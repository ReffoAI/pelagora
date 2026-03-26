/**
 * Multi-stage UPC/barcode resolution.
 * Resolves a UPC code to a product name via a fallback chain:
 *   1. UPCitemdb free trial API (no key required, 100/day)
 *   2. Google search via Serper + AI extraction
 *   3. Direct AI identification (least reliable)
 */

import type { AiProvider } from './product-lookup';

export interface UpcResolveResult {
  name: string;
  brand: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  priceLow: number | null;
  priceHigh: number | null;
}

/**
 * Normalize a UPC/EAN barcode: strip leading zeros to get the core UPC-A (12 digits).
 * Returns both the original and stripped versions for multi-format lookups.
 */
function normalizeUpc(upc: string): string[] {
  const variants = new Set<string>();
  variants.add(upc);
  const stripped = upc.replace(/^0+/, '');
  if (stripped.length >= 8) variants.add(stripped);
  if (stripped.length <= 12) variants.add(stripped.padStart(12, '0'));
  if (stripped.length <= 13) variants.add(stripped.padStart(13, '0'));
  return [...variants];
}

/**
 * Stage 1: Resolve UPC via UPCitemdb free trial API.
 * Free tier: 100 lookups/day, 6/minute. No API key required.
 */
export async function resolveUpc(upc: string): Promise<UpcResolveResult | null> {
  const variants = normalizeUpc(upc);

  for (const variant of variants) {
    try {
      const res = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(variant)}`,
        { signal: AbortSignal.timeout(5000) },
      );

      if (!res.ok) continue;

      const data = await res.json() as { code: string; items?: Array<Record<string, unknown>> };
      if (data.code !== 'OK' || !data.items?.length) continue;

      const item = data.items[0] as Record<string, unknown>;
      if (!item.title) continue;

      const catStr = typeof item.category === 'string' ? item.category : '';
      const topCategory = catStr.split('>')[0]?.trim() || null;
      const images = item.images as string[] | undefined;

      return {
        name: item.title as string,
        brand: (item.brand as string) || null,
        description: (item.description as string) || null,
        category: topCategory,
        imageUrl: images?.[0] || null,
        priceLow:
          typeof item.lowest_recorded_price === 'number'
            ? item.lowest_recorded_price
            : null,
        priceHigh:
          typeof item.highest_recorded_price === 'number'
            ? item.highest_recorded_price
            : null,
      };
    } catch {
      continue;
    }
  }

  return null;
}

// --- AI helper functions for Serper + AI and direct AI stages ---

function extractAiText(provider: AiProvider, data: unknown): string {
  const d = data as Record<string, unknown>;
  if (provider === 'anthropic') {
    const content = (d.content as Array<{ type: string; text: string }>) || [];
    return content[0]?.type === 'text' ? content[0].text.trim() : '';
  }
  if (provider === 'google') {
    const candidates = d.candidates as Array<{ content?: { parts?: { text?: string }[] } }> | undefined;
    return candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }
  // openai / xai compatible
  const choices = (d.choices as Array<{ message?: { content?: string } }>) || [];
  return choices[0]?.message?.content?.trim() ?? '';
}

function getAiEndpoint(provider: AiProvider): { url: string; model: string } {
  switch (provider) {
    case 'anthropic':
      return { url: 'https://api.anthropic.com/v1/messages', model: 'claude-haiku-4-5-20251001' };
    case 'openai':
      return { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' };
    case 'google':
      return { url: '', model: 'gemini-2.0-flash-lite' }; // URL constructed differently
    case 'xai':
      return { url: 'https://api.x.ai/v1/chat/completions', model: 'grok-3-mini-fast' };
  }
}

async function callAiSimple(
  provider: AiProvider,
  apiKey: string,
  prompt: string,
  timeoutMs: number,
): Promise<string> {
  const { url, model } = getAiEndpoint(provider);

  let res: Response;

  if (provider === 'anthropic') {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } else if (provider === 'google') {
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    res = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 256 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } else {
    // openai / xai
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  if (!res.ok) return '';
  const data = await res.json();
  return extractAiText(provider, data);
}

/**
 * Stage 2: Search Google via Serper for a UPC and use AI to extract the product name.
 */
export async function resolveUpcViaSearch(
  upc: string,
  provider: AiProvider,
  aiApiKey: string,
  serperKey: string,
): Promise<UpcResolveResult | null> {
  try {
    // Search Google for the UPC
    const searchRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: `"${upc}" UPC product`, num: 10 }),
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) {
      console.error(`[upc-lookup] Serper search failed: ${searchRes.status}`);
      return null;
    }

    const searchData = await searchRes.json() as Record<string, unknown>;
    const organic = searchData.organic as Array<{ title: string; snippet: string; link: string }>;
    const shopping = searchData.shopping as Array<{ title: string; source: string }> | undefined;
    const knowledgeGraph = searchData.knowledgeGraph as { title?: string; description?: string } | undefined;

    // If knowledge graph has a direct answer, use it
    if (knowledgeGraph?.title && !knowledgeGraph.title.match(/^\d+$/)) {
      console.log(`[upc-lookup] Knowledge graph hit: "${knowledgeGraph.title}"`);
      return {
        name: knowledgeGraph.title,
        brand: null,
        description: knowledgeGraph.description || null,
        category: null,
        imageUrl: null,
        priceLow: null,
        priceHigh: null,
      };
    }

    // Combine organic + shopping results for AI to parse
    const allResults: string[] = [];
    if (organic?.length) {
      organic.slice(0, 5).forEach((r, i) => {
        allResults.push(`${i + 1}. ${r.title}\n   ${r.snippet}`);
      });
    }
    if (shopping?.length) {
      shopping.slice(0, 3).forEach((r) => {
        allResults.push(`Shopping: ${r.title} (${r.source})`);
      });
    }

    if (!allResults.length) {
      console.log(`[upc-lookup] Serper returned no results for "${upc}"`);
      return null;
    }

    const resultsSummary = allResults.join('\n');

    // Ask AI to extract the product name from search results
    const prompt = `I searched Google for UPC barcode "${upc}" and got these results:\n\n${resultsSummary}\n\nBased on these results, what is the product? Return ONLY a JSON object: {"name": "product name", "brand": "brand or null"}. If the results don't clearly identify a product, return {"name": null, "brand": null}. No other text.`;

    const text = await callAiSimple(provider, aiApiKey, prompt, 10000);
    if (!text) return null;

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.name) return null;

    return {
      name: parsed.name,
      brand: parsed.brand || null,
      description: null,
      category: null,
      imageUrl: null,
      priceLow: null,
      priceHigh: null,
    };
  } catch (err) {
    console.error('[upc-lookup] Serper search resolve error:', err);
    return null;
  }
}

