/**
 * Multi-provider AI product lookup abstraction.
 * Supports: anthropic, openai, google, xai — all returning the same response shape.
 */

export type AiProvider = 'anthropic' | 'openai' | 'google' | 'xai';

export interface ProductLookupRequest {
  name: string;
  category?: string;
  subcategory?: string;
  attributeKeys: string[];
}

export interface ProductLookupResponse {
  description: string | null;
  sku: string | null;
  product_url: string | null;
  image_url: string | null;
  attributes: Record<string, string>;
  price_estimate: {
    low: number;
    high: number;
    typical: number;
    confidence: 'low' | 'medium' | 'high';
  };
}

function buildPrompt(req: ProductLookupRequest): string {
  const parts = [
    `Product: ${req.name}`,
    req.category && `Category: ${req.category}`,
    req.subcategory && `Subcategory: ${req.subcategory}`,
  ].filter(Boolean).join('\n');

  const attrList = req.attributeKeys.length > 0
    ? `Only fill these attribute keys: ${req.attributeKeys.join(', ')}`
    : 'No category-specific attributes for this category.';

  return `You are a product data expert. Given a product name and category, return structured product data as JSON.

${parts}

${attrList}

Return this exact JSON format:
{
  "description": "<Start with 1 concise summary sentence. Then 1-2 detailed paragraphs covering key features, specs, and typical use cases. Factual only, not marketing copy. Null if unknown.>",
  "sku": "<manufacturer SKU/part number, or null if unknown>",
  "product_url": "<official manufacturer product page URL, or null if unknown>",
  "image_url": "<official product image URL from manufacturer domain, or null if unknown>",
  "attributes": {<only keys from the provided list, values as strings, omit unknown>},
  "price_estimate": {"low": <number>, "high": <number>, "typical": <number>, "confidence": "<low|medium|high>"}
}

Rules:
- Return null for any field you are uncertain about. Do NOT hallucinate.
- Only provide URLs from the manufacturer's official domain.
- Only fill attribute keys from the provided list.
- Description should start with one concise summary sentence, followed by 1-2 detailed paragraphs. Factual only, not marketing copy.
- All prices in USD as numbers (no $ sign).
- confidence: "high" if well-known product, "medium" if somewhat familiar, "low" if uncertain.
- Respond with ONLY valid JSON, no other text.`;
}

async function callAnthropic(apiKey: string, prompt: string): Promise<ProductLookupResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { content?: { type: string; text: string }[] };
  const text = data.content?.[0]?.type === 'text' ? data.content[0].text : '';
  return parseResponse(text, 'claude-3-haiku-20240307');
}

async function callOpenAICompatible(
  apiKey: string,
  prompt: string,
  endpoint: string,
  model: string,
): Promise<ProductLookupResponse> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${model} API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseResponse(text, model);
}

async function callGoogle(apiKey: string, prompt: string): Promise<ProductLookupResponse> {
  const model = 'gemini-2.0-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google AI error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseResponse(text, model);
}

function parseResponse(text: string, model: string): ProductLookupResponse {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);

  const DEVICE_UNIQUE = new Set(['vin', 'hin', 'imei', 'parcel_id']);
  const attrs: Record<string, string> = {};
  if (parsed.attributes && typeof parsed.attributes === 'object') {
    for (const [k, v] of Object.entries(parsed.attributes)) {
      if (v != null && v !== '' && !DEVICE_UNIQUE.has(k)) attrs[k] = String(v);
    }
  }

  const pe = parsed.price_estimate || {};
  const confidence = ['low', 'medium', 'high'].includes(pe.confidence) ? pe.confidence : 'low';

  return {
    description: typeof parsed.description === 'string' ? parsed.description : null,
    sku: typeof parsed.sku === 'string' ? parsed.sku : null,
    product_url: typeof parsed.product_url === 'string' ? parsed.product_url : null,
    image_url: typeof parsed.image_url === 'string' ? parsed.image_url : null,
    attributes: attrs,
    price_estimate: {
      low: Math.max(0, Number(pe.low) || 0),
      high: Math.max(0, Number(pe.high) || 0),
      typical: Math.max(0, Number(pe.typical) || 0),
      confidence,
    },
  };
}

export async function callProductLookup(
  provider: AiProvider,
  apiKey: string,
  req: ProductLookupRequest,
): Promise<ProductLookupResponse> {
  const prompt = buildPrompt(req);

  switch (provider) {
    case 'anthropic':
      return callAnthropic(apiKey, prompt);
    case 'openai':
      return callOpenAICompatible(apiKey, prompt, 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini');
    case 'google':
      return callGoogle(apiKey, prompt);
    case 'xai':
      return callOpenAICompatible(apiKey, prompt, 'https://api.x.ai/v1/chat/completions', 'grok-3-mini-fast');
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