/**
 * Stage 3: Ask AI directly to identify a product from its UPC/EAN barcode.
 * Least reliable method — the AI may not have the UPC in its training data.
 */
export async function identifyUpcWithAI(
  upc: string,
  provider: AiProvider,
  apiKey: string,
): Promise<string | null> {
  try {
    const prompt = `What product has the UPC/EAN barcode: ${upc}?\n\nReturn ONLY the product name as a short string (e.g. "Crest 3D White Toothpaste 4.1oz"). If you cannot confidently identify it, return exactly "UNKNOWN". Do not include any other text.`;

    const text = await callAiSimple(provider, apiKey, prompt, 10000);
    if (!text || text === 'UNKNOWN' || text.length > 200) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Stage 2 via Reffo.ai: Use Reffo.ai's barcode endpoint as the search+AI stage
 * when the user has a Reffo API key but no direct AI provider or Serper key.
 */
export async function resolveUpcViaReffo(
  upc: string,
  reffoApiKey: string,
  reffoUrl: string,
): Promise<UpcResolveResult | null> {
  try {
    const res = await fetch(`${reffoUrl}/api/scan/barcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${reffoApiKey}`,
      },
      body: JSON.stringify({ upc }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;
    if (data.unidentified || !data.name) return null;

    const pe = (data.price_estimate || {}) as Record<string, unknown>;

    return {
      name: data.name as string,
      brand: null,
      description: (data.description as string) || null,
      category: null,
      imageUrl: (data.image_url as string) || null,
      priceLow: typeof pe.low === 'number' ? pe.low : null,
      priceHigh: typeof pe.high === 'number' ? pe.high : null,
    };
  } catch (err) {
    console.error('[upc-lookup] Reffo.ai resolve error:', err);
    return null;
  }
}
