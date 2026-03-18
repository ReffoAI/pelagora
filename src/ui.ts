import { TAXONOMY } from './taxonomy';
import { CATEGORY_SCHEMAS } from '@pelagora/pim-protocol';

export function renderUI(): string {
  const taxonomyJSON = JSON.stringify(TAXONOMY);

  // Serialize category schemas for client-side use (only the data needed for UI)
  const schemasForUI: Record<string, { conditionOptions: string[]; attributes: Array<{ key: string; label: string; type: string; placeholder?: string; options?: string[]; summary?: boolean; unit?: string }> }> = {};
  for (const [key, schema] of Object.entries(CATEGORY_SCHEMAS)) {
    schemasForUI[key] = {
      conditionOptions: schema.conditionOptions,
      attributes: schema.attributes.map(a => ({ key: a.key, label: a.label, type: a.type, placeholder: a.placeholder, options: a.options, summary: a.summary, unit: a.unit })),
    };
  }
  const defaultSchemaForUI = { conditionOptions: ['new', 'like_new', 'good', 'fair', 'poor'], attributes: [] };
  const categorySchemaJSON = JSON.stringify(schemasForUI);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>beacon</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Poppins', sans-serif; background: #F4F5F6; color: #23262F; line-height: 1.5; min-height: 100vh; display: flex; flex-direction: column; }
    .app-content { flex: 1; min-height: calc(100dvh - 80px); }
    .container { max-width: 1100px; padding: 24px; }

    /* Fade-in animation (from Modal.module.sass) */
    @keyframes showModal { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes fadeIn { 0% { opacity: 0; transform: translateY(3px); } 100% { opacity: 1; transform: translateY(0); } }

    /* Header */
    h1 { font-size: 1.25rem; font-weight: 700; color: #141416; margin: 0; }

    /* App Header — sticky bar */
    .app-header { position: sticky; top: 0; z-index: 100; background: #FCFCFD; border-bottom: 1px solid #E6E8EC; padding: 0 24px; }
    .app-header-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 16px; }
    .app-header-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; flex-shrink: 0; }
    .app-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .header-settings-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #E6E8EC; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; position: relative; color: #777E90; }
    .header-settings-btn:hover { border-color: #141416; color: #141416; }
    .header-settings-btn .notif-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: #EC526F; display: none; }
    .sidebar-nav-item { position: relative; }
    .sidebar-notif-dot { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; background: #EC526F; display: none; }
    .header-link-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 18px; background: linear-gradient(90deg, #8101B4 0%, #EA526F 100%); border: none; border-radius: 18px; font-size: 13px; font-weight: 500; color: #FCFCFD; cursor: pointer; transition: opacity 0.2s; font-family: 'Poppins', sans-serif; white-space: nowrap; }
    .header-link-btn:hover { opacity: 0.9; }

    /* Avatar dropdown */
    .header-avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #E6E8EC; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: border-color 0.2s; overflow: hidden; font-size: 14px; font-weight: 700; color: #EC526F; font-family: 'Poppins', sans-serif; }
    .header-avatar:hover { border-color: #EC526F; }
    .header-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-dropdown { position: absolute; right: 0; top: 100%; margin-top: 8px; width: 220px; background: #FCFCFD; border: 1px solid #E6E8EC; border-radius: 16px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); padding: 8px 0; z-index: 200; display: none; }
    .avatar-dropdown.open { display: block; }
    .avatar-dropdown .dd-header { padding: 12px 20px; border-bottom: 1px solid #E6E8EC; }
    .avatar-dropdown .dd-header-name { font-size: 14px; font-weight: 600; color: #141416; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .avatar-dropdown .dd-header-sub { font-size: 12px; color: #777E90; margin-top: 2px; }
    .avatar-dropdown .dd-item { display: block; width: 100%; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #23262F; cursor: pointer; transition: background 0.15s; border: none; background: none; text-align: left; font-family: 'Poppins', sans-serif; text-decoration: none; }
    .avatar-dropdown .dd-item:hover { background: #F4F5F6; }
    .avatar-dropdown .dd-divider { height: 1px; background: #E6E8EC; margin: 4px 0; }
    .avatar-dropdown .dd-label { padding: 8px 20px 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #777E90; }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .app-header-inner { gap: 8px; }
      .app-header-logo h1 { display: none; }
      .header-link-btn { padding: 0 12px; font-size: 12px; height: 32px; }
      .search-filter-segment { padding: 0 10px; }
    }

    /* Search Filter Bar — 3 segment pill (matching webapp) */
    .search-filter-bar { display: flex; align-items: center; background: #FCFCFD; border-radius: 48px; box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px #E6E8EC; overflow: hidden; height: 56px; padding-right: 8px; max-width: 660px; margin: 0 auto; }
    .search-filter-segment { display: flex; align-items: center; gap: 8px; padding: 0 16px; height: 100%; white-space: nowrap; }
    .search-filter-segment svg { flex-shrink: 0; color: #777E90; }
    .search-filter-bar input { border: none; outline: none; background: transparent; height: 100%; font-size: 14px; font-weight: 500; font-family: 'Poppins', sans-serif; color: #23262F; flex: 1; min-width: 0; padding: 0; margin: 0; }
    .search-filter-bar input::placeholder { color: #777E90; font-weight: 400; }
    .sfb-divider { width: 1px; height: 24px; background: #E6E8EC; flex-shrink: 0; }
    .search-filter-bar select { border: none; outline: none; background: transparent; height: 100%; font-size: 14px; font-weight: 500; font-family: 'Poppins', sans-serif; color: #23262F; cursor: pointer; -webkit-appearance: none; appearance: none; padding: 0; margin: 0; }
    .sfb-search-btn { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; background: #EC526F; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-left: 4px; transition: background 0.2s; }
    .sfb-search-btn:hover { background: #DD436C; }

    /* Mobile search — collapsed pill + expanded panel */
    .mobile-search-pill { display: none; width: 100%; align-items: center; gap: 12px; height: 48px; padding: 0 16px; border-radius: 24px; background: #FCFCFD; border: 1px solid #E6E8EC; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: pointer; font-family: 'Poppins', sans-serif; transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.25s ease; }
    .mobile-search-pill .pill-text { flex: 1; min-width: 0; text-align: left; }
    .mobile-search-pill .pill-title { font-size: 14px; font-weight: 500; color: #141416; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mobile-search-pill .pill-sub { font-size: 11px; color: #777E90; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2; }
    .mobile-search-pill .pill-btn { width: 32px; height: 32px; border-radius: 50%; background: #EC526F; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mobile-search-expanded { display: none; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.25s ease, opacity 0.2s ease; }
    .mobile-search-expanded.open { grid-template-rows: 1fr; opacity: 1; }
    .mobile-search-expanded .expand-inner { overflow: hidden; }
    .mobile-search-expanded .expand-card { background: #FCFCFD; border-radius: 16px; border: 1px solid #E6E8EC; padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); transition: transform 0.25s ease; transform: translateY(-8px); }
    .mobile-search-expanded.open .expand-card { transform: translateY(0); }
    .expand-field { margin-bottom: 12px; }
    .expand-field label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #777E90; margin-bottom: 4px; }
    .expand-field-row { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px; border-radius: 12px; background: #F4F5F6; }
    .expand-field-row svg { flex-shrink: 0; color: #777E90; }
    .expand-field-row input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; font-weight: 500; font-family: 'Poppins', sans-serif; color: #23262F; min-width: 0; padding: 0; margin: 0; }
    .expand-field-row input::placeholder { color: #777E90; font-weight: 400; }
    .expand-field-row select { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; font-weight: 500; font-family: 'Poppins', sans-serif; color: #23262F; cursor: pointer; -webkit-appearance: none; appearance: none; padding: 0; margin: 0; }
    .expand-actions { display: flex; gap: 12px; padding-top: 4px; }
    .expand-actions button { flex: 1; height: 44px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; transition: all 0.2s; }
    .expand-cancel { border: 1px solid #E6E8EC; background: #FCFCFD; color: #23262F; }
    .expand-cancel:hover { background: #F4F5F6; }
    .expand-submit { border: none; background: #EC526F; color: #FCFCFD; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .expand-submit:hover { background: #DD436C; }

    @media (max-width: 639px) {
      .search-filter-bar { display: none !important; }
      .mobile-search-pill { display: flex; }
      .mobile-search-expanded { display: grid; }
      .container { padding: 16px; }
    }
    @media (min-width: 640px) and (max-width: 768px) { .search-filter-segment { padding: 0 10px; } }

    /* Layout toggle */
    .layout-toggle { display: flex; gap: 0; border: 1px solid #E6E8EC; border-radius: 8px; overflow: hidden; }
    .layout-toggle button { width: 36px; height: 32px; border: none; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #777E90; transition: all 0.15s; }
    .layout-toggle button.active { background: #141416; color: #FCFCFD; }
    .layout-toggle button:hover:not(.active) { background: #F4F5F6; }

    /* Row layout */
    .rows { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .ref-row { display: flex; align-items: center; gap: 16px; background: #FCFCFD; border-radius: 12px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(15,15,15,0.08); cursor: pointer; transition: all 0.15s; }
    .ref-row:hover { box-shadow: 0 4px 12px rgba(15,15,15,0.12); transform: translateY(-1px); }
    .ref-row .row-img { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; background: #F4F5F6; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .ref-row .row-img img { width: 100%; height: 100%; object-fit: cover; }
    .ref-row .row-img .placeholder { color: #E6E8EC; font-size: 1.2rem; }
    .ref-row .row-name { font-size: 14px; font-weight: 600; color: #141416; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ref-row .row-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .ref-row .row-price { font-size: 14px; font-weight: 700; color: #1a8a42; white-space: nowrap; }
    .ref-row .row-qty { font-size: 12px; color: #777E90; white-space: nowrap; }

    /* Sections — Card.module.sass shadow depth */
    section { background: #FCFCFD; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); }
    h2 { font-size: 16px; font-weight: 700; color: #141416; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #EC526F; text-transform: uppercase; letter-spacing: 0.02em; }

    /* Settings cards — scoped overrides to match webapp Account page */
    .settings-card { padding: 32px; margin-bottom: 32px; }
    .settings-card h2 { font-size: 18px; font-weight: 600; color: #23262F; text-transform: none; letter-spacing: 0; border-bottom: 1px solid #E6E8EC; padding-bottom: 16px; margin-bottom: 24px; }
    .settings-card .info-row { display: flex; justify-content: space-between; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #F4F5F6; }
    .settings-card .info-row:last-child { border-bottom: none; }
    .settings-card .info-label { color: #777E90; font-weight: 500; }
    .settings-card .info-value { font-weight: 600; color: #23262F; }

    /* Favorite heart button — absolute-positioned on search result cards */
    .fav-heart { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.85); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; transition: all 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
    .fav-heart:hover { background: #fff; transform: scale(1.1); }
    .fav-heart.active { background: #FFF0F3; }
    .fav-heart.active svg { fill: #EA526F; stroke: #EA526F; }
    /* Favorite filter toggle button in search toolbar */
    .fav-filter-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E6E8EC; background: #FCFCFD; cursor: pointer; color: #777E90; transition: all 0.2s; flex-shrink: 0; }
    .fav-filter-btn:hover { border-color: #EA526F; color: #EA526F; }
    .fav-filter-btn.active { background: #FFF0F3; border-color: #EA526F; color: #EA526F; }

    .update-banner {
      background: linear-gradient(90deg, rgba(129,1,180,0.06), rgba(234,82,111,0.06));
      border: 1px solid rgba(129,1,180,0.15);
      border-radius: 12px; padding: 16px 20px;
      margin-bottom: 24px; display: none;
    }
    .update-banner .update-title {
      font-weight: 600; font-size: 14px; color: #23262F; margin-bottom: 4px;
    }
    .update-banner .update-cmd {
      font-size: 13px; color: #777E90; font-family: monospace;
    }

    /* Forms — Form.module.sass: 48px height, pill shape, 2px border */
    label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #777E90; text-transform: uppercase; letter-spacing: 0.02em; }
    input, select { width: 100%; height: 48px; padding: 0 14px; border: 2px solid #E6E8EC; border-radius: 12px; font-size: 14px; font-family: 'Poppins', sans-serif; font-weight: 500; margin-bottom: 14px; background: #FCFCFD; color: #23262F; transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; }
    textarea { width: 100%; padding: 12px 14px; border: 2px solid #E6E8EC; border-radius: 12px; font-size: 14px; font-family: 'Poppins', sans-serif; font-weight: 500; margin-bottom: 14px; background: #FCFCFD; color: #23262F; transition: border-color 0.2s, box-shadow 0.2s; resize: vertical; min-height: 60px; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #777E90; box-shadow: none; background: #fff; }
    input::placeholder, textarea::placeholder { color: #777E90; font-weight: 400; }
    .row { display: flex; gap: 14px; }
    .row > div { flex: 1; }

    /* Buttons — button.sass: 48px height, pill, Poppins bold 700 */
    .btn-primary { background: #EC526F; color: #FCFCFD; border: none; height: 48px; padding: 0 24px; border-radius: 24px; font-size: 16px; font-weight: 700; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; user-select: none; }
    .btn-primary:hover { background: #DD436C; }
    .btn-primary:disabled { opacity: 0.5; pointer-events: none; }
    /* Stroke variant — button.sass buttonStroke: inset box-shadow, transparent bg */
    .btn-secondary { background: transparent; color: #23262F; border: none; box-shadow: inset 0 0 0 2px #E6E8EC; height: 48px; padding: 0 24px; border-radius: 24px; font-size: 14px; font-weight: 500; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; user-select: none; }
    .btn-secondary:hover { background: #23262F; box-shadow: inset 0 0 0 2px #23262F; color: #FCFCFD; }
    /* Danger — button.sass buttonDanger */
    .btn-danger { background: #E92222; color: #FCFCFD; border: none; height: 48px; padding: 0 24px; border-radius: 24px; font-size: 14px; font-weight: 500; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.5s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; user-select: none; }
    .btn-danger:hover { background: #c41c1c; }
    .btn-danger:disabled { background: #E6E8EC; color: #23262F; pointer-events: none; }
    .btn-sm { height: 40px; padding: 0 16px; font-size: 14px; border-radius: 20px; }

    /* Cards grid — DealsList.module.sass: 4→3→2→1 column grid */
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 16px; }
    @media (max-width: 1023px) { .cards { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 639px) { .cards { grid-template-columns: 1fr; } }

    /* Ref card — Card.module.sass: 16px radius, deep shadow, image hover scale */
    .card { background: #FCFCFD; border-radius: 16px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    .card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px -8px rgba(15,15,15,0.18); }
    .card-img { width: 100%; height: 180px; position: relative; overflow: hidden; background: #F4F5F6; display: flex; align-items: center; justify-content: center; }
    .card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s; }
    .card:hover .card-img img { transform: scale(1.1); }
    .card-img .placeholder { color: #B1B5C3; font-size: 2.5rem; }
    .card-body { padding: 20px; }
    .card-body h3 { font-size: 16px; font-weight: 600; color: #141416; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.2s; }
    .card:hover .card-body h3 { color: #EC526F; }
    .card-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    /* Badges — status.sass: inline-block, 12px bold uppercase, 13px radius, 26px line-height */
    .badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 0 12px; border-radius: 13px; line-height: 26px; text-transform: uppercase; }
    .badge-cat { background: #F4F5F6; color: #777E90; }
    .badge-private { background: #E6E8EC; color: #353945; }
    .badge-for-sale { background: #e6f9ed; color: #1a8a42; }
    .badge-willing { background: #fff8e1; color: #e6a200; }
    .badge-for-rent { background: #e6f0ff; color: #1a6aba; }
    .card-price { font-size: 16px; font-weight: 700; color: #1a8a42; margin-top: 4px; }
    .card-qty { font-size: 12px; color: #777E90; margin-top: 4px; font-weight: 500; }
    .card-desc { font-size: 14px; color: #777E90; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.71; }

    /* Status segmented control */
    .status-segmented { display:flex; border-radius:12px; overflow:hidden; border:1px solid #E6E8EC; margin-bottom:14px; }
    .status-segmented button { flex:1; padding:8px 12px; border:none; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s; background:transparent; color:#777E90; text-align:center; white-space:nowrap; font-family:'Poppins',sans-serif; }
    .seg-active-private { background:#777E90 !important; color:#fff !important; }
    .seg-active-for_sale { background:#45B36B !important; color:#fff !important; }
    .seg-active-willing_to_sell { background:#3B82F6 !important; color:#fff !important; }
    .seg-active-for_rent { background:#F59E0B !important; color:#fff !important; }

    /* Price estimate card */
    .price-estimate-card { background: linear-gradient(135deg, #f0f2ff 0%, #e8eeff 100%); border: 1px solid #d4dbf5; border-left: 3px solid #7B61FF; border-radius: 12px; padding: 14px 14px 14px 16px; margin-bottom: 14px; }
    .price-estimate-card .est-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .price-estimate-card .est-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; color: #5B4FC7; }
    .price-estimate-card .est-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; }
    .price-estimate-card .est-badge-high { background: #e6f9ed; color: #1a8a42; }
    .price-estimate-card .est-badge-medium { background: #fff8e1; color: #e6a200; }
    .price-estimate-card .est-badge-low { background: #F4F5F6; color: #777E90; }
    .price-estimate-card .est-text { font-size: 15px; color: #23262F; }
    .price-estimate-card .est-text strong { font-weight: 700; }
    .price-estimate-card .est-muted { font-size: 14px; color: #777E90; }
    .price-estimate-spinner { width: 16px; height: 16px; border: 2px solid #92A5EF; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* AI autofill badge */
    .autofill-badge { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: 8px; background: #f0f2ff; color: #7B61FF; margin-left: 6px; vertical-align: middle; }
    .autofill-card { background: linear-gradient(135deg, #f0f2ff 0%, #e8eeff 100%); border: 1px solid #d4dbf5; border-left: 3px solid #7B61FF; border-radius: 12px; padding: 14px 14px 14px 16px; margin-bottom: 14px; }
    .autofill-card .autofill-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .autofill-card .autofill-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; color: #5B4FC7; }
    .autofill-card .autofill-fields { font-size: 13px; color: #777E90; }
    .autofill-img-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid #E6E8EC; }
    .autofill-link { font-size: 12px; color: #7B61FF; text-decoration: none; }
    .autofill-link:hover { text-decoration: underline; }

    /* AI suggested image card (near photos) */
    .ai-suggested-img { background: linear-gradient(135deg, #f0f2ff 0%, #e8eeff 100%); border: 1px solid #d4dbf5; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
    .ai-suggested-img .ai-img-preview { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; border: 1px solid #E6E8EC; cursor: pointer; flex-shrink: 0; transition: transform 0.15s; }
    .ai-suggested-img .ai-img-preview:hover { transform: scale(1.05); }
    .ai-suggested-img .ai-img-info { flex: 1; min-width: 0; }
    .ai-suggested-img .ai-img-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #23262F; margin-bottom: 4px; }
    .ai-suggested-img .ai-img-hint { font-size: 12px; color: #777E90; line-height: 1.4; }
    .ai-suggested-img .ai-img-actions { display: flex; gap: 8px; margin-top: 8px; }
    .ai-suggested-img .ai-use-btn { display: flex; align-items: center; gap: 5px; background: #7B61FF; color: #fff; border: none; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .ai-suggested-img .ai-use-btn:hover { background: #6B51EF; }
    .ai-suggested-img .ai-dismiss-btn { background: none; border: 1px solid #E6E8EC; border-radius: 8px; padding: 6px 10px; font-size: 12px; color: #777E90; cursor: pointer; transition: background 0.15s; }
    .ai-suggested-img .ai-dismiss-btn:hover { background: #F4F5F6; }
    .ai-suggested-img .ai-img-expanded { margin-top: 10px; border-radius: 10px; max-width: 100%; max-height: 220px; object-fit: contain; border: 1px solid #E6E8EC; background: #fff; }

    /* Upload area */
    .upload-area { border: 2px dashed #E6E8EC; border-radius: 16px; padding: 24px; text-align: center; color: #B1B5C3; cursor: pointer; transition: border-color 0.2s, background 0.2s; margin-bottom: 14px; }
    .upload-area:hover { border-color: #EC526F; background: rgba(236,82,111,0.03); }
    .upload-area input[type=file] { display: none; }
    .upload-area p { font-size: 14px; margin-top: 4px; font-weight: 500; }
    .upload-area .upload-icon { font-size: 1.8rem; color: #B1B5C3; }

    /* Tabs */
    .tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid #E6E8EC; }
    .tab { padding: 10px 24px; cursor: pointer; font-size: 14px; font-weight: 700; color: #777E90; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.02em; }
    .tab.active { color: #EC526F; border-bottom-color: #EC526F; }
    .tab:hover { color: #EC526F; }

    /* (nav-tabs removed — navigation is in app-header) */

    /* Detail view — ImageCarousel.module.sass: flex 3/1, 16px radius */
    .detail-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #EC526F; cursor: pointer; margin-bottom: 16px; font-weight: 600; transition: color 0.2s; }
    .detail-back:hover { color: #DD436C; }
    .detail-back svg { flex-shrink: 0; }
    .detail-gallery { display: flex; gap: 12px; margin-bottom: 24px; height: 480px; }
    .detail-main-img { flex: 3; height: 100%; border-radius: 16px; overflow: hidden; background: #F4F5F6; display: flex; align-items: center; justify-content: center; position: relative; }
    .detail-main-img img.blur-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(24px); transform: scale(1.1); opacity: 0.6; z-index: 0; }
    .detail-main-img img.main-img { width: 100%; height: 100%; object-fit: contain; position: relative; z-index: 1; }
    .detail-main-img .placeholder { color: #B1B5C3; font-size: 3rem; }
    .detail-side-imgs { flex: 1; display: flex; flex-direction: column; gap: 12px; height: 100%; }
    .detail-side-img { flex: 1; min-height: 0; border-radius: 16px; overflow: hidden; background: #F4F5F6; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s; position: relative; }
    .detail-side-img:hover { opacity: 0.85; }
    .detail-side-img img { width: 100%; height: 100%; object-fit: cover; }
    .detail-side-img .placeholder { color: #E6E8EC; font-size: 1.5rem; }
    .detail-view-all { position: absolute; inset: 0; background: rgba(20,20,22,0.55); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; border-radius: 16px; }
    .detail-view-all:hover { background: rgba(20,20,22,0.7); }
    .detail-view-all span { color: #FCFCFD; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .detail-columns { display: flex; gap: 24px; }
    .detail-left { flex: 1; }
    .detail-right { flex: 0 0 320px; }
    /* Action card — PaymentCard.module.sass: sticky, 15px radius, deep shadow */
    .action-card { background: #FCFCFD; border-radius: 16px; padding: 24px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); position: sticky; top: 24px; }
    .action-card .action-price { font-size: 32px; font-weight: 700; color: #141416; margin-bottom: 16px; }
    .action-card .action-row { display: flex; justify-content: space-between; font-size: 14px; padding: 10px 0; border-bottom: 1px solid #F4F5F6; }
    .action-card .action-row:last-of-type { border-bottom: none; }
    .action-card .action-label { color: #777E90; font-weight: 500; }
    .action-card .action-value { font-weight: 600; color: #23262F; }
    @media (max-width: 767px) { .detail-columns { flex-direction: column; } .detail-right { flex: none; } .detail-gallery { flex-direction: column; height: auto; } .detail-main-img { flex: none; height: 240px; } .detail-side-imgs { flex-direction: row; height: auto; } .detail-side-img { height: 100px; } }

    /* Media management */
    .media-thumbs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .media-thumb { position: relative; width: 90px; height: 90px; border-radius: 16px; overflow: hidden; background: #F4F5F6; }
    .media-thumb img, .media-thumb video { width: 100%; height: 100%; object-fit: cover; }
    .media-thumb .del-btn { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(233,34,34,0.9); color: #FCFCFD; border: none; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; transition: transform 0.15s; }
    .media-thumb .del-btn:hover { transform: scale(1.1); }

    /* Negotiation cards */
    .neg-card { background: #FCFCFD; border-radius: 16px; padding: 20px 24px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); margin-bottom: 16px; border-left: 4px solid #E6E8EC; transition: transform 0.2s; }
    .neg-card:hover { transform: translateY(-1px); }
    .neg-card.pending { border-left-color: #FFB900; }
    .neg-card.accepted { border-left-color: #28a745; }
    .neg-card.rejected { border-left-color: #E92222; }
    .neg-card.countered { border-left-color: #A4CDE3; }
    .neg-card.withdrawn { border-left-color: #777E90; }
    .neg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }

    /* Inbox email-style rows */
    .inbox-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #F4F5F6; cursor: pointer; transition: background 0.15s; }
    .inbox-row:hover { background: #F4F5F6; }
    .inbox-row.unread { font-weight: 600; background: #FAFAFA; }
    .inbox-row .inbox-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px; }
    .inbox-row .inbox-icon.offer { background: #fff8e1; color: #e6a200; }
    .inbox-row .inbox-icon.message { background: #F4F0FF; color: #7C3AED; }
    .inbox-row .inbox-icon.accepted { background: #e6f9ed; color: #1a8a42; }
    .inbox-row .inbox-icon.sold { background: #e6f9ed; color: #1a8a42; }
    .inbox-row .inbox-body { flex: 1; min-width: 0; }
    .inbox-row .inbox-sender { font-size: 13px; color: #23262F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .inbox-row .inbox-preview { font-size: 12px; color: #777E90; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 400; }
    .inbox-row .inbox-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .inbox-row .inbox-date { font-size: 11px; color: #777E90; white-space: nowrap; font-weight: 400; }
    .inbox-row .inbox-badge { font-size: 10px; font-weight: 700; padding: 1px 8px; border-radius: 10px; text-transform: uppercase; white-space: nowrap; }
    .inbox-badge.pending { background: #fff8e1; color: #e6a200; }
    .inbox-badge.accepted { background: #e6f9ed; color: #1a8a42; }
    .inbox-badge.rejected { background: #fce8e6; color: #E92222; }
    .inbox-badge.countered { background: #e1f5fe; color: #0277bd; }
    .inbox-badge.withdrawn { background: #F4F5F6; color: #777E90; }
    .inbox-badge.sold { background: #e6f9ed; color: #1a8a42; }
    .inbox-badge.new-msg { background: #F4F0FF; color: #7C3AED; }
    .inbox-badge.replied { background: #F4F5F6; color: #777E90; }
    .inbox-list { background: #fff; border: 1px solid #E6E8EC; border-radius: 12px; overflow: hidden; }
    .inbox-list .inbox-row:last-child { border-bottom: none; }
    .inbox-thread { background: #fff; border: 1px solid #E6E8EC; border-radius: 12px; padding: 20px; }
    .inbox-thread-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #EC526F; cursor: pointer; margin-bottom: 16px; font-weight: 600; }
    .inbox-thread-back:hover { color: #DD436C; }
    .neg-item-name { font-weight: 700; font-size: 16px; color: #141416; }
    /* Status badge — status.sass */
    .neg-status { font-size: 12px; font-weight: 700; padding: 0 12px; border-radius: 13px; line-height: 26px; text-transform: uppercase; }
    .neg-status.pending { background: #fff8e1; color: #e6a200; }
    .neg-status.accepted { background: #e6f9ed; color: #1a8a42; }
    .neg-status.rejected { background: #fce8e6; color: #E92222; }
    .neg-status.countered { background: #e1f5fe; color: #0277bd; }
    .neg-status.withdrawn { background: #F4F5F6; color: #777E90; }
    .neg-details { font-size: 14px; color: #777E90; margin-bottom: 10px; line-height: 1.71; }
    .neg-actions { display: flex; gap: 8px; margin-top: 12px; }

    /* Modal — Modal.module.sass: rgba($n1, 0.3), 16px radius, deep shadow, 0.4s animation */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(20,20,22,0.3); display: flex; align-items: center; justify-content: center; z-index: 999; overflow: auto; padding: 48px; animation: showModal 0.4s forwards; }
    @media (max-width: 767px) { .modal-overlay { padding: 32px 16px; } }
    .modal { background: #FCFCFD; border-radius: 16px; padding: 50px 40px; width: 544px; max-width: 100%; box-shadow: 0px 64px 64px -48px rgba(15,15,15,0.08); position: relative; z-index: 2; animation: fadeIn 0.4s forwards; }
    @media (max-width: 767px) { .modal { padding: 32px 24px; } }
    .modal h3 { font-size: 24px; font-weight: 600; margin-bottom: 20px; color: #141416; }
    .modal .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; flex-wrap: wrap; }

    /* Messages */
    .msg { padding: 12px 16px; border-radius: 12px; margin-bottom: 14px; font-size: 14px; font-weight: 500; }
    .msg.ok { background: #e6f9ed; color: #1a8a42; }
    .msg.err { background: #fce8e6; color: #E92222; }
    .empty { color: #B1B5C3; font-style: italic; margin-top: 8px; font-size: 14px; }
    .beacon-id { font-size: 12px; color: #B1B5C3; word-break: break-all; margin-top: 4px; font-weight: 500; }

    .hidden { display: none !important; }

    /* Sync toggle */
    .sync-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
    .sync-toggle input { display: none; }
    .sync-toggle .toggle-track { width: 36px; height: 20px; border-radius: 10px; background: #E6E8EC; position: relative; transition: background 0.2s; flex-shrink: 0; }
    .sync-toggle input:checked + .toggle-track { background: #EC526F; }
    .sync-toggle .toggle-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
    .sync-toggle input:checked + .toggle-track::after { transform: translateX(16px); }
    .sync-toggle .toggle-label { font-size: 12px; font-weight: 600; color: #777E90; }
    .badge-synced { background: #e8f0fe; color: #1967d2; }

    /* Toast notifications */
    #toast-container { position: fixed; top: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
    .toast { background: #141416; color: #fff; border-radius: 12px; padding: 14px 20px; font-size: 14px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.2); opacity: 0; transform: translateY(-8px); transition: opacity 0.2s, transform 0.2s; min-width: 260px; max-width: 360px; }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast-accepted { border-left: 4px solid #2ecc71; }
    .toast-rejected  { border-left: 4px solid #e74c3c; }
    .toast-countered { border-left: 4px solid #EC526F; }
    .toast-sold { border-left: 4px solid #1a8a42; }

    /* Archive badges */
    .badge-archived-sold { background: #e8eaed; color: #1a8a42; }
    .badge-archived-deleted { background: #fce8e6; color: #E92222; }

    /* PaymentCard — Old Reffo: sticky, 15px radius, soft shadow */
    .payment-card { background: #fff; border-radius: 15px; box-shadow: 0px 35px 46px 0px rgba(0,0,0,0.05); border: 1px solid #E6E8EC; position: sticky; top: 100px; overflow: hidden; }
    .payment-card-header { display: flex; justify-content: space-between; align-items: center; padding: 30px 30px 0; }
    .payment-card-amount { font-size: 24px; font-weight: 700; color: #141416; line-height: 1.2; }
    .payment-card-amount small { font-size: 14px; font-weight: 500; color: #777E90; display: block; margin-top: 4px; }
    .payment-card-thumb { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #F4F5F6; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .payment-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .payment-card-details { background: #F4F5F6; border-radius: 15px; padding: 20px; margin: 20px 30px; }
    .payment-card-detail-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .payment-card-detail-row .label { font-size: 10px; text-transform: uppercase; color: #777E90; letter-spacing: 0.02em; }
    .payment-card-detail-row .value { font-size: 14px; font-weight: 600; color: #23262F; }
    .payment-card-buttons { display: flex; gap: 10px; margin: 20px 30px; }
    .invoice-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 10px; margin: 0 30px; font-size: 14px; color: #23262F; }
    .invoice-row .invoice-label { color: #777E90; }
    .invoice-row .invoice-value { font-weight: 600; }
    .invoice-row-bg { background: #F4F5F6; border-radius: 10px; }
    .payment-card-footer { text-align: center; padding: 15px; margin: 0 30px; color: #777E90; font-size: 12px; }

    /* DealBody — Old Reffo: title, posted by, content, info section */
    .deal-body { max-width: 640px; padding-right: 50px; }
    .deal-title { font-size: 24px; font-weight: 700; color: #141416; margin-bottom: 8px; }
    .deal-posted-by { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #E0E0E0; margin-bottom: 16px; }
    .deal-posted-by .avatar { width: 36px; height: 36px; border-radius: 50%; background: #F4F5F6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .deal-posted-by .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .deal-posted-by .poster-name { font-size: 14px; font-weight: 600; color: #23262F; }
    .deal-posted-by .poster-label { font-size: 12px; color: #777E90; }
    .deal-content { padding: 20px 0; font-size: 16px; color: #353945; line-height: 1.71; white-space: pre-line; }
    .deal-heading { font-weight: 700; font-size: 16px; color: #141416; padding: 40px 0 16px; }
    .info-grid { display: flex; flex-wrap: wrap; gap: 16px; padding: 10px 0; }
    .info-item { display: flex; align-items: center; gap: 12px; width: calc(50% - 8px); cursor: pointer; }
    .info-icon { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s; }
    .info-icon.blue { border: 2px solid #92A5EF; }
    .info-icon.teal { border: 2px solid #8BC5E5; }
    .info-icon.orange { border: 2px solid #FA8F54; }
    .info-icon.green { border: 2px solid #58C27D; }
    .info-item:hover .info-icon { background: #E6E8EC; }
    .info-type { font-size: 14px; font-weight: 500; color: #23262F; }

    /* Old Reffo gradient button */
    .button-gradient { display: inline-flex; justify-content: center; align-items: center; height: 40px; padding: 0 20px; background: linear-gradient(90deg, #8101B4 0%, #EA526F 100%); border-radius: 20px; font-size: 13px; font-weight: 500; color: #FCFCFD; border: none; cursor: pointer; transition: all 0.2s; flex: 1; gap: 6px; font-family: 'Poppins', sans-serif; }
    .button-gradient:hover { background: linear-gradient(90deg, #6e019a 0%, #d44560 100%); }
    /* Old Reffo stroke button */
    .button-stroke { display: inline-flex; justify-content: center; align-items: center; height: 40px; padding: 0 20px; background: none; border-radius: 20px; font-size: 13px; font-weight: 500; color: #23262F; box-shadow: 0 0 0 2px #E6E8EC inset; border: none; cursor: pointer; transition: all 0.2s; gap: 6px; font-family: 'Poppins', sans-serif; }
    .button-stroke:hover { background: #23262F; box-shadow: 0 0 0 2px #23262F inset; color: #FCFCFD; }

    /* Detail header — above gallery */
    .detail-header { margin-bottom: 24px; }
    .detail-header-back {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 14px; font-weight: 600; color: #23262F;
      background: #F4F5F6; border: 1px solid #E6E8EC;
      border-radius: 24px; padding: 8px 16px;
      cursor: pointer; transition: all 0.2s;
      text-decoration: none;
    }
    .detail-header-back:hover { background: #E6E8EC; }
    .detail-header-back svg { flex-shrink: 0; }

    .detail-title-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; margin-top: 16px;
    }
    .detail-title-row h1 {
      font-size: 32px; font-weight: 700; color: #141416; margin: 0; flex: 1;
    }
    .detail-title-actions { display: flex; align-items: center; gap: 8px; }
    .detail-title-actions button {
      width: 40px; height: 40px; border-radius: 50%;
      border: 1px solid #E6E8EC; background: #FCFCFD;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #777E90; transition: all 0.2s;
    }
    .detail-title-actions button:hover { border-color: #141416; color: #141416; }

    .detail-posted-line {
      display: flex; align-items: center; gap: 10px;
      margin-top: 8px; font-size: 14px; color: #777E90;
    }
    .detail-posted-line .avatar-sm {
      width: 28px; height: 28px; border-radius: 50%;
      background: #EC526F; color: #fff; font-size: 12px;
      font-weight: 700; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    }
    .detail-posted-line .poster-name { font-weight: 600; color: #23262F; }
    .detail-posted-line .loc-pin { display: flex; align-items: center; gap: 4px; }

    /* PaymentCard initial-letter avatar */
    .payment-card-thumb.initial-avatar {
      background: #EC526F; color: #fff;
      font-size: 13px; font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }

    /* Edit button at top of payment card */
    .payment-card-edit {
      display: flex; justify-content: flex-end; padding: 12px 30px 0;
    }
    .payment-card-edit button {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 13px; font-weight: 600; color: #EC526F;
      background: none; border: none; cursor: pointer;
      font-family: 'Poppins', sans-serif;
    }
    .payment-card-edit button:hover { text-decoration: underline; }

    @media (max-width: 767px) {
      .deal-body { max-width: 100%; padding-right: 0; }
      .info-item { width: 100%; }
      .payment-card { position: static; }
      .detail-title-row { flex-wrap: wrap; }
      .detail-title-row h1 { font-size: 24px; }
    }

    /* Sold negotiation status */
    .neg-card.sold { border-left-color: #1a8a42; }
    .neg-status.sold { background: #e6f9ed; color: #1a8a42; }

    /* Archived negotiation card */
    .neg-card.archived { border-left-color: #B1B5C3; opacity: 0.75; }
    .neg-archive-actions { display: flex; gap: 8px; margin-top: 12px; }
    .btn-icon-sm { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E6E8EC; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #777E90; transition: all 0.2s; font-size: 12px; padding: 0; }
    .btn-icon-sm:hover { border-color: #141416; color: #141416; }
    .btn-icon-sm.danger:hover { border-color: #E92222; color: #E92222; }

    /* Ref sub-tabs */
    .ref-subtabs { display: flex; gap: 0; margin-bottom: 16px; }
    .ref-subtab { padding: 8px 20px; cursor: pointer; font-size: 13px; font-weight: 700; color: #777E90; border-bottom: 2px solid transparent; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.02em; }
    .ref-subtab.active { color: #EC526F; border-bottom-color: #EC526F; }
    .ref-subtab:hover { color: #EC526F; }

    /* Dashboard layout */
    .dashboard-layout { display: flex; min-height: calc(100dvh - 64px); }
    .sidebar { width: 240px; background: #FCFCFD; border-right: 1px solid #E6E8EC; position: sticky; top: 64px; height: calc(100dvh - 64px); overflow-y: auto; flex-shrink: 0; transition: transform 0.3s; z-index: 90; padding: 16px 0; }
    .sidebar-section-title { padding: 16px 20px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #777E90; }
    .sidebar-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #23262F; cursor: pointer; transition: all 0.15s; border-left: 3px solid transparent; text-decoration: none; font-family: 'Poppins', sans-serif; border-top: none; border-right: none; border-bottom: none; background: none; width: 100%; text-align: left; }
    .sidebar-nav-item:hover { background: rgba(236,82,111,0.03); color: #EC526F; }
    .sidebar-nav-item.active { border-left-color: #EC526F; background: rgba(236,82,111,0.05); color: #EC526F; font-weight: 600; }
    .sidebar-nav-item svg { flex-shrink: 0; width: 18px; height: 18px; }
    .sidebar-divider { height: 1px; background: #E6E8EC; margin: 8px 20px; }
    .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(20,20,22,0.3); z-index: 89; }
    .dashboard-main { flex: 1; min-width: 0; }
    .sidebar-toggle { display: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #E6E8EC; background: #FCFCFD; cursor: pointer; align-items: center; justify-content: center; color: #777E90; transition: all 0.2s; }
    .sidebar-toggle:hover { border-color: #141416; color: #141416; }
    @media (max-width: 768px) {
      .sidebar { position: fixed; top: 64px; left: 0; transform: translateX(-100%); z-index: 91; height: calc(100dvh - 64px); box-shadow: 4px 0 16px rgba(0,0,0,0.1); }
      .sidebar.open { transform: translateX(0); }
      .sidebar-overlay.open { display: block; }
      .sidebar-toggle { display: flex; }
    }

    /* Dashboard stat cards */
    .stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #FCFCFD; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(15,15,15,0.06); transition: transform 0.2s; }
    .stat-card:hover { transform: translateY(-2px); }
    .stat-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .stat-icon.pink { background: rgba(236,82,111,0.1); color: #EC526F; }
    .stat-icon.green { background: rgba(26,138,66,0.1); color: #1a8a42; }
    .stat-icon.amber { background: rgba(230,162,0,0.1); color: #e6a200; }
    .stat-icon.blue { background: rgba(26,106,186,0.1); color: #1a6aba; }
    .stat-value { font-size: 28px; font-weight: 700; color: #23262F; line-height: 1.2; }
    .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #777E90; margin-top: 4px; }
    @media (max-width: 768px) { .stat-cards { grid-template-columns: repeat(2, 1fr); } #tab-dashboard > div:last-child { grid-template-columns: 1fr !important; } }
    @media (max-width: 480px) { .stat-cards { grid-template-columns: 1fr; } }

    /* Dashboard quick actions */
    .quick-actions { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }

    /* AI Quick Start */
    .ai-quickstart-card { background: #FCFCFD; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(15,15,15,0.06); margin-bottom: 24px; border-top: 3px solid; border-image: linear-gradient(90deg, #8101B4, #EA526F) 1; }
    .ai-quickstart-card h3 { font-size: 16px; font-weight: 700; color: #141416; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
    .ai-quickstart-card .ai-qs-sub { font-size: 13px; color: #777E90; margin-bottom: 16px; }
    .ai-quickstart-prompt { position: relative; background: #F4F5F6; border-radius: 12px; padding: 16px 48px 16px 16px; margin-bottom: 16px; }
    .ai-quickstart-prompt pre { margin: 0; font-size: 13px; color: #23262F; white-space: pre-wrap; word-break: break-word; font-family: 'Courier New', monospace; line-height: 1.6; }
    .ai-quickstart-copy-btn { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E6E8EC; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #777E90; transition: all 0.2s; }
    .ai-quickstart-copy-btn:hover { border-color: #141416; color: #141416; }
    .ai-quickstart-llm-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .ai-quickstart-llm-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: 8px; border: 1px solid #E6E8EC; background: #FCFCFD; font-size: 13px; font-weight: 500; color: #23262F; cursor: pointer; transition: all 0.2s; font-family: 'Poppins', sans-serif; }
    .ai-quickstart-llm-btn:hover { border-color: #EC526F; color: #EC526F; }
    .ai-quickstart-llm-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
    .ai-quickstart-sidebar-card { margin: 16px 16px 8px; padding: 12px; border-radius: 12px; border: 1px solid rgba(236,82,111,0.2); background: linear-gradient(135deg, rgba(236,82,111,0.04), rgba(129,1,180,0.04)); cursor: pointer; transition: all 0.2s; }
    .ai-quickstart-sidebar-card:hover { border-color: rgba(236,82,111,0.4); box-shadow: 0 2px 8px rgba(236,82,111,0.08); }
    .ai-quickstart-sidebar-card .qs-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #23262F; margin-bottom: 2px; }
    .ai-quickstart-sidebar-card .qs-sub { font-size: 11px; color: #777E90; }
    .ai-quickstart-modal { display: none; position: fixed; inset: 0; z-index: 999; background: rgba(20,20,22,0.5); backdrop-filter: blur(2px); justify-content: center; align-items: center; }
    .ai-quickstart-modal.open { display: flex; }
    .ai-quickstart-modal-inner { background: #FCFCFD; border-radius: 20px; max-width: 520px; width: calc(100% - 32px); padding: 28px; position: relative; box-shadow: 0 24px 48px rgba(15,15,15,0.16); animation: showModal 0.2s ease; max-height: 90vh; overflow-y: auto; }
    .ai-quickstart-modal-inner .modal-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E6E8EC; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #777E90; transition: all 0.2s; }
    .ai-quickstart-modal-inner .modal-close:hover { border-color: #141416; color: #141416; }
    .ai-quickstart-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #23262F; color: #FCFCFD; font-size: 13px; font-weight: 500; padding: 10px 24px; border-radius: 24px; box-shadow: 0 8px 24px rgba(15,15,15,0.2); z-index: 1000; opacity: 0; transition: opacity 0.3s; pointer-events: none; font-family: 'Poppins', sans-serif; }
    .ai-quickstart-toast.show { opacity: 1; }

    /* Dashboard recent list */
    .recent-list { background: #FCFCFD; border-radius: 16px; box-shadow: 0 4px 16px rgba(15,15,15,0.06); overflow: hidden; margin-bottom: 24px; }
    .recent-list-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E6E8EC; }
    .recent-list-header h3 { font-size: 14px; font-weight: 700; color: #141416; margin: 0; }
    .recent-list-header a { font-size: 12px; font-weight: 600; color: #EC526F; cursor: pointer; text-decoration: none; }
    .recent-list-row { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #F4F5F6; transition: background 0.15s; cursor: pointer; }
    .recent-list-row:last-child { border-bottom: none; }
    .recent-list-row:hover { background: rgba(236,82,111,0.02); }
    .recent-list-row .row-img { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: #F4F5F6; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .recent-list-row .row-img img { width: 100%; height: 100%; object-fit: cover; }
    .recent-list-row .row-info { flex: 1; min-width: 0; }
    .recent-list-row .row-info .row-name { font-size: 13px; font-weight: 600; color: #141416; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .recent-list-row .row-info .row-sub { font-size: 11px; color: #777E90; }
    .recent-list-row .row-badge { flex-shrink: 0; }
    .recent-list-row .row-date { font-size: 11px; color: #777E90; flex-shrink: 0; }

    /* Table layout for refs */
    .table-header-row { display: flex; align-items: center; padding: 8px 16px; background: #F4F5F6; border-radius: 12px 12px 0 0; border-bottom: 1px solid #E6E8EC; position: sticky; top: 0; z-index: 1; }
    .table-header-row span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #777E90; cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .table-header-row span:hover { color: #23262F; }
    .table-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #E6E8EC; background: #FCFCFD; transition: background 0.15s; cursor: pointer; }
    .table-row:nth-child(even) { background: #F9FAFB; }
    .table-row:hover { background: rgba(236,82,111,0.03); }
    .table-row .col-check { width: 32px; flex-shrink: 0; display: flex; align-items: center; }
    .table-row .col-check input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: #EC526F; margin: 0; padding: 0; border-radius: 4px; }
    .table-header-row .col-check { width: 32px; flex-shrink: 0; }
    .table-row .col-img { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; background: #F4F5F6; flex-shrink: 0; margin-right: 12px; display: flex; align-items: center; justify-content: center; }
    .table-row .col-img img { width: 100%; height: 100%; object-fit: cover; }
    .table-row .col-name { flex: 1; min-width: 0; }
    .table-row .col-name .name { font-size: 14px; font-weight: 600; color: #141416; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .table-row .col-name .cat { font-size: 12px; color: #777E90; }
    .table-row .col-status { width: 100px; flex-shrink: 0; }
    .table-row .col-price { width: 90px; flex-shrink: 0; text-align: right; font-size: 14px; font-weight: 700; color: #1a8a42; }
    .table-row .col-qty { width: 50px; flex-shrink: 0; text-align: center; font-size: 12px; color: #777E90; }
    .table-row .col-date { width: 90px; flex-shrink: 0; font-size: 12px; color: #777E90; text-align: right; }
    .table-row .col-actions { width: 80px; flex-shrink: 0; display: flex; gap: 4px; justify-content: flex-end; }
    .table-row .col-actions button { width: 28px; height: 28px; border: none; background: none; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #777E90; transition: all 0.15s; }
    .table-row .col-actions button:hover { background: #F4F5F6; color: #23262F; }
    .table-row .col-actions button.del:hover { background: #fce8e6; color: #E92222; }
    @media (max-width: 768px) { .table-row .col-qty, .table-row .col-date, .table-header-row .col-qty, .table-header-row .col-date { display: none; } }

    /* Bulk action sidebar */
    .refs-with-sidebar { display: flex; gap: 24px; }
    .refs-main-col { flex: 1; min-width: 0; }
    .bulk-action-sidebar { width: 200px; flex-shrink: 0; display: none; }
    .bulk-action-sidebar.show { display: block; }
    .bulk-action-sidebar-inner { position: sticky; top: 88px; background: #FCFCFD; border-radius: 16px; padding: 20px; box-shadow: 0 4px 16px rgba(15,15,15,0.06); }
    .bulk-action-sidebar-inner .bulk-count-label { font-size: 14px; font-weight: 700; color: #23262F; margin-bottom: 16px; }
    .bulk-action-sidebar-inner .bulk-divider { height: 1px; background: #E6E8EC; margin: 8px 0; }
    .bulk-action-sidebar-inner button { display: block; width: 100%; height: 36px; padding: 0 14px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; border: none; margin-bottom: 6px; text-align: left; transition: opacity 0.15s; }
    .bulk-action-sidebar-inner button:hover { opacity: 0.85; }
    .bulk-action-sidebar-inner .bulk-cancel { background: transparent; color: #777E90; border: 1px solid #E6E8EC; text-align: center; }
    @media (max-width: 1024px) {
      .refs-with-sidebar { flex-direction: column; }
      .bulk-action-sidebar { width: 100%; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; }
      .bulk-action-sidebar-inner { position: static; border-radius: 0; border-top: 1px solid #E6E8EC; box-shadow: 0 -4px 24px rgba(15,15,15,0.10); display: flex; align-items: center; gap: 10px; padding: 12px 20px; flex-wrap: wrap; }
      .bulk-action-sidebar-inner .bulk-count-label { margin-bottom: 0; margin-right: 4px; white-space: nowrap; }
      .bulk-action-sidebar-inner .bulk-divider { display: none; }
      .bulk-action-sidebar-inner button { display: inline-block; width: auto; margin-bottom: 0; text-align: center; }
    }
    /* Checkbox normalization */
    input[type="checkbox"] { -webkit-appearance: checkbox; appearance: checkbox; width: 16px; height: 16px; cursor: pointer; accent-color: #EC526F; border-radius: 3px; }

    /* Archive card actions */
    .archive-actions { display: flex; gap: 8px; margin-top: 12px; }
    .archive-reason { font-size: 12px; color: #777E90; font-weight: 500; margin-top: 4px; }

    /* Ref group rows */
    .neg-group-row { background: #FCFCFD; border-radius: 16px; padding: 16px 24px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    .neg-group-row:hover { transform: translateY(-1px); box-shadow: 0 16px 40px -8px rgba(15,15,15,0.18); }
    .neg-group-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .neg-group-name { font-weight: 700; font-size: 16px; color: #141416; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .neg-group-count { display: inline-block; background: #E6E8EC; color: #353945; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 10px; flex-shrink: 0; }
    .neg-group-count.has-pending { background: #fff8e1; color: #e6a200; }
    .neg-group-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .neg-group-date { font-size: 12px; color: #777E90; font-weight: 500; }
    .neg-group-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #EC526F; cursor: pointer; margin-bottom: 16px; font-weight: 600; transition: color 0.2s; }
    .neg-group-back:hover { color: #DD436C; }

    /* Footer */
    .app-footer { border-top: 1px solid #E6E8EC; background: #FCFCFD; padding: 0; }
    .app-footer-inner { max-width: 1100px; margin: 0 auto; padding: 48px 24px; }
    .app-footer-grid { display: grid; grid-template-columns: 140px 1fr 1fr 1fr; gap: 40px; }
    .app-footer-brand { display: flex; flex-direction: column; gap: 16px; }
    .app-footer-brand img { height: 40px; width: auto; object-fit: contain; }
    .app-footer-nav { display: flex; flex-direction: column; gap: 16px; }
    .app-footer-nav a { color: #EA526F; text-decoration: none; font-size: 14px; font-weight: 500; transition: opacity 0.2s; }
    .app-footer-nav a:hover { opacity: 0.8; }
    .app-footer-col { border-left: 1px solid #E6E8EC; padding-left: 32px; display: flex; flex-direction: column; gap: 12px; }
    .app-footer-col-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #141416; }
    .app-footer-col a { color: #EA526F; text-decoration: none; font-size: 14px; transition: opacity 0.2s; }
    .app-footer-col a:hover { opacity: 0.8; }
    .app-footer-col .col-text { font-size: 14px; color: #23262F; }
    .app-footer-col .col-desc { font-size: 14px; color: #777E90; line-height: 1.5; }
    .app-footer-col input { height: 44px; padding: 0 16px; border: 1px solid #E6E8EC; border-radius: 22px; font-size: 13px; font-family: 'Poppins', sans-serif; font-weight: 500; color: #23262F; background: #FCFCFD; outline: none; width: 100%; margin-bottom: 0; }
    .app-footer-col input:focus { border-color: #EA526F; }
    .footer-download-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 40px; padding: 0 20px; background: linear-gradient(90deg, #8101B4 0%, #EA526F 100%); border: none; border-radius: 20px; font-size: 13px; font-weight: 500; color: #FCFCFD !important; cursor: pointer; font-family: 'Poppins', sans-serif; transition: opacity 0.2s; align-self: flex-start; }
    .footer-download-btn:hover { opacity: 0.9; color: #FCFCFD !important; }
    .app-footer-bar { border-top: 1px solid #E6E8EC; }
    .app-footer-bar-inner { max-width: 1100px; margin: 0 auto; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
    .app-footer-copy { font-size: 12px; color: #777E90; }
    .app-footer-social { display: flex; align-items: center; gap: 20px; }
    .app-footer-social a { color: #777E90; transition: color 0.2s; display: flex; }
    .app-footer-social a:hover { color: #141416; }
    @media (max-width: 768px) {
      .app-footer-grid { grid-template-columns: 1fr; gap: 32px; }
      .app-footer-col { border-left: none; padding-left: 0; border-top: 1px solid #E6E8EC; padding-top: 24px; }
      .app-footer-bar-inner { flex-direction: column; text-align: center; gap: 12px; }
    }
    /* Lightbox */
    .lightbox-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; }
    .lightbox-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; flex-shrink: 0; }
    .lightbox-counter { color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500; }
    .lightbox-close { width: 40px; height: 40px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: rgba(255,255,255,0.8); transition: all 0.2s; }
    .lightbox-close:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .lightbox-body { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; min-height: 0; padding: 0 64px; }
    .lightbox-img { max-height: calc(100vh - 160px); max-width: 100%; object-fit: contain; user-select: none; }
    .lightbox-prev, .lightbox-next { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: rgba(255,255,255,0.7); transition: all 0.2s; }
    .lightbox-prev:hover, .lightbox-next:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .lightbox-prev { left: 8px; }
    .lightbox-next { right: 8px; }
    .lightbox-thumbs { flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; overflow-x: auto; }
    .lightbox-thumb { width: 56px; height: 56px; border-radius: 8px; overflow: hidden; cursor: pointer; padding: 0; border: 2px solid transparent; opacity: 0.5; transition: all 0.2s; background: none; flex-shrink: 0; }
    .lightbox-thumb.active { border-color: #fff; opacity: 1; }
    .lightbox-thumb img { width: 100%; height: 100%; object-fit: cover; }

    /* ===== Home / Landing Page ===== */
    .home-hero { background: linear-gradient(135deg, rgba(129,1,180,0.55) 0%, rgba(234,82,111,0.6) 100%); background-color: #7b2d8e; padding: 64px 24px 56px; text-align: center; color: #fff; border-radius: 20px; margin: 0 0 8px; position: relative; overflow: hidden; }
    @media (max-width: 767px) { .home-hero { border-radius: 16px; } }
    .home-hero h2 { font-size: clamp(1.75rem, 4vw, 3rem); font-weight: 700; margin: 0 0 12px; color: #fff; line-height: 1.15; letter-spacing: -0.01em; text-transform: none; }
    .home-hero p { color: rgba(255,255,255,0.82); font-size: clamp(0.95rem, 1.5vw, 1.125rem); margin: 0 0 32px; max-width: 520px; margin-left: auto; margin-right: auto; line-height: 1.6; }
    .home-hero .search-filter-bar { max-width: 660px; margin: 0 auto; }
    .home-hero .mobile-search-pill { max-width: 660px; margin: 0 auto; }
    .home-section { max-width: 1100px; padding: 40px 24px; }
    .home-section-label { text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #777E90; margin-bottom: 4px; }
    .home-section h3 { font-size: 1.35rem; font-weight: 700; margin: 0 0 24px; }
    .home-quick-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; padding: 0 24px 8px; }
    .home-recent-grid { display: flex; gap: 16px; overflow: hidden; }
    .home-recent-grid .home-recent-card { min-width: 200px; max-width: 260px; flex: 1 1 0; }
    .home-recent-card { background: var(--surface); border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
    .home-recent-card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.10); }
    .home-recent-card img { width: 100%; height: 140px; object-fit: cover; display: block; }
    .home-recent-card .card-body { padding: 12px 14px; }
    .home-recent-card .card-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .home-recent-card .card-meta { font-size: 12px; color: #777E90; margin-top: 4px; }
    .home-recent-card .card-price { font-weight: 600; font-size: 14px; color: #EC526F; margin-top: 6px; }
    .home-recent-empty { text-align: center; padding: 48px 24px; color: #777E90; }
    .home-recent-empty p { margin: 0 0 16px; font-size: 14px; }
    @media (max-width: 767px) { .home-hero { padding: 48px 16px 40px; } }

  </style>
</head>
<body>
  <!-- App Header -->
  <div class="app-header">
    <div class="app-header-inner">
      <div class="app-header-logo" onclick="sidebarNav('home')">
        <span style="font-size:1.25rem;font-weight:700;color:#141416;">Pelagora</span>
      </div>

      <!-- Header actions: link + bell + avatar -->
      <div class="app-header-actions">
        <button class="sidebar-toggle" id="sidebarToggle" onclick="toggleSidebar()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
        </button>
        <button class="header-link-btn" id="headerLinkBtn" style="display:none;" onclick="switchTab('settings')" title="Connect to Reffo.ai">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          Link to Reffo.ai
        </button>
        <button class="header-settings-btn" onclick="switchTab('inbox')" title="Inbox">
          <svg width="18" height="18" viewBox="0 0 18 19" fill="none"><path d="M17.97 15.02c0 .24-.09.46-.26.63-.16.17-.39.26-.62.26H.85c-.23-.01-.45-.1-.61-.27a.87.87 0 010-1.23c.16-.16.38-.26.61-.27h.02V7.98c.02-2.13.88-4.17 2.4-5.67C4.79.82 6.84-.02 8.97 0c2.13-.02 4.18.82 5.7 2.31 1.52 1.5 2.38 3.5 2.4 5.67v6.16h.02c.23 0 .46.09.62.26.17.17.26.39.26.62zM2.67 14.14h12.6V7.98c0-1.67-.66-3.27-1.85-4.45-1.18-1.18-2.78-1.85-4.45-1.85s-3.27.67-4.45 1.85C3.33 4.71 2.67 6.31 2.67 7.98v6.16zm4.28 3.62c-.25-.5.22-.97.77-.97h2.5c.55 0 1.02.47.77.97-.11.22-.26.42-.43.6-.43.41-1 .65-1.6.65-.59 0-1.16-.24-1.59-.65-.18-.17-.32-.38-.43-.6z" fill="currentColor"/></svg>
          <span class="notif-dot" id="headerNotifDot"></span>
        </button>
        <div style="position:relative;" id="avatarContainer">
          <button class="header-avatar" onclick="toggleAvatarDropdown()" title="Menu" id="avatarBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <div class="avatar-dropdown" id="avatarDropdown">
            <div class="dd-header">
              <div class="dd-header-name" id="ddBeaconName">My Beacon</div>
              <div class="dd-header-sub" id="ddBeaconSub">Local Node</div>
            </div>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('refs');">My Refs</button>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('inbox');">Inbox</button>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('settings');">Settings</button>
            <div class="dd-divider"></div>
            <a class="dd-item" href="https://reffo.ai/about" target="_blank" rel="noopener noreferrer">About</a>
            <a class="dd-item" href="https://reffo.ai/docs" target="_blank" rel="noopener noreferrer">Docs</a>
            <a class="dd-item" href="https://reffo.ai/agents" target="_blank" rel="noopener noreferrer">AI Agents</a>
            <a class="dd-item" href="https://reffo.ai/skills" target="_blank" rel="noopener noreferrer">Skills</a>
            <a class="dd-item" href="https://reffo.ai/support?source=beacon" target="_blank" rel="noopener noreferrer">Support</a>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('for-bots');">&#x1F916; For Bots</button>
            <div class="dd-divider"></div>
            <div class="dd-label">Legal</div>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('terms');">Terms of Service</button>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('privacy');">Privacy Policy</button>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('acceptable-use');">Acceptable Use</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="app-content">
  <div class="dashboard-layout">
  <aside class="sidebar" id="sidebar">
    <div class="ai-quickstart-sidebar-card" onclick="openAiQuickStartModal()">
      <div class="qs-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EC526F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        AI Quick Start
      </div>
      <div class="qs-sub">Get help from any AI assistant</div>
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-title">Manage</div>
    <button class="sidebar-nav-item active" data-sidebar="home" onclick="sidebarNav('home')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      Home
    </button>
    <button class="sidebar-nav-item" data-sidebar="dashboard" onclick="sidebarNav('dashboard')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      Dashboard
    </button>
    <button class="sidebar-nav-item" data-sidebar="refs" onclick="sidebarNav('refs')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      My Listings
    </button>
    <button class="sidebar-nav-item" data-sidebar="scan" onclick="sidebarNav('scan')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      Scan Items
    </button>
    <button class="sidebar-nav-item" data-sidebar="collections" onclick="sidebarNav('collections')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
      Collections
    </button>
    <button class="sidebar-nav-item" data-sidebar="archive" onclick="sidebarNav('archive')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
      Archived
    </button>
    <button class="sidebar-nav-item" data-sidebar="favorites" onclick="sidebarNav('favorites')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      Favorites
    </button>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-title">Activity</div>
    <button class="sidebar-nav-item" data-sidebar="inbox" onclick="sidebarNav('inbox')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      Inbox
      <span id="sidebarInboxDot" class="sidebar-notif-dot"></span>
    </button>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-title">Actions</div>
    <button class="sidebar-nav-item" data-sidebar="list" onclick="sidebarNav('list')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Create New Listing
    </button>
    <button class="sidebar-nav-item" data-sidebar="search" onclick="sidebarNav('search'); executeHeaderSearch();">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Search Network
    </button>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-title">Settings</div>
    <button class="sidebar-nav-item" data-sidebar="settings" onclick="sidebarNav('settings')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      Settings
    </button>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-title">Links</div>
    <a class="sidebar-nav-item" href="https://reffo.ai/docs" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Help & Docs
    </a>
    <a class="sidebar-nav-item" href="https://reffo.ai/about" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      About Reffo
    </a>
  </aside>
  <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
  <div class="dashboard-main">
  <div class="container">
    <!-- Search Filter Bar (global / network search) -->
    <div style="margin-bottom:24px;" id="globalSearchBarWrapper">
      <!-- Desktop: full pill bar -->
      <div class="search-filter-bar" id="searchFilterBar">
        <div class="search-filter-segment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <input id="headerSearchLoc" placeholder="Search where?" onkeydown="if(event.key==='Enter')executeHeaderSearch()">
        </div>
        <span class="sfb-divider"></span>
        <div class="search-filter-segment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <select id="headerSearchCat"><option value="">All Categories</option></select>
        </div>
        <span class="sfb-divider"></span>
        <div class="search-filter-segment" style="flex:1;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="headerSearchQ" placeholder="Search Ref..." onkeydown="if(event.key==='Enter')executeHeaderSearch()">
        </div>
        <button class="sfb-search-btn" onclick="executeHeaderSearch()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
      </div>

      <!-- Mobile: collapsed pill -->
      <div class="mobile-search-pill" id="mobileSearchPill" onclick="expandMobileSearch()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <div class="pill-text">
          <div class="pill-title" id="mobileSearchTitle">Search items...</div>
          <div class="pill-sub" id="mobileSearchSub">All categories &middot; Anywhere</div>
        </div>
        <div class="pill-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
      </div>

      <!-- Mobile: expanded panel -->
      <div class="mobile-search-expanded" id="mobileSearchExpanded">
        <div class="expand-inner">
          <div class="expand-card">
            <div class="expand-field">
              <label>Search</label>
              <div class="expand-field-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input id="mobileSearchQ" placeholder="What are you looking for?" onkeydown="if(event.key==='Enter'){executeHeaderSearch();collapseMobileSearch();}">
              </div>
            </div>
            <div class="expand-field">
              <label>Category</label>
              <div class="expand-field-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                <select id="mobileSearchCat"><option value="">All Categories</option></select>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div class="expand-field">
              <label>Where</label>
              <div class="expand-field-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <input id="mobileSearchLoc" placeholder="City, state, or zip" onkeydown="if(event.key==='Enter'){executeHeaderSearch();collapseMobileSearch();}">
              </div>
            </div>
            <div class="expand-actions">
              <button class="expand-cancel" onclick="collapseMobileSearch()">Cancel</button>
              <button class="expand-submit" onclick="executeHeaderSearch();collapseMobileSearch();">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Home Tab -->
    <div id="tab-home">
      <!-- Hero -->
      <div class="home-hero">
        <h2>Your node on the Pelagora network</h2>
        <p>List items, search the network, and trade directly &mdash; zero fees, your data stays local.</p>

        <!-- Desktop search -->
        <div class="search-filter-bar" id="homeSearchBar">
          <div class="search-filter-segment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <input id="homeSearchLoc" placeholder="Search where?" onkeydown="if(event.key==='Enter')homeSearchSubmit()">
          </div>
          <span class="sfb-divider"></span>
          <div class="search-filter-segment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <select id="homeSearchCat"><option value="">All Categories</option></select>
          </div>
          <span class="sfb-divider"></span>
          <div class="search-filter-segment" style="flex:1;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="homeSearchQ" placeholder="Search Ref..." onkeydown="if(event.key==='Enter')homeSearchSubmit()">
          </div>
          <button class="sfb-search-btn" onclick="homeSearchSubmit()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>

        <!-- Mobile search pill -->
        <div class="mobile-search-pill" id="homeSearchPillMobile" onclick="expandHomeMobileSearch()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <div class="pill-text">
            <div class="pill-title">Search items...</div>
            <div class="pill-sub">All categories &middot; Anywhere</div>
          </div>
          <div class="pill-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
        </div>

        <!-- Mobile expanded panel -->
        <div class="mobile-search-expanded" id="homeSearchExpandedMobile">
          <div class="expand-inner">
            <div class="expand-card">
              <div class="expand-field">
                <label>Search</label>
                <div class="expand-field-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input id="homeSearchQMobile" placeholder="What are you looking for?" onkeydown="if(event.key==='Enter'){homeSearchSubmit();collapseHomeMobileSearch();}">
                </div>
              </div>
              <div class="expand-field">
                <label>Category</label>
                <div class="expand-field-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  <select id="homeSearchCatMobile"><option value="">All Categories</option></select>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div class="expand-field">
                <label>Where</label>
                <div class="expand-field-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <input id="homeSearchLocMobile" placeholder="City, state, or zip" onkeydown="if(event.key==='Enter'){homeSearchSubmit();collapseHomeMobileSearch();}">
                </div>
              </div>
              <div class="expand-actions">
                <button class="expand-cancel" onclick="collapseHomeMobileSearch()">Cancel</button>
                <button class="expand-submit" onclick="homeSearchSubmit();collapseHomeMobileSearch();">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="home-quick-actions" style="padding-top:28px;padding-bottom:8px;">
        <button class="btn-primary" onclick="sidebarNav('list')">+ Create New Listing</button>
        <button class="btn-secondary" onclick="sidebarNav('scan')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          Scan to List
        </button>
        <button class="btn-secondary" onclick="sidebarNav('dashboard')">Go to Dashboard</button>
      </div>

      <!-- Your Listings -->
      <div class="home-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="margin:0;">Your Listings</h3>
          <a style="font-size:13px;color:#EC526F;cursor:pointer;font-weight:500;" onclick="sidebarNav('refs')">View all &rarr;</a>
        </div>
        <div id="homeRecentItems">
          <div style="padding:20px;color:#777E90;font-size:13px;">Loading...</div>
        </div>
      </div>


    </div>

    <!-- Dashboard Tab -->
    <div id="tab-dashboard">
      <div class="stat-cards" id="dashboardStats">
        <div class="stat-card">
          <div class="stat-icon pink"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
          <div class="stat-value" id="statTotalListed">--</div>
          <div class="stat-label">Total Listed</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-8 8"/><path d="M8 8h8v8"/></svg></div>
          <div class="stat-value" id="statActiveOffers">--</div>
          <div class="stat-label">Active Offers</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
          <div class="stat-value" id="statPendingNegs">--</div>
          <div class="stat-label">Pending Negotiations</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div>
          <div class="stat-value" id="statFavorites">--</div>
          <div class="stat-label">Favorites</div>
        </div>
      </div>

      <div class="quick-actions">
        <button class="btn-primary" onclick="sidebarNav('list')">+ Create New Listing</button>
        <button class="btn-secondary" onclick="sidebarNav('scan')">Scan to List</button>
        <button class="btn-secondary" onclick="sidebarNav('search'); executeHeaderSearch();">Search Network</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div class="ai-quickstart-card" style="grid-column:1/-1;padding:16px 20px;">
          <h3 style="font-size:14px;margin-bottom:2px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EC526F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Get Started with AI
          </h3>
          <div class="ai-qs-sub" style="margin-bottom:10px;font-size:12px;">Copy this prompt into any AI assistant to learn about Reffo and get help creating listings.</div>
          <div class="ai-quickstart-prompt" style="padding:12px 40px 12px 12px;margin-bottom:10px;">
            <pre id="aiPromptText" style="font-size:12px;line-height:1.5;"></pre>
            <button class="ai-quickstart-copy-btn" onclick="copyAiPrompt()" title="Copy prompt" style="top:8px;right:8px;width:28px;height:28px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <div class="ai-quickstart-llm-buttons">
            <button class="ai-quickstart-llm-btn" style="height:32px;font-size:12px;padding:0 12px;" onclick="openWithLlm('perplexity')">Perplexity</button>
            <button class="ai-quickstart-llm-btn" style="height:32px;font-size:12px;padding:0 12px;" onclick="openWithLlm('claude')">Claude</button>
            <button class="ai-quickstart-llm-btn" style="height:32px;font-size:12px;padding:0 12px;" onclick="openWithLlm('chatgpt')">ChatGPT</button>
            <button class="ai-quickstart-llm-btn" style="height:32px;font-size:12px;padding:0 12px;" onclick="openWithLlm('gemini')">Gemini</button>
            <button class="ai-quickstart-llm-btn" style="height:32px;font-size:12px;padding:0 12px;" onclick="openWithLlm('grok')">Grok</button>
            <button class="ai-quickstart-llm-btn" style="height:32px;font-size:12px;padding:0 12px;" onclick="copyAiPrompt()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy prompt
            </button>
          </div>
        </div>
        <div class="recent-list" id="dashboardRecentItems">
          <div class="recent-list-header">
            <h3>Recent Listings</h3>
            <a onclick="sidebarNav('refs')">View all</a>
          </div>
          <div id="recentItemsList"><div style="padding:20px;color:#777E90;font-size:13px;">Loading...</div></div>
        </div>
        <div class="recent-list" id="dashboardRecentOffers">
          <div class="recent-list-header">
            <h3>Recent Offers</h3>
            <a onclick="sidebarNav('inbox')">View all</a>
          </div>
          <div id="recentOffersList"><div style="padding:20px;color:#777E90;font-size:13px;">Loading...</div></div>
        </div>
      </div>
    </div>

    <!-- Refs Tab -->
    <div id="tab-refs" class="hidden">
      <div class="ref-subtabs">
        <div class="ref-subtab active" data-reftab="active" onclick="switchRefSubTab('active')">Active</div>
        <div class="ref-subtab" data-reftab="archive" onclick="switchRefSubTab('archive')">Archive</div>
        <div class="ref-subtab" data-reftab="favorites" onclick="switchRefSubTab('favorites')">Favorites</div>
      </div>

      <div id="refSubtabActive">
      <section>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;border:none;padding:0;">My Refs</h2>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="layout-toggle">
              <button id="layoutTableBtn" onclick="setRefLayout('table')" title="Table view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
              </button>
              <button id="layoutRowBtn" class="active" onclick="setRefLayout('row')" title="Row view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></svg>
              </button>
              <button id="layoutCardBtn" onclick="setRefLayout('card')" title="Card view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </button>
            </div>
            <button class="btn-primary btn-sm" onclick="openListRefModal()">+ New Ref</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;height:44px;padding:0 14px;border-radius:24px;background:#fff;border:1px solid #E6E8EC;flex:0 0 240px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="refLocalSearch" type="text" placeholder="Search my items..." oninput="applyRefLocalFilter()" style="border:none;outline:none;background:transparent;font-size:14px;font-family:'Poppins',sans-serif;color:#23262F;flex:1;min-width:0;line-height:44px;padding:0;margin:0;">
          </div>
          <select id="refLocalCategory" onchange="applyRefLocalFilter()" style="height:44px;padding:0 14px;border-radius:24px;background:#fff;border:1px solid #E6E8EC;font-size:14px;font-family:'Poppins',sans-serif;color:#23262F;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.04);-webkit-appearance:none;appearance:none;padding-right:32px;background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23777E90%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>');background-repeat:no-repeat;background-position:right 12px center;">
            <option value="">All Categories</option>
          </select>
          <select id="refLocalSort" onchange="applyRefLocalFilter()" style="height:44px;padding:0 14px;border-radius:24px;background:#fff;border:1px solid #E6E8EC;font-size:14px;font-family:'Poppins',sans-serif;color:#23262F;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.04);-webkit-appearance:none;appearance:none;padding-right:32px;background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23777E90%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>');background-repeat:no-repeat;background-position:right 12px center;">
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>
        <div class="refs-with-sidebar">
          <div class="refs-main-col">
            <div id="myRefs"><p class="empty">Loading...</p></div>
          </div>
          <div class="bulk-action-sidebar" id="bulkActionSidebar">
            <div class="bulk-action-sidebar-inner">
              <div class="bulk-count-label"><span id="bulkCount">0</span> selected</div>
              <button style="background:#E6E8EC;color:#353945;" onclick="bulkSetStatus('private')">Set Private</button>
              <button style="background:#e6f9ed;color:#1a8a42;" onclick="bulkSetStatus('for_sale')">Set For Sale</button>
              <button style="background:#fff8e1;color:#e6a200;" onclick="bulkSetStatus('willing_to_sell')">Set Willing to Sell</button>
              <div class="bulk-divider"></div>
              <button style="background:#eee8f7;color:#8101B4;" onclick="bulkMoveToCollection()">Move to Collection</button>
              <div class="bulk-divider"></div>
              <button style="background:#E92222;color:#fff;" onclick="bulkArchive()">Archive</button>
              <button style="background:#E92222;color:#fff;" onclick="bulkDelete()">Delete</button>
              <button class="bulk-cancel" onclick="clearSelection()">Cancel</button>
            </div>
          </div>
        </div>
      </section>
      </div>

      <div id="refSubtabArchive" class="hidden">
      <section>
        <h2>Archived Refs</h2>
        <div class="refs-with-sidebar">
          <div class="refs-main-col">
            <div id="archivedRefs"><p class="empty">No archived refs</p></div>
          </div>
          <div class="bulk-action-sidebar" id="archiveBulkSidebar">
            <div class="bulk-action-sidebar-inner">
              <div class="bulk-count-label"><span id="archiveBulkCount">0</span> selected</div>
              <button style="background:#e6f9ed;color:#1a8a42;" onclick="bulkRestoreArchived()">Restore</button>
              <div class="bulk-divider"></div>
              <button style="background:#E92222;color:#fff;" onclick="bulkDeleteForeverArchived()">Delete Forever</button>
              <button class="bulk-cancel" onclick="clearArchiveSelection()">Cancel</button>
            </div>
          </div>
        </div>
      </section>
      </div>

      <div id="refSubtabFavorites" class="hidden">
      <section>
        <h2>Favorite Refs</h2>
        <div class="refs-with-sidebar">
          <div class="refs-main-col">
            <div id="favoriteRefs"><p class="empty">No favorites yet. Search for items and click the heart to save them.</p></div>
          </div>
          <div class="bulk-action-sidebar" id="favBulkSidebar">
            <div class="bulk-action-sidebar-inner">
              <div class="bulk-count-label"><span id="favBulkCount">0</span> selected</div>
              <button style="background:#fce8e6;color:#E92222;" onclick="bulkUnfavorite()">Unfavorite</button>
              <button class="bulk-cancel" onclick="clearFavSelection()">Cancel</button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>

    <!-- Scan Items Tab -->
    <div id="tab-scan" class="hidden">
      <section>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;border:none;padding:0;">Scan Items</h2>
        </div>
        <p style="color:#777E90;font-size:13px;margin-bottom:20px;">Upload a photo to automatically detect and identify items using AI. Detected items can be reviewed, edited, and confirmed into listings.</p>

        <!-- Upload zone -->
        <div id="scanUploadZone" style="border:2px dashed #E6E8EC;border-radius:16px;padding:40px;text-align:center;cursor:pointer;transition:all 0.2s;margin-bottom:24px;background:#FCFCFD;" ondragover="event.preventDefault();this.style.borderColor='#EC526F';this.style.background='rgba(236,82,111,0.03)';" ondragleave="this.style.borderColor='#E6E8EC';this.style.background='#FCFCFD';" ondrop="handleScanDrop(event)" onclick="document.getElementById('scanFileInput').click()">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          <div style="font-size:15px;font-weight:600;color:#23262F;margin-bottom:4px;">Drop a photo here or click to upload</div>
          <div style="font-size:12px;color:#777E90;">JPEG, PNG, or WebP &middot; Max 10MB</div>
          <input type="file" id="scanFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="handleScanFileSelect(this)">
        </div>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:-12px;margin-bottom:24px;">
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation();openScanCamera()" style="display:inline-flex;align-items:center;gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Take Photo
          </button>
        </div>
        <div id="scanCameraContainer" class="hidden" style="margin-bottom:24px;text-align:center;">
          <video id="scanCameraVideo" autoplay playsinline style="width:100%;max-width:500px;border-radius:12px;border:1px solid #E6E8EC;"></video>
          <canvas id="scanCameraCanvas" style="display:none;"></canvas>
          <div style="margin-top:12px;display:flex;gap:12px;justify-content:center;">
            <button class="btn-primary btn-sm" onclick="captureScanPhoto()" style="display:inline-flex;align-items:center;gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>
              Capture
            </button>
            <button class="btn-secondary btn-sm" onclick="closeScanCamera()">Cancel</button>
          </div>
        </div>

        <!-- Processing state -->
        <div id="scanProcessing" class="hidden" style="text-align:center;padding:40px;">
          <div style="display:inline-block;width:32px;height:32px;border:3px solid #E6E8EC;border-top-color:#EC526F;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
          <div style="font-size:14px;font-weight:600;color:#23262F;">Analyzing image...</div>
          <div style="font-size:12px;color:#777E90;margin-top:4px;">This may take a few seconds</div>
        </div>

        <!-- Scan results -->
        <div id="scanResults" class="hidden">
          <!-- Scan Summary Header -->
          <div id="scanSummaryHeader" style="background:#FCFCFD;border:1px solid #E6E8EC;border-radius:12px;padding:14px 16px;margin-bottom:16px;cursor:pointer;" onclick="toggleScanSummary()">
            <div style="display:flex;align-items:center;gap:12px;">
              <img id="scanSummaryThumb" src="" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;display:none;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:600;color:#23262F;">Scan Summary</div>
                <div style="font-size:12px;color:#777E90;"><span id="scanResultCount">0</span> items found &middot; <span id="scanPublishCount">0</span> to publish</div>
              </div>
              <svg id="scanSummaryChevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div id="scanSummaryExpanded" class="hidden" style="margin-top:12px;padding-top:12px;border-top:1px solid #E6E8EC;">
              <div id="scanSummaryList" style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;"></div>
            </div>
          </div>

          <!-- Results header -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="font-size:16px;font-weight:700;color:#23262F;"><span id="scanResultCountHeader">0</span> items found</div>
            <div style="display:flex;gap:8px;">
              <button class="btn-secondary btn-sm" onclick="retryScan()" style="display:inline-flex;align-items:center;gap:4px;font-weight:600;">New Scan</button>
            </div>
          </div>

          <!-- Bulk actions bar -->
          <div style="background:#FCFCFD;border:1px solid #E6E8EC;border-radius:10px;padding:10px 14px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;color:#777E90;">
                <input type="checkbox" id="scanSelectAll" onchange="toggleScanSelectAll(this.checked)" style="width:16px;height:16px;accent-color:#EC526F;">
                Select all
              </label>
              <span style="width:1px;height:20px;background:#E6E8EC;margin:0 4px;"></span>
              <span style="font-size:11px;color:#777E90;">Set selected to:</span>
              <button class="scan-bulk-status-btn" onclick="bulkSetScanStatus('for_sale')" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:none;cursor:pointer;background:#e6f9ed;color:#1a8a42;">For Sale</button>
              <button class="scan-bulk-status-btn" onclick="bulkSetScanStatus('willing_to_sell')" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:none;cursor:pointer;background:#fff8e1;color:#e6a200;">Willing to Sell</button>
              <button class="scan-bulk-status-btn" onclick="bulkSetScanStatus('for_rent')" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:none;cursor:pointer;background:#e6f0ff;color:#1a6aba;">For Rent</button>
              <button class="scan-bulk-status-btn" onclick="bulkSetScanStatus('private')" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:none;cursor:pointer;background:#E6E8EC;color:#353945;">Private</button>
              <button onclick="bulkRemoveScanItems()" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:none;cursor:pointer;background:#fef2f2;color:#991b1b;">Remove</button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:11px;color:#777E90;">Move to folder:</span>
              <select id="scanCollectionPicker" style="height:28px;padding:0 8px;border-radius:8px;border:1px solid #E6E8EC;font-size:12px;font-family:'Poppins',sans-serif;color:#23262F;">
                <option value="">No folder</option>
              </select>
              <button onclick="openNewCollectionFromScan()" style="font-size:11px;font-weight:600;color:#1a8a42;background:none;border:none;cursor:pointer;">+ New Folder</button>
            </div>
          </div>

          <!-- Items list -->
          <div id="scanItemsGrid" style="display:flex;flex-direction:column;gap:12px;"></div>

          <!-- Publish footer -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding:16px;background:#FCFCFD;border:1px solid #E6E8EC;border-radius:12px;">
            <div style="font-size:13px;color:#777E90;">
              <span id="scanPublishFooterCount">0</span> of <span id="scanTotalFooterCount">0</span> items to publish
              <span id="scanRemovedFooterCount" style="display:none;"> &middot; <span id="scanRemovedNum">0</span> removed</span>
            </div>
            <button class="btn-primary" onclick="confirmScanItems()" id="scanPublishBtn" style="font-weight:600;">
              Create <span id="scanPublishBtnCount">0</span> Listing(s)
            </button>
          </div>
        </div>

        <!-- Barcode Lookup -->
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #E6E8EC;">
          <h3 style="font-size:14px;font-weight:600;color:#23262F;margin-bottom:12px;">Barcode / UPC Lookup</h3>
          <div style="display:flex;gap:8px;max-width:400px;">
            <input id="barcodeInput" type="text" placeholder="Enter UPC or barcode number" style="flex:1;height:40px;padding:0 12px;border:1px solid #E6E8EC;border-radius:10px;font-size:14px;font-family:'Poppins',sans-serif;color:#23262F;" onkeydown="if(event.key==='Enter')lookupBarcode()">
            <button class="btn-primary btn-sm" onclick="lookupBarcode()" style="white-space:nowrap;">Lookup</button>
          </div>
          <div style="margin-top:8px;">
            <button class="btn-secondary btn-sm" id="barcodeCameraBtn" onclick="toggleBarcodeCamera()" style="display:inline-flex;align-items:center;gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Scan with Camera
            </button>
          </div>
          <div id="barcodeCameraContainer" class="hidden" style="margin-top:12px;max-width:400px;">
            <video id="barcodeVideo" autoplay playsinline style="width:100%;border-radius:12px;border:1px solid #E6E8EC;"></video>
            <div style="margin-top:8px;text-align:center;">
              <button class="btn-secondary btn-sm" onclick="toggleBarcodeCamera()">Stop Camera</button>
            </div>
          </div>
          <div id="barcodeResult" style="margin-top:12px;"></div>
        </div>

        <!-- Scan History -->
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #E6E8EC;">
          <h3 style="font-size:14px;font-weight:600;color:#23262F;margin-bottom:12px;">Scan History</h3>
          <div id="scanHistory"><p style="color:#777E90;font-size:13px;">No scans yet</p></div>
        </div>
      </section>
    </div>

    <!-- Collections Tab -->
    <div id="tab-collections" class="hidden">
      <section>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;border:none;padding:0;">Collections</h2>
          <button class="btn-primary btn-sm" onclick="openNewCollectionModal()">+ New Collection</button>
        </div>
        <div id="collectionsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;"></div>
        <div id="collectionsEmpty" class="hidden" style="text-align:center;padding:40px;color:#777E90;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D2D5DB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          <div style="font-size:14px;font-weight:500;">No collections yet</div>
          <div style="font-size:12px;margin-top:4px;">Create a collection to organize your listings</div>
        </div>
      </section>

      <!-- Collection detail (shown when a collection is selected) -->
      <div id="collectionDetail" class="hidden">
        <section>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <button style="background:none;border:none;cursor:pointer;color:#777E90;font-size:18px;" onclick="loadCollections()" title="Back">&larr;</button>
            <div style="flex:1;">
              <h2 style="margin:0;border:none;padding:0;" id="collectionDetailName"></h2>
              <div style="font-size:12px;color:#777E90;" id="collectionDetailDesc"></div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn-secondary btn-sm" onclick="editCollection()" title="Edit">Edit</button>
              <button style="background:#fce8e6;color:#E92222;border:none;border-radius:10px;height:32px;padding:0 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Poppins',sans-serif;" onclick="deleteCollection()">Delete</button>
            </div>
          </div>
          <div id="collectionRefs"><p class="empty">No items in this collection</p></div>
        </section>
      </div>
    </div>

    <!-- Ref Detail View (hidden by default) -->
    <div id="tab-detail" class="hidden">
      <section id="detailContent"></section>
    </div>

    <!-- Search Tab -->
    <div id="tab-search" class="hidden">
      <section>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;border:none;padding:0;line-height:32px;">Search Results</h2>
          <div style="display:flex;align-items:center;gap:10px;">
            <select id="searchRadiusSelect" style="font-size:13px;border:1px solid #E6E8EC;border-radius:8px;padding:4px 8px;font-family:'Poppins',sans-serif;height:32px;margin-bottom:0;width:auto;display:none;" onchange="executeHeaderSearch()">
              <option value="10">10 miles</option>
              <option value="25">25 miles</option>
              <option value="50" selected>50 miles</option>
              <option value="100">100 miles</option>
              <option value="200">200 miles</option>
              <option value="500">500 miles</option>
            </select>
            <select id="searchSortSelect" style="font-size:13px;border:1px solid #E6E8EC;border-radius:8px;padding:4px 8px;font-family:'Poppins',sans-serif;height:32px;margin-bottom:0;width:auto;">
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <button id="favFilterBtn" class="fav-filter-btn" onclick="toggleFavFilter()" title="Show favorites only">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <div class="layout-toggle">
              <button id="searchLayoutCardBtn" class="active" onclick="setSearchLayout('card')" title="Card view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </button>
              <button id="searchLayoutRowBtn" onclick="setSearchLayout('row')" title="Row view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="ref-subtabs" id="sourceFilterTabs">
          <div class="ref-subtab active" data-source="all" onclick="setSourceFilter('all')">All</div>
          <div class="ref-subtab" data-source="beacons" onclick="setSourceFilter('beacons')">Beacons</div>
          <div class="ref-subtab" data-source="reffo" onclick="setSourceFilter('reffo')">Reffo</div>
        </div>
        <div id="searchResults"><p class="empty">Use the search bar above to find refs</p></div>
      </section>
    </div>

    <!-- Unified Inbox Tab -->
    <div id="tab-inbox" class="hidden">
      <section>
        <h2 style="margin-bottom:16px;">Inbox</h2>
        <div class="tabs" style="margin-bottom:16px;">
          <div class="tab active" data-inboxtab="all" onclick="switchInboxTab('all')">All</div>
          <div class="tab" data-inboxtab="offers" onclick="switchInboxTab('offers')">Offers</div>
          <div class="tab" data-inboxtab="sent" onclick="switchInboxTab('sent')">Sent</div>
          <div class="tab" data-inboxtab="messages" onclick="switchInboxTab('messages')">Messages</div>
          <div class="tab" data-inboxtab="resolved" onclick="switchInboxTab('resolved')">Resolved</div>
          <div class="tab" data-inboxtab="archived" onclick="switchInboxTab('archived')">Archived</div>
        </div>
        <div id="inboxContainer"><p class="empty">Loading...</p></div>
      </section>
    </div>

    <!-- Legacy hidden containers for negotiation detail views -->
    <div id="negIncoming" class="hidden"></div>
    <div id="negOutgoing" class="hidden"></div>
    <div id="negResolved" class="hidden"></div>
    <div id="negArchived" class="hidden"></div>

    <div id="tab-settings" class="hidden">
      <h1 style="font-size:24px;font-weight:600;color:#23262F;margin-bottom:32px;">Settings</h1>
      <div id="updateBanner" class="update-banner">
        <div class="update-title">&#x2B06; Update available: <span id="updateVersionLabel"></span></div>
        <div class="update-cmd">Run: npx pelagora-cli-installer@latest</div>
      </div>
      <section class="settings-card">
        <h2>Profile Picture</h2>
        <div style="display:flex;align-items:center;gap:20px;">
          <div id="profilePicPreview" style="width:80px;height:80px;border-radius:50%;border:2px solid #E6E8EC;background:#FCFCFD;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;flex-shrink:0;" onclick="document.getElementById('profilePicInput').click()">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B1B5C3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <button class="btn-secondary btn-sm" onclick="document.getElementById('profilePicInput').click()">Upload Photo</button>
            <button class="btn-danger btn-sm" id="removeProfilePicBtn" style="display:none;margin-left:8px;" onclick="removeProfilePicture()">Remove</button>
            <input type="file" id="profilePicInput" accept="image/*" style="display:none;" onchange="uploadProfilePicture(this)">
            <p style="font-size:12px;color:#B1B5C3;margin-top:6px;margin-bottom:0;">Click the circle or button to upload. Max 10 MB.</p>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <h2>Reffo.ai Connection</h2>
        <div id="settingsMsg"></div>

        <!-- Promo card: shown when no API key -->
        <div id="connectionPromo" style="display:none; border-radius:16px; overflow:hidden; background:linear-gradient(135deg, #f8f0fc 0%, #fdedf0 100%); padding:24px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <div style="width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:linear-gradient(135deg, #8101B4 0%, #EA526F 100%);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FCFCFD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:15px; font-weight:600; color:#141416; margin-bottom:4px;">Connect to Reffo.ai</div>
              <div style="font-size:13px; color:#777E90; line-height:1.5;">Sync your inventory with the Reffo.ai marketplace. Get an API key from your account, paste it below, and your listed items will appear on reffo.ai.</div>
            </div>
          </div>
          <div style="display:flex; gap:10px; align-items:flex-end; margin-top:16px;">
            <div style="flex:1;">
              <label for="settingsApiKey">API Key</label>
              <input id="settingsApiKey" type="password" placeholder="rfk_xxxxxxxxxxxx">
            </div>
            <button class="btn-primary" style="margin-bottom:14px;" onclick="saveApiKey()">Save</button>
          </div>
          <p style="font-size:12px; color:#B1B5C3; margin-top:-6px;">Get your API key at <a href="https://reffo.ai/account" target="_blank" style="color:#EC526F;">reffo.ai/account</a></p>
        </div>

        <!-- Connected state: shown when API key exists -->
        <div id="connectionConnected" style="display:none;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
            <div id="syncStatusDot" style="width:12px;height:12px;border-radius:50%;background:#E6E8EC;flex-shrink:0;"></div>
            <span id="syncStatusText" style="font-size:14px;font-weight:500;color:#777E90;">Not connected</span>
            <button id="retryConnectionBtn" class="btn-primary btn-sm" style="display:none;font-size:12px;padding:4px 12px;" onclick="retryConnection()">Retry</button>
          </div>
          <div id="syncErrorDetail" style="font-size:12px;color:#F5A623;margin-bottom:16px;display:none;"></div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:12px;">
            <span style="font-size:13px;color:#777E90;" id="connectedKeyPrefix"></span>
            <button class="btn-danger btn-sm" id="removeKeyBtn" onclick="removeApiKey()">Remove</button>
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid #E6E8EC;display:flex;align-items:center;gap:8px;">
            <span style="font-size:13px;font-weight:500;color:#777E90;">Synced Refs:</span>
            <span id="syncedCount" style="font-size:15px;font-weight:700;color:#141416;">0</span>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <h2>AI Provider</h2>
        <div id="aiProviderMsg"></div>
        <p style="font-size:12px;color:#B1B5C3;margin-bottom:12px;">Choose how Smart Autofill gets product data. Default uses your Reffo API key.</p>
        <label for="aiProviderSelect">Provider</label>
        <select id="aiProviderSelect" onchange="toggleAiKeyField()">
          <option value="reffo">Reffo (default)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (ChatGPT)</option>
          <option value="google">Google (Gemini)</option>
          <option value="xai">xAI (Grok)</option>
        </select>
        <div id="aiKeySection" style="display:none;margin-top:10px;">
          <label for="aiApiKeyInput">API Key</label>
          <input id="aiApiKeyInput" type="password" placeholder="Enter your API key">
        </div>
        <div id="aiReffoNote" style="font-size:12px;color:#B1B5C3;margin-top:8px;">Uses your Reffo API key — no extra configuration needed.</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn-primary btn-sm" onclick="saveAiProvider()">Save</button>
          <button class="btn-danger btn-sm" id="removeAiProviderBtn" style="display:none;" onclick="removeAiProvider()">Remove</button>
        </div>
      </section>

      <section class="settings-card">
        <h2>Default Location</h2>
        <div id="locationMsg"></div>
        <p style="font-size:12px;color:#B1B5C3;margin-bottom:12px;">Set your default location. New refs will inherit these values. Street address is stored locally and never shared.</p>
        <label for="locAddress">Address (private)</label>
        <input id="locAddress" placeholder="123 Main St (never shared)">
        <div class="row">
          <div><label for="locCity">City</label><input id="locCity" placeholder="City"></div>
          <div><label for="locState">State</label><input id="locState" placeholder="FL"></div>
          <div><label for="locZip">Zip</label><input id="locZip" placeholder="32801"></div>
        </div>
        <div class="row">
          <div>
            <label for="locCountry">Country</label>
            <select id="locCountry">
              <option value="US">US</option>
              <option value="CA">CA</option>
              <option value="GB">GB</option>
              <option value="AU">AU</option>
              <option value="DE">DE</option>
              <option value="FR">FR</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div><label for="locLat">Latitude</label><input id="locLat" type="number" step="any" placeholder="28.5383"></div>
          <div><label for="locLng">Longitude</label><input id="locLng" type="number" step="any" placeholder="-81.3792"></div>
          <div style="display:flex;align-items:flex-end;"><button class="btn-secondary btn-sm" style="margin-bottom:14px;white-space:nowrap;" onclick="useMyLocation()">Use My Location</button></div>
        </div>
        <div class="row">
          <div>
            <label for="locScope">Default Selling Scope</label>
            <select id="locScope">
              <option value="global">Global</option>
              <option value="national">National</option>
              <option value="range">Range (miles)</option>
            </select>
          </div>
          <div>
            <label for="locRadius">Default Radius (miles)</label>
            <input id="locRadius" type="number" min="1" value="250">
          </div>
        </div>
        <button class="btn-primary" onclick="saveLocation()">Save Location</button>
      </section>

      <section class="settings-card">
        <h2>Beacon Info</h2>
        <div class="info-row"><span class="info-label">Beacon ID</span><span class="info-value" id="settingsBeaconId" style="word-break:break-all;font-size:12px;"></span></div>
        <div class="info-row"><span class="info-label">Version</span><span class="info-value" id="settingsVersion"></span></div>
        <div class="info-row"><span class="info-label">Uptime</span><span class="info-value" id="settingsUptime"></span></div>
      </section>
    </div>
  </div>

  <!-- List Ref Tab -->
  <div id="tab-list" class="hidden">
    <div style="max-width:1100px;margin:0 auto;padding:0 24px;">
      <div style="margin-bottom:8px;">
        <a onclick="switchTab('refs')" style="cursor:pointer;color:#EC526F;font-size:14px;font-weight:500;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Refs
        </a>
      </div>
      <h3 style="margin:0 0 20px;font-size:1.5rem;font-weight:700;">List a Ref</h3>
    </div>
    <section style="max-width:1100px;margin:0 auto;padding:0 24px 24px;">
      <div style="padding-top:30px;">
      <div id="listMsg"></div>
      <form id="listForm">
        <input type="hidden" id="refListingStatus" name="listingStatus" value="private">

        <!-- Segmented status control -->
        <div class="status-segmented" id="createStatusSegment">
          <button type="button" class="seg-active-private" onclick="selectCreateStatus('private')">Private</button>
          <button type="button" onclick="selectCreateStatus('for_sale')">For Sale</button>
          <button type="button" onclick="selectCreateStatus('willing_to_sell')">Willing to Sell</button>
          <button type="button" onclick="selectCreateStatus('for_rent')">For Rent</button>
        </div>

        <label for="refName">Name *</label>
        <input id="refName" name="name" required placeholder="e.g. Fender Stratocaster">

        <div class="row">
          <div>
            <label for="refCat">Category</label>
            <select id="refCat" name="category"><option value="">Select...</option></select>
          </div>
          <div>
            <label for="refSubcat">Subcategory</label>
            <select id="refSubcat" name="subcategory"><option value="">Select...</option></select>
          </div>
        </div>

        <div id="createAutofillSection">
          <div id="createAutofillActive" style="display:none;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <button type="button" id="createAutofillBtn" onclick="triggerProductLookup('create')" style="display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#8101B4 0%,#EA526F 100%);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
                Smart Autofill
              </button>
              <span id="createAutofillStatus" style="font-size:12px;color:#777E90;"></span>
            </div>
          </div>
          <div id="createAutofillPromo" style="display:none;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#f8f0fc 0%,#fdedf0 100%);padding:14px 16px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:linear-gradient(135deg,#8101B4 0%,#EA526F 100%);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCFCFD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:#141416;margin-bottom:2px;">Smart Autofill with AI</div>
                <div style="font-size:12px;color:#777E90;line-height:1.4;">Link a <a href="https://reffo.ai/api" target="_blank" style="color:#EC526F;font-weight:600;text-decoration:none;">Reffo.ai</a> account to auto-fill descriptions, attributes, images, and price estimates when you list items.</div>
              </div>
            </div>
          </div>
        </div>
        <div id="createAutofillCard"></div>

        <label for="refDesc">Description</label>
        <textarea id="refDesc" name="description" placeholder="Condition, details..."></textarea>

        <div id="createCategoryFields"></div>

        <div class="row">
          <div>
            <label for="refQuantity">Quantity</label>
            <input id="refQuantity" name="quantity" type="number" min="1" step="1" value="1">
          </div>
        </div>

        <div id="createPriceSection" style="display:none;">
          <div class="row">
            <div>
              <label for="refPrice">Price</label>
              <input id="refPrice" name="price" type="number" min="0" step="0.01" placeholder="0.00">
            </div>
            <div>
              <label for="refCurrency">Currency</label>
              <select id="refCurrency" name="currency">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>
        </div>

        <div id="rentalFieldsCreate" style="display:none;margin-bottom:14px;border:2px solid #e6f0ff;border-radius:12px;padding:14px;background:#f8fbff;">
          <div style="font-size:12px;font-weight:600;color:#1a6aba;text-transform:uppercase;letter-spacing:0.02em;margin-bottom:10px;">Rental Details</div>
          <label for="refRentalTerms">Rental Terms</label>
          <textarea id="refRentalTerms" placeholder="Terms and conditions for rental..." rows="2" style="resize:vertical;"></textarea>
          <div class="row">
            <div><label for="refRentalDeposit">Deposit</label><input id="refRentalDeposit" type="number" min="0" step="0.01" placeholder="0.00"></div>
            <div><label for="refRentalDuration">Duration</label><input id="refRentalDuration" type="number" min="1" placeholder="e.g. 7"></div>
            <div><label for="refRentalDurationUnit">Unit</label>
              <select id="refRentalDurationUnit">
                <option value="days">Days</option>
                <option value="hours">Hours</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
        </div>

        <label for="refSku">SKU</label>
        <input id="refSku" name="sku" placeholder="Optional SKU or part number">

        <details style="margin-bottom:14px;border:2px solid #E6E8EC;border-radius:12px;padding:14px;">
          <summary style="cursor:pointer;font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.02em;">Location Override</summary>
          <p style="font-size:12px;color:#B1B5C3;margin:8px 0;">Leave blank to use your default location from Settings.</p>
          <div class="row">
            <div><label for="refLocCity">City</label><input id="refLocCity" placeholder="City"></div>
            <div><label for="refLocState">State</label><input id="refLocState" placeholder="State"></div>
            <div><label for="refLocZip">Zip</label><input id="refLocZip" placeholder="Zip"></div>
          </div>
          <div class="row">
            <div><label for="refLocLat">Latitude</label><input id="refLocLat" type="number" step="any" placeholder="e.g. 28.54"></div>
            <div><label for="refLocLng">Longitude</label><input id="refLocLng" type="number" step="any" placeholder="e.g. -81.38"></div>
          </div>
          <div class="row">
            <div>
              <label for="refSellingScope">Selling Scope</label>
              <select id="refSellingScope">
                <option value="">Use default</option>
                <option value="global">Global</option>
                <option value="national">National</option>
                <option value="range">Range (miles)</option>
              </select>
            </div>
            <div>
              <label for="refSellingRadius">Radius (miles)</label>
              <input id="refSellingRadius" type="number" min="1" placeholder="250">
            </div>
          </div>
        </details>

        <label>Photos (up to 30)</label>
        <div class="upload-area" onclick="document.getElementById('refPhotos').click()">
          <div class="upload-icon">+</div>
          <p>Click to upload photos</p>
          <input type="file" id="refPhotos" accept="image/*" multiple>
        </div>
        <div id="photoPreview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>
        <div id="aiSuggestedImage"></div>

        <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-bottom:10px;margin-top:20px;">
          <span style="font-size:13px;font-weight:600;color:#23262F;">Also push to Reffo</span>
          <label class="sync-toggle" style="margin:0;">
            <input type="checkbox" id="refAlsoPushReffo">
            <span class="toggle-track"></span>
          </label>
        </div>
        <div id="createPriceEstimate"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;">
          <button type="button" class="btn-secondary" onclick="closeListRefModal()">Cancel</button>
          <button type="submit" class="btn-primary" id="createSubmitBtn">Create Listing</button>
        </div>
      </form>
      </div>
    </section>
  </div>

  <!-- Proposal Modal (buyer sending offer) -->
  <div id="proposalModal" class="modal-overlay hidden">
    <div class="modal">
      <h3 id="modalTitle">Make a Proposal</h3>
      <input type="hidden" id="modalRefId">
      <input type="hidden" id="modalRefName">
      <input type="hidden" id="modalSellerBeaconId">
      <div class="row">
        <div>
          <label for="modalPrice">Your Offer Price</label>
          <input id="modalPrice" type="number" min="0.01" step="0.01" placeholder="0.00">
        </div>
        <div>
          <label for="modalCurrency">Currency</label>
          <select id="modalCurrency">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>
      <label for="modalMessage">Message</label>
      <textarea id="modalMessage" placeholder="Why are you interested?"></textarea>
      <div id="modalMsg"></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeProposalModal()">Cancel</button>
        <button class="btn-primary" id="modalSendBtn" onclick="sendProposal()">Send Proposal</button>
      </div>
    </div>
  </div>

  <!-- Respond Modal (seller responding to incoming offer) -->
  <div id="respondModal" class="modal-overlay hidden">
    <div class="modal">
      <h3 id="respondModalTitle">Respond to Offer</h3>
      <input type="hidden" id="respondNegId">
      <div id="respondOfferInfo" style="background:#F4F5F6;border-radius:16px;padding:20px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;margin-bottom:4px;">Offered Price</div>
        <div id="respondOfferPrice" style="font-size:24px;font-weight:700;color:#141416;"></div>
        <div id="respondOfferMessage" style="font-size:14px;color:#777E90;margin-top:6px;"></div>
      </div>
      <div id="respondCounterFields" class="hidden">
        <label for="respondCounterPrice">Your Counter Price</label>
        <input id="respondCounterPrice" type="number" min="0.01" step="0.01" placeholder="0.00">
        <label for="respondMessage">Message (optional)</label>
        <textarea id="respondMessage" placeholder="Explain your counter offer..."></textarea>
      </div>
      <div id="respondMsg"></div>
      <div class="modal-actions" style="flex-wrap:wrap;gap:10px;">
        <button class="btn-secondary" onclick="closeRespondModal()">Cancel</button>
        <button class="btn-danger btn-sm" id="respondRejectBtn" onclick="submitRespond('rejected')">Reject</button>
        <button class="btn-secondary btn-sm" id="respondCounterBtn" onclick="toggleCounterFields()">Counter</button>
        <button class="btn-primary btn-sm" id="respondAcceptBtn" onclick="submitRespond('accepted')">Accept</button>
      </div>
    </div>
  </div>

  <!-- Legal: Terms of Service -->
  <div id="tab-terms" class="hidden">
    <section>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;" onclick="switchTab('refs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span style="font-size:13px;color:#777E90;">Back</span>
      </div>
      <h2 style="border-bottom:none;margin-bottom:4px;">Terms of Service</h2>
      <p style="font-size:13px;color:#777E90;margin-bottom:24px;">Last updated: March 6, 2026</p>
      <div style="font-size:14px;color:#23262F;line-height:1.7;">
        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">1. Acceptance of Terms</h3>
        <p>By accessing or using Reffo.ai (the &ldquo;Service&rdquo;), the protocol, the beacon software, or any associated APIs, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not use the Service.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">2. Description of Services</h3>
        <p>Reffo is built on an open protocol for decentralized commerce. The Service consists of:</p>
        <ul style="padding-left:24px;margin:8px 0;">
          <li><strong>Reffo.ai Webapp</strong> &mdash; A web-based discovery layer and search interface for the Pelagora network.</li>
          <li><strong>Beacon</strong> &mdash; Open-source, self-hosted inventory server software that runs on your machine.</li>
          <li><strong>Reffo API</strong> &mdash; Programmatic access to search, listings, and network data.</li>
          <li><strong>The Protocol</strong> &mdash; The open specification that enables interoperability between beacons.</li>
        </ul>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">3. User Accounts and Responsibilities</h3>
        <p>You may create an account on Reffo.ai to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating your account and to keep it up to date.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">4. User-Generated Content and Listings</h3>
        <p>You retain ownership of all content you create and list through the Service, including item descriptions, images, and pricing information. By listing content on the Pelagora network, you grant Reffo.ai a limited, non-exclusive, royalty-free license to display, index, and make your listings discoverable through the webapp and API.</p>
        <p style="margin-top:8px;">You are solely responsible for the accuracy, legality, and appropriateness of your listings and content.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">5. Peer-to-Peer Transactions</h3>
        <p>Reffo.ai is a discovery and communication layer. All transactions on the Pelagora network occur directly between users (peer-to-peer). Reffo.ai is not a party to any transaction, does not provide escrow services, and makes no guarantees regarding the quality, safety, legality, or delivery of items listed on the network.</p>
        <p style="margin-top:8px;">You acknowledge that you engage in peer-to-peer transactions at your own risk. Reffo.ai is not responsible for disputes between users.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">6. Prohibited Uses</h3>
        <p>You agree to comply with our <a href="javascript:void(0)" onclick="switchTab('acceptable-use')" style="color:#EA526F;">Acceptable Use Policy</a>, which is incorporated into these Terms by reference. Violation of the Acceptable Use Policy may result in suspension or termination of your account.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">7. API Usage</h3>
        <p>Access to the Reffo API is subject to rate limits and usage policies. API keys are personal and non-transferable. You may not use the API to scrape, spam, or otherwise abuse the Service. We reserve the right to revoke API access for violations.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">8. Intellectual Property</h3>
        <p>The Reffo name, logo, and branding are trademarks of Reffo.ai. The protocol specification is released under a CC0 public domain dedication. The beacon software is released under an open-source license (see the respective repository for details). This webapp and its original content are the property of Reffo.ai.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">9. Disclaimers</h3>
        <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. REFFO.AI DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. WE MAKE NO WARRANTIES REGARDING THE RELIABILITY, ACCURACY, OR COMPLETENESS OF ANY LISTINGS, USER CONTENT, OR PEER-TO-PEER TRANSACTIONS ON THE NETWORK.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">10. Limitation of Liability</h3>
        <p>TO THE FULLEST EXTENT PERMITTED BY LAW, REFFO.AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO DAMAGES FROM PEER-TO-PEER TRANSACTIONS, LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">11. Indemnification</h3>
        <p>You agree to indemnify and hold harmless Reffo.ai, its officers, directors, employees, and agents from any claims, liabilities, damages, or expenses arising from your use of the Service, your listings, your transactions with other users, or your violation of these Terms.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">12. Termination</h3>
        <p>We may suspend or terminate your account and access to the Service at our discretion, with or without notice, for conduct that we believe violates these Terms or is harmful to other users or the Service. Upon termination, your right to use the Service ceases immediately, though your locally stored beacon data remains yours.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">13. Governing Law</h3>
        <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict-of-law provisions.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">14. Changes to These Terms</h3>
        <p>We may update these Terms from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">15. Contact</h3>
        <p>If you have questions about these Terms, please contact us at <a href="mailto:help@reffo.ai" style="color:#EA526F;">help@reffo.ai</a>.</p>
      </div>
    </section>
  </div>

  <!-- Legal: Privacy Policy -->
  <div id="tab-privacy" class="hidden">
    <section>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;" onclick="switchTab('refs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span style="font-size:13px;color:#777E90;">Back</span>
      </div>
      <h2 style="border-bottom:none;margin-bottom:4px;">Privacy Policy</h2>
      <p style="font-size:13px;color:#777E90;margin-bottom:24px;">Last updated: March 6, 2026</p>
      <div style="font-size:14px;color:#23262F;line-height:1.7;">
        <p>Reffo.ai (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the Reffo.ai webapp, the beacon software, and associated APIs (collectively, the &ldquo;Service&rdquo;).</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">1. Information We Collect</h3>
        <p><strong>Account Data:</strong> When you create an account, we collect your email address and store a password hash through our authentication provider (Supabase). You may optionally provide a display name, username, and avatar.</p>
        <p style="margin-top:8px;"><strong>Listing Data:</strong> When your beacon syncs with Reffo.ai, we receive and index your listing data (item titles, descriptions, images, prices, and categories) to make it discoverable through search.</p>
        <p style="margin-top:8px;"><strong>Search Queries:</strong> We collect search queries to improve search relevance and service quality. Search queries are not linked to your account unless you are logged in.</p>
        <p style="margin-top:8px;"><strong>Usage Data:</strong> We collect standard web analytics data including page views, browser type, device information, and IP address for service improvement and security purposes.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">2. How We Use Your Information</h3>
        <ul style="padding-left:24px;margin:8px 0;">
          <li>To provide and operate the Service, including search and discovery features.</li>
          <li>To improve search relevance and overall service quality.</li>
          <li>To communicate important updates about the Service or your account.</li>
          <li>To enforce our Terms of Service and Acceptable Use Policy.</li>
          <li>To detect and prevent fraud, abuse, or security threats.</li>
        </ul>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">3. Data Sharing</h3>
        <p>We do not sell your personal information. We may share data with the following third-party service providers that help us operate the Service:</p>
        <ul style="padding-left:24px;margin:8px 0;">
          <li><strong>Supabase</strong> &mdash; Authentication and database services.</li>
          <li><strong>Vercel</strong> &mdash; Web hosting and deployment.</li>
        </ul>
        <p style="margin-top:8px;">These providers process data on our behalf and are contractually obligated to protect your information. We may also disclose information if required by law or to protect the rights, safety, or property of Reffo.ai, its users, or the public.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">4. Data Retention</h3>
        <p>Account data is retained for as long as your account is active. Beacon sync data (listings indexed for search) is periodically refreshed and updated as your beacon syncs. If you delete your account, your account data will be removed, and your listings will be de-indexed from search.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">5. Your Rights</h3>
        <p>Depending on your jurisdiction (including under GDPR and CCPA), you may have the right to:</p>
        <ul style="padding-left:24px;margin:8px 0;">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your data.</li>
          <li>Object to or restrict certain processing of your data.</li>
          <li>Request data portability.</li>
        </ul>
        <p style="margin-top:8px;">To exercise any of these rights, contact us at <a href="mailto:help@reffo.ai" style="color:#EA526F;">help@reffo.ai</a>.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">6. Security</h3>
        <p>We implement industry-standard security measures to protect your data, including encryption in transit (TLS), secure password hashing, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">7. Children&rsquo;s Privacy</h3>
        <p>The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will take steps to delete it promptly.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">8. International Transfers</h3>
        <p>Your information may be transferred to and processed in countries other than your own. By using the Service, you consent to the transfer of your information to the United States and other jurisdictions where our service providers operate.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">9. Cookies</h3>
        <p>We use cookies for authentication and essential service functionality.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">10. Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the Service after changes constitutes acceptance of the revised policy.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">11. Contact</h3>
        <p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:help@reffo.ai" style="color:#EA526F;">help@reffo.ai</a>.</p>
      </div>
    </section>
  </div>

  <!-- Legal: Acceptable Use Policy -->
  <div id="tab-acceptable-use" class="hidden">
    <section>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;" onclick="switchTab('refs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span style="font-size:13px;color:#777E90;">Back</span>
      </div>
      <h2 style="border-bottom:none;margin-bottom:4px;">Acceptable Use Policy</h2>
      <p style="font-size:13px;color:#777E90;margin-bottom:24px;">Last updated: March 6, 2026</p>
      <div style="font-size:14px;color:#23262F;line-height:1.7;">
        <p>This Acceptable Use Policy (&ldquo;AUP&rdquo;) governs your use of the Reffo.ai webapp, the Pelagora network, and associated services. By using the Service, you agree to comply with this policy. Violation may result in listing removal, account suspension, or reporting to law enforcement.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">1. Prohibited Items</h3>
        <p>You may not list, offer, or facilitate the sale or exchange of:</p>
        <ul style="padding-left:24px;margin:8px 0;">
          <li>Illegal goods or services under applicable law.</li>
          <li>Weapons, firearms, ammunition, or explosives (unless permitted by local law and properly licensed).</li>
          <li>Controlled substances, illegal drugs, or drug paraphernalia.</li>
          <li>Stolen property or goods obtained through illegal means.</li>
          <li>Counterfeit goods, including fake branded merchandise.</li>
          <li>Hazardous materials that pose a risk to health or safety.</li>
          <li>Items that infringe on intellectual property rights.</li>
          <li>Human remains, body parts, or products derived from endangered species.</li>
        </ul>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">2. Prohibited Conduct</h3>
        <p>You may not:</p>
        <ul style="padding-left:24px;margin:8px 0;">
          <li>Engage in fraud, misrepresentation, or deceptive practices.</li>
          <li>Harass, threaten, or abuse other users.</li>
          <li>Send spam, unsolicited messages, or bulk communications.</li>
          <li>Manipulate search results, the DHT, or any ranking or discovery mechanism.</li>
          <li>Impersonate other users, beacons, or Reffo.ai staff.</li>
          <li>Attempt to gain unauthorized access to other users&rsquo; accounts, beacons, or data.</li>
          <li>Use the Service for money laundering, terrorist financing, or other financial crimes.</li>
          <li>Interfere with or disrupt the Service, network, or other users&rsquo; beacons.</li>
        </ul>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">3. Listing Accuracy</h3>
        <p>All listings must accurately represent the item or service being offered. Descriptions, photos, pricing, and condition must be truthful and not misleading. Bait-and-switch tactics are strictly prohibited.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">4. Enforcement</h3>
        <p>Reffo.ai reserves the right to take action against violations of this AUP, including but not limited to:</p>
        <ul style="padding-left:24px;margin:8px 0;">
          <li>Removing or de-indexing offending listings from search.</li>
          <li>Issuing warnings to account holders.</li>
          <li>Suspending or terminating user accounts.</li>
          <li>Revoking API access.</li>
          <li>Reporting illegal activity to the appropriate authorities.</li>
        </ul>
        <p style="margin-top:8px;">Note: Because the Pelagora network is decentralized, Reffo.ai can remove listings from its own search index and webapp but cannot control content on individual beacons. Beacon operators are independently responsible for the content they host.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">5. Reporting Violations</h3>
        <p>If you encounter a listing or user that violates this policy, please report it to <a href="mailto:help@reffo.ai" style="color:#EA526F;">help@reffo.ai</a> with as much detail as possible, including the listing URL or description and the nature of the violation.</p>

        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">6. Changes to This Policy</h3>
        <p>We may update this AUP from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page.</p>
      </div>
    </section>
  </div>

  <!-- For Bots -->
  <div id="tab-for-bots" class="hidden">
    <section>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;" onclick="switchTab('refs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span style="font-size:13px;color:#777E90;">Back</span>
      </div>
      <h2 style="border-bottom:none;margin-bottom:4px;">&#x1F916; For Bots Only</h2>
      <p style="font-size:13px;color:#777E90;margin-bottom:24px;">Structured info for AI agents, crawlers, and bots. Humans: you probably want <a href="https://reffo.ai/docs" target="_blank" rel="noopener noreferrer" style="color:#EA526F;">Docs</a> or <a href="https://reffo.ai/agents" target="_blank" rel="noopener noreferrer" style="color:#EA526F;">AI Agents</a>.</p>
      <div style="font-size:14px;color:#23262F;line-height:1.7;">
        <p>For full bot-readable documentation, visit <a href="https://reffo.ai/for-bots" target="_blank" rel="noopener noreferrer" style="color:#EA526F;">reffo.ai/for-bots</a></p>
        <pre style="background:#1a1a2e;color:#e0e0e0;border-radius:12px;padding:20px;overflow-x:auto;font-size:13px;line-height:1.6;margin-top:16px;">Pelagora = open peer-to-peer commerce network (pelagora.net)
Beacon = self-hosted marketplace node (Express + SQLite + DHT)
MCP = @pelagora/mcp &mdash; connect AI agents to a beacon
Skills = plugin system for extending beacons
API = REST on port 3737
Quickstart = npx pelagora-cli-installer
GitHub = https://github.com/ReffoAI
Website = https://reffo.ai</pre>
      </div>
    </section>
  </div>

  <!-- Toast container -->
  <div id="toast-container"></div>

  </div><!-- end container -->
  </div><!-- end dashboard-main -->
</div><!-- end dashboard-layout -->
</div><!-- end app-content -->

  <!-- Lightbox overlay (outside app-content so z-index works) -->
  <div id="lightboxOverlay" class="lightbox-overlay" style="display:none;" onclick="if(event.target===this)closeLightbox()">
    <div class="lightbox-topbar">
      <span class="lightbox-counter" id="lightboxCounter"></span>
      <button class="lightbox-close" onclick="closeLightbox()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="lightbox-body">
      <button class="lightbox-prev" id="lightboxPrev" onclick="lightboxNav(-1)"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
      <img class="lightbox-img" id="lightboxImg" src="" alt="">
      <button class="lightbox-next" id="lightboxNext" onclick="lightboxNav(1)"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
    <div class="lightbox-thumbs" id="lightboxThumbs"></div>
  </div>

  <!-- Sync to Reffo modal -->
  <div id="syncModal" class="modal-overlay hidden" onclick="if(event.target===this)closeSyncModal()">
    <div class="modal" style="text-align:center;padding:40px 36px 32px;">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#8101B4 0%,#EA526F 100%);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </div>
      <h3 style="font-size:20px;font-weight:700;margin:0 0 8px;">Push to Reffo.ai?</h3>
      <p style="font-size:14px;color:#777E90;margin:0 0 28px;line-height:1.5;">Your listing was saved locally. Would you also like to share it on Reffo.ai for more visibility?</p>
      <div class="modal-actions" style="justify-content:center;">
        <button type="button" class="btn-secondary" onclick="closeSyncModal()" style="min-width:100px;">Not now</button>
        <button type="button" class="btn-primary" id="syncModalConfirmBtn" style="min-width:140px;">Push to Reffo</button>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="app-footer">
    <div class="app-footer-inner">
      <div class="app-footer-grid">
        <!-- Col 1: Logo -->
        <div class="app-footer-brand">
          <img src="/footer-brand.png" alt="Reffo" style="height: 40px; width: auto;">
          <button id="footerUpdateBtn" class="button-gradient" style="display:none;height:32px;padding:0 16px;font-size:12px;border-radius:16px;" onclick="switchTab('settings')">&#x2B06; Update</button>
        </div>

        <!-- Col 2: Nav -->
        <div class="app-footer-nav">
          <a href="https://reffo.ai/about" target="_blank" rel="noopener noreferrer">About</a>
          <a href="https://reffo.ai/docs" target="_blank" rel="noopener noreferrer">Docs</a>
          <a href="https://reffo.ai/agents" target="_blank" rel="noopener noreferrer">AI Agents</a>
          <a href="https://reffo.ai/skills" target="_blank" rel="noopener noreferrer">Skills</a>
          <a href="https://reffo.ai/support?source=beacon" target="_blank" rel="noopener noreferrer">Support</a>
          <span class="app-footer-col-title" style="margin-top:12px;">Legal</span>
          <a href="https://reffo.ai/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          <a href="https://reffo.ai/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <a href="https://reffo.ai/acceptable-use" target="_blank" rel="noopener noreferrer">Acceptable Use</a>
        </div>

        <!-- Col 3: Contact -->
        <div class="app-footer-col">
          <span class="app-footer-col-title">Contact</span>
          <a href="mailto:info@reffo.ai">info@reffo.ai</a>
          <span class="col-text">Jacksonville Beach, FL</span>
          <span class="col-text">United States</span>
        </div>

        <!-- Col 4: Dynamic CTA (API key / Skills) -->
        <div class="app-footer-col" id="footerCtaCol">
          <span class="app-footer-col-title" id="footerCtaTitle">Connect to Reffo.ai</span>
          <span class="col-desc" id="footerCtaDesc">Link your node to Reffo.ai to sync listings, access the skill marketplace, and join the Pelagora network.</span>
          <a id="footerCtaBtn" href="https://reffo.ai/api" target="_blank" rel="noopener noreferrer" class="footer-download-btn" style="text-decoration:none;"><svg id="footerCtaBtnIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Get API Key</a>
        </div>
      </div>
    </div>
    <div class="app-footer-bar">
      <div class="app-footer-bar-inner">
        <div class="app-footer-copy">&copy; 2026 Pelagora Association. All rights reserved</div>
        <div class="app-footer-social">
          <a href="https://facebook.com/reffoai" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
          <a href="https://x.com/ReffoAI" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
          <a href="https://instagram.com/reffoai" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
          <a href="https://github.com/ReffoAI" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg></a>
        </div>
      </div>
    </div>
  </footer>

  <!-- AI Quick Start Modal -->
  <div class="ai-quickstart-modal" id="aiQuickStartModal" onclick="if(event.target===this)closeAiQuickStartModal()">
    <div class="ai-quickstart-modal-inner">
      <button class="modal-close" onclick="closeAiQuickStartModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
      </button>
      <h3 style="font-size:18px;font-weight:700;color:#141416;margin:0 0 4px;">AI Quick Start</h3>
      <p style="font-size:13px;color:#777E90;margin-bottom:16px;">Copy this prompt into any AI assistant to learn about Reffo and get help.</p>
      <div class="ai-quickstart-prompt">
        <pre id="aiModalPromptText"></pre>
        <button class="ai-quickstart-copy-btn" onclick="copyAiPrompt()" title="Copy prompt">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
      <div class="ai-quickstart-llm-buttons">
        <button class="ai-quickstart-llm-btn" onclick="openWithLlm('perplexity')">Perplexity</button>
        <button class="ai-quickstart-llm-btn" onclick="openWithLlm('claude')">Claude</button>
        <button class="ai-quickstart-llm-btn" onclick="openWithLlm('chatgpt')">ChatGPT</button>
        <button class="ai-quickstart-llm-btn" onclick="openWithLlm('gemini')">Gemini</button>
        <button class="ai-quickstart-llm-btn" onclick="openWithLlm('grok')">Grok</button>
        <button class="ai-quickstart-llm-btn" onclick="copyAiPrompt()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy prompt
        </button>
      </div>
    </div>
  </div>
  <div class="ai-quickstart-toast" id="aiToast"></div>

  <script>
    const TAXONOMY = ${taxonomyJSON};
    const CATEGORY_SCHEMAS_UI = ${categorySchemaJSON};
    const DEFAULT_SCHEMA_UI = ${JSON.stringify(defaultSchemaForUI)};

    // ===== AI Quick Start =====
    var AI_QUICKSTART_PROMPT = 'I want to learn about the Pelagora network, a peer-to-peer marketplace for buying and selling items. Please read this page first: https://reffo.ai/for-bots \\u2014 it contains everything you need to know about how the Pelagora network works, including the beacon app, the webapp, listings, offers, and negotiations. Then help me get started with creating listings and finding items.';

    // Populate prompt text elements on load
    (function() {
      var els = document.querySelectorAll('#aiPromptText, #aiModalPromptText');
      for (var i = 0; i < els.length; i++) { els[i].textContent = AI_QUICKSTART_PROMPT; }
    })();

    var aiToastTimer = null;
    function showAiToast(msg) {
      var el = document.getElementById('aiToast');
      el.textContent = msg;
      el.classList.add('show');
      if (aiToastTimer) clearTimeout(aiToastTimer);
      aiToastTimer = setTimeout(function() { el.classList.remove('show'); }, 2500);
    }

    function copyAiPrompt() {
      navigator.clipboard.writeText(AI_QUICKSTART_PROMPT).then(function() {
        showAiToast('Prompt copied to clipboard!');
      });
    }

    var LLM_PROVIDERS = {
      perplexity: { label: 'Perplexity', url: 'https://www.perplexity.ai/?q=' + encodeURIComponent(AI_QUICKSTART_PROMPT), directFill: true },
      claude: { label: 'Claude', url: 'https://claude.ai' },
      chatgpt: { label: 'ChatGPT', url: 'https://chatgpt.com' },
      gemini: { label: 'Gemini', url: 'https://gemini.google.com' },
      grok: { label: 'Grok', url: 'https://grok.com' }
    };

    function openWithLlm(provider) {
      var p = LLM_PROVIDERS[provider];
      if (!p) return;
      if (p.directFill) {
        window.open(p.url, '_blank', 'noopener,noreferrer');
      } else {
        navigator.clipboard.writeText(AI_QUICKSTART_PROMPT).then(function() {
          window.open(p.url, '_blank', 'noopener,noreferrer');
          showAiToast('Prompt copied! Paste it in ' + p.label);
        });
      }
    }

    function openAiQuickStartModal() {
      document.getElementById('aiQuickStartModal').classList.add('open');
    }
    window.openAiQuickStartModal = openAiQuickStartModal;

    function closeAiQuickStartModal() {
      document.getElementById('aiQuickStartModal').classList.remove('open');
    }
    window.closeAiQuickStartModal = closeAiQuickStartModal;

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('aiQuickStartModal').classList.contains('open')) {
        closeAiQuickStartModal();
      }
    });

    // ===== Tab switching =====
    function switchTab(tab) {
      var tabs = ['home','dashboard','refs','detail','search','inbox','settings','list','scan','collections','terms','privacy','acceptable-use','for-bots'];
      tabs.forEach(function(t) {
        var el = document.getElementById('tab-' + t);
        if (el) el.classList.toggle('hidden', tab !== t);
      });
      // Show/hide global search filter bar (only for network search tab)
      var sfbWrap = document.getElementById('globalSearchBarWrapper');
      if (sfbWrap) sfbWrap.style.display = (tab === 'search') ? '' : 'none';
      if (tab === 'home') { homeLoaded = false; loadHome(); }
      if (tab === 'inbox') loadInbox();
      if (tab === 'refs') loadMyRefs();
      if (tab === 'settings') loadSettings();
      if (tab === 'scan') loadScanHistory();
      if (tab === 'collections') loadCollections();
      // Update sidebar active state
      document.querySelectorAll('.sidebar-nav-item[data-sidebar]').forEach(function(item) {
        item.classList.remove('active');
      });
      var sidebarMap = { home: 'home', dashboard: 'dashboard', refs: 'refs', detail: 'refs', search: 'search', inbox: 'inbox', settings: 'settings', list: 'list', scan: 'scan', collections: 'collections' };
      var mappedSidebar = sidebarMap[tab];
      if (mappedSidebar) {
        var activeItem = document.querySelector('.sidebar-nav-item[data-sidebar="' + mappedSidebar + '"]');
        if (activeItem) activeItem.classList.add('active');
      }
      if (tab === 'dashboard') loadDashboard();
      window.scrollTo(0, 0);
    }

    var currentInboxTab = 'all';
    function switchInboxTab(tab) {
      currentInboxTab = tab;
      document.querySelectorAll('.tab[data-inboxtab]').forEach(t => t.classList.toggle('active', t.dataset.inboxtab === tab));
      renderInboxView();
    }

    function switchRefSubTab(tab) {
      document.querySelectorAll('.ref-subtab').forEach(t => t.classList.toggle('active', t.dataset.reftab === tab));
      document.getElementById('refSubtabActive').classList.toggle('hidden', tab !== 'active');
      document.getElementById('refSubtabArchive').classList.toggle('hidden', tab !== 'archive');
      document.getElementById('refSubtabFavorites').classList.toggle('hidden', tab !== 'favorites');
      if (tab === 'archive') loadArchivedRefs();
      if (tab === 'active') loadMyRefs();
      if (tab === 'favorites') loadFavorites();
    }

    // ===== Sidebar navigation =====
    function sidebarNav(target) {
      closeSidebar();
      if (target === 'home') { switchTab('home'); return; }
      if (target === 'dashboard') { switchTab('dashboard'); return; }
      if (target === 'refs') { switchTab('refs'); switchRefSubTab('active'); return; }
      if (target === 'archive') { switchTab('refs'); switchRefSubTab('archive'); return; }
      if (target === 'favorites') { switchTab('refs'); switchRefSubTab('favorites'); return; }
      if (target === 'inbox') { switchTab('inbox'); return; }
      if (target === 'scan') { switchTab('scan'); return; }
      if (target === 'collections') { switchTab('collections'); return; }
      if (target === 'list') { switchTab('list'); return; }
      if (target === 'search') { switchTab('search'); return; }
      if (target === 'settings') { switchTab('settings'); return; }
    }
    window.sidebarNav = sidebarNav;

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('open');
    }
    window.toggleSidebar = toggleSidebar;

    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('open');
    }
    window.closeSidebar = closeSidebar;

    // ===== Home =====
    let homeLoaded = false;
    async function loadHome() {
      if (homeLoaded) return;
      try {
        const res = await fetch('/health/dashboard');
        const data = await res.json();
        const container = document.getElementById('homeRecentItems');
        if (!data.recentItems || data.recentItems.length === 0) {
          container.innerHTML = '<div class="home-recent-empty"><p>No listings yet &mdash; create your first!</p><button class="btn-primary" onclick="sidebarNav(\\'list\\')">+ Create New Listing</button></div>';
          homeLoaded = true;
          return;
        }
        const mediaMap = {};
        await Promise.all(data.recentItems.map(async function(ref) {
          try {
            const mRes = await fetch('/refs/' + ref.id + '/media');
            mediaMap[ref.id] = await mRes.json();
          } catch(e) { mediaMap[ref.id] = []; }
        }));
        container.innerHTML = '<div class="home-recent-grid">' + data.recentItems.map(function(ref) {
          var photos = (mediaMap[ref.id] || []).filter(function(m) { return m.mediaType === 'photo'; });
          var firstPhoto = photos[0];
          var imgHtml = firstPhoto
            ? '<img src="/' + escapeHtml(firstPhoto.filePath) + '" alt="">'
            : '<div style="height:140px;display:flex;align-items:center;justify-content:center;background:var(--bg);color:#D2D5DB;font-size:32px;">&#x1F4F7;</div>';
          var price = ref.listingStatus === 'willing_to_sell' ? 'Make me sell' : ref.price ? fmtCurrency(ref.price, 'USD') : '';
          var statusLabel = statusLabels[ref.listingStatus] || 'Private';
          var statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
          return '<div class="home-recent-card" onclick="openDetail(\\'' + ref.id + '\\')">' + imgHtml + '<div class="card-body"><div class="card-name">' + escapeHtml(ref.name) + '</div><div class="card-meta">' + escapeHtml(ref.category || '') + ' <span class="status-badge ' + statusClass + '">' + statusLabel + '</span></div>' + (price ? '<div class="card-price">' + price + '</div>' : '') + '</div></div>';
        }).join('') + '</div>';
        homeLoaded = true;
      } catch(e) {
        document.getElementById('homeRecentItems').innerHTML = '<div style="padding:20px;color:#777E90;font-size:13px;">Could not load listings.</div>';
      }
    }

    function homeSearchSubmit() {
      // Sync mobile values to desktop if mobile was used
      var qMobile = document.getElementById('homeSearchQMobile');
      var catMobile = document.getElementById('homeSearchCatMobile');
      var locMobile = document.getElementById('homeSearchLocMobile');
      var q = document.getElementById('homeSearchQ');
      var cat = document.getElementById('homeSearchCat');
      var loc = document.getElementById('homeSearchLoc');
      // Prefer mobile values if they have content
      var qVal = (qMobile && qMobile.value) || (q ? q.value : '');
      var catVal = (catMobile && catMobile.value) || (cat ? cat.value : '');
      var locVal = (locMobile && locMobile.value) || (loc ? loc.value : '');
      // Copy into global search inputs
      document.getElementById('headerSearchQ').value = qVal;
      document.getElementById('headerSearchCat').value = catVal;
      document.getElementById('headerSearchLoc').value = locVal;
      // Also sync to global mobile inputs
      var mQ = document.getElementById('mobileSearchQ'); if (mQ) mQ.value = qVal;
      var mC = document.getElementById('mobileSearchCat'); if (mC) mC.value = catVal;
      var mL = document.getElementById('mobileSearchLoc'); if (mL) mL.value = locVal;
      executeHeaderSearch();
    }
    window.homeSearchSubmit = homeSearchSubmit;

    function expandHomeMobileSearch() {
      var el = document.getElementById('homeSearchExpandedMobile');
      if (el) el.classList.add('open');
      var pill = document.getElementById('homeSearchPillMobile');
      if (pill) pill.style.display = 'none';
    }
    window.expandHomeMobileSearch = expandHomeMobileSearch;

    function collapseHomeMobileSearch() {
      var el = document.getElementById('homeSearchExpandedMobile');
      if (el) el.classList.remove('open');
      var pill = document.getElementById('homeSearchPillMobile');
      if (pill) pill.style.display = '';
    }
    window.collapseHomeMobileSearch = collapseHomeMobileSearch;

    // ===== Dashboard =====
    async function loadDashboard() {
      try {
        const res = await fetch('/health/dashboard');
        const data = await res.json();
        document.getElementById('statTotalListed').textContent = data.totalListed;
        document.getElementById('statActiveOffers').textContent = data.activeOffers;
        document.getElementById('statPendingNegs').textContent = data.pendingNegotiations;
        document.getElementById('statFavorites').textContent = data.favoritesCount;

        // Recent items
        const itemsContainer = document.getElementById('recentItemsList');
        if (data.recentItems && data.recentItems.length > 0) {
          // Load media for recent items
          const mediaMap = {};
          await Promise.all(data.recentItems.map(async ref => {
            try {
              const mRes = await fetch('/refs/' + ref.id + '/media');
              mediaMap[ref.id] = await mRes.json();
            } catch(e) { mediaMap[ref.id] = []; }
          }));

          itemsContainer.innerHTML = data.recentItems.map(function(ref) {
            var photos = (mediaMap[ref.id] || []).filter(function(m) { return m.mediaType === 'photo'; });
            var firstPhoto = photos[0];
            var imgHtml = firstPhoto
              ? '<div class="row-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
              : '<div class="row-img"><span style="color:#E6E8EC;font-size:14px;">&#x26A1;</span></div>';
            var statusLabel = statusLabels[ref.listingStatus] || 'Private';
            var statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
            var date = new Date(ref.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return '<div class="recent-list-row" onclick="openDetail(\\'' + ref.id + '\\')">' +
              imgHtml +
              '<div class="row-info"><div class="row-name">' + escapeHtml(ref.name) + '</div>' +
              '<div class="row-sub">' + escapeHtml(ref.category || '') + '</div></div>' +
              '<span class="row-badge badge ' + statusClass + '" style="font-size:10px;padding:0 8px;line-height:22px;">' + statusLabel + '</span>' +
              '<span class="row-date">' + date + '</span></div>';
          }).join('');
        } else {
          itemsContainer.innerHTML = '<div style="padding:20px;color:#B1B5C3;font-size:13px;font-style:italic;">No listings yet</div>';
        }

        // Recent offers
        const offersContainer = document.getElementById('recentOffersList');
        if (data.recentOffers && data.recentOffers.length > 0) {
          offersContainer.innerHTML = data.recentOffers.map(function(offer) {
            var date = new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            var statusClass = { active: 'badge-for-sale', sold: 'badge-archived-sold', cancelled: 'badge-archived-deleted' }[offer.status] || 'badge-private';
            return '<div class="recent-list-row">' +
              '<div class="row-img"><span style="color:#1a8a42;font-size:14px;">$</span></div>' +
              '<div class="row-info"><div class="row-name">' + escapeHtml(fmtCurrency(offer.price, offer.priceCurrency)) + '</div>' +
              '<div class="row-sub">Ref: ' + escapeHtml(offer.refId).substring(0, 8) + '...</div></div>' +
              '<span class="row-badge badge ' + statusClass + '" style="font-size:10px;padding:0 8px;line-height:22px;">' + escapeHtml(offer.status) + '</span>' +
              '<span class="row-date">' + date + '</span></div>';
          }).join('');
        } else {
          offersContainer.innerHTML = '<div style="padding:20px;color:#B1B5C3;font-size:13px;font-style:italic;">No offers yet</div>';
        }
      } catch(e) {
        document.getElementById('recentItemsList').innerHTML = '<div style="padding:20px;color:#B1B5C3;font-size:13px;">Failed to load dashboard</div>';
      }
    }

    // ===== Bulk selection =====
    if (!window._selectedRefIds) window._selectedRefIds = new Set();

    window.toggleSelectRef = function(refId, checked) {
      if (checked) window._selectedRefIds.add(refId);
      else window._selectedRefIds.delete(refId);
      updateBulkBar();
    };

    window.toggleSelectAll = function(checked) {
      // Handle both table rows and ref-rows
      document.querySelectorAll('.table-row .col-check input[type=checkbox], .ref-row input[type=checkbox]').forEach(function(cb) {
        var row = cb.closest('.table-row') || cb.closest('.ref-row');
        var refId = row ? (row.getAttribute('data-refid') || '') : '';
        if (!refId) {
          var onclick = row ? row.getAttribute('onclick') : '';
          var match = onclick ? onclick.match(/openDetail\\('([^']+)'\\)/) : null;
          if (match) refId = match[1];
        }
        if (refId) {
          if (checked) window._selectedRefIds.add(refId);
          else window._selectedRefIds.delete(refId);
          cb.checked = checked;
        }
      });
      updateBulkBar();
    };

    function updateBulkBar() {
      var sidebar = document.getElementById('bulkActionSidebar');
      var count = window._selectedRefIds.size;
      if (count > 0) {
        sidebar.classList.add('show');
        document.getElementById('bulkCount').textContent = count;
      } else {
        sidebar.classList.remove('show');
      }
    }

    window.clearSelection = function() {
      window._selectedRefIds.clear();
      document.querySelectorAll('.table-row .col-check input[type=checkbox], .ref-row input[type=checkbox]').forEach(function(cb) { cb.checked = false; });
      var selectAll = document.querySelector('.table-header-row .col-check input[type=checkbox]');
      if (selectAll) selectAll.checked = false;
      updateBulkBar();
    };

    window.bulkArchive = async function() {
      var ids = Array.from(window._selectedRefIds);
      if (ids.length === 0) return;
      if (!confirm('Archive ' + ids.length + ' item(s)?')) return;
      try {
        var res = await fetch('/refs/bulk-archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids })
        });
        if (!res.ok) throw new Error('Failed');
        var data = await res.json();
        showToast(data.archived + ' item(s) archived', 'accepted');
        window._selectedRefIds.clear();
        updateBulkBar();
        homeLoaded = false;
        await loadMyRefs();
      } catch(e) {
        console.error('[BulkArchive] Failed:', e);
        showToast('Failed to archive items', 'rejected');
      }
    };

    window.bulkDelete = async function() {
      var ids = Array.from(window._selectedRefIds);
      if (ids.length === 0) return;
      if (!confirm('Delete ' + ids.length + ' item(s)? This will archive them.')) return;
      try {
        var res = await fetch('/refs/bulk-archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids })
        });
        if (!res.ok) throw new Error('Failed');
        var data = await res.json();
        showToast(data.archived + ' item(s) deleted', '');
        window._selectedRefIds.clear();
        updateBulkBar();
        homeLoaded = false;
        await loadMyRefs();
      } catch(e) {
        console.error('[BulkDelete] Failed:', e);
        showToast('Failed to delete items', 'rejected');
      }
    };

    window.bulkSetStatus = async function(status) {
      var ids = Array.from(window._selectedRefIds);
      if (ids.length === 0) return;
      var labels = { private: 'Private', for_sale: 'For Sale', willing_to_sell: 'Willing to Sell', for_rent: 'For Rent' };
      var label = labels[status] || status;
      if (!confirm('Set ' + ids.length + ' item(s) to "' + label + '"?')) return;
      try {
        var res = await fetch('/refs/bulk-update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids, listingStatus: status })
        });
        if (!res.ok) throw new Error('Failed');
        var data = await res.json();
        showToast(data.updated + ' item(s) set to ' + label, 'accepted');
        window._selectedRefIds.clear();
        updateBulkBar();
        loadMyRefs();
      } catch(e) {
        showToast('Failed to update status', 'rejected');
      }
    };

    window.bulkMoveToCollection = async function() {
      var ids = Array.from(window._selectedRefIds);
      if (ids.length === 0) return;
      try {
        var colsRes = await fetch('/collections');
        var cols = await colsRes.json();
        var options = ['(none - remove from collection)'].concat(cols.map(function(c) { return c.name; }));
        var choice = prompt('Move ' + ids.length + ' item(s) to collection:\\n' + options.map(function(o, i) { return i + ': ' + o; }).join('\\n') + '\\n\\nEnter number:');
        if (choice === null) return;
        var idx = parseInt(choice, 10);
        if (isNaN(idx) || idx < 0 || idx > cols.length) { showToast('Invalid choice', 'rejected'); return; }
        var collectionId = idx === 0 ? null : cols[idx - 1].id;
        var res = await fetch('/refs/bulk-move-collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids, collectionId: collectionId })
        });
        if (!res.ok) throw new Error('Failed');
        var data = await res.json();
        showToast(data.updated + ' item(s) moved', 'accepted');
        window._selectedRefIds.clear();
        updateBulkBar();
        loadMyRefs();
      } catch(e) {
        showToast('Failed to move items', 'rejected');
      }
    };

    window.archiveRef = async function(refId) {
      if (!confirm('Archive this ref?')) return;
      try {
        var res = await fetch('/refs/' + refId, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        showToast('Ref archived', 'accepted');
        homeLoaded = false;
        await loadMyRefs();
      } catch(e) {
        console.error('[Archive] Failed:', e);
        showToast('Failed to archive ref', 'rejected');
      }
    };

    window.deleteRefWithConfirm = async function(refId) {
      if (!confirm('Delete this ref? It will be moved to the archive.')) return;
      try {
        var res = await fetch('/refs/' + refId, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        showToast('Ref archived', 'accepted');
        homeLoaded = false;
        await loadMyRefs();
      } catch(e) {
        console.error('[Delete] Failed:', e);
        showToast('Failed to delete ref', 'rejected');
      }
    };

    // ===== Archive multi-select =====
    if (!window._selectedArchiveIds) window._selectedArchiveIds = new Set();

    function updateArchiveBulkBar() {
      var sidebar = document.getElementById('archiveBulkSidebar');
      var count = window._selectedArchiveIds.size;
      if (count > 0) { sidebar.classList.add('show'); document.getElementById('archiveBulkCount').textContent = count; }
      else { sidebar.classList.remove('show'); }
    }

    window.toggleSelectArchive = function(id, checked) {
      if (checked) window._selectedArchiveIds.add(id); else window._selectedArchiveIds.delete(id);
      updateArchiveBulkBar();
    };

    window.toggleSelectAllArchive = function(checked) {
      document.querySelectorAll('#archivedRefs .ref-row input[type=checkbox]').forEach(function(cb) {
        var row = cb.closest('.ref-row');
        var refId = row ? row.getAttribute('data-refid') : '';
        if (refId) { cb.checked = checked; if (checked) window._selectedArchiveIds.add(refId); else window._selectedArchiveIds.delete(refId); }
      });
      updateArchiveBulkBar();
    };

    window.clearArchiveSelection = function() {
      window._selectedArchiveIds.clear();
      document.querySelectorAll('#archivedRefs input[type=checkbox]').forEach(function(cb) { cb.checked = false; });
      updateArchiveBulkBar();
    };

    window.bulkRestoreArchived = async function() {
      var ids = Array.from(window._selectedArchiveIds);
      if (ids.length === 0) return;
      try {
        for (var i = 0; i < ids.length; i++) {
          await fetch('/refs/' + ids[i] + '/restore', { method: 'POST' });
        }
        showToast(ids.length + ' ref(s) restored', 'accepted');
        window._selectedArchiveIds.clear();
        loadArchivedRefs();
        loadMyRefs();
      } catch { showToast('Bulk restore failed', 'rejected'); }
    };

    window.bulkDeleteForeverArchived = async function() {
      var ids = Array.from(window._selectedArchiveIds);
      if (ids.length === 0) return;
      if (!confirm('Permanently delete ' + ids.length + ' ref(s)? This cannot be undone.')) return;
      try {
        for (var i = 0; i < ids.length; i++) {
          await fetch('/refs/' + ids[i] + '/permanent', { method: 'DELETE' });
        }
        showToast(ids.length + ' ref(s) permanently deleted', '');
        window._selectedArchiveIds.clear();
        loadArchivedRefs();
      } catch { showToast('Bulk delete failed', 'rejected'); }
    };

    async function loadArchivedRefs() {
      const container = document.getElementById('archivedRefs');
      try {
        const res = await fetch('/refs?archived=true');
        const refs = await res.json();
        if (refs.length === 0) {
          container.innerHTML = '<p class="empty">No archived refs</p>';
          updateArchiveBulkBar();
          return;
        }

        var selectedIds = window._selectedArchiveIds || new Set();
        var allSelected = refs.every(function(r) { return selectedIds.has(r.id); });

        container.innerHTML =
          '<div style="display:flex;align-items:center;gap:10px;padding:4px 12px 8px;">' +
            '<input type="checkbox" ' + (allSelected ? 'checked' : '') + ' onchange="toggleSelectAllArchive(this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#EC526F;">' +
            '<span style="font-size:11px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.05em;">' + (selectedIds.size > 0 ? selectedIds.size + ' selected' : 'Select all') + '</span>' +
          '</div>' +
          '<div class="rows">' + refs.map(function(ref) {
            var statusLabel = ref.listingStatus === 'archived_sold' ? 'Sold' : 'Deleted';
            var statusStyle = ref.listingStatus === 'archived_sold' ? 'background:#e8eaed;color:#1a8a42;' : 'background:#fce8e6;color:#E92222;';
            var archiveDate = new Date(ref.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            var isSelected = selectedIds.has(ref.id);

            return '<div class="ref-row" data-refid="' + ref.id + '" style="cursor:default;">' +
              '<div onclick="event.stopPropagation()" style="flex-shrink:0;margin-right:8px;display:flex;align-items:center;">' +
                '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleSelectArchive(\\'' + ref.id + '\\', this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#EC526F;">' +
              '</div>' +
              '<span class="row-name">' + escapeHtml(ref.name) + '</span>' +
              '<div class="row-meta">' +
                '<span class="badge" style="font-size:10px;padding:0 8px;line-height:22px;' + statusStyle + '">' + statusLabel + '</span>' +
                (ref.category ? '<span class="badge badge-cat" style="font-size:10px;padding:0 8px;line-height:22px;">' + escapeHtml(ref.category) + '</span>' : '') +
                '<span style="font-size:11px;color:#777E90;">' + archiveDate + '</span>' +
              '</div>' +
              '<div style="display:flex;gap:6px;flex-shrink:0;margin-left:auto;" onclick="event.stopPropagation()">' +
                '<button class="btn-secondary btn-sm" style="font-size:11px;" onclick="restoreRef(\\'' + ref.id + '\\')">Restore</button>' +
                '<button class="btn-danger btn-sm" style="font-size:11px;" onclick="permanentDeleteRef(\\'' + ref.id + '\\')">Delete</button>' +
              '</div>' +
            '</div>';
          }).join('') + '</div>';
        updateArchiveBulkBar();
      } catch {
        container.innerHTML = '<p class="empty">Failed to load archived refs</p>';
      }
    }

    window.restoreRef = async function(refId) {
      try {
        const res = await fetch('/refs/' + refId + '/restore', { method: 'POST' });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        showToast('Ref restored', 'accepted');
        loadArchivedRefs();
        loadMyRefs();
      } catch (err) {
        showToast('Restore failed: ' + err.message, 'rejected');
      }
    };

    window.permanentDeleteRef = async function(refId) {
      if (!confirm('Permanently delete this ref? This cannot be undone. All media and data will be destroyed.')) return;
      try {
        const res = await fetch('/refs/' + refId + '/permanent', { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        showToast('Ref permanently deleted', '');
        loadArchivedRefs();
      } catch {
        showToast('Failed to permanently delete ref', 'rejected');
      }
    };

    // ===== Category dropdowns =====
    function populateCategories(selectEl, onChange) {
      Object.keys(TAXONOMY).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        selectEl.appendChild(opt);
      });
      if (onChange) selectEl.addEventListener('change', onChange);
    }

    function populateSubcategories(catSelectEl, subSelectEl) {
      const cat = catSelectEl.value;
      subSelectEl.innerHTML = '<option value="">Select...</option>';
      if (cat && TAXONOMY[cat]) {
        TAXONOMY[cat].forEach(sc => {
          const opt = document.createElement('option');
          opt.value = sc;
          opt.textContent = sc;
          subSelectEl.appendChild(opt);
        });
      }
    }

    populateCategories(document.getElementById('refCat'), () =>
      populateSubcategories(document.getElementById('refCat'), document.getElementById('refSubcat'))
    );
    populateCategories(document.getElementById('headerSearchCat'));
    populateCategories(document.getElementById('mobileSearchCat'));
    populateCategories(document.getElementById('homeSearchCat'));
    populateCategories(document.getElementById('homeSearchCatMobile'));

    document.getElementById('refCat').addEventListener('change', function() {
      renderCategoryFields('createCategoryFields', this.value, document.getElementById('refSubcat').value, {});
    });
    document.getElementById('refSubcat').addEventListener('change', function() {
      renderCategoryFields('createCategoryFields', document.getElementById('refCat').value, this.value, {});
    });

    // ===== Category Schema Helpers =====
    function getCatSchema(category, subcategory) {
      if (category && subcategory) {
        var exact = CATEGORY_SCHEMAS_UI[category + '|' + subcategory];
        if (exact) return exact;
      }
      return DEFAULT_SCHEMA_UI;
    }

    function renderCategoryFields(containerId, category, subcategory, existingAttrs) {
      var container = document.getElementById(containerId);
      if (!container) return;
      var schema = getCatSchema(category, subcategory);
      var html = '';

      // Condition dropdown (if category has condition options)
      if (schema.conditionOptions.length > 0) {
        var currentCondition = (existingAttrs && existingAttrs._condition) || '';
        html += '<label for="' + containerId + '_condition">Condition</label>';
        html += '<select id="' + containerId + '_condition">';
        html += '<option value="">Select condition...</option>';
        schema.conditionOptions.forEach(function(opt) {
          var label = opt.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
          html += '<option value="' + opt + '"' + (currentCondition === opt ? ' selected' : '') + '>' + label + '</option>';
        });
        html += '</select>';
      }

      // Category-specific attribute fields
      if (schema.attributes.length > 0) {
        html += '<div style="font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.02em;margin-bottom:8px;margin-top:4px;">Category Details</div>';
        // Render in rows of 2
        for (var i = 0; i < schema.attributes.length; i += 2) {
          var a1 = schema.attributes[i];
          var a2 = schema.attributes[i + 1];
          html += '<div class="row">';
          html += renderAttrField(containerId, a1, existingAttrs);
          if (a2) html += renderAttrField(containerId, a2, existingAttrs);
          html += '</div>';
        }
      }

      container.innerHTML = html;
    }

    function renderAttrField(prefix, attr, existingAttrs) {
      var val = (existingAttrs && existingAttrs[attr.key] != null) ? existingAttrs[attr.key] : '';
      var fieldId = prefix + '_' + attr.key;
      var html = '<div>';
      html += '<label for="' + fieldId + '">' + attr.label + '</label>';

      if (attr.type === 'select') {
        html += '<select id="' + fieldId + '">';
        html += '<option value="">Select...</option>';
        (attr.options || []).forEach(function(opt) {
          var label = opt.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
          html += '<option value="' + opt + '"' + (String(val) === opt ? ' selected' : '') + '>' + label + '</option>';
        });
        html += '</select>';
      } else if (attr.type === 'boolean') {
        html += '<select id="' + fieldId + '">';
        html += '<option value=""' + (!val ? ' selected' : '') + '>\\u2014</option>';
        html += '<option value="true"' + (val === true || val === 'true' ? ' selected' : '') + '>Yes</option>';
        html += '<option value="false"' + (val === false || val === 'false' ? ' selected' : '') + '>No</option>';
        html += '</select>';
      } else {
        html += '<input id="' + fieldId + '" type="' + (attr.type === 'number' ? 'number' : 'text') + '"';
        if (attr.placeholder) html += ' placeholder="' + attr.placeholder + '"';
        if (attr.type === 'number') html += ' step="any"';
        html += ' value="' + (val !== '' && val !== undefined ? val : '') + '">';
      }

      html += '</div>';
      return html;
    }

    function collectCategoryAttrs(containerId, category, subcategory) {
      var schema = getCatSchema(category, subcategory);
      var attrs = {};

      // Collect condition
      var condEl = document.getElementById(containerId + '_condition');
      if (condEl && condEl.value) attrs._condition = condEl.value;

      // Collect attribute fields
      schema.attributes.forEach(function(a) {
        var el = document.getElementById(containerId + '_' + a.key);
        if (!el) return;
        var v = el.value;
        if (v === '' || v === undefined) return;
        if (a.type === 'number') {
          attrs[a.key] = parseFloat(v);
        } else if (a.type === 'boolean') {
          if (v === 'true') attrs[a.key] = true;
          else if (v === 'false') attrs[a.key] = false;
        } else {
          attrs[a.key] = v;
        }
      });

      return attrs;
    }

    function buildAttributeSummary(category, subcategory, attrs, condition) {
      if (!attrs && !condition) return '';
      var schema = getCatSchema(category, subcategory);
      var parts = [];
      if (condition) {
        parts.push(condition.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); }));
      }
      schema.attributes.forEach(function(a) {
        if (!a.summary || !attrs || !attrs[a.key]) return;
        var v = String(attrs[a.key]);
        if (a.unit) v += ' ' + a.unit;
        parts.push(v);
      });
      return parts.join(' \\u00B7 ');
    }

    // ===== Helpers =====
    function escapeHtml(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    function escapeJs(s) {
      if (!s) return '';
      return String(s).replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'").replace(/"/g, '\\\\"').replace(/\\n/g, '\\\\n').replace(/\\r/g, '');
    }

    function fmtCurrency(amount, currency) {
      currency = currency || 'USD';
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
      } catch(e) {
        return currency + ' ' + Number(amount).toFixed(2);
      }
    }

    function showMsg(elId, text, ok) {
      const el = document.getElementById(elId);
      el.innerHTML = '<div class="msg ' + (ok ? 'ok' : 'err') + '">' + escapeHtml(text) + '</div>';
      setTimeout(() => el.innerHTML = '', 4000);
    }

    function showToast(message, type) {
      type = type || '';
      const t = document.createElement('div');
      t.className = 'toast' + (type ? ' toast-' + type : '');
      t.textContent = message;
      document.getElementById('toast-container').appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
      }, 5000);
    }

    function showSyncModal(refId) {
      var modal = document.getElementById('syncModal');
      modal.classList.remove('hidden');
      var btn = document.getElementById('syncModalConfirmBtn');
      // Clone to remove old listeners
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.onclick = async function() {
        newBtn.disabled = true;
        newBtn.textContent = 'Syncing...';
        try {
          var syncRes = await fetch('/settings/sync-item/' + refId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sync: true })
          });
          var syncData = await syncRes.json();
          if (syncRes.ok) {
            showToast(syncData.warning ? 'Ref marked for sync (remote pending)' : 'Ref synced to Reffo.ai', 'accepted');
          } else {
            showToast('Sync failed: ' + (syncData.error || 'Unknown error'), 'rejected');
          }
        } catch(e) {
          showToast('Sync failed: ' + e.message, 'rejected');
        }
        closeSyncModal();
        openDetail(refId);
      };
    }
    window.closeSyncModal = function() {
      document.getElementById('syncModal').classList.add('hidden');
    };

    function uploadPhotoForRef(refId) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = function() {
        const file = input.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('photos', file);
        fetch('/refs/' + refId + '/media', { method: 'POST', body: fd })
          .then(function(r) { return r.json(); })
          .then(function() { showToast('Photo uploaded', ''); loadRefDetail(refId); })
          .catch(function() { showToast('Upload failed', 'error'); });
      };
      input.click();
    }

    const statusLabels = { private: 'Private', for_sale: 'For Sale', willing_to_sell: 'Willing to Sell', for_rent: 'For Rent', archived_sold: 'Sold (Archived)', archived_deleted: 'Deleted (Archived)' };
    const statusBadgeClass = { private: 'badge-private', for_sale: 'badge-for-sale', willing_to_sell: 'badge-willing', for_rent: 'badge-for-rent', archived_sold: 'badge-archived-sold', archived_deleted: 'badge-archived-deleted' };
    const negStatusLabels = { pending: 'Pending', accepted: 'Under Contract', rejected: 'Rejected', countered: 'Countered', withdrawn: 'Withdrawn', sold: 'Sold' };

    let lastSearchResults = [];

    // ===== File Preview with Delete =====
    let selectedPhotos = [];
    let selectedVideo = null;

    function renderPhotoPreview() {
      const preview = document.getElementById('photoPreview');
      preview.innerHTML = '';
      selectedPhotos.forEach(function(file, idx) {
        const url = URL.createObjectURL(file);
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        thumb.style.cssText = 'width:72px;height:72px;';
        thumb.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">' +
          '<button class="del-btn" type="button" onclick="removePhoto(' + idx + ')" title="Remove">&times;</button>';
        preview.appendChild(thumb);
      });
    }

    function renderVideoPreview() {
      const preview = document.getElementById('videoPreview');
      preview.innerHTML = '';
      if (selectedVideo) {
        const url = URL.createObjectURL(selectedVideo);
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        thumb.style.cssText = 'width:72px;height:72px;';
        thumb.innerHTML = '<video src="' + url + '" style="width:100%;height:100%;object-fit:cover;" muted></video>' +
          '<button class="del-btn" type="button" onclick="removeVideo()" title="Remove">&times;</button>';
        preview.appendChild(thumb);
      }
    }

    window.removePhoto = function(idx) {
      selectedPhotos.splice(idx, 1);
      renderPhotoPreview();
    };

    window.removeVideo = function() {
      selectedVideo = null;
      renderVideoPreview();
    };

    // ===== AI Suggested Image Card (near photos) =====
    function renderAiSuggestedImage(context) {
      var containerId = context === 'detail' ? 'detailAiSuggestedImage' : 'aiSuggestedImage';
      var container = document.getElementById(containerId);
      if (!container) return;
      var imgUrl = window._autofillImageUrl && window._autofillImageUrl[context];
      if (!imgUrl || (context === 'create' && selectedPhotos.length > 0)) {
        container.innerHTML = '';
        return;
      }
      var expandId = context === 'detail' ? 'aiImageExpandedDetail' : 'aiImageExpandedCreate';
      var ctxEsc = escapeHtml(context);
      container.innerHTML = '<div class="ai-suggested-img">' +
        '<img src="' + escapeHtml(imgUrl) + '" class="ai-img-preview" onclick="toggleAiImageExpand(\\'' + ctxEsc + '\\')" onerror="this.parentElement.style.display=\\'none\\'" title="Click to preview">' +
        '<div class="ai-img-info">' +
          '<div class="ai-img-label"><span class="autofill-badge">AI</span> Suggested product image</div>' +
          '<div class="ai-img-hint">Use this as your listing photo, or upload your own.</div>' +
          '<div class="ai-img-actions">' +
            '<button type="button" class="ai-use-btn" onclick="useAiImage(\\'' + ctxEsc + '\\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Use Image</button>' +
            '<button type="button" class="ai-dismiss-btn" onclick="dismissAiImage(\\'' + ctxEsc + '\\')">Dismiss</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="' + expandId + '" style="display:none;text-align:center;margin-top:6px;margin-bottom:6px;">' +
        '<img src="' + escapeHtml(imgUrl) + '" class="ai-suggested-img ai-img-expanded" style="margin:0 auto;" onerror="this.style.display=\\'none\\'">' +
      '</div>';
    }

    window.toggleAiImageExpand = function(context) {
      var expandedId = context === 'detail' ? 'aiImageExpandedDetail' : 'aiImageExpandedCreate';
      var el = document.getElementById(expandedId);
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };

    window.useAiImage = async function(context) {
      var imgUrl = window._autofillImageUrl && window._autofillImageUrl[context];
      if (!imgUrl) return;
      if (context === 'create') {
        try {
          // Fetch the image and stage it as a photo file
          var resp = await fetch(imgUrl);
          if (!resp.ok) throw new Error('Failed to fetch image');
          var blob = await resp.blob();
          var ext = (blob.type || 'image/jpeg').split('/')[1] || 'jpg';
          var file = new File([blob], 'ai-suggested.' + ext, { type: blob.type || 'image/jpeg' });
          selectedPhotos.push(file);
          renderPhotoPreview();
          window._autofillImageUrl.create = null;
          renderAiSuggestedImage('create');
          showToast('AI image added to photos', 'accepted');
        } catch (err) {
          // CORS blocked direct fetch — mark as accepted, image will be downloaded server-side on create
          var container = document.getElementById('aiSuggestedImage');
          if (container) {
            container.innerHTML = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
              '<span style="font-size:13px;color:#15803d;font-weight:500;">AI image will be added when you create the listing</span></div>';
          }
          showToast('AI image queued — will be saved when listing is created', 'accepted');
        }
      } else if (context === 'detail') {
        var refId = _currentDetailRefId || '';
        if (!refId) return;
        try {
          var res = await fetch('/refs/' + refId + '/media/from-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imgUrl })
          });
          if (res.ok) {
            showToast('AI product image saved', 'accepted');
            window._autofillImageUrl.detail = null;
            var detailContainer = document.getElementById('detailAiSuggestedImage');
            if (detailContainer) detailContainer.innerHTML = '';
            openDetail(refId);
          } else {
            showToast('Failed to save image', 'rejected');
          }
        } catch { showToast('Failed to save image', 'rejected'); }
      }
    };

    window.dismissAiImage = function(context) {
      if (window._autofillImageUrl) window._autofillImageUrl[context] = null;
      var containerId = context === 'detail' ? 'detailAiSuggestedImage' : 'aiSuggestedImage';
      var container = document.getElementById(containerId);
      if (container) container.innerHTML = '';
    };

    document.getElementById('refPhotos').addEventListener('change', function() {
      var files = this.files;
      for (var i = 0; i < files.length; i++) {
        if (selectedPhotos.length < 30) selectedPhotos.push(files[i]);
      }
      this.value = '';
      renderPhotoPreview();
      // Hide AI suggested image when user uploads their own
      if (selectedPhotos.length > 0) renderAiSuggestedImage('create');
    });

    // ===== List Form =====
    document.getElementById('listForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('createSubmitBtn');
      btn.disabled = true;

      try {
        const name = document.getElementById('refName').value.trim();
        const description = document.getElementById('refDesc').value.trim();
        const category = document.getElementById('refCat').value;
        const subcategory = document.getElementById('refSubcat').value;
        const listingStatus = document.getElementById('refListingStatus').value;
        const quantity = parseInt(document.getElementById('refQuantity').value) || 1;
        const priceVal = document.getElementById('refPrice').value;
        const price = priceVal ? parseFloat(priceVal) : 0;
        const currency = document.getElementById('refCurrency').value;
        const sku = document.getElementById('refSku').value.trim() || undefined;
        const locCity = document.getElementById('refLocCity').value.trim() || undefined;
        const locState = document.getElementById('refLocState').value.trim() || undefined;
        const locZip = document.getElementById('refLocZip').value.trim() || undefined;
        const locLat = document.getElementById('refLocLat').value ? parseFloat(document.getElementById('refLocLat').value) : undefined;
        const locLng = document.getElementById('refLocLng').value ? parseFloat(document.getElementById('refLocLng').value) : undefined;
        const sellingScope = document.getElementById('refSellingScope').value || undefined;
        const sellingRadiusMiles = document.getElementById('refSellingRadius').value ? parseInt(document.getElementById('refSellingRadius').value) : undefined;

        const categoryAttrs = collectCategoryAttrs('createCategoryFields', category, subcategory);
        const condition = categoryAttrs._condition || undefined;
        delete categoryAttrs._condition;
        const attributes = Object.keys(categoryAttrs).length > 0 ? categoryAttrs : undefined;

        const rentalTerms = listingStatus === 'for_rent' ? (document.getElementById('refRentalTerms').value.trim() || null) : null;
        const rentalDeposit = listingStatus === 'for_rent' ? (document.getElementById('refRentalDeposit').value ? parseFloat(document.getElementById('refRentalDeposit').value) : null) : null;
        const rentalDuration = listingStatus === 'for_rent' ? (document.getElementById('refRentalDuration').value ? parseInt(document.getElementById('refRentalDuration').value) : null) : null;
        const rentalDurationUnit = listingStatus === 'for_rent' ? (document.getElementById('refRentalDurationUnit').value || null) : null;

        const refRes = await fetch('/refs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, category, subcategory, listingStatus, quantity, sku,
            locationCity: locCity, locationState: locState, locationZip: locZip,
            locationLat: locLat, locationLng: locLng,
            sellingScope, sellingRadiusMiles, condition, attributes,
            rentalTerms, rentalDeposit, rentalDuration, rentalDurationUnit })
        });
        if (!refRes.ok) { const err = await refRes.json(); throw new Error(err.error || 'Failed to create ref'); }
        const ref = await refRes.json();

        // Upload photos and video separately so one failure doesn't kill the other
        const uploadErrors = [];
        if (selectedPhotos.length > 0) {
          const fd = new FormData();
          for (let i = 0; i < Math.min(selectedPhotos.length, 4); i++) fd.append('files', selectedPhotos[i]);
          const photoRes = await fetch('/refs/' + ref.id + '/media', { method: 'POST', body: fd });
          if (!photoRes.ok) {
            let errMsg = 'Photo upload failed';
            try { const err = await photoRes.json(); errMsg = err.error || errMsg; } catch {}
            uploadErrors.push(errMsg);
          }
        }
        if (selectedVideo) {
          const fd = new FormData();
          fd.append('files', selectedVideo);
          const videoRes = await fetch('/refs/' + ref.id + '/media', { method: 'POST', body: fd });
          if (!videoRes.ok) {
            let errMsg = 'Video upload failed';
            try { const err = await videoRes.json(); errMsg = err.error || errMsg; } catch {}
            uploadErrors.push(errMsg);
          }
        }
        // Download AI autofill image if no user photos were uploaded
        if (selectedPhotos.length === 0 && window._autofillImageUrl && window._autofillImageUrl.create) {
          try {
            const imgRes = await fetch('/refs/' + ref.id + '/media/from-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: window._autofillImageUrl.create })
            });
            if (imgRes.ok) {
              showToast('AI product image saved', 'accepted');
            }
          } catch { /* ignore download failures */ }
          window._autofillImageUrl.create = null;
        }
        if (uploadErrors.length > 0) console.warn('Media upload issues:', uploadErrors.join('; '));

        // Create offer if price > 0 and not private
        if (listingStatus !== 'private' && price > 0) {
          await fetch('/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refId: ref.id, price, priceCurrency: currency })
          });
        }

        // Push to Reffo if toggle is checked
        if (document.getElementById('refAlsoPushReffo').checked) {
          try {
            const syncRes = await fetch('/settings/sync-item/' + ref.id, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sync: true })
            });
            const syncData = await syncRes.json();
            if (syncRes.ok) {
              showToast(syncData.warning ? 'Ref marked for sync (remote pending)' : 'Ref synced to Reffo.ai', 'accepted');
            } else {
              showToast('Sync failed: ' + (syncData.error || 'Unknown error'), 'rejected');
            }
          } catch (syncErr) {
            showToast('Sync failed: ' + syncErr.message, 'rejected');
          }
        }

        showMsg('listMsg', 'Ref added successfully!', true);
        e.target.reset();
        document.getElementById('refQuantity').value = '1';
        document.getElementById('refSubcat').innerHTML = '<option value="">Select...</option>';
        document.getElementById('createCategoryFields').innerHTML = '';
        // Reset segmented control to Private
        selectCreateStatus('private');
        document.getElementById('createPriceEstimate').innerHTML = '';
        selectedPhotos = [];
        selectedVideo = null;
        window._autofillImageUrl.create = null;
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('aiSuggestedImage').innerHTML = '';
        closeListRefModal();
        loadMyRefs();
      } catch (err) {
        showMsg('listMsg', err.message, false);
      } finally {
        btn.disabled = false;
      }
    });

    // ===== My Refs =====
    var _allRefs = [];
    var _allOfferMap = {};
    var _allMediaMap = {};

    window.applyRefLocalFilter = function() {
      var search = (document.getElementById('refLocalSearch').value || '').trim().toLowerCase();
      var category = document.getElementById('refLocalCategory').value;
      var sort = document.getElementById('refLocalSort').value;
      var filtered = _allRefs.filter(function(ref) {
        if (category && ref.category !== category) return false;
        if (search && (ref.name || '').toLowerCase().indexOf(search) === -1 && (ref.description || '').toLowerCase().indexOf(search) === -1) return false;
        return true;
      });
      if (sort === 'price_asc' || sort === 'price_desc') {
        filtered.sort(function(a, b) {
          var aOffer = (_allOfferMap[a.id] || []).find(function(o) { return o.status === 'active'; });
          var bOffer = (_allOfferMap[b.id] || []).find(function(o) { return o.status === 'active'; });
          var aPrice = aOffer ? aOffer.price : 0;
          var bPrice = bOffer ? bOffer.price : 0;
          return sort === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
        });
      }
      renderRefList(filtered, _allOfferMap, _allMediaMap);
    };

    async function loadMyRefs() {
      const container = document.getElementById('myRefs');
      try {
        const [refsRes, offersRes] = await Promise.all([fetch('/refs'), fetch('/offers')]);
        const refs = await refsRes.json();
        const offers = await offersRes.json();

        if (refs.length === 0) {
          container.innerHTML = '<p class="empty">No refs yet. Click "+ New Ref" to list your first ref!</p>';
          return;
        }

        const offerMap = {};
        offers.forEach(o => { if (!offerMap[o.refId]) offerMap[o.refId] = []; offerMap[o.refId].push(o); });

        // Load media for all refs
        const mediaMap = {};
        await Promise.all(refs.map(async ref => {
          const mRes = await fetch('/refs/' + ref.id + '/media');
          mediaMap[ref.id] = await mRes.json();
        }));

        // Store for local filtering
        _allRefs = refs;
        _allOfferMap = offerMap;
        _allMediaMap = mediaMap;

        // Populate category dropdown from actual data
        var cats = {};
        refs.forEach(function(r) { if (r.category) cats[r.category] = true; });
        var catSelect = document.getElementById('refLocalCategory');
        var currentCat = catSelect.value;
        catSelect.innerHTML = '<option value="">All Categories</option>' + Object.keys(cats).sort().map(function(c) {
          return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
        }).join('');
        catSelect.value = currentCat;

        // Apply any active filters (this calls renderRefList)
        applyRefLocalFilter();

      } catch {
        document.getElementById('myRefs').innerHTML = '<p class="empty">Failed to load refs</p>';
      }
    }

    function renderRefList(refs, offerMap, mediaMap) {
      const container = document.getElementById('myRefs');
      if (refs.length === 0) {
        container.innerHTML = '<p class="empty">No items match your filters.</p>';
        updateBulkBar();
        return;
      }

        if (refLayout === 'table') {
          var selectedIds = window._selectedRefIds || new Set();
          var allChecked = refs.length > 0 && refs.every(function(r) { return selectedIds.has(r.id); });
          container.innerHTML = '<div>' +
            '<div class="table-header-row">' +
              '<div class="col-check"><input type="checkbox" ' + (allChecked ? 'checked' : '') + ' onchange="toggleSelectAll(this.checked)"></div>' +
              '<span style="width:60px;">Image</span>' +
              '<span style="flex:1;">Name</span>' +
              '<span style="width:100px;">Status</span>' +
              '<span style="width:90px;text-align:right;">Price</span>' +
              '<span class="col-qty" style="width:50px;text-align:center;">Qty</span>' +
              '<span class="col-date" style="width:90px;text-align:right;">Date</span>' +
              '<span style="width:80px;text-align:right;">Actions</span>' +
            '</div>' +
            refs.map(function(ref) {
              var refOffers = offerMap[ref.id] || [];
              var activeOffer = refOffers.find(function(o) { return o.status === 'active'; });
              var priceStr = ref.listingStatus === 'willing_to_sell' ? 'Make me sell' : activeOffer ? fmtCurrency(activeOffer.price, activeOffer.priceCurrency) : '';
              var photos = (mediaMap[ref.id] || []).filter(function(m) { return m.mediaType === 'photo'; });
              var firstPhoto = photos[0];
              var statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
              var statusLabel = statusLabels[ref.listingStatus] || 'Private';
              var date = new Date(ref.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              var isSelected = selectedIds.has(ref.id);

              var imgHtml = firstPhoto
                ? '<div class="col-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
                : '<div class="col-img"><span style="color:#E6E8EC;font-size:14px;">&#x26A1;</span></div>';

              return '<div class="table-row" onclick="openDetail(\\'' + ref.id + '\\')">' +
                '<div class="col-check" onclick="event.stopPropagation()"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleSelectRef(\\'' + ref.id + '\\', this.checked)"></div>' +
                imgHtml +
                '<div class="col-name"><div class="name">' + escapeHtml(ref.name) + '</div><div class="cat">' + escapeHtml([ref.category, ref.subcategory].filter(Boolean).join(' / ')) + '</div></div>' +
                '<div class="col-status"><span class="badge ' + statusClass + '" style="font-size:10px;padding:0 8px;line-height:22px;">' + statusLabel + '</span></div>' +
                '<div class="col-price">' + (priceStr ? escapeHtml(priceStr) : '') + '</div>' +
                '<div class="col-qty">' + ref.quantity + '</div>' +
                '<div class="col-date">' + date + '</div>' +
                '<div class="col-actions" onclick="event.stopPropagation()">' +
                  '<button onclick="openDetail(\\'' + ref.id + '\\')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
                  '<button onclick="archiveRef(\\'' + ref.id + '\\')" title="Archive"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></button>' +
                  '<button class="del" onclick="deleteRefWithConfirm(\\'' + ref.id + '\\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>';
          updateBulkBar();
        } else if (refLayout === 'row') {
          var selectedIds = window._selectedRefIds || new Set();
          var allRowsSelected = refs.length > 0 && refs.every(r => selectedIds.has(r.id));
          container.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:4px 12px 8px;"><input type="checkbox" ' + (allRowsSelected ? 'checked' : '') + ' onchange="toggleSelectAll(this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#EC526F;"><span style="font-size:11px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.05em;">' + (selectedIds.size > 0 ? selectedIds.size + ' selected' : 'Select all') + '</span></div>' +
          '<div class="rows">' + refs.map(ref => {
            const refOffers = offerMap[ref.id] || [];
            const activeOffer = refOffers.find(o => o.status === 'active');
            const priceStr = ref.listingStatus === 'willing_to_sell' ? 'Make me sell' : activeOffer ? fmtCurrency(activeOffer.price, activeOffer.priceCurrency) : '';
            const photos = (mediaMap[ref.id] || []).filter(m => m.mediaType === 'photo');
            const firstPhoto = photos[0];
            const statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
            const statusLabel = statusLabels[ref.listingStatus] || 'Private';
            const attrSummary = buildAttributeSummary(ref.category, ref.subcategory, ref.attributes, ref.condition);
            const isSelected = selectedIds.has(ref.id);

            const imgHtml = firstPhoto
              ? '<div class="row-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
              : '<div class="row-img"><span class="placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></span></div>';

            return '<div class="ref-row" data-refid="' + ref.id + '" onclick="openDetail(\\'' + ref.id + '\\')">' +
              '<div onclick="event.stopPropagation()" style="flex-shrink:0;margin-right:8px;display:flex;align-items:center;"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleSelectRef(\\'' + ref.id + '\\', this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#EC526F;"></div>' +
              imgHtml +
              '<span class="row-name">' + escapeHtml(ref.name) + '</span>' +
              '<div class="row-meta">' +
                '<span class="badge ' + statusClass + '" style="font-size:10px;padding:0 8px;line-height:22px;">' + statusLabel + '</span>' +
                (ref.category ? '<span class="badge badge-cat" style="font-size:10px;padding:0 8px;line-height:22px;">' + escapeHtml(ref.category) + '</span>' : '') +
                (ref.condition ? '<span class="badge" style="font-size:10px;padding:0 8px;line-height:22px;background:#B1B5C3;color:#fff;">' + escapeHtml(ref.condition.replace(/_/g, ' ')) + '</span>' : '') +
                (priceStr ? '<span class="row-price">' + escapeHtml(priceStr) + '</span>' : '') +
                (attrSummary ? '<span class="row-qty">' + escapeHtml(attrSummary) + '</span>' : '') +
                (ref.quantity > 1 ? '<span class="row-qty">Qty: ' + ref.quantity + '</span>' : '') +
                (ref.networkPublished ? '<span class="badge" style="font-size:10px;padding:0 8px;line-height:22px;background:#7C3AED;color:#fff;">Published</span>' : '') +
                (ref.reffoSynced ? '<span class="badge badge-synced" style="font-size:10px;padding:0 8px;line-height:22px;">Synced</span>' : '') +
              '</div>' +
            '</div>';
          }).join('') + '</div>';
          updateBulkBar();
        } else {
          container.innerHTML = '<div class="cards">' + refs.map(ref => {
            const refOffers = offerMap[ref.id] || [];
            const activeOffer = refOffers.find(o => o.status === 'active');
            const priceStr = ref.listingStatus === 'willing_to_sell' ? 'Make me sell' : activeOffer ? fmtCurrency(activeOffer.price, activeOffer.priceCurrency) : '';
            const photos = (mediaMap[ref.id] || []).filter(m => m.mediaType === 'photo');
            const firstPhoto = photos[0];
            const catBadges = [ref.category, ref.subcategory].filter(Boolean).map(b =>
              '<span class="badge badge-cat">' + escapeHtml(b) + '</span>'
            ).join('');
            const statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
            const statusLabel = statusLabels[ref.listingStatus] || 'Private';
            const cardAttrSummary = buildAttributeSummary(ref.category, ref.subcategory, ref.attributes, ref.condition);

            const imgHtml = firstPhoto
              ? '<div class="card-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
              : '<div class="card-img"><span class="placeholder"><svg width="40" height="40" viewBox="0 0 40 71" fill="none"><path d="M36.3314 2.40738C36.3314 2.40738 36.8264 1.42463 36.4263 0.662012C36.0263 -0.10061 35.0534 0.00517205 35.0534 0.00517205H11.1756C11.1756 0.00517205 10.5428 -0.0279334 10.1477 0.343949C9.75251 0.715831 9.59304 1.49138 9.59304 1.49138L0.238015 32.5907C0.238015 32.5907 -0.24866 33.7655 0.169465 34.6704C0.58759 35.5752 1.5753 35.4965 1.5753 35.4965H10.0645L0.5629 66.8837C0.5629 66.8837 -0.162543 68.519 1.00281 69.3381C2.16816 70.1572 3.37309 68.9223 3.37309 68.9223L37.7402 24.6034C37.7402 24.6034 38.3085 23.9493 37.9286 22.9371C37.5486 21.9249 36.7018 22.0235 36.7018 22.0235H26.875L36.3314 2.40738Z" fill="#E6E8EC"/></svg></span></div>';

            return '<div class="card" onclick="openDetail(\\'' + ref.id + '\\')">' +
              imgHtml +
              '<div class="card-body">' +
                '<h3>' + escapeHtml(ref.name) + '</h3>' +
                '<div class="card-meta"><span class="badge ' + statusClass + '">' + statusLabel + '</span>' + catBadges +
                (ref.networkPublished ? '<span class="badge" style="background:#7C3AED;color:#fff;">Published</span>' : '') +
                (ref.reffoSynced ? '<span class="badge badge-synced">Synced</span>' : '') + '</div>' +
                (priceStr ? '<div class="card-price">' + escapeHtml(priceStr) + '</div>' : '') +
                (cardAttrSummary ? '<div class="card-desc" style="font-size:12px;color:#777E90;margin-top:4px;">' + escapeHtml(cardAttrSummary) + '</div>' : '') +
                (ref.quantity > 1 ? '<div class="card-qty">Qty: ' + ref.quantity + '</div>' : '') +
                (ref.description ? '<div class="card-desc">' + escapeHtml(ref.description) + '</div>' : '') +
              '</div></div>';
          }).join('') + '</div>';
        }
    }

    // ===== Ref Detail / Edit View =====
    var _currentDetailRefId = null;
    async function openDetail(refId) {
      _currentDetailRefId = refId;
      const container = document.getElementById('detailContent');
      container.innerHTML = '<p class="empty">Loading...</p>';
      switchTab('detail');

      try {
        const [refRes, mediaRes, offersRes, negRes] = await Promise.all([
          fetch('/refs/' + refId),
          fetch('/refs/' + refId + '/media'),
          fetch('/offers'),
          fetch('/negotiations')
        ]);
        const ref = await refRes.json();
        const media = await mediaRes.json();
        const offers = await offersRes.json();
        const allNegs = await negRes.json();
        const refNegs = allNegs.filter(n => n.refId === refId);
        const refOffers = offers.filter(o => o.refId === refId);
        const activeOffer = refOffers.find(o => o.status === 'active');

        const photos = media.filter(m => m.mediaType === 'photo');
        const video = media.find(m => m.mediaType === 'video');
        const mainMedia = photos[0] || video;
        const sideMedia = photos.slice(1);
        const thumbSrc = photos[0] ? '/' + escapeHtml(photos[0].filePath) : '';

        // Gallery
        let mainImgHtml = mainMedia
          ? (mainMedia.mediaType === 'video'
            ? '<video src="/' + escapeHtml(mainMedia.filePath) + '" controls style="width:100%;height:100%;object-fit:cover;"></video>'
            : '<img class="blur-bg" src="/' + escapeHtml(mainMedia.filePath) + '" alt=""><img class="main-img" src="/' + escapeHtml(mainMedia.filePath) + '" alt="">')
          : '<span class="placeholder">No media</span>';

        const hasVideo = !!video;
        const showViewAll = photos.length > 4 || (photos.length >= 4 && hasVideo);
        const photoUrls = photos.map(p => '/' + p.filePath);
        let sideImgsHtml = '';
        for (let i = 0; i < 3; i++) {
          const sm = sideMedia[i];
          if (sm) {
            const viewAllOverlay = (i === 2 && showViewAll) ? '<div class="detail-view-all" onclick="event.stopPropagation();openLightbox(window._currentPhotos, 0)"><span>View all</span></div>' : '';
            sideImgsHtml += '<div class="detail-side-img" onclick="openLightbox(window._currentPhotos, ' + (i + 1) + ')"><img src="/' + escapeHtml(sm.filePath) + '" alt="">' + viewAllOverlay + '</div>';
          } else {
            sideImgsHtml += '<div class="detail-side-img" style="cursor:pointer;" onclick="uploadPhotoForRef(\\'' + ref.id + '\\')"><span class="placeholder">+</span></div>';
          }
        }

        const priceDisplay = ref.listingStatus === 'willing_to_sell' ? 'Make me sell' : activeOffer ? fmtCurrency(activeOffer.price, activeOffer.priceCurrency) : 'No price';
        const locParts = [ref.locationCity, ref.locationState, ref.locationZip].filter(Boolean);
        const scopeLabels = { global: 'Global', national: 'National', range: 'Range' };
        let scopeText = '';
        if (ref.sellingScope) {
          scopeText = scopeLabels[ref.sellingScope] || ref.sellingScope;
          if (ref.sellingScope === 'range' && ref.sellingRadiusMiles) scopeText += ' (' + ref.sellingRadiusMiles + ' mi)';
        }
        const conditionDisplay = ref.condition ? ref.condition.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); }) : '';
        const detailAttrSummary = buildAttributeSummary(ref.category, ref.subcategory, ref.attributes, null);
        const listedDate = ref.createdAt ? new Date(ref.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

        // Build detail HTML — New header above gallery
        let html = '<div class="detail-header">';
        html += '<span class="detail-header-back" onclick="switchTab(\\'refs\\')">';
        html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#23262F"/></svg>';
        html += ' Back to refs</span>';
        html += '<div class="detail-title-row">';
        html += '<h1>' + escapeHtml(ref.name) + '</h1>';
        html += '<div class="detail-title-actions">';
        const shareUrl1 = ref.shareUrl
          || (ref.reffoSynced && ref.reffoRefId ? ((typeof window !== 'undefined' && window._reffoUrl) || 'https://reffo.ai') + '/items/' + ref.reffoRefId : '');
        html += '<button onclick="' + (shareUrl1
          ? 'navigator.clipboard.writeText(\\'' + shareUrl1 + '\\').then(function(){ showToast(\\'Link copied!\\',\\'\\'); })'
          : 'showToast(\\'List publicly to get a shareable link\\',\\'\\')') + '" title="Share"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>';
        html += '<button title="Save"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>';
        html += '</div></div>';
        html += '<div class="detail-posted-line">';
        html += '<div class="avatar-sm">Y</div>';
        html += '<span class="poster-name">Your Beacon</span>';
        if (ref.networkPublished) {
          html += '<span class="badge" style="background:#7C3AED;color:#fff;font-size:11px;">Published</span>';
        }
        if (locParts.length > 0) {
          html += '<span class="loc-pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> ' + escapeHtml(locParts.join(', ')) + '</span>';
        }
        html += '</div>';
        html += '</div>'; // end detail-header

        html += '<div class="detail-gallery">';
        html += '<div class="detail-main-img" id="detailMainImg" style="cursor:pointer;" onclick="openLightbox(window._currentPhotos, 0)">' + mainImgHtml + '</div>';
        html += '<div class="detail-side-imgs">' + sideImgsHtml + '</div>';
        html += '</div>';

        // Set photos for lightbox (innerHTML doesn't execute <script> tags)
        window._currentPhotos = photoUrls;

        html += '<div class="detail-columns">';

        // ===== Left: DealBody =====
        html += '<div class="detail-left deal-body">';
        html += '<div id="detailMsg"></div>';

        // Description
        if (ref.description) {
          html += '<div class="deal-content">' + escapeHtml(ref.description) + '</div>';
        }

        // Information grid — simplified: location only
        html += '<div class="deal-heading">Information</div>';
        html += '<div class="info-grid">';
        html += '<div class="info-item">';
        html += '<div class="info-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92A5EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>';
        html += '<span class="info-type">' + (locParts.length > 0 ? escapeHtml(locParts.join(', ')) : 'Location not set') + '</span></div>';
        html += '</div>';

        // Edit form (collapsible)
        html += '<div id="editFormSection" style="display:none;">';
        html += '<div class="deal-heading">Edit Ref</div>';
        html += '<form id="detailForm" data-ref-id="' + ref.id + '">';
        html += '<label>Name</label><input id="dName" value="' + escapeHtml(ref.name) + '">';
        html += '<label>Description</label><textarea id="dDesc">' + escapeHtml(ref.description) + '</textarea>';
        html += '<div class="row"><div><label>Category</label><select id="dCat"><option value="">Select...</option></select></div>';
        html += '<div><label>Subcategory</label><select id="dSubcat"><option value="">Select...</option></select></div></div>';
        html += '<div id="detailAutofillSection">';
        html += '<div id="detailAutofillActive" style="display:' + (window._aiEnabled ? 'block' : 'none') + ';">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">';
        html += '<button type="button" onclick="triggerProductLookup(\\\'detail\\\')" style="display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#8101B4 0%,#EA526F 100%);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>';
        html += 'Smart Autofill</button>';
        html += '<span id="detailAutofillStatus" style="font-size:12px;color:#777E90;"></span></div></div>';
        html += '<div id="detailAutofillPromo" style="display:' + (window._aiEnabled ? 'none' : 'block') + ';border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#f8f0fc 0%,#fdedf0 100%);padding:14px 16px;margin-bottom:14px;">';
        html += '<div style="display:flex;align-items:center;gap:12px;">';
        html += '<div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:linear-gradient(135deg,#8101B4 0%,#EA526F 100%);">';
        html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCFCFD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg></div>';
        html += '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#141416;margin-bottom:2px;">Smart Autofill with AI</div>';
        html += '<div style="font-size:12px;color:#777E90;line-height:1.4;">Link a <a href="https://reffo.ai/api" target="_blank" style="color:#EC526F;font-weight:600;text-decoration:none;">Reffo.ai</a> account to auto-fill descriptions, attributes, images, and price estimates.</div>';
        html += '</div></div></div></div>';
        html += '<div id="detailAutofillCard"></div>';
        html += '<div id="detailCategoryFields"></div>';
        html += '<div class="row"><div><label>Price</label><input id="dPrice" type="number" min="0" step="0.01" value="' + (activeOffer ? activeOffer.price : '') + '"></div>';
        html += '<div><label>Currency</label><select id="dCurrency"><option value="USD"' + ((activeOffer && activeOffer.priceCurrency === 'USD') || !activeOffer ? ' selected' : '') + '>USD</option><option value="EUR"' + (activeOffer && activeOffer.priceCurrency === 'EUR' ? ' selected' : '') + '>EUR</option><option value="GBP"' + (activeOffer && activeOffer.priceCurrency === 'GBP' ? ' selected' : '') + '>GBP</option></select></div></div>';
        html += '<div class="row"><div><label>Quantity</label><input id="dQty" type="number" min="1" value="' + ref.quantity + '"></div>';
        html += '<div><label>SKU</label><input id="dSku" value="' + escapeHtml(ref.sku || '') + '"></div></div>';
        html += '<details style="margin-bottom:14px;border:2px solid #E6E8EC;border-radius:12px;padding:14px;" open>';
        html += '<summary style="cursor:pointer;font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.02em;">Location</summary>';
        html += '<div class="row"><div><label>City</label><input id="dLocCity" value="' + escapeHtml(ref.locationCity || '') + '"></div>';
        html += '<div><label>State</label><input id="dLocState" value="' + escapeHtml(ref.locationState || '') + '"></div>';
        html += '<div><label>Zip</label><input id="dLocZip" value="' + escapeHtml(ref.locationZip || '') + '"></div></div>';
        html += '<div class="row"><div><label>Latitude</label><input id="dLocLat" type="number" step="any" value="' + (ref.locationLat || '') + '"></div>';
        html += '<div><label>Longitude</label><input id="dLocLng" type="number" step="any" value="' + (ref.locationLng || '') + '"></div></div>';
        html += '<div class="row"><div><label>Selling Scope</label><select id="dSellingScope">';
        ['global','national','range'].forEach(s => {
          html += '<option value="' + s + '"' + ((ref.sellingScope || 'global') === s ? ' selected' : '') + '>' + ({global:'Global',national:'National',range:'Range (miles)'})[s] + '</option>';
        });
        html += '</select></div>';
        html += '<div><label>Radius (miles)</label><input id="dSellingRadius" type="number" min="1" value="' + (ref.sellingRadiusMiles || '') + '"></div></div>';
        html += '</details>';
        // Rental fields (shown when for_rent)
        html += '<div id="rentalFieldsDetail" style="display:' + (ref.listingStatus === 'for_rent' ? 'block' : 'none') + ';margin-bottom:14px;border:2px solid #e6f0ff;border-radius:12px;padding:14px;background:#f8fbff;">';
        html += '<div style="font-size:12px;font-weight:600;color:#1a6aba;text-transform:uppercase;letter-spacing:0.02em;margin-bottom:10px;">Rental Details</div>';
        html += '<label>Rental Terms</label><textarea id="dRentalTerms" rows="2" style="resize:vertical;">' + escapeHtml(ref.rentalTerms || '') + '</textarea>';
        html += '<div class="row"><div><label>Deposit</label><input id="dRentalDeposit" type="number" min="0" step="0.01" value="' + (ref.rentalDeposit || '') + '"></div>';
        html += '<div><label>Duration</label><input id="dRentalDuration" type="number" min="1" value="' + (ref.rentalDuration || '') + '"></div>';
        html += '<div><label>Unit</label><select id="dRentalDurationUnit">';
        ['hours','days','weeks','months'].forEach(u => {
          html += '<option value="' + u + '"' + ((ref.rentalDurationUnit || 'days') === u ? ' selected' : '') + '>' + u.charAt(0).toUpperCase() + u.slice(1) + '</option>';
        });
        html += '</select></div></div>';
        html += '</div>';
        // Purchase info fields
        html += '<details style="margin-bottom:14px;border:2px solid #E6E8EC;border-radius:12px;padding:14px;" ' + (ref.purchaseDate || ref.purchasePrice ? 'open' : '') + '>';
        html += '<summary style="cursor:pointer;font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.02em;">Purchase Info</summary>';
        html += '<div class="row"><div><label>Purchase Date</label><input id="dPurchaseDate" type="date" value="' + escapeHtml(ref.purchaseDate || '') + '"></div>';
        html += '<div><label>Purchase Price</label><input id="dPurchasePrice" type="number" min="0" step="0.01" value="' + (ref.purchasePrice || '') + '"></div></div>';
        html += '</details>';
        html += '</form>';
        html += '</div>';

        // Media management
        html += '<div class="deal-heading">Media</div>';
        html += '<div id="detailAiSuggestedImage"></div>';
        html += '<div class="media-thumbs" id="mediaThumbs">';
        media.forEach(m => {
          const isVid = m.mediaType === 'video';
          html += '<div class="media-thumb">';
          html += isVid
            ? '<video src="/' + escapeHtml(m.filePath) + '" muted></video>'
            : '<img src="/' + escapeHtml(m.filePath) + '" alt="">';
          html += '<button class="del-btn" onclick="deleteMedia(\\'' + ref.id + '\\', \\'' + m.id + '\\')" title="Delete">&times;</button>';
          html += '</div>';
        });
        html += '</div>';
        html += '<div class="upload-area" onclick="document.getElementById(\\'detailFileInput\\').click()" style="max-width:200px;">';
        html += '<div class="upload-icon">+</div><p>Upload</p>';
        html += '<input type="file" id="detailFileInput" accept="image/*" multiple onchange="uploadDetailMedia(\\'' + ref.id + '\\')">';
        html += '</div>';

        // Negotiations for this ref
        if (refNegs.length > 0) {
          html += '<div class="deal-heading">Negotiations</div>';
          html += renderNegotiationCards(refNegs, true);
        }

        html += '</div>'; // end detail-left deal-body

        // ===== Right: PaymentCard =====
        html += '<div class="detail-right">';
        html += '<div class="payment-card">';

        // Row 1: Price + Edit/Share buttons
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 20px 4px;">';
        html += '<div style="font-size:24px;font-weight:700;color:#23262F;">' + (ref.listingStatus === 'private' ? 'My Item' : priceDisplay) + '</div>';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<button style="width:32px;height:32px;border-radius:50%;border:1px solid #E6E8EC;background:#FCFCFD;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#777E90;padding:0;" onclick="document.getElementById(\\'editFormSection\\').style.display=\\'block\\';document.getElementById(\\'editFormSection\\').scrollIntoView({behavior:\\'smooth\\'})">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        html += '</button>';
        html += '<button style="width:32px;height:32px;border-radius:50%;border:1px solid #E6E8EC;background:#FCFCFD;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#777E90;padding:0;" onclick="';
        const shareUrl2 = ref.shareUrl
          || (ref.reffoSynced && ref.reffoRefId ? ((typeof window !== 'undefined' && window._reffoUrl) || 'https://reffo.ai') + '/items/' + ref.reffoRefId : '');
        if (shareUrl2) {
          html += 'navigator.clipboard.writeText(\\'' + shareUrl2 + '\\').then(function(){ showToast(\\'Link copied!\\',\\'\\'); })';
        } else {
          html += 'showToast(\\'List publicly to get a shareable link\\',\\'\\')';
        }
        html += '" title="Share">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
        html += '</button>';
        html += '</div></div>';

        // Row 2: Avatar + "Your Beacon"
        html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 20px 16px;">';
        html += '<div style="width:32px;height:32px;border-radius:50%;background:#EC526F;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">Y</div>';
        html += '<span style="font-size:14px;font-weight:600;color:#23262F;">Your Beacon</span>';
        html += '</div>';

        // Private item: completeness checklist
        if (ref.listingStatus === 'private') {
          const hasPhoto = media.filter(m => m.mediaType === 'photo').length > 0;
          const checks = [
            { label: 'Name', done: !!ref.name },
            { label: 'Category', done: !!ref.category },
            { label: 'Condition', done: !!ref.condition },
            { label: 'Purchase date', done: !!ref.purchaseDate },
            { label: 'Purchase price', done: !!ref.purchasePrice },
            { label: 'Description', done: !!ref.description },
            { label: 'Photo', done: hasPhoto },
          ];
          const doneCount = checks.filter(function(c) { return c.done; }).length;
          const pct = Math.round((doneCount / checks.length) * 100);
          html += '<div style="padding:0 20px 14px;">';
          html += '<div style="background:#F4F5F6;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;">';
          html += '<div style="flex:1;min-width:0;">';
          html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">';
          html += '<span style="font-size:13px;font-weight:700;color:' + (pct === 100 ? '#45B36B' : '#23262F') + ';">' + pct + '%</span>';
          html += '<span style="font-size:13px;font-weight:600;color:#23262F;">Complete</span>';
          html += '</div>';
          html += '<div style="font-size:11px;color:#777E90;">Fill in details to help your listing sell faster.</div>';
          html += '</div>';
          html += '<button class="button-stroke" onclick="document.getElementById(\\\'editFormSection\\\').style.display=\\\'block\\\';document.getElementById(\\\'editFormSection\\\').scrollIntoView({behavior:\\\'smooth\\\'})" style="font-size:12px;padding:0 14px;height:34px;white-space:nowrap;">Fill in details</button>';
          html += '</div></div>';
        }

        // Status segmented control (replaces dropdown)
        html += '<input type="hidden" id="dStatus" value="' + (ref.listingStatus || 'private') + '">';
        html += '<div style="padding:0 20px 10px;">';
        html += '<div class="status-segmented" id="detailStatusSegment">';
        ['private','for_sale','willing_to_sell','for_rent'].forEach(s => {
          const activeClass = ref.listingStatus === s ? segClassMap[s] : '';
          html += '<button type="button" class="' + activeClass + '" onclick="selectDetailStatus(\\'' + s + '\\')">' + statusLabels[s] + '</button>';
        });
        html += '</div>';
        html += '</div>';

        // Price fields (for_sale and for_rent)
        const _initStatus = ref.listingStatus || 'private';
        const _initPrice = activeOffer ? String(activeOffer.price) : (ref.price ? String(ref.price) : '');
        const _initCurrency = activeOffer ? (activeOffer.priceCurrency || 'USD') : (ref.currency || 'USD');
        const _initMinPrice = ref.price ? String(ref.price) : '';
        const _initDuration = ref.rentalDuration ? String(ref.rentalDuration) : '';
        const _initDurationUnit = ref.rentalDurationUnit || 'days';
        const _showPrice = (_initStatus === 'for_sale' || _initStatus === 'for_rent') ? 'block' : 'none';
        const _showMinPrice = _initStatus === 'willing_to_sell' ? 'block' : 'none';
        const _showRental = _initStatus === 'for_rent' ? 'block' : 'none';

        html += '<div id="cardPriceFields" style="display:' + _showPrice + ';padding:0 20px 10px;">';
        html += '<div style="display:flex;gap:8px;">';
        html += '<input type="number" id="cardPrice" placeholder="Price" value="' + _initPrice + '" style="flex:1;height:40px;padding:0 12px;border:2px solid #E6E8EC;border-radius:12px;font-size:14px;font-weight:500;background:#FCFCFD;font-family:inherit;" oninput="checkCardDirty()">';
        html += '<select id="cardCurrency" style="width:80px;height:40px;padding:0 8px;border:2px solid #E6E8EC;border-radius:12px;font-size:13px;font-weight:600;background:#FCFCFD;font-family:inherit;cursor:pointer;" onchange="checkCardDirty()">';
        html += '<option value="USD"' + (_initCurrency === 'USD' ? ' selected' : '') + '>USD</option><option value="EUR"' + (_initCurrency === 'EUR' ? ' selected' : '') + '>EUR</option><option value="GBP"' + (_initCurrency === 'GBP' ? ' selected' : '') + '>GBP</option>';
        html += '</select>';
        html += '</div></div>';

        // Min price field (willing_to_sell only)
        html += '<div id="cardMinPriceField" style="display:' + _showMinPrice + ';padding:0 20px 10px;">';
        html += '<input type="number" id="cardMinPrice" placeholder="Minimum price (optional)" value="' + _initMinPrice + '" style="width:100%;height:40px;padding:0 12px;border:2px solid #E6E8EC;border-radius:12px;font-size:14px;font-weight:500;background:#FCFCFD;font-family:inherit;" oninput="checkCardDirty()">';
        html += '</div>';

        // Rental fields (for_rent only)
        html += '<div id="cardRentalFields" style="display:' + _showRental + ';padding:0 20px 10px;">';
        html += '<div style="display:flex;gap:8px;">';
        html += '<input type="number" id="cardRentalDuration" placeholder="Duration" value="' + _initDuration + '" style="flex:1;height:40px;padding:0 12px;border:2px solid #E6E8EC;border-radius:12px;font-size:14px;font-weight:500;background:#FCFCFD;font-family:inherit;" oninput="checkCardDirty()">';
        html += '<select id="cardRentalDurationUnit" style="width:100px;height:40px;padding:0 8px;border:2px solid #E6E8EC;border-radius:12px;font-size:13px;font-weight:600;background:#FCFCFD;font-family:inherit;cursor:pointer;" onchange="checkCardDirty()">';
        html += '<option value="hours"' + (_initDurationUnit === 'hours' ? ' selected' : '') + '>Hours</option><option value="days"' + (_initDurationUnit === 'days' ? ' selected' : '') + '>Days</option><option value="weeks"' + (_initDurationUnit === 'weeks' ? ' selected' : '') + '>Weeks</option><option value="months"' + (_initDurationUnit === 'months' ? ' selected' : '') + '>Months</option>';
        html += '</select>';
        html += '</div></div>';

        // Save Changes button (hidden by default, shown when dirty)
        html += '<div id="cardSaveBtn" style="display:none;padding:0 20px 10px;">';
        html += '<button class="button-gradient" onclick="saveDetail(\\'' + ref.id + '\\', \\'' + (activeOffer ? activeOffer.id : '') + '\\')" style="width:100%;">Save Changes</button>';
        html += '</div>';

        // Price estimate (hidden for private items)
        if (ref.listingStatus !== 'private') {
          html += '<div style="padding:0 20px 10px;"><div id="detailPriceEstimate"></div></div>';
        } else {
          html += '<div style="display:none;"><div id="detailPriceEstimate"></div></div>';
        }

        // Invoice rows — category added as first row
        const catParts = [ref.category, ref.subcategory].filter(Boolean);
        if (catParts.length > 0) {
          html += '<div class="invoice-row"><span class="invoice-label">Category</span><span class="invoice-value">' + escapeHtml(catParts.join(' / ')) + '</span></div>';
        }
        if (conditionDisplay) {
          html += '<div class="invoice-row"><span class="invoice-label">Condition</span><span class="invoice-value">' + escapeHtml(conditionDisplay) + '</span></div>';
        }
        if (detailAttrSummary) {
          html += '<div class="invoice-row"><span class="invoice-label">Details</span><span class="invoice-value" style="font-size:12px;">' + escapeHtml(detailAttrSummary) + '</span></div>';
        }
        if (ref.sku) {
          html += '<div class="invoice-row"><span class="invoice-label">SKU</span><span class="invoice-value">' + escapeHtml(ref.sku) + '</span></div>';
        }
        if (locParts.length > 0) {
          html += '<div class="invoice-row"><span class="invoice-label">Location</span><span class="invoice-value">' + escapeHtml(locParts.join(', ')) + '</span></div>';
        }
        if (scopeText) {
          html += '<div class="invoice-row"><span class="invoice-label">Selling Scope</span><span class="invoice-value">' + escapeHtml(scopeText) + '</span></div>';
        }
        if (ref.rentalTerms) {
          html += '<div class="invoice-row"><span class="invoice-label">Rental Terms</span><span class="invoice-value" style="font-size:12px;max-width:160px;text-align:right;">' + escapeHtml(ref.rentalTerms) + '</span></div>';
        }
        if (ref.rentalDeposit) {
          html += '<div class="invoice-row"><span class="invoice-label">Deposit</span><span class="invoice-value">' + fmtCurrency(ref.rentalDeposit, 'USD') + '</span></div>';
        }
        if (ref.rentalDuration) {
          html += '<div class="invoice-row"><span class="invoice-label">Duration</span><span class="invoice-value">' + ref.rentalDuration + ' ' + (ref.rentalDurationUnit || 'days') + '</span></div>';
        }
        if (ref.purchaseDate) {
          html += '<div class="invoice-row"><span class="invoice-label">Purchased</span><span class="invoice-value">' + new Date(ref.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '</span></div>';
        }
        if (ref.purchasePrice) {
          html += '<div class="invoice-row"><span class="invoice-label">Purchase Price</span><span class="invoice-value">' + fmtCurrency(ref.purchasePrice, 'USD') + '</span></div>';
        }

        // Hidden invoice rows (future use)
        html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Commission</span><span class="invoice-value">$0.00</span></div>';
        html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Referral Fee</span><span class="invoice-value">$0.00</span></div>';
        html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Tax</span><span class="invoice-value">$0.00</span></div>';

        // Network publish status
        if (ref.networkPublished) {
          html += '<div style="margin:14px 20px;padding:10px 16px;background:#F3F0FF;border:1px solid #D8CCF1;border-radius:12px;display:flex;align-items:center;justify-content:space-between;">';
          html += '<div style="display:flex;align-items:center;gap:8px;">';
          html += '<span style="font-size:14px;">&#127760;</span>';
          html += '<span style="font-size:13px;font-weight:600;color:#5B21B6;">Published to Reffo.ai</span>';
          html += '</div>';
          html += '<span style="position:relative;display:inline-flex;" onmouseenter="this.querySelector(\\'.npt\\').style.display=\\'block\\'" onmouseleave="this.querySelector(\\'.npt\\').style.display=\\'none\\'">';
          html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:help;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
          html += '<div class="npt" style="display:none;position:absolute;right:0;top:24px;width:220px;padding:10px 12px;background:#fff;border:1px solid #D8CCF1;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);font-size:11px;color:#5B21B6;line-height:1.5;z-index:10;">Public items are automatically mirrored on Reffo.ai for broader discovery by search engines and buyers.</div>';
          html += '</span>';
          html += '</div>';
        }

        // Account sync toggle — stylized card
        html += '<div style="margin:14px 20px;border:1px solid #E6E8EC;border-radius:12px;overflow:hidden;">';
        html += '<div style="height:3px;background:linear-gradient(90deg,#8101B4,#EA526F);"></div>';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;">';
        html += '<div>';
        html += '<div style="font-size:14px;font-weight:600;color:#23262F;">&#128279; Sync to Reffo.ai Account</div>';
        html += '<div style="font-size:12px;color:#777E90;margin-top:2px;">Manage this item from your Reffo.ai dashboard.</div>';
        html += '</div>';
        html += '<label class="sync-toggle"><input type="checkbox" ' + (ref.reffoSynced ? 'checked' : '') + ' onchange="toggleSync(\\'' + ref.id + '\\', this)"><span class="toggle-track"></span></label>';
        html += '</div></div>';

        if (listedDate) {
          let footerText = 'Listed ' + listedDate;
          if (ref.listingStatus === 'for_sale' || ref.listingStatus === 'willing_to_sell') footerText += ' · Open to negotiation';
          if (ref.listingStatus === 'for_rent') footerText += ' · Available for rent';
          html += '<div class="payment-card-footer">' + footerText + '</div>';
        }

        // Archive link
        html += '<a style="display:block;text-align:center;font-size:13px;color:#777E90;cursor:pointer;padding:12px 0;" onclick="deleteRef(\\'' + ref.id + '\\')">Archive this listing</a>';

        html += '</div>'; // end payment-card
        html += '</div>'; // end detail-right

        html += '</div>'; // end detail-columns

        container.innerHTML = html;

        // Initialize dirty-state tracking for card fields
        window._cardInitial = {
          status: _initStatus,
          price: _initPrice,
          currency: _initCurrency,
          minPrice: _initMinPrice,
          duration: _initDuration,
          durationUnit: _initDurationUnit
        };

        // Populate category selects in detail form
        const dCat = document.getElementById('dCat');
        const dSubcat = document.getElementById('dSubcat');
        populateCategories(dCat, () => populateSubcategories(dCat, dSubcat));
        dCat.value = ref.category || '';
        populateSubcategories(dCat, dSubcat);
        dSubcat.value = ref.subcategory || '';
        renderCategoryFields('detailCategoryFields', ref.category || '', ref.subcategory || '', Object.assign({}, ref.attributes || {}, ref.condition ? { _condition: ref.condition } : {}));
        dCat.addEventListener('change', function() {
          renderCategoryFields('detailCategoryFields', this.value, dSubcat.value, {});
        });
        dSubcat.addEventListener('change', function() {
          renderCategoryFields('detailCategoryFields', dCat.value, this.value, {});
        });
        // Trigger AI price estimate on load
        setTimeout(function() { triggerDetailPriceEstimate(); }, 100);
      } catch (err) {
        container.innerHTML = '<p class="empty">Failed to load ref details</p>';
      }
    }
    window.openDetail = openDetail;

    // Global: whether AI autofill is available (set by loadSettings)
    window._aiEnabled = false;
    // Global: Reffo.ai base URL (set by loadSettings)
    window._reffoUrl = 'https://reffo.ai';
    // Store AI autofill image URLs per context (create / detail)
    window._autofillImageUrl = { create: null, detail: null };

    // ===== Segmented Status Control (Detail) =====
    let detailEstimateTimer = null;

    window.selectDetailStatus = function(status) {
      document.getElementById('dStatus').value = status;
      const seg = document.getElementById('detailStatusSegment');
      if (seg) {
        seg.querySelectorAll('button').forEach(function(btn, i) {
          const statuses = ['private', 'for_sale', 'willing_to_sell', 'for_rent'];
          btn.className = statuses[i] === status ? segClassMap[status] : '';
        });
      }
      // Toggle rental fields
      const rentalSection = document.getElementById('rentalFieldsDetail');
      if (rentalSection) rentalSection.style.display = status === 'for_rent' ? 'block' : 'none';
      // Toggle card price/rental field containers
      var cpf = document.getElementById('cardPriceFields');
      var cmpf = document.getElementById('cardMinPriceField');
      var crf = document.getElementById('cardRentalFields');
      if (cpf) cpf.style.display = (status === 'for_sale' || status === 'for_rent') ? 'block' : 'none';
      if (cmpf) cmpf.style.display = status === 'willing_to_sell' ? 'block' : 'none';
      if (crf) crf.style.display = status === 'for_rent' ? 'block' : 'none';
      // Check dirty state
      if (typeof checkCardDirty === 'function') checkCardDirty();
      // Trigger AI price estimate for all statuses
      triggerDetailPriceEstimate();
    };

    window.checkCardDirty = function() {
      var ini = window._cardInitial;
      if (!ini) return;
      var status = document.getElementById('dStatus').value;
      var price = document.getElementById('cardPrice') ? document.getElementById('cardPrice').value : '';
      var currency = document.getElementById('cardCurrency') ? document.getElementById('cardCurrency').value : 'USD';
      var minPrice = document.getElementById('cardMinPrice') ? document.getElementById('cardMinPrice').value : '';
      var duration = document.getElementById('cardRentalDuration') ? document.getElementById('cardRentalDuration').value : '';
      var durationUnit = document.getElementById('cardRentalDurationUnit') ? document.getElementById('cardRentalDurationUnit').value : 'days';
      var dirty = status !== ini.status || price !== ini.price || currency !== ini.currency || minPrice !== ini.minPrice || duration !== ini.duration || durationUnit !== ini.durationUnit;
      var btn = document.getElementById('cardSaveBtn');
      if (btn) btn.style.display = dirty ? 'block' : 'none';
    };

    window.triggerDetailPriceEstimate = function() {
      if (detailEstimateTimer) clearTimeout(detailEstimateTimer);
      // Skip if price is already set
      var priceEl = document.getElementById('cardPrice') || document.getElementById('dPrice');
      if (priceEl && priceEl.value && parseFloat(priceEl.value) > 0) {
        var container = document.getElementById('detailPriceEstimate');
        if (container) container.innerHTML = '';
        return;
      }
      var nameEl = document.getElementById('dName');
      var catEl = document.getElementById('dCat');
      var nameVal = nameEl ? nameEl.value.trim() : '';
      var catVal = catEl ? catEl.value : '';
      if (!nameVal || !catVal) {
        var missing = !nameVal && !catVal ? 'a name and category' : !nameVal ? 'a name' : 'a category';
        renderPriceEstimateUnavailable('detailPriceEstimate', 'Select ' + missing + ' to see price suggestions.');
        return;
      }
      var container = document.getElementById('detailPriceEstimate');
      if (!container) return;
      container.innerHTML = '<div class="price-estimate-card"><div style="display:flex;align-items:center;gap:8px;"><div class="price-estimate-spinner"></div><span class="est-muted">Estimating price...</span></div></div>';
      detailEstimateTimer = setTimeout(function() {
        var subcatEl = document.getElementById('dSubcat');
        var subcatVal = subcatEl ? subcatEl.value : '';
        fetch('/settings/price-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameVal, category: catVal, subcategory: subcatVal })
        }).then(function(res) {
          if (!res.ok) throw new Error('API error');
          return res.json();
        }).then(function(data) {
          renderPriceEstimate('detailPriceEstimate', data);
        }).catch(function() {
          renderPriceEstimateUnavailable('detailPriceEstimate', 'Connect to Reffo.ai for price suggestions');
        });
      }, 800);
    };

    window.setMainImage = function(src) {
      document.getElementById('detailMainImg').innerHTML = '<img class="blur-bg" src="' + src + '" alt=""><img class="main-img" src="' + src + '" alt="">';
    };

    // Lightbox
    window._lbPhotos = [];
    window._lbIndex = 0;

    function lightboxUpdate() {
      var photos = window._lbPhotos;
      var idx = window._lbIndex;
      document.getElementById('lightboxImg').src = photos[idx];
      document.getElementById('lightboxCounter').textContent = (idx + 1) + ' / ' + photos.length;
      document.getElementById('lightboxPrev').style.display = idx > 0 ? '' : 'none';
      document.getElementById('lightboxNext').style.display = idx < photos.length - 1 ? '' : 'none';
      var thumbs = document.getElementById('lightboxThumbs');
      var html = '';
      for (var i = 0; i < photos.length; i++) {
        html += '<button class="lightbox-thumb' + (i === idx ? ' active' : '') + '" onclick="lightboxGo(' + i + ')"><img src="' + photos[i] + '" alt=""></button>';
      }
      thumbs.innerHTML = photos.length > 1 ? html : '';
    }

    window.openLightbox = function(photos, startIndex) {
      if (!photos || photos.length === 0) return;
      window._lbPhotos = photos;
      window._lbIndex = startIndex || 0;
      document.getElementById('lightboxOverlay').style.display = '';
      document.body.style.overflow = 'hidden';
      lightboxUpdate();
    };

    window.closeLightbox = function() {
      document.getElementById('lightboxOverlay').style.display = 'none';
      document.body.style.overflow = '';
    };

    window.lightboxNav = function(dir) {
      var next = window._lbIndex + dir;
      if (next >= 0 && next < window._lbPhotos.length) {
        window._lbIndex = next;
        lightboxUpdate();
      }
    };

    window.lightboxGo = function(idx) {
      window._lbIndex = idx;
      lightboxUpdate();
    };

    document.addEventListener('keydown', function(e) {
      if (document.getElementById('lightboxOverlay').style.display === 'none') return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') lightboxNav(1);
      else if (e.key === 'ArrowLeft') lightboxNav(-1);
    });

    window.saveDetail = async function(refId, existingOfferId) {
      try {
        const dLocLat = document.getElementById('dLocLat');
        const dLocLng = document.getElementById('dLocLng');
        const detailCatAttrs = collectCategoryAttrs('detailCategoryFields', document.getElementById('dCat').value, document.getElementById('dSubcat').value);
        const detailCondition = detailCatAttrs._condition || null;
        delete detailCatAttrs._condition;
        const detailAttributes = Object.keys(detailCatAttrs).length > 0 ? detailCatAttrs : null;
        const listingStatus = document.getElementById('dStatus').value;
        const rentalTerms = listingStatus === 'for_rent' ? (document.getElementById('dRentalTerms') ? document.getElementById('dRentalTerms').value.trim() || null : null) : null;
        const rentalDeposit = listingStatus === 'for_rent' ? (document.getElementById('dRentalDeposit') && document.getElementById('dRentalDeposit').value ? parseFloat(document.getElementById('dRentalDeposit').value) : null) : null;
        const rentalDuration = listingStatus === 'for_rent' ? (document.getElementById('dRentalDuration') && document.getElementById('dRentalDuration').value ? parseInt(document.getElementById('dRentalDuration').value) : null) : null;
        const rentalDurationUnit = listingStatus === 'for_rent' ? (document.getElementById('dRentalDurationUnit') ? document.getElementById('dRentalDurationUnit').value || null : null) : null;
        const res = await fetch('/refs/' + refId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('dName').value.trim(),
            description: document.getElementById('dDesc').value.trim(),
            category: document.getElementById('dCat').value,
            subcategory: document.getElementById('dSubcat').value,
            quantity: parseInt(document.getElementById('dQty').value) || 1,
            sku: document.getElementById('dSku').value.trim() || undefined,
            listingStatus: listingStatus,
            locationCity: document.getElementById('dLocCity').value.trim() || null,
            locationState: document.getElementById('dLocState').value.trim() || null,
            locationZip: document.getElementById('dLocZip').value.trim() || null,
            locationLat: dLocLat && dLocLat.value ? parseFloat(dLocLat.value) : null,
            locationLng: dLocLng && dLocLng.value ? parseFloat(dLocLng.value) : null,
            sellingScope: document.getElementById('dSellingScope').value,
            sellingRadiusMiles: document.getElementById('dSellingRadius').value ? parseInt(document.getElementById('dSellingRadius').value) : null,
            condition: detailCondition,
            attributes: detailAttributes,
            rentalTerms, rentalDeposit, rentalDuration, rentalDurationUnit,
            purchaseDate: document.getElementById('dPurchaseDate') ? (document.getElementById('dPurchaseDate').value || null) : null,
            purchasePrice: document.getElementById('dPurchasePrice') && document.getElementById('dPurchasePrice').value ? parseFloat(document.getElementById('dPurchasePrice').value) : null,
          })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }

        // Create or update offer if price is set and not private
        const cardPriceEl = document.getElementById('cardPrice');
        const priceVal = cardPriceEl ? cardPriceEl.value : document.getElementById('dPrice').value;
        const price = priceVal ? parseFloat(priceVal) : 0;
        const cardCurrencyEl = document.getElementById('cardCurrency');
        const currency = cardCurrencyEl ? cardCurrencyEl.value : document.getElementById('dCurrency').value;
        if (price > 0 && listingStatus !== 'private') {
          if (existingOfferId) {
            await fetch('/offers/' + existingOfferId, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ price: price, priceCurrency: currency })
            });
          } else {
            await fetch('/offers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refId: refId, price: price, priceCurrency: currency })
            });
          }
        }

        showMsg('detailMsg', 'Saved!', true);

        // Prompt to push to Reffo — only if not already synced
        var syncToggle = document.querySelector('.sync-toggle input[type="checkbox"]');
        if (listingStatus !== 'private' && syncToggle && !syncToggle.checked) {
          showSyncModal(refId);
        } else {
          openDetail(refId);
        }
      } catch (err) {
        showMsg('detailMsg', err.message, false);
      }
    };

    window.deleteMedia = async function(refId, mediaId) {
      if (!confirm('Delete this media?')) return;
      await fetch('/refs/' + refId + '/media/' + mediaId, { method: 'DELETE' });
      openDetail(refId);
    };

    window.uploadDetailMedia = async function(refId) {
      const input = document.getElementById('detailFileInput');
      if (!input.files.length) return;
      const errors = [];
      // Split photos and video into separate requests
      const photos = [];
      const videos = [];
      for (let i = 0; i < input.files.length; i++) {
        if (input.files[i].type.startsWith('video/')) videos.push(input.files[i]);
        else photos.push(input.files[i]);
      }
      if (photos.length > 0) {
        const fd = new FormData();
        photos.forEach(f => fd.append('files', f));
        const res = await fetch('/refs/' + refId + '/media', { method: 'POST', body: fd });
        if (!res.ok) {
          try { const err = await res.json(); errors.push(err.error || 'Photo upload failed'); }
          catch { errors.push('Photo upload failed (server error ' + res.status + ')'); }
        }
      }
      if (videos.length > 0) {
        const fd = new FormData();
        videos.forEach(f => fd.append('files', f));
        const res = await fetch('/refs/' + refId + '/media', { method: 'POST', body: fd });
        if (!res.ok) {
          try { const err = await res.json(); errors.push(err.error || 'Video upload failed'); }
          catch { errors.push('Video upload failed (server error ' + res.status + ')'); }
        }
      }
      if (errors.length > 0) alert(errors.join('\\n'));
      input.value = '';
      openDetail(refId);
    };

    window.deleteRef = async function(refId) {
      if (!confirm('Archive this ref? You can restore it later from the Archive tab.')) return;
      try {
        const res = await fetch('/refs/' + refId, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to archive');
        showToast('Ref archived', '');
        homeLoaded = false;
        switchTab('refs');
        await loadMyRefs();
      } catch(e) {
        console.error('[DeleteRef] Failed:', e);
        alert('Failed to archive ref');
      }
    };

    // ===== Search Network =====
    var _lastSearchSource = 'all';
    window.setSourceFilter = function(src) {
      _lastSearchSource = src;
      document.querySelectorAll('#sourceFilterTabs .ref-subtab').forEach(function(tab) {
        if (tab.getAttribute('data-source') === src) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      // Client-side filter: show/hide cards by source
      document.querySelectorAll('.result-card').forEach(function(card) {
        var cardSource = card.getAttribute('data-source');
        if (src === 'all' || cardSource === src) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
      // Update summary counts
      var dhtCount = document.querySelectorAll('.result-card[data-source="dht"]:not([style*="display: none"])').length;
      var reffoCount = document.querySelectorAll('.result-card[data-source="reffo"]:not([style*="display: none"])').length;
      var summaryEl = document.getElementById('searchSummary');
      if (summaryEl) {
        var parts = [];
        if (src === 'all' || src === 'beacons') parts.push(dhtCount + ' from beacons');
        if (src === 'all' || src === 'reffo') parts.push(reffoCount + ' from Reffo');
        summaryEl.textContent = parts.join(' \\u00b7 ');
      }
    };

    async function renderSearchResults(data) {
      const container = document.getElementById('searchResults');
      window._lastSearchData = data;
      if (data.results.length === 0) {
        container.innerHTML = '<p class="empty">No results found. Try a different search or location.</p>';
        return;
      }

      // Fetch favorite IDs for heart overlay
      try {
        const favRes = await fetch('/favorites/ids');
        const favIds = await favRes.json();
        window._favSet = new Set(favIds);
      } catch { window._favSet = new Set(); }

      // Flatten all items from all peers into one array
      var allItems = [];
      var dhtKeys = new Set();

      // First pass: collect DHT items and build dedup keys
      data.results.forEach(peer => {
        const peerSource = peer.source || 'dht';
        const peerRefs = peer.refs || [];
        const peerOffers = peer.offers || [];
        const peerMedia = peer.media || {};
        const peerHttpPort = peer.httpPort || 0;
        const offerMap = {};
        peerOffers.forEach(o => { if (!offerMap[o.refId]) offerMap[o.refId] = []; offerMap[o.refId].push(o); });

        if (peerSource === 'dht') {
          peerRefs.forEach(item => {
            const refOffers = offerMap[item.id] || [];
            const activeOffer = refOffers.find(o => o.status === 'active');
            const refMedia = peerMedia[item.id] || [];
            dhtKeys.add(item.id + ':' + peer.beaconId);
            allItems.push({ item: item, peer: peer, activeOffer: activeOffer || null, refMedia: refMedia, peerHttpPort: peerHttpPort, source: 'dht' });
          });
        }
      });

      // Second pass: collect Reffo items, dedup against DHT
      data.results.forEach(peer => {
        const peerSource = peer.source || 'dht';
        if (peerSource !== 'reffo') return;
        const peerRefs = peer.refs || [];
        const peerOffers = peer.offers || [];
        const peerMedia = peer.media || {};
        const offerMap = {};
        peerOffers.forEach(o => { if (!offerMap[o.refId]) offerMap[o.refId] = []; offerMap[o.refId].push(o); });

        peerRefs.forEach(item => {
          const dedupKey = item.id + ':' + peer.beaconId;
          if (dhtKeys.has(dedupKey)) return; // skip duplicate
          const refOffers = offerMap[item.id] || [];
          const activeOffer = refOffers.find(o => o.status === 'active');
          const refMedia = peerMedia[item.id] || [];
          allItems.push({ item: item, peer: peer, activeOffer: activeOffer || null, refMedia: refMedia, peerHttpPort: 0, source: 'reffo' });
        });
      });

      // Sort by newest first and limit to 30
      allItems.sort((a, b) => {
        const da = a.item.createdAt || '';
        const db = b.item.createdAt || '';
        return da < db ? 1 : da > db ? -1 : 0;
      });
      allItems = allItems.slice(0, 30);

      var dhtCount = allItems.filter(e => e.source === 'dht').length;
      var reffoCount = allItems.filter(e => e.source === 'reffo').length;

      let cards = '';
      let rows = '';
      lastSearchResults = [];
      allItems.forEach(entry => {
          const item = entry.item;
          const peer = entry.peer;
          const activeOffer = entry.activeOffer;
          const refMedia = entry.refMedia;
          const peerHttpPort = entry.peerHttpPort;
          const entrySource = entry.source;

          const priceStr = item.listingStatus === 'willing_to_sell' ? 'Make me sell' : activeOffer ? fmtCurrency(activeOffer.price, activeOffer.priceCurrency) : '';
          const badges = [item.category, item.subcategory].filter(Boolean).map(b =>
            '<span class="badge badge-cat">' + escapeHtml(b) + '</span>'
          ).join('');
          const statusClass = statusBadgeClass[item.listingStatus] || 'badge-for-sale';
          const statusLabel = statusLabels[item.listingStatus] || '';
          const firstPhoto = refMedia.find(m => m.mediaType === 'photo');

          let actionBtn = '';
          const isOwnCard = peer.beaconId === window._myBeaconId;
          if (!isOwnCard && item.listingStatus === 'for_sale' && activeOffer) {
            actionBtn = '<a style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#EC526F;cursor:pointer;text-decoration:none;" onclick="event.stopPropagation(); openBuyModal(\\'' + escapeJs(item.id) + '\\', \\'' + escapeJs(item.name) + '\\', \\'' + escapeJs(peer.beaconId) + '\\', ' + activeOffer.price + ', \\'' + escapeJs(activeOffer.priceCurrency) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EC526F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Buy at ' + escapeHtml(fmtCurrency(activeOffer.price, activeOffer.priceCurrency)) + '</a>';
          } else if (!isOwnCard && item.listingStatus === 'willing_to_sell') {
            actionBtn = '<a style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#EC526F;cursor:pointer;text-decoration:none;" onclick="event.stopPropagation(); openOfferModal(\\'' + escapeJs(item.id) + '\\', \\'' + escapeJs(item.name) + '\\', \\'' + escapeJs(peer.beaconId) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EC526F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Make Offer</a>';
          }

          const idx = lastSearchResults.length;
          lastSearchResults.push({ item: item, peer: peer, offer: activeOffer || null, media: refMedia, httpPort: peerHttpPort, source: entrySource });

          const favKey = item.id + ':' + peer.beaconId;
          const isFav = window._favSet && window._favSet.has(favKey);
          const heartFill = isFav ? '#EA526F' : 'none';
          const heartStroke = isFav ? '#EA526F' : '#777E90';
          const heartClass = isFav ? 'fav-heart active' : 'fav-heart';
          const heartBtn = '<button class="' + heartClass + '" onclick="event.stopPropagation(); toggleFavorite(this, ' + idx + ')"><svg width="16" height="16" viewBox="0 0 24 24" fill="' + heartFill + '" stroke="' + heartStroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>';

          // Source badge
          const sourceDot = entrySource === 'reffo'
            ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#7B61FF;font-weight:500;"><span style="width:6px;height:6px;border-radius:50%;background:#7B61FF;display:inline-block;"></span>Reffo</span>'
            : '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#45B26B;font-weight:500;"><span style="width:6px;height:6px;border-radius:50%;background:#45B26B;display:inline-block;"></span>Beacon</span>';

          // For Reffo results, filePath is a full URL; for DHT, it's relative
          let cardImgHtml;
          if (firstPhoto && entrySource === 'reffo') {
            cardImgHtml = '<div class="card-img" style="position:relative;"><img src="' + escapeHtml(firstPhoto.filePath) + '" alt="">' + heartBtn + '</div>';
          } else if (firstPhoto && peerHttpPort) {
            cardImgHtml = '<div class="card-img" style="position:relative;"><img src="http://' + location.hostname + ':' + peerHttpPort + '/' + escapeHtml(firstPhoto.filePath) + '" alt="">' + heartBtn + '</div>';
          } else {
            cardImgHtml = '<div class="card-img" style="position:relative;"><span class="placeholder"><svg width="40" height="40" viewBox="0 0 40 71" fill="none"><path d="M36.3314 2.40738C36.3314 2.40738 36.8264 1.42463 36.4263 0.662012C36.0263 -0.10061 35.0534 0.00517205 35.0534 0.00517205H11.1756C11.1756 0.00517205 10.5428 -0.0279334 10.1477 0.343949C9.75251 0.715831 9.59304 1.49138 9.59304 1.49138L0.238015 32.5907C0.238015 32.5907 -0.24866 33.7655 0.169465 34.6704C0.58759 35.5752 1.5753 35.4965 1.5753 35.4965H10.0645L0.5629 66.8837C0.5629 66.8837 -0.162543 68.519 1.00281 69.3381C2.16816 70.1572 3.37309 68.9223 3.37309 68.9223L37.7402 24.6034C37.7402 24.6034 38.3085 23.9493 37.9286 22.9371C37.5486 21.9249 36.7018 22.0235 36.7018 22.0235H26.875L36.3314 2.40738Z" fill="#E6E8EC"/></svg></span>' + heartBtn + '</div>';
          }

          cards += '<div class="card result-card" data-source="' + entrySource + '" onclick="openRemoteDetail(' + idx + ')">' +
            cardImgHtml +
            '<div class="card-body">' +
              '<h3>' + escapeHtml(item.name) + '</h3>' +
              '<div class="card-meta"><span class="badge ' + statusClass + '">' + statusLabel + '</span>' + badges + ' ' + sourceDot + '</div>' +
              (priceStr ? '<div class="card-price">' + escapeHtml(priceStr) + '</div>' : '') +
              (item.description ? '<div class="card-desc">' + escapeHtml(item.description) + '</div>' : '') +
              (function() {
                const lp = [item.locationCity, item.locationState, item.locationZip].filter(Boolean);
                return lp.length > 0 ? '<div style="font-size:12px;color:#777E90;margin-top:4px;font-weight:500;">Near ' + escapeHtml(lp.join(', ')) + '</div>' : '';
              })() +
              '<div class="beacon-id">Beacon: ' + escapeHtml(peer.beaconId.slice(0, 16)) + '...</div>' +
              (actionBtn ? '<div style="margin-top:10px;">' + actionBtn + '</div>' : '') +
            '</div></div>';

          // Row view
          let rowImgHtml;
          if (firstPhoto && entrySource === 'reffo') {
            rowImgHtml = '<div class="row-img"><img src="' + escapeHtml(firstPhoto.filePath) + '" alt="" style="width:100%;height:100%;object-fit:cover;"></div>';
          } else if (firstPhoto && peerHttpPort) {
            rowImgHtml = '<div class="row-img"><img src="http://' + location.hostname + ':' + peerHttpPort + '/' + escapeHtml(firstPhoto.filePath) + '" alt="" style="width:100%;height:100%;object-fit:cover;"></div>';
          } else {
            rowImgHtml = '<div class="row-img"><span class="placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></span></div>';
          }

          rows += '<div class="ref-row result-card" data-source="' + entrySource + '" onclick="openRemoteDetail(' + idx + ')">' +
            rowImgHtml +
            '<span class="row-name">' + escapeHtml(item.name) + '</span>' +
            '<div class="row-meta">' +
              '<span class="badge ' + statusClass + '" style="font-size:10px;padding:0 8px;line-height:22px;">' + statusLabel + '</span>' +
              (item.category ? '<span class="badge badge-cat" style="font-size:10px;padding:0 8px;line-height:22px;">' + escapeHtml(item.category) + '</span>' : '') +
              sourceDot +
              (priceStr ? '<span class="row-price">' + escapeHtml(priceStr) + '</span>' : '') +
            '</div>' +
          '</div>';
      });

      var summaryParts = [];
      if (dhtCount > 0) summaryParts.push(dhtCount + ' from beacons');
      if (reffoCount > 0) summaryParts.push(reffoCount + ' from Reffo');
      if (summaryParts.length === 0) summaryParts.push('0 results');

      const summaryHtml = '<p id="searchSummary" style="font-size:14px;color:#777E90;margin-bottom:12px;font-weight:500;">' +
        summaryParts.join(' \\u00b7 ') + '</p>';

      if (searchLayout === 'row') {
        container.innerHTML = summaryHtml + '<div class="rows">' + rows + '</div>';
      } else {
        container.innerHTML = summaryHtml + '<div class="cards">' + cards + '</div>';
      }

      // Re-apply active source filter
      if (_lastSearchSource !== 'all') {
        setSourceFilter(_lastSearchSource);
      }
    }

    /* ── Mobile search expand / collapse ──────────────── */
    function expandMobileSearch() {
      var pill = document.getElementById('mobileSearchPill');
      var panel = document.getElementById('mobileSearchExpanded');
      // Sync desktop → mobile inputs
      document.getElementById('mobileSearchQ').value = document.getElementById('headerSearchQ').value;
      document.getElementById('mobileSearchLoc').value = document.getElementById('headerSearchLoc').value;
      document.getElementById('mobileSearchCat').value = document.getElementById('headerSearchCat').value;
      // Animate pill out
      pill.style.opacity = '0';
      pill.style.transform = 'scale(0.97)';
      pill.style.maxHeight = '0';
      pill.style.pointerEvents = 'none';
      // Animate panel in
      panel.classList.add('open');
      setTimeout(function() { document.getElementById('mobileSearchQ').focus(); }, 80);
    }
    function collapseMobileSearch() {
      var pill = document.getElementById('mobileSearchPill');
      var panel = document.getElementById('mobileSearchExpanded');
      // Sync mobile → desktop inputs
      document.getElementById('headerSearchQ').value = document.getElementById('mobileSearchQ').value;
      document.getElementById('headerSearchLoc').value = document.getElementById('mobileSearchLoc').value;
      document.getElementById('headerSearchCat').value = document.getElementById('mobileSearchCat').value;
      // Update pill summary
      var q = document.getElementById('mobileSearchQ').value.trim();
      var cat = document.getElementById('mobileSearchCat').value;
      var loc = document.getElementById('mobileSearchLoc').value.trim();
      document.getElementById('mobileSearchTitle').textContent = q || 'Search items...';
      document.getElementById('mobileSearchSub').textContent = (cat || 'All categories') + ' \\u00b7 ' + (loc || 'Anywhere');
      // Animate panel out
      panel.classList.remove('open');
      // Animate pill in
      pill.style.opacity = '1';
      pill.style.transform = 'scale(1)';
      pill.style.maxHeight = '48px';
      pill.style.pointerEvents = 'auto';
    }
    // Collapse on scroll
    window.addEventListener('scroll', function() {
      var panel = document.getElementById('mobileSearchExpanded');
      if (panel && panel.classList.contains('open')) collapseMobileSearch();
    }, { passive: true });
    // Collapse on outside click
    document.addEventListener('mousedown', function(e) {
      var panel = document.getElementById('mobileSearchExpanded');
      var pill = document.getElementById('mobileSearchPill');
      if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !pill.contains(e.target)) {
        collapseMobileSearch();
      }
    });

    async function executeHeaderSearch() {
      // Sync mobile inputs to desktop before searching (in case called from mobile)
      if (window.innerWidth < 640) {
        document.getElementById('headerSearchQ').value = document.getElementById('mobileSearchQ').value;
        document.getElementById('headerSearchLoc').value = document.getElementById('mobileSearchLoc').value;
        document.getElementById('headerSearchCat').value = document.getElementById('mobileSearchCat').value;
      }
      switchTab('search');
      const container = document.getElementById('searchResults');
      container.innerHTML = '<p class="empty">Searching...</p>';

      var q = document.getElementById('headerSearchQ').value.trim();
      var c = document.getElementById('headerSearchCat').value;
      var loc = document.getElementById('headerSearchLoc').value.trim();
      var radiusSelect = document.getElementById('searchRadiusSelect');
      var radius = radiusSelect.value || '50';

      var params = new URLSearchParams();
      if (q) params.set('q', q);
      if (c) params.set('c', c);

      // Geocode location if provided
      if (loc) {
        try {
          var geoParams = new URLSearchParams({ q: loc, format: 'json', limit: '1', countrycodes: 'us' });
          var geoRes = await fetch('https://nominatim.openstreetmap.org/search?' + geoParams.toString(), {
            headers: { 'User-Agent': 'ReffoBeacon/1.0' }
          });
          var geoData = await geoRes.json();
          if (geoData.length > 0) {
            params.set('lat', geoData[0].lat);
            params.set('lng', geoData[0].lon);
            params.set('radius', radius);
            radiusSelect.style.display = '';
          } else {
            container.innerHTML = '<p class="empty">Location not found. Try a different city or zip code.</p>';
            return;
          }
        } catch (e) {
          container.innerHTML = '<p class="empty">Failed to look up location.</p>';
          return;
        }
      } else {
        radiusSelect.style.display = 'none';
      }

      try {
        var res = await fetch('/search?' + params.toString());
        var data = await res.json();
        renderSearchResults(data);
      } catch {
        container.innerHTML = '<p class="empty">Search failed</p>';
      }
    }
    window.executeHeaderSearch = executeHeaderSearch;

    // ===== Avatar Dropdown =====
    window.toggleAvatarDropdown = function() {
      var dd = document.getElementById('avatarDropdown');
      dd.classList.toggle('open');
    };

    window.closeAvatarDropdown = function() {
      document.getElementById('avatarDropdown').classList.remove('open');
    };

    // Close avatar dropdown on outside click
    document.addEventListener('mousedown', function(e) {
      var container = document.getElementById('avatarContainer');
      if (container && !container.contains(e.target)) {
        document.getElementById('avatarDropdown').classList.remove('open');
      }
    });

    // ===== Favorites =====
    let favFilterActive = false;

    // ===== Favorites multi-select =====
    if (!window._selectedFavIds) window._selectedFavIds = new Set();
    var _favsList = [];

    function updateFavBulkBar() {
      var sidebar = document.getElementById('favBulkSidebar');
      var count = window._selectedFavIds.size;
      if (count > 0) { sidebar.classList.add('show'); document.getElementById('favBulkCount').textContent = count; }
      else { sidebar.classList.remove('show'); }
    }

    window.toggleSelectFav = function(key, checked) {
      if (checked) window._selectedFavIds.add(key); else window._selectedFavIds.delete(key);
      updateFavBulkBar();
    };

    window.toggleSelectAllFav = function(checked) {
      document.querySelectorAll('#favoriteRefs .ref-row input[type=checkbox]').forEach(function(cb) {
        var row = cb.closest('.ref-row');
        var key = row ? row.getAttribute('data-favkey') : '';
        if (key) { cb.checked = checked; if (checked) window._selectedFavIds.add(key); else window._selectedFavIds.delete(key); }
      });
      updateFavBulkBar();
    };

    window.clearFavSelection = function() {
      window._selectedFavIds.clear();
      document.querySelectorAll('#favoriteRefs input[type=checkbox]').forEach(function(cb) { cb.checked = false; });
      updateFavBulkBar();
    };

    window.bulkUnfavorite = async function() {
      var keys = Array.from(window._selectedFavIds);
      if (keys.length === 0) return;
      if (!confirm('Remove ' + keys.length + ' favorite(s)?')) return;
      try {
        for (var i = 0; i < keys.length; i++) {
          var parts = keys[i].split('::');
          await fetch('/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refId: parts[0], beaconId: parts[1] }) });
          if (window._favSet) window._favSet.delete(parts[0] + ':' + parts[1]);
        }
        showToast(keys.length + ' favorite(s) removed', '');
        window._selectedFavIds.clear();
        loadFavorites();
      } catch { showToast('Bulk unfavorite failed', 'rejected'); }
    };

    async function loadFavorites() {
      const container = document.getElementById('favoriteRefs');
      try {
        const res = await fetch('/favorites');
        const favs = await res.json();
        _favsList = favs;
        if (favs.length === 0) {
          container.innerHTML = '<p class="empty">No favorites yet. Search for items and click the heart to save them.</p>';
          updateFavBulkBar();
          return;
        }
        const statusLabelsLocal = { for_sale: 'For Sale', willing_to_sell: 'Open to Offers', for_rent: 'For Rent' };
        const statusBadgeClassLocal = { for_sale: 'badge-for-sale', willing_to_sell: 'badge-willing', for_rent: 'badge-for-rent' };
        var selectedIds = window._selectedFavIds || new Set();
        var allSelected = favs.length > 0 && favs.every(function(f) { return selectedIds.has(f.refId + '::' + f.beaconId); });

        container.innerHTML =
          '<div style="display:flex;align-items:center;gap:10px;padding:4px 12px 8px;">' +
            '<input type="checkbox" ' + (allSelected ? 'checked' : '') + ' onchange="toggleSelectAllFav(this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#EC526F;">' +
            '<span style="font-size:11px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.05em;">' + (selectedIds.size > 0 ? selectedIds.size + ' selected' : 'Select all') + '</span>' +
          '</div>' +
          '<div class="rows">' + favs.map(function(fav) {
            const sLabel = statusLabelsLocal[fav.listingStatus] || '';
            const sClass = statusBadgeClassLocal[fav.listingStatus] || '';
            const locParts = [fav.locationCity, fav.locationState, fav.locationZip].filter(Boolean);
            const favKey = fav.refId + '::' + fav.beaconId;
            const isSelected = selectedIds.has(favKey);

            return '<div class="ref-row" data-favkey="' + escapeHtml(favKey) + '" style="cursor:default;">' +
              '<div onclick="event.stopPropagation()" style="flex-shrink:0;margin-right:8px;display:flex;align-items:center;">' +
                '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleSelectFav(\\'' + escapeHtml(favKey) + '\\', this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#EC526F;">' +
              '</div>' +
              '<span class="row-name">' + escapeHtml(fav.refName) + '</span>' +
              '<div class="row-meta">' +
                (sLabel ? '<span class="badge ' + sClass + '" style="font-size:10px;padding:0 8px;line-height:22px;">' + sLabel + '</span>' : '') +
                (fav.category ? '<span class="badge badge-cat" style="font-size:10px;padding:0 8px;line-height:22px;">' + escapeHtml(fav.category) + '</span>' : '') +
                (locParts.length > 0 ? '<span style="font-size:11px;color:#777E90;">Near ' + escapeHtml(locParts.join(', ')) + '</span>' : '') +
              '</div>' +
              '<div style="flex-shrink:0;margin-left:auto;" onclick="event.stopPropagation()">' +
                '<button class="btn-danger btn-sm" style="font-size:11px;" onclick="removeFavorite(\\'' + escapeHtml(fav.refId) + '\\', \\'' + escapeHtml(fav.beaconId) + '\\')">Remove</button>' +
              '</div>' +
            '</div>';
          }).join('') + '</div>';
        updateFavBulkBar();
      } catch {
        container.innerHTML = '<p class="empty">Failed to load favorites</p>';
      }
    }

    window.removeFavorite = async function(refId, beaconId) {
      try {
        await fetch('/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refId, beaconId }) });
        // Remove from favSet
        if (window._favSet) window._favSet.delete(refId + ':' + beaconId);
        loadFavorites();
        showToast('Removed from favorites', '');
      } catch {}
    };

    window.toggleFavorite = async function(btn, idx) {
      const entry = lastSearchResults[idx];
      if (!entry) return;
      const item = entry.item;
      const peer = entry.peer;
      const offer = entry.offer;
      const mediaList = entry.media || [];
      const httpPort = entry.httpPort || 0;
      const firstPhoto = mediaList.find(function(m) { return m.mediaType === 'photo'; });
      const imageUrl = (firstPhoto && httpPort) ? 'http://' + location.hostname + ':' + httpPort + '/' + firstPhoto.filePath : '';

      try {
        const res = await fetch('/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refId: item.id,
            refName: item.name || '',
            beaconId: peer.beaconId,
            offerPrice: offer ? offer.price : undefined,
            offerCurrency: offer ? offer.priceCurrency : 'USD',
            listingStatus: item.listingStatus,
            category: item.category || '',
            subcategory: item.subcategory || '',
            locationCity: item.locationCity || '',
            locationState: item.locationState || '',
            locationZip: item.locationZip || '',
            imageUrl: imageUrl
          })
        });
        const result = await res.json();
        const key = item.id + ':' + peer.beaconId;
        if (result.favorited) {
          btn.classList.add('active');
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#EA526F" stroke="#EA526F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
          if (window._favSet) window._favSet.add(key);
          showToast('Added to favorites', '');
        } else {
          btn.classList.remove('active');
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
          if (window._favSet) window._favSet.delete(key);
          showToast('Removed from favorites', '');
        }
      } catch {
        showToast('Failed to toggle favorite', '');
      }
    };

    window.toggleDetailFavorite = async function(idx, btn) {
      await window.toggleFavorite(btn, idx);
    };

    window.toggleFavFilter = function() {
      favFilterActive = !favFilterActive;
      var filterBtn = document.getElementById('favFilterBtn');
      filterBtn.classList.toggle('active', favFilterActive);
      var cards = document.querySelectorAll('.result-card');
      if (favFilterActive && window._favSet) {
        cards.forEach(function(card, i) {
          var entry = lastSearchResults[i];
          if (entry) {
            var key = entry.item.id + ':' + entry.peer.beaconId;
            card.style.display = window._favSet.has(key) ? '' : 'none';
          }
        });
      } else {
        cards.forEach(function(card) {
          var cardSource = card.getAttribute('data-source');
          if (_lastSearchSource === 'all' || cardSource === _lastSearchSource) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      }
    };

    // ===== Remote Ref Detail (read-only) =====
    window.openRemoteDetail = function(idx) {
      const entry = lastSearchResults[idx];
      if (!entry) return;
      const item = entry.item;
      const peer = entry.peer;
      const offer = entry.offer;
      const mediaList = entry.media || [];
      const httpPort = entry.httpPort || 0;
      const entrySource = entry.source || 'dht';
      const baseUrl = httpPort ? 'http://' + location.hostname + ':' + httpPort : '';

      // Helper to resolve media URL based on source
      function mediaUrl(filePath) {
        if (entrySource === 'reffo') return escapeHtml(filePath);
        return baseUrl ? baseUrl + '/' + escapeHtml(filePath) : '';
      }

      const container = document.getElementById('detailContent');
      switchTab('detail');

      const photos = mediaList.filter(m => m.mediaType === 'photo');
      const mainPhoto = photos[0];
      const sidePhotos = photos.slice(1);
      const thumbSrc = mainPhoto ? mediaUrl(mainPhoto.filePath) : '';

      let mainImgHtml = (mainPhoto && (baseUrl || entrySource === 'reffo'))
        ? '<img class="blur-bg" src="' + mediaUrl(mainPhoto.filePath) + '" alt=""><img class="main-img" src="' + mediaUrl(mainPhoto.filePath) + '" alt="">'
        : '<span class="placeholder">No media</span>';

      const hasVideo = mediaList.some(m => m.mediaType === 'video');
      const showViewAll = photos.length > 4 || (photos.length >= 4 && hasVideo);
      const remotePhotoUrls = photos.filter(p => baseUrl || entrySource === 'reffo').map(p => mediaUrl(p.filePath));
      let sideImgsHtml = '';
      for (let i = 0; i < 3; i++) {
        const sm = sidePhotos[i];
        if (sm && (baseUrl || entrySource === 'reffo')) {
          const src = mediaUrl(sm.filePath);
          const viewAllOverlay = (i === 2 && showViewAll) ? '<div class="detail-view-all" onclick="event.stopPropagation();openLightbox(window._currentPhotos, 0)"><span>View all</span></div>' : '';
          sideImgsHtml += '<div class="detail-side-img" onclick="openLightbox(window._currentPhotos, ' + (i + 1) + ')"><img src="' + src + '" alt="">' + viewAllOverlay + '</div>';
        } else {
          sideImgsHtml += '<div class="detail-side-img"><span class="placeholder">+</span></div>';
        }
      }

      const statusLabel = statusLabels[item.listingStatus] || '';
      const priceDisplay = item.listingStatus === 'willing_to_sell' ? 'Make me sell' : offer ? fmtCurrency(offer.price, offer.priceCurrency) : 'Make an offer';
      const remoteLoc = [item.locationCity, item.locationState, item.locationZip].filter(Boolean);
      const conditionDisplay = item.condition ? item.condition.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) : '';

      // Build action buttons for remote detail (skip for own items)
      let purchaseBtn = '';
      let negotiateBtn = '';
      const isOwnItem = peer.beaconId === window._myBeaconId;
      if (!isOwnItem && item.listingStatus === 'for_sale' && offer) {
        purchaseBtn = '<button class="button-gradient" onclick="openBuyModal(\\'' + escapeJs(item.id) + '\\', \\'' + escapeJs(item.name) + '\\', \\'' + escapeJs(peer.beaconId) + '\\', ' + offer.price + ', \\'' + escapeJs(offer.priceCurrency) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Purchase</button>';
        negotiateBtn = '<button class="button-stroke" onclick="openOfferModal(\\'' + escapeJs(item.id) + '\\', \\'' + escapeJs(item.name) + '\\', \\'' + escapeJs(peer.beaconId) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Negotiate</button>';
      } else if (!isOwnItem && item.listingStatus === 'willing_to_sell') {
        purchaseBtn = '<button class="button-gradient" onclick="openOfferModal(\\'' + escapeJs(item.id) + '\\', \\'' + escapeJs(item.name) + '\\', \\'' + escapeJs(peer.beaconId) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Make an Offer</button>';
      }

      let html = '';
      // New header above gallery
      const sellerInitial = (peer.beaconId || 'S')[0].toUpperCase();
      html += '<div class="detail-header">';
      html += '<span class="detail-header-back" onclick="switchTab(\\'search\\')">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#23262F"/></svg>';
      html += ' Back to Search</span>';
      html += '<div class="detail-title-row">';
      html += '<h1>' + escapeHtml(item.name) + '</h1>';
      html += '<div class="detail-title-actions">';
      html += '<button onclick="navigator.clipboard.writeText(location.href).then(function(){ showToast(\\'Link copied!\\',\\'\\'); })" title="Share"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>';
      const detailFavKey = item.id + ':' + peer.beaconId;
      const detailIsFav = window._favSet && window._favSet.has(detailFavKey);
      const detailHeartFill = detailIsFav ? '#EA526F' : 'none';
      const detailHeartStroke = detailIsFav ? '#EA526F' : 'currentColor';
      const detailHeartBg = detailIsFav ? 'background:#FFF0F3;' : '';
      html += '<button id="detailHeartBtn" title="Save" style="' + detailHeartBg + '" onclick="toggleDetailFavorite(' + idx + ', this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="' + detailHeartFill + '" stroke="' + detailHeartStroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>';
      html += '</div></div>';
      html += '<div class="detail-posted-line">';
      html += '<div class="avatar-sm">' + sellerInitial + '</div>';
      html += '<span class="poster-name">Seller Beacon</span>';
      if (remoteLoc.length > 0) {
        html += '<span class="loc-pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Near ' + escapeHtml(remoteLoc.join(', ')) + '</span>';
      }
      html += '</div>';
      html += '</div>'; // end detail-header

      html += '<div class="detail-gallery">';
      html += '<div class="detail-main-img" id="detailMainImg" style="cursor:pointer;" onclick="openLightbox(window._currentPhotos, 0)">' + mainImgHtml + '</div>';
      html += '<div class="detail-side-imgs">' + sideImgsHtml + '</div>';
      html += '</div>';

      // Set photos for lightbox (innerHTML doesn't execute <script> tags)
      window._currentPhotos = remotePhotoUrls;

      html += '<div class="detail-columns">';

      // ===== Left: DealBody =====
      html += '<div class="detail-left deal-body">';

      // Description
      if (item.description) {
        html += '<div class="deal-content">' + escapeHtml(item.description) + '</div>';
      }

      // Information grid — simplified: location + beacon only
      html += '<div class="deal-heading">Information</div>';
      html += '<div class="info-grid">';
      html += '<div class="info-item">';
      html += '<div class="info-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92A5EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>';
      html += '<span class="info-type">' + (remoteLoc.length > 0 ? 'Near ' + escapeHtml(remoteLoc.join(', ')) : 'Location N/A') + '</span></div>';
      html += '<div class="info-item">';
      html += '<div class="info-icon orange"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FA8F54" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
      html += '<span class="info-type">Beacon: ' + escapeHtml(peer.beaconId.slice(0, 12)) + '...</span></div>';
      html += '</div>';

      html += '</div>'; // end detail-left deal-body

      // ===== Right: PaymentCard =====
      html += '<div class="detail-right">';
      html += '<div class="payment-card">';

      // Header: price + initial-letter avatar
      html += '<div class="payment-card-header">';
      html += '<div class="payment-card-amount">' + priceDisplay;
      html += '</div>';
      html += '<div class="payment-card-thumb initial-avatar">' + sellerInitial + '</div>';
      html += '</div>';

      // Status badge below price (category moved to invoice row)
      html += '<div style="padding:0 30px 10px;">';
      html += '<div style="margin-bottom:6px;"><span class="badge badge-' + (item.listingStatus === 'for_sale' ? 'for-sale' : 'willing-to-sell') + '">' + statusLabel + '</span></div>';
      html += '</div>';

      // Share button — own row, icon only
      html += '<div style="margin:12px 30px 0;"><button class="button-stroke" onclick="navigator.clipboard.writeText(location.href).then(function(){ showToast(\\'Link copied!\\',\\'\\'); })" title="Share" style="width:40px;height:40px;padding:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button></div>';
      // Action buttons row
      html += '<div class="payment-card-buttons">';
      if (negotiateBtn) html += negotiateBtn;
      if (purchaseBtn) html += purchaseBtn;
      html += '</div>';

      // Collapsible "Send a Message" section (only for non-own items)
      if (!isOwnItem) {
        const msgId = 'detailMsgSection';
        html += '<div style="margin:0 30px;border-top:1px solid #E6E8EC;padding-top:8px;">';
        html += '<button class="contact-toggle" onclick="toggleDetailContact()" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 0;font-size:13px;font-weight:600;color:#777E90;width:100%;text-align:left;">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        html += 'Send a Message';
        html += '<svg id="detailContactChevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>';
        html += '</button>';
        html += '<div id="' + msgId + '" style="display:none;padding-bottom:12px;">';
        html += '<textarea id="detailMsgText" placeholder="Write a message to the seller..." rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #E6E8EC;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;margin-bottom:8px;"></textarea>';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<button class="button-gradient" onclick="sendDetailMessage(\\'' + escapeJs(item.id) + '\\', \\'' + escapeJs(item.name) + '\\', \\'' + escapeJs(peer.beaconId) + '\\')" style="height:34px;padding:0 16px;font-size:13px;">Send</button>';
        html += '<span id="detailMsgStatus" style="font-size:12px;color:#777E90;"></span>';
        html += '</div></div></div>';
      }

      // Invoice rows — category added
      const remoteCatParts = [item.category, item.subcategory].filter(Boolean);
      if (remoteCatParts.length > 0) {
        html += '<div class="invoice-row"><span class="invoice-label">Category</span><span class="invoice-value">' + escapeHtml(remoteCatParts.join(' / ')) + '</span></div>';
      }
      if (offer) {
        html += '<div class="invoice-row"><span class="invoice-label">Item Price</span><span class="invoice-value">' + escapeHtml(fmtCurrency(offer.price, offer.priceCurrency)) + '</span></div>';
      }
      if (conditionDisplay) {
        html += '<div class="invoice-row"><span class="invoice-label">Condition</span><span class="invoice-value">' + escapeHtml(conditionDisplay) + '</span></div>';
      }
      if (remoteLoc.length > 0) {
        html += '<div class="invoice-row"><span class="invoice-label">Location</span><span class="invoice-value">' + escapeHtml(remoteLoc.join(', ')) + '</span></div>';
      }

      // Hidden invoice rows (future use)
      html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Commission</span><span class="invoice-value">$0.00</span></div>';
      html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Referral Fee</span><span class="invoice-value">$0.00</span></div>';
      html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Tax</span><span class="invoice-value">$0.00</span></div>';

      // Total row
      if (offer) {
        html += '<div class="invoice-row invoice-row-bg"><span class="invoice-label" style="font-weight:600;color:#141416;">Total</span><span class="invoice-value" style="font-size:16px;">' + escapeHtml(fmtCurrency(offer.price, offer.priceCurrency)) + '</span></div>';
      }

      // Footer
      const remoteListedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      let remoteFooterText = remoteListedDate ? 'Listed ' + remoteListedDate : 'Seller beacon is online';
      if (item.listingStatus === 'willing_to_sell' || item.listingStatus === 'for_sale') remoteFooterText += ' · Open to negotiation';
      html += '<div class="payment-card-footer">' + remoteFooterText + '</div>';

      html += '</div>'; // end payment-card
      html += '</div>'; // end detail-right

      html += '</div>'; // end detail-columns

      container.innerHTML = html;
    };

    // ===== Proposal Modal =====
    window.openBuyModal = function(refId, refName, sellerBeaconId, price, currency) {
      if (sellerBeaconId === window._myBeaconId) return;
      document.getElementById('modalRefId').value = refId;
      document.getElementById('modalRefName').value = refName;
      document.getElementById('modalSellerBeaconId').value = sellerBeaconId;
      document.getElementById('modalPrice').value = price;
      document.getElementById('modalCurrency').value = currency;
      document.getElementById('modalMessage').value = 'Accepting listed price';
      document.getElementById('modalTitle').textContent = 'Buy: ' + refName;
      document.getElementById('modalSendBtn').textContent = 'Send Proposal';
      document.getElementById('modalMsg').innerHTML = '';
      document.getElementById('proposalModal').classList.remove('hidden');
    };

    window.openOfferModal = function(refId, refName, sellerBeaconId) {
      if (sellerBeaconId === window._myBeaconId) return;
      document.getElementById('modalRefId').value = refId;
      document.getElementById('modalRefName').value = refName;
      document.getElementById('modalSellerBeaconId').value = sellerBeaconId;
      document.getElementById('modalPrice').value = '';
      document.getElementById('modalCurrency').value = 'USD';
      document.getElementById('modalMessage').value = '';
      document.getElementById('modalTitle').textContent = 'Make Offer: ' + refName;
      document.getElementById('modalSendBtn').textContent = 'Send Offer';
      document.getElementById('modalMsg').innerHTML = '';
      document.getElementById('proposalModal').classList.remove('hidden');
    };

    window.closeProposalModal = function() {
      document.getElementById('proposalModal').classList.add('hidden');
    };

    // Toggle the collapsible contact section on item detail
    window.toggleDetailContact = function() {
      var s = document.getElementById('detailMsgSection');
      var chev = document.getElementById('detailContactChevron');
      if (!s) return;
      var show = s.style.display === 'none';
      s.style.display = show ? 'block' : 'none';
      if (chev) chev.style.transform = show ? 'rotate(180deg)' : '';
    };

    // Send a message from the item detail page (creates a proposal with message-only type)
    window.sendDetailMessage = async function(refId, refName, sellerBeaconId) {
      var textarea = document.getElementById('detailMsgText');
      var statusEl = document.getElementById('detailMsgStatus');
      var msg = textarea.value.trim();
      if (!msg) { statusEl.textContent = 'Please enter a message'; statusEl.style.color = '#e74c3c'; return; }
      statusEl.textContent = 'Sending...';
      statusEl.style.color = '#777E90';
      try {
        var res = await fetch('/negotiations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refId: refId,
            refName: refName,
            sellerBeaconId: sellerBeaconId,
            price: 0,
            priceCurrency: 'USD',
            message: msg,
          })
        });
        if (!res.ok) {
          var err = await res.json();
          throw new Error(err.error || 'Failed to send');
        }
        textarea.value = '';
        statusEl.textContent = 'Message sent!';
        statusEl.style.color = '#2E7D32';
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.style.color = '#e74c3c';
      }
    };

    window.sendProposal = async function() {
      const btn = document.getElementById('modalSendBtn');
      btn.disabled = true;
      try {
        const res = await fetch('/negotiations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refId: document.getElementById('modalRefId').value,
            refName: document.getElementById('modalRefName').value,
            sellerBeaconId: document.getElementById('modalSellerBeaconId').value,
            price: parseFloat(document.getElementById('modalPrice').value),
            priceCurrency: document.getElementById('modalCurrency').value,
            message: document.getElementById('modalMessage').value.trim(),
          })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to send proposal');
        }
        closeProposalModal();
        switchTab('inbox');
        currentInboxTab = 'sent';
        loadInbox();
      } catch (err) {
        document.getElementById('modalMsg').innerHTML = '<div class="msg err">' + escapeHtml(err.message) + '</div>';
      } finally {
        btn.disabled = false;
      }
    };

    // ===== Negotiations =====
    let cachedIncoming = [];
    let cachedOutgoing = [];

    // ===== Unified Inbox =====
    var cachedMessages = [];
    var cachedResolved = [];
    var cachedArchivedNegs = [];

    function renderNegotiationCards(negs, isSeller) {
      if (negs.length === 0) return '<p class="empty">No negotiations yet</p>';
      return negs.map(n => {
        let actions = '';
        if (isSeller && n.role === 'seller' && n.status === 'pending') {
          actions = '<div class="neg-actions">' +
            '<button class="btn-primary btn-sm" onclick="openRespondModal(\\'' + n.id + '\\', \\'' + escapeJs(n.refName || n.refId.slice(0,8)) + '\\', ' + n.price + ', \\'' + escapeJs(n.priceCurrency) + '\\', \\'' + escapeJs(n.message || '') + '\\')">Respond</button>' +
            '</div>';
        } else if (isSeller && n.role === 'seller' && n.status === 'accepted') {
          actions = '<div class="neg-actions">' +
            '<button class="btn-primary btn-sm" onclick="markAsSold(\\'' + n.id + '\\')">Mark as Sold</button>' +
            '</div>';
        } else if (!isSeller && n.role === 'buyer' && n.status === 'pending') {
          actions = '<div class="neg-actions"><button class="btn-secondary btn-sm" onclick="withdrawNeg(\\'' + n.id + '\\')">Withdraw</button></div>';
        }

        const displayStatus = negStatusLabels[n.status] || n.status;

        let details = '<strong>' + escapeHtml(fmtCurrency(n.price, n.priceCurrency)) + '</strong>';
        if (n.message) details += ' &mdash; ' + escapeHtml(n.message);
        if (n.counterPrice) details += '<br>Counter: <strong>' + escapeHtml(fmtCurrency(n.counterPrice, n.priceCurrency)) + '</strong>';
        if (n.responseMessage) details += ' &mdash; ' + escapeHtml(n.responseMessage);

        return '<div class="neg-card ' + n.status + '">' +
          '<div class="neg-header">' +
            '<span class="neg-item-name">' + escapeHtml(n.refName || n.refId.slice(0, 8)) + '</span>' +
            '<span class="neg-status ' + n.status + '">' + displayStatus + '</span>' +
          '</div>' +
          '<div class="neg-details">' + details + '</div>' +
          '<div class="beacon-id">' + (n.role === 'seller' ? 'Buyer' : 'Seller') + ': ' + escapeHtml((n.role === 'seller' ? n.buyerBeaconId : n.sellerBeaconId).slice(0, 16)) + '...</div>' +
          actions +
          '</div>';
      }).join('');
    }

    function renderInboxRow(item) {
      var unreadClass = item.unread ? ' unread' : '';
      var iconClass = item.type === 'message' ? 'message' : (item.iconType || 'offer');
      var iconLetter = item.type === 'message' ? '&#9993;' : '&#36;';
      var badgeClass = item.badgeClass || '';
      var badgeLabel = item.badgeLabel || '';
      return '<div class="inbox-row' + unreadClass + '" onclick="' + item.onclick + '">' +
        '<div class="inbox-icon ' + iconClass + '">' + iconLetter + '</div>' +
        '<div class="inbox-body">' +
          '<div class="inbox-sender">' + escapeHtml(item.sender) + ' &middot; <span style="color:#777E90;font-weight:400;">' + escapeHtml(item.refName) + '</span></div>' +
          '<div class="inbox-preview">' + escapeHtml(item.preview) + '</div>' +
        '</div>' +
        '<div class="inbox-meta">' +
          '<span class="inbox-date">' + item.date + '</span>' +
          (badgeLabel ? '<span class="inbox-badge ' + badgeClass + '">' + badgeLabel + '</span>' : '') +
        '</div>' +
      '</div>';
    }

    function buildInboxItems() {
      var items = [];
      // Add incoming negotiations (offers received)
      cachedIncoming.forEach(function(n) {
        var displayStatus = negStatusLabels[n.status] || n.status;
        var preview = escapeHtml(fmtCurrency(n.price, n.priceCurrency));
        if (n.message) preview += ' — ' + n.message;
        items.push({
          type: 'offer',
          subtype: 'incoming',
          id: n.id,
          sender: (n.buyerBeaconId || '').slice(0, 12) + '...',
          refName: n.refName || n.refId.slice(0, 8),
          refId: n.refId,
          preview: preview,
          date: new Date(n.updatedAt || n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sortDate: new Date(n.updatedAt || n.createdAt).getTime(),
          unread: n.status === 'pending',
          badgeClass: n.status,
          badgeLabel: displayStatus,
          iconType: n.status === 'accepted' ? 'accepted' : (n.status === 'sold' ? 'sold' : 'offer'),
          status: n.status,
          onclick: 'openInboxNegThread(\\'' + n.refId + '\\', true)',
          raw: n
        });
      });
      // Add outgoing negotiations (offers sent)
      cachedOutgoing.forEach(function(n) {
        var displayStatus = negStatusLabels[n.status] || n.status;
        var preview = escapeHtml(fmtCurrency(n.price, n.priceCurrency));
        if (n.message) preview += ' — ' + n.message;
        items.push({
          type: 'offer',
          subtype: 'sent',
          id: n.id,
          sender: 'You',
          refName: n.refName || n.refId.slice(0, 8),
          refId: n.refId,
          preview: preview,
          date: new Date(n.updatedAt || n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sortDate: new Date(n.updatedAt || n.createdAt).getTime(),
          unread: false,
          badgeClass: n.status,
          badgeLabel: displayStatus,
          iconType: 'offer',
          status: n.status,
          onclick: 'openInboxNegThread(\\'' + n.refId + '\\', false)',
          raw: n
        });
      });
      // Add network messages
      cachedMessages.forEach(function(m) {
        items.push({
          type: 'message',
          subtype: 'message',
          id: m.id,
          sender: m.senderName || 'Anonymous',
          refName: m.refName || m.refId.slice(0, 8),
          refId: m.refId,
          preview: m.message,
          date: new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sortDate: new Date(m.createdAt).getTime(),
          unread: !m.read,
          badgeClass: m.reply ? 'replied' : (!m.read ? 'new-msg' : ''),
          badgeLabel: m.reply ? 'Replied' : (!m.read ? 'New' : ''),
          iconType: 'message',
          status: m.reply ? 'replied' : (m.read ? 'read' : 'new'),
          onclick: 'openInboxMessage(\\'' + m.id + '\\')',
          raw: m
        });
      });
      // Sort by date descending
      items.sort(function(a, b) { return b.sortDate - a.sortDate; });
      return items;
    }

    function renderInboxView() {
      var container = document.getElementById('inboxContainer');
      if (!container) return;
      var tab = currentInboxTab;
      var items = buildInboxItems();

      if (tab === 'offers') items = items.filter(function(i) { return i.type === 'offer' && i.subtype === 'incoming'; });
      else if (tab === 'sent') items = items.filter(function(i) { return i.type === 'offer' && i.subtype === 'sent'; });
      else if (tab === 'messages') items = items.filter(function(i) { return i.type === 'message'; });
      else if (tab === 'resolved') {
        // Show resolved negotiations
        if (cachedResolved.length === 0) {
          container.innerHTML = '<p class="empty">No resolved negotiations</p>';
          return;
        }
        container.innerHTML = '<div class="inbox-list">' + cachedResolved.map(function(n) {
          var displayStatus = negStatusLabels[n.status] || n.status;
          var preview = escapeHtml(fmtCurrency(n.price, n.priceCurrency));
          if (n.message) preview += ' — ' + n.message;
          var roleLabel = n.role === 'seller' ? 'From buyer' : 'To seller';
          return renderInboxRow({
            type: 'offer',
            sender: roleLabel,
            refName: n.refName || n.refId.slice(0, 8),
            preview: preview,
            date: new Date(n.updatedAt || n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            unread: false,
            badgeClass: n.status,
            badgeLabel: displayStatus,
            iconType: n.status === 'sold' ? 'sold' : (n.status === 'accepted' ? 'accepted' : 'offer'),
            onclick: 'openInboxResolvedDetail(\\'' + n.id + '\\')'
          });
        }).join('') + '</div>';
        return;
      }
      else if (tab === 'archived') {
        if (cachedArchivedNegs.length === 0) {
          container.innerHTML = '<p class="empty">No archived items</p>';
          return;
        }
        container.innerHTML = '<div class="inbox-list">' + cachedArchivedNegs.map(function(n) {
          var displayStatus = negStatusLabels[n.status] || n.status;
          var preview = escapeHtml(fmtCurrency(n.price, n.priceCurrency));
          return renderInboxRow({
            type: 'offer',
            sender: n.role === 'seller' ? 'From buyer' : 'To seller',
            refName: n.refName || n.refId.slice(0, 8),
            preview: preview,
            date: new Date(n.updatedAt || n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            unread: false,
            badgeClass: 'withdrawn',
            badgeLabel: displayStatus,
            iconType: 'offer',
            onclick: 'openInboxArchivedDetail(\\'' + n.id + '\\')'
          });
        }).join('') + '</div>';
        return;
      }
      // 'all' tab — everything
      if (items.length === 0) {
        container.innerHTML = '<p class="empty">No messages or offers yet</p>';
        return;
      }
      // Deduplicate negotiations by refId (show latest per thread)
      var seenNegThreads = {};
      var deduped = [];
      items.forEach(function(item) {
        if (item.type === 'offer') {
          var key = item.subtype + ':' + item.refId;
          if (!seenNegThreads[key]) {
            seenNegThreads[key] = true;
            deduped.push(item);
          }
        } else {
          deduped.push(item);
        }
      });
      container.innerHTML = '<div class="inbox-list">' + deduped.map(renderInboxRow).join('') + '</div>';
    }

    // Open negotiation thread detail inline
    window.openInboxNegThread = function(refId, isSeller) {
      var source = isSeller ? cachedIncoming : cachedOutgoing;
      var filtered = source.filter(function(n) { return n.refId === refId; });
      var container = document.getElementById('inboxContainer');
      var refName = filtered.length > 0 ? escapeHtml(filtered[0].refName || refId.slice(0, 8)) : escapeHtml(refId.slice(0, 8));
      var html = '<span class="inbox-thread-back" onclick="renderInboxView()">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
      html += ' Back to Inbox</span>';
      html += '<h3 style="font-size:18px;font-weight:700;color:#141416;margin-bottom:16px;">' + refName + '</h3>';
      html += renderNegotiationCards(filtered, isSeller);
      container.innerHTML = html;
    };

    // Open message detail inline
    window.openInboxMessage = function(msgId) {
      var msg = cachedMessages.find(function(m) { return m.id === msgId; });
      if (!msg) return;
      var container = document.getElementById('inboxContainer');
      var refName = msg.refName || msg.refId.slice(0, 8);
      var date = new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

      // Mark as read
      if (!msg.read) {
        fetch('/settings/network-messages/' + msg.id + '/read', { method: 'PATCH' });
        msg.read = true;
        updateInboxDots();
      }

      var replyHtml = '';
      if (msg.reply) {
        var replyDate = msg.repliedAt ? new Date(msg.repliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
        replyHtml = '<div style="margin-top:16px;padding:12px 16px;background:#F4F0FF;border-radius:8px;border-left:3px solid #7C3AED;">' +
          '<div style="font-size:12px;color:#7C3AED;font-weight:600;margin-bottom:4px;">Your reply' + (replyDate ? ' &middot; ' + replyDate : '') + '</div>' +
          '<div style="font-size:14px;color:#353945;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(msg.reply) + '</div>' +
        '</div>';
      } else {
        replyHtml = '<div style="margin-top:16px;" id="replySection_' + msg.id + '">' +
          '<button onclick="toggleReplyForm(\\'' + msg.id + '\\')" style="font-size:13px;padding:8px 18px;border-radius:20px;border:1px solid #7C3AED;background:none;cursor:pointer;color:#7C3AED;font-weight:500;font-family:Poppins,sans-serif;">Reply</button>' +
          '<div id="replyForm_' + msg.id + '" style="display:none;margin-top:10px;">' +
            '<textarea id="replyText_' + msg.id + '" placeholder="Write your reply..." rows="3" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #E6E8EC;font-size:14px;resize:vertical;font-family:Poppins,sans-serif;margin-bottom:8px;" maxlength="2000"></textarea>' +
            '<div style="display:flex;gap:8px;">' +
              '<button onclick="sendReply(\\'' + msg.id + '\\')" style="font-size:13px;padding:8px 20px;border-radius:20px;border:none;background:#7C3AED;color:#fff;cursor:pointer;font-weight:500;font-family:Poppins,sans-serif;">Send Reply</button>' +
              '<button onclick="toggleReplyForm(\\'' + msg.id + '\\')" style="font-size:13px;padding:8px 16px;border-radius:20px;border:1px solid #E6E8EC;background:none;cursor:pointer;color:#777E90;font-family:Poppins,sans-serif;">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      var html = '<span class="inbox-thread-back" onclick="renderInboxView()">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
      html += ' Back to Inbox</span>';
      html += '<div class="inbox-thread">';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
      html += '<div style="width:36px;height:36px;border-radius:50%;background:#EC526F;color:#fff;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;">' +
        (msg.senderName ? escapeHtml(msg.senderName.charAt(0).toUpperCase()) : '?') + '</div>';
      html += '<div><div style="font-size:15px;font-weight:600;color:#23262F;">' + escapeHtml(msg.senderName || 'Anonymous') + '</div>';
      html += '<div style="font-size:12px;color:#777E90;">' + date + ' &middot; Re: <span style="cursor:pointer;color:#7C3AED;" onclick="openDetail(\\'' + msg.refId + '\\')">' + escapeHtml(refName) + '</span></div>';
      html += '</div></div>';
      html += '<div style="font-size:14px;color:#353945;line-height:1.7;white-space:pre-wrap;padding:12px 0;border-top:1px solid #F4F5F6;">' + escapeHtml(msg.message) + '</div>';
      html += replyHtml;
      html += '</div>';
      container.innerHTML = html;
    };

    // Open resolved negotiation detail
    window.openInboxResolvedDetail = function(negId) {
      var n = cachedResolved.find(function(x) { return x.id === negId; });
      if (!n) return;
      var container = document.getElementById('inboxContainer');
      var html = '<span class="inbox-thread-back" onclick="switchInboxTab(\\'resolved\\')">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
      html += ' Back to Resolved</span>';
      html += renderNegotiationCards([n], n.role === 'seller');
      html += '<div style="margin-top:8px;"><button class="btn-secondary btn-sm" onclick="archiveNeg(\\'' + n.id + '\\')">Archive</button></div>';
      container.innerHTML = html;
    };

    // Open archived negotiation detail
    window.openInboxArchivedDetail = function(negId) {
      var n = cachedArchivedNegs.find(function(x) { return x.id === negId; });
      if (!n) return;
      var container = document.getElementById('inboxContainer');
      var html = '<span class="inbox-thread-back" onclick="switchInboxTab(\\'archived\\')">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
      html += ' Back to Archived</span>';
      html += renderNegotiationCards([n], n.role === 'seller');
      html += '<div style="margin-top:8px;display:flex;gap:8px;">';
      html += '<button class="btn-secondary btn-sm" onclick="unarchiveNeg(\\'' + n.id + '\\')">Restore</button>';
      html += '<button class="btn-danger btn-sm" onclick="deleteNeg(\\'' + n.id + '\\')">Delete</button>';
      html += '</div>';
      container.innerHTML = html;
    };

    window.archiveNeg = async function(id) {
      try {
        const res = await fetch('/negotiations/' + id + '/archive', { method: 'PATCH' });
        if (!res.ok) throw new Error('Failed to archive');
        loadInbox();
      } catch (err) {
        showToast(err.message, '');
      }
    };

    window.unarchiveNeg = async function(id) {
      try {
        const res = await fetch('/negotiations/' + id + '/unarchive', { method: 'PATCH' });
        if (!res.ok) throw new Error('Failed to restore');
        loadInbox();
      } catch (err) {
        showToast(err.message, '');
      }
    };

    window.deleteNeg = async function(id) {
      if (!confirm('Permanently delete this negotiation?')) return;
      try {
        const res = await fetch('/negotiations/' + id, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        loadInbox();
      } catch (err) {
        showToast(err.message, '');
      }
    };

    function updateInboxDots() {
      var pendingNegs = cachedIncoming.filter(function(n) { return n.status === 'pending'; }).length;
      var unreadMsgs = cachedMessages.filter(function(m) { return !m.read; }).length;
      var totalUnread = pendingNegs + unreadMsgs;
      var headerDot = document.getElementById('headerNotifDot');
      var sidebarDot = document.getElementById('sidebarInboxDot');
      if (headerDot) headerDot.style.display = totalUnread > 0 ? 'block' : 'none';
      if (sidebarDot) sidebarDot.style.display = totalUnread > 0 ? 'block' : 'none';
    }

    async function loadInbox() {
      try {
        // Fetch refs for message refName enrichment
        var refsRes = await fetch('/refs');
        var refsData = await refsRes.json();
        var refMap = {};
        (refsData.refs || []).forEach(function(r) { refMap[r.id] = r; });

        // Fetch negotiations, messages, resolved, archived in parallel
        var results = await Promise.all([
          fetch('/negotiations?role=seller'),
          fetch('/negotiations?role=buyer'),
          fetch('/settings/network-messages'),
          fetch('/negotiations?role=resolved'),
          fetch('/negotiations?role=archived')
        ]);
        cachedIncoming = await results[0].json();
        cachedOutgoing = await results[1].json();
        var rawMessages = await results[2].json();
        cachedResolved = await results[3].json();
        cachedArchivedNegs = await results[4].json();

        // Enrich messages with ref names
        cachedMessages = rawMessages.map(function(m) {
          var ref = refMap[m.refId];
          m.refName = ref ? ref.name : (m.refId || '').slice(0, 8);
          return m;
        });

        updateInboxDots();
        renderInboxView();
      } catch (err) {
        var container = document.getElementById('inboxContainer');
        if (container) container.innerHTML = '<p class="empty">Failed to load inbox</p>';
      }
    }

    // Keep loadNegotiations as alias for inbox (called from home page, etc.)
    async function loadNegotiations() { return loadInbox(); }

    // ===== Respond Modal (seller) =====
    window.openRespondModal = function(negId, refName, price, currency, message) {
      document.getElementById('respondNegId').value = negId;
      document.getElementById('respondModalTitle').textContent = 'Respond: ' + refName;
      document.getElementById('respondOfferPrice').textContent = fmtCurrency(parseFloat(price), currency);
      document.getElementById('respondOfferMessage').textContent = message || '';
      document.getElementById('respondOfferMessage').style.display = message ? 'block' : 'none';
      document.getElementById('respondCounterPrice').value = '';
      document.getElementById('respondMessage').value = '';
      document.getElementById('respondCounterFields').classList.add('hidden');
      document.getElementById('respondMsg').innerHTML = '';
      // Show accept/reject/counter buttons, hide send counter
      document.getElementById('respondAcceptBtn').classList.remove('hidden');
      document.getElementById('respondRejectBtn').classList.remove('hidden');
      document.getElementById('respondCounterBtn').classList.remove('hidden');
      document.getElementById('respondCounterBtn').textContent = 'Counter';
      document.getElementById('respondCounterBtn').onclick = function() { toggleCounterFields(); };
      document.getElementById('respondModal').classList.remove('hidden');
    };

    window.toggleCounterFields = function() {
      const fields = document.getElementById('respondCounterFields');
      const btn = document.getElementById('respondCounterBtn');
      if (fields.classList.contains('hidden')) {
        // Show counter fields, change button to "Send Counter"
        fields.classList.remove('hidden');
        btn.textContent = 'Send Counter';
        btn.onclick = function() { submitRespond('countered'); };
        document.getElementById('respondCounterPrice').focus();
      } else {
        // Hide counter fields, revert button
        fields.classList.add('hidden');
        btn.textContent = 'Counter';
        btn.onclick = function() { toggleCounterFields(); };
      }
    };

    window.closeRespondModal = function() {
      document.getElementById('respondModal').classList.add('hidden');
    };

    window.submitRespond = async function(status) {
      const negId = document.getElementById('respondNegId').value;
      const body = { status };

      if (status === 'countered') {
        const cp = parseFloat(document.getElementById('respondCounterPrice').value);
        if (isNaN(cp) || cp <= 0) {
          document.getElementById('respondMsg').innerHTML = '<div class="msg err">Please enter a valid counter price</div>';
          return;
        }
        body.counterPrice = cp;
        body.responseMessage = document.getElementById('respondMessage').value.trim();
      }

      // Disable all buttons during request
      const btns = document.querySelectorAll('#respondModal button');
      btns.forEach(b => b.disabled = true);

      try {
        const res = await fetch('/negotiations/' + negId + '/respond', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.delivered === false) {
          document.getElementById('respondMsg').innerHTML = '<div class="msg err">Response saved but buyer appears offline. They will not see this until you are both online.</div>';
          setTimeout(() => {
            closeRespondModal();
            loadNegotiations();
          }, 3000);
        } else {
          closeRespondModal();
          loadNegotiations();
        }
      } catch (err) {
        document.getElementById('respondMsg').innerHTML = '<div class="msg err">' + escapeHtml(err.message) + '</div>';
      } finally {
        btns.forEach(b => b.disabled = false);
      }
    };

    window.withdrawNeg = async function(negId) {
      if (!confirm('Withdraw this proposal?')) return;
      try {
        const res = await fetch('/negotiations/' + negId + '/withdraw', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        loadNegotiations();
      } catch (err) {
        alert(err.message);
      }
    };

    window.markAsSold = async function(negId) {
      if (!confirm('Mark this deal as sold? This will decrement the ref quantity.')) return;
      try {
        const res = await fetch('/negotiations/' + negId + '/mark-sold', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        showToast('Deal marked as sold!', 'sold');
        loadNegotiations();
        loadMyRefs();
      } catch (err) {
        showToast('Failed: ' + err.message, 'rejected');
      }
    };

    // ===== Settings =====
    const userSvgPlaceholder = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    const previewSvgPlaceholder = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B1B5C3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    // Legacy loadMessages — now handled by loadInbox
    async function loadMessages() { return loadInbox(); }

    window.markMessageRead = async function(id, btn) {
      try {
        await fetch('/settings/network-messages/' + id + '/read', { method: 'PATCH' });
        if (btn) btn.remove();
        var msg = cachedMessages.find(function(m) { return m.id === id; });
        if (msg) msg.read = true;
        updateInboxDots();
      } catch {}
    };

    window.toggleReplyForm = function(id) {
      var form = document.getElementById('replyForm_' + id);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };

    window.sendReply = async function(id) {
      var textarea = document.getElementById('replyText_' + id);
      var reply = textarea ? textarea.value.trim() : '';
      if (!reply) return;
      try {
        var res = await fetch('/settings/network-messages/' + id + '/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: reply })
        });
        if (res.ok) {
          // Replace the reply section with the sent reply
          var section = document.getElementById('replySection_' + id);
          var replyDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          if (section) {
            section.innerHTML = '<div style="padding:10px 12px;background:#F4F0FF;border-radius:8px;border-left:3px solid #7C3AED;">' +
              '<div style="font-size:11px;color:#7C3AED;font-weight:600;margin-bottom:4px;">Your reply · ' + replyDate + '</div>' +
              '<div style="font-size:13px;color:#353945;line-height:1.5;white-space:pre-wrap;">' + escapeHtml(reply) + '</div>' +
            '</div>';
          }
        } else {
          var data = await res.json().catch(function() { return {}; });
          alert(data.error || 'Failed to send reply');
        }
      } catch (err) {
        alert('Failed to send reply');
      }
    };

    async function loadSettings() {
      try {
        const res = await fetch('/settings');
        const data = await res.json();
        window._myBeaconId = data.beaconId || '';
        document.getElementById('settingsBeaconId').textContent = data.beaconId || '';
        document.getElementById('settingsVersion').textContent = data.version || '';
        const uptime = data.uptime || 0;
        const hours = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        document.getElementById('settingsUptime').textContent = hours + 'h ' + mins + 'm';
        document.getElementById('syncedCount').textContent = data.syncedItemCount || '0';

        // Profile picture
        const avatarBtn = document.getElementById('avatarBtn');
        const preview = document.getElementById('profilePicPreview');
        const removeBtn = document.getElementById('removeProfilePicBtn');
        if (data.profilePicturePath) {
          const ts = Date.now();
          avatarBtn.innerHTML = '<img src="' + data.profilePicturePath + '?t=' + ts + '" alt="avatar">';
          preview.innerHTML = '<img src="' + data.profilePicturePath + '?t=' + ts + '" alt="preview" style="width:100%;height:100%;object-fit:cover;">';
          removeBtn.style.display = '';
        } else {
          avatarBtn.innerHTML = userSvgPlaceholder;
          preview.innerHTML = previewSvgPlaceholder;
          removeBtn.style.display = 'none';
        }

        // Toggle promo vs connected state
        var linkBtn = document.getElementById('headerLinkBtn');
        var promoEl = document.getElementById('connectionPromo');
        var connEl = document.getElementById('connectionConnected');
        if (linkBtn) linkBtn.style.display = data.hasApiKey ? 'none' : '';
        promoEl.style.display = data.hasApiKey ? 'none' : '';
        connEl.style.display = data.hasApiKey ? '' : 'none';

        if (data.hasApiKey) {
          const dot = document.getElementById('syncStatusDot');
          const text = document.getElementById('syncStatusText');
          const retryBtn = document.getElementById('retryConnectionBtn');
          const errorDetail = document.getElementById('syncErrorDetail');
          const keyPrefix = document.getElementById('connectedKeyPrefix');
          keyPrefix.textContent = 'Key: ' + (data.apiKey || 'rfk_***');
          if (data.connected) {
            dot.style.background = '#1a8a42';
            text.textContent = 'Connected to Reffo.ai';
            text.style.color = '#1a8a42';
            retryBtn.style.display = 'none';
            errorDetail.style.display = 'none';
          } else {
            dot.style.background = '#F5A623';
            text.textContent = 'Key saved — not connected';
            text.style.color = '#F5A623';
            retryBtn.style.display = '';
            if (data.syncError) {
              errorDetail.textContent = data.syncError;
              errorDetail.style.display = 'block';
            } else {
              errorDetail.style.display = 'none';
            }
          }
        }
        // AI Provider settings
        var aiProviderSelect = document.getElementById('aiProviderSelect');
        var removeAiBtn = document.getElementById('removeAiProviderBtn');
        if (aiProviderSelect && data.aiProvider) {
          aiProviderSelect.value = data.aiProvider;
          toggleAiKeyField();
          if (data.aiProvider !== 'reffo') {
            removeAiBtn.style.display = '';
          } else {
            removeAiBtn.style.display = 'none';
          }
        }

        // Store Reffo.ai base URL
        window._reffoUrl = data.reffoApiUrl || 'https://reffo.ai';
        // Determine if AI autofill is available (has Reffo key OR has direct AI provider key)
        var aiEnabled = data.hasApiKey || (data.aiProvider !== 'reffo' && data.aiApiKeySet);
        window._aiEnabled = aiEnabled;
        var createActive = document.getElementById('createAutofillActive');
        var createPromo = document.getElementById('createAutofillPromo');
        if (createActive) createActive.style.display = aiEnabled ? '' : 'none';
        if (createPromo) createPromo.style.display = aiEnabled ? 'none' : '';
        var detailActive = document.getElementById('detailAutofillActive');
        var detailPromo = document.getElementById('detailAutofillPromo');
        if (detailActive) detailActive.style.display = aiEnabled ? '' : 'none';
        if (detailPromo) detailPromo.style.display = aiEnabled ? 'none' : '';

        // Update footer CTA based on API key status
        var footerCtaTitle = document.getElementById('footerCtaTitle');
        var footerCtaDesc = document.getElementById('footerCtaDesc');
        var footerCtaBtn = document.getElementById('footerCtaBtn');
        if (footerCtaTitle && footerCtaDesc && footerCtaBtn) {
          if (data.hasApiKey) {
            footerCtaTitle.textContent = 'Explore Skills';
            footerCtaDesc.textContent = 'Browse and install skills to add capabilities to your node \u2014 from reverse auctions to analytics and more.';
            footerCtaBtn.href = 'https://reffo.ai/skills';
            footerCtaBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Browse Skills';
          } else {
            footerCtaTitle.textContent = 'Connect to Reffo.ai';
            footerCtaDesc.textContent = 'Link your node to Reffo.ai to sync listings, access the skill marketplace, and join the Pelagora network.';
            footerCtaBtn.href = 'https://reffo.ai/api';
            footerCtaBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Get API Key';
          }
        }

        // Check for update
        try {
          const healthRes = await fetch('/health');
          const healthData = await healthRes.json();
          var banner = document.getElementById('updateBanner');
          var versionLabel = document.getElementById('updateVersionLabel');
          var footerBtn = document.getElementById('footerUpdateBtn');
          if (healthData.updateAvailable && healthData.latestVersion) {
            versionLabel.textContent = 'v' + healthData.latestVersion;
            banner.style.display = 'block';
            if (footerBtn) footerBtn.style.display = '';
          } else {
            banner.style.display = 'none';
            if (footerBtn) footerBtn.style.display = 'none';
          }
        } catch {}

        // Load location settings
        try {
          const locRes = await fetch('/settings/location');
          const loc = await locRes.json();
          if (loc.locationAddress) document.getElementById('locAddress').value = loc.locationAddress;
          if (loc.locationCity) document.getElementById('locCity').value = loc.locationCity;
          if (loc.locationState) document.getElementById('locState').value = loc.locationState;
          if (loc.locationZip) document.getElementById('locZip').value = loc.locationZip;
          if (loc.locationCountry) document.getElementById('locCountry').value = loc.locationCountry;
          if (loc.locationLat) document.getElementById('locLat').value = loc.locationLat;
          if (loc.locationLng) document.getElementById('locLng').value = loc.locationLng;
          document.getElementById('locScope').value = loc.defaultSellingScope || 'global';
          document.getElementById('locRadius').value = loc.defaultSellingRadiusMiles || 250;
        } catch {}
      } catch {}
    }

    window.useMyLocation = function() {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById('locLat').value = pos.coords.latitude.toFixed(6);
          document.getElementById('locLng').value = pos.coords.longitude.toFixed(6);
        },
        (err) => {
          alert('Could not get location: ' + err.message);
        }
      );
    };

    window.saveLocation = async function() {
      try {
        const res = await fetch('/settings/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationAddress: document.getElementById('locAddress').value.trim() || null,
            locationCity: document.getElementById('locCity').value.trim() || null,
            locationState: document.getElementById('locState').value.trim() || null,
            locationZip: document.getElementById('locZip').value.trim() || null,
            locationCountry: document.getElementById('locCountry').value || 'US',
            locationLat: document.getElementById('locLat').value ? parseFloat(document.getElementById('locLat').value) : null,
            locationLng: document.getElementById('locLng').value ? parseFloat(document.getElementById('locLng').value) : null,
            defaultSellingScope: document.getElementById('locScope').value,
            defaultSellingRadiusMiles: parseInt(document.getElementById('locRadius').value) || 250,
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showMsg('locationMsg', 'Location saved!', true);
      } catch (err) {
        showMsg('locationMsg', err.message, false);
      }
    };

    window.saveApiKey = async function() {
      const input = document.getElementById('settingsApiKey');
      const key = input.value.trim();
      if (!key) return;
      try {
        const res = await fetch('/settings/api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: key })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showMsg('settingsMsg', data.message || 'API key saved', true);
        input.value = '';
        loadSettings();
      } catch (err) {
        showMsg('settingsMsg', err.message, false);
      }
    };

    window.removeApiKey = async function() {
      if (!confirm('Remove API key and disconnect from Reffo.ai?')) return;
      try {
        await fetch('/settings/api-key', { method: 'DELETE' });
        showMsg('settingsMsg', 'API key removed', true);
        loadSettings();
      } catch (err) {
        showMsg('settingsMsg', err.message, false);
      }
    };

    window.retryConnection = async function() {
      const btn = document.getElementById('retryConnectionBtn');
      btn.textContent = 'Connecting...';
      btn.disabled = true;
      try {
        const res = await fetch('/settings/retry-connection', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          showMsg('settingsMsg', 'Connected to Reffo.ai!', true);
        } else {
          showMsg('settingsMsg', 'Connection failed: ' + (data.error || 'Unknown error'), false);
        }
        loadSettings();
      } catch (err) {
        showMsg('settingsMsg', 'Connection failed: ' + err.message, false);
      } finally {
        btn.textContent = 'Retry';
        btn.disabled = false;
      }
    };

    window.uploadProfilePicture = async function(input) {
      if (!input.files || !input.files[0]) return;
      const formData = new FormData();
      formData.append('file', input.files[0]);
      try {
        const res = await fetch('/settings/profile-picture', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        loadSettings();
      } catch (err) {
        showToast('Upload failed: ' + err.message, 'rejected');
      }
      input.value = '';
    };

    window.removeProfilePicture = async function() {
      try {
        const res = await fetch('/settings/profile-picture', { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        loadSettings();
      } catch (err) {
        showToast('Remove failed: ' + err.message, 'rejected');
      }
    };

    window.toggleSync = async function(refId, checkbox) {
      const sync = checkbox.checked;
      try {
        const res = await fetch('/settings/sync-item/' + refId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sync: sync })
        });
        const data = await res.json();
        if (!res.ok) {
          checkbox.checked = !sync;
          throw new Error(data.error);
        }
        if (data.warning) {
          showToast(sync ? 'Ref marked for sync (remote pending)' : 'Ref unsynced locally (remote pending)', 'accepted');
        } else {
          showToast(sync ? 'Ref synced to Reffo.ai' : 'Ref removed from Reffo.ai', sync ? 'accepted' : '');
        }
        // Refresh refs list to update synced badges
        loadMyRefs();
      } catch (err) {
        showToast('Sync failed: ' + err.message, 'rejected');
      }
    };

    // ===== Layout Toggle =====
    let refLayout = 'row';
    window.setRefLayout = function(layout) {
      refLayout = layout;
      document.getElementById('layoutCardBtn').classList.toggle('active', layout === 'card');
      document.getElementById('layoutRowBtn').classList.toggle('active', layout === 'row');
      var tableBtn = document.getElementById('layoutTableBtn');
      if (tableBtn) tableBtn.classList.toggle('active', layout === 'table');
      loadMyRefs();
    };

    let searchLayout = 'card';
    window.setSearchLayout = function(layout) {
      searchLayout = layout;
      document.getElementById('searchLayoutCardBtn').classList.toggle('active', layout === 'card');
      document.getElementById('searchLayoutRowBtn').classList.toggle('active', layout === 'row');
      if (window._lastSearchData) renderSearchResults(window._lastSearchData);
    };

    // ===== List Ref =====
    window.openListRefModal = function() {
      switchTab('list');
    };

    window.closeListRefModal = function() {
      switchTab('refs');
    };

    // ===== Segmented Status Control (Create) =====
    const segClassMap = { private: 'seg-active-private', for_sale: 'seg-active-for_sale', willing_to_sell: 'seg-active-willing_to_sell', for_rent: 'seg-active-for_rent' };
    let createEstimateTimer = null;

    window.selectCreateStatus = function(status) {
      document.getElementById('refListingStatus').value = status;
      const seg = document.getElementById('createStatusSegment');
      if (seg) {
        seg.querySelectorAll('button').forEach(function(btn, i) {
          const statuses = ['private', 'for_sale', 'willing_to_sell', 'for_rent'];
          btn.className = statuses[i] === status ? segClassMap[status] : '';
        });
      }
      // Toggle price section: hidden when private
      var priceSection = document.getElementById('createPriceSection');
      if (priceSection) priceSection.style.display = status === 'private' ? 'none' : '';
      // Toggle rental fields: visible when for_rent
      var rentalSection = document.getElementById('rentalFieldsCreate');
      if (rentalSection) rentalSection.style.display = status === 'for_rent' ? 'block' : 'none';
      // Toggle price estimate: visible when private
      var estimateSection = document.getElementById('createPriceEstimate');
      if (estimateSection) {
        triggerCreatePriceEstimate();
      }
    };

    window.triggerCreatePriceEstimate = function() {
      if (createEstimateTimer) clearTimeout(createEstimateTimer);
      // Skip if price is already set
      var priceEl = document.getElementById('refPrice');
      if (priceEl && priceEl.value && parseFloat(priceEl.value) > 0) {
        var container = document.getElementById('createPriceEstimate');
        if (container) container.innerHTML = '';
        return;
      }
      var nameVal = (document.getElementById('refName').value || '').trim();
      var catVal = document.getElementById('refCat').value || '';
      if (!nameVal || !catVal) {
        var missing = !nameVal && !catVal ? 'a name and category' : !nameVal ? 'a name' : 'a category';
        renderPriceEstimateUnavailable('createPriceEstimate', 'Select ' + missing + ' to see price suggestions.');
        return;
      }
      var container = document.getElementById('createPriceEstimate');
      container.innerHTML = '<div class="price-estimate-card"><div style="display:flex;align-items:center;gap:8px;"><div class="price-estimate-spinner"></div><span class="est-muted">Estimating price...</span></div></div>';
      createEstimateTimer = setTimeout(function() {
        var subcatVal = document.getElementById('refSubcat').value || '';
        fetch('/settings/price-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameVal, category: catVal, subcategory: subcatVal })
        }).then(function(res) {
          if (!res.ok) throw new Error('API error');
          return res.json();
        }).then(function(data) {
          renderPriceEstimate('createPriceEstimate', data);
        }).catch(function() {
          renderPriceEstimateUnavailable('createPriceEstimate', 'Connect to Reffo.ai for price suggestions');
        });
      }, 800);
    };

    window.renderPriceEstimate = function(containerId, data) {
      var c = document.getElementById(containerId);
      if (!c) return;
      if (!data || !data.typical || data.typical <= 0) {
        c.innerHTML = '<div class="price-estimate-card"><span class="est-muted">Could not estimate price for this item.</span></div>';
        return;
      }
      var badgeClass = 'est-badge-' + (data.confidence || 'low');
      c.innerHTML = '<div class="price-estimate-card">' +
        '<div class="est-header">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B61FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>' +
        '<span class="est-label">AI Price Suggestion</span>' +
        '<span class="est-badge ' + badgeClass + '">' + (data.confidence || 'low') + '</span>' +
        '</div>' +
        '<div class="est-text">Similar items typically sell for <strong>$' + Math.round(data.low) + '\\u2013$' + Math.round(data.high) + '</strong> <span class="est-muted">(avg $' + Math.round(data.typical) + ')</span></div>' +
        '</div>';
    };

    window.renderPriceEstimateUnavailable = function(containerId, message) {
      var c = document.getElementById(containerId);
      if (!c) return;
      c.innerHTML = '<div class="price-estimate-card"><span class="est-muted">' + escapeHtml(message) + '</span></div>';
    };

    // ===== AI Provider Settings =====
    window.toggleAiKeyField = function() {
      var provider = document.getElementById('aiProviderSelect').value;
      var keySection = document.getElementById('aiKeySection');
      var reffoNote = document.getElementById('aiReffoNote');
      if (provider === 'reffo') {
        keySection.style.display = 'none';
        reffoNote.style.display = '';
      } else {
        keySection.style.display = '';
        reffoNote.style.display = 'none';
      }
    };

    window.saveAiProvider = async function() {
      var provider = document.getElementById('aiProviderSelect').value;
      var apiKey = document.getElementById('aiApiKeyInput').value.trim();
      var msgEl = document.getElementById('aiProviderMsg');
      try {
        var res = await fetch('/settings/ai-provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: provider, apiKey: apiKey || undefined })
        });
        var data = await res.json();
        if (res.ok) {
          msgEl.innerHTML = '<div style="color:#1a8a42;font-size:13px;margin-bottom:8px;">AI provider saved.</div>';
          if (provider !== 'reffo') {
            document.getElementById('removeAiProviderBtn').style.display = '';
          }
        } else {
          msgEl.innerHTML = '<div style="color:#EC526F;font-size:13px;margin-bottom:8px;">' + escapeHtml(data.error || 'Failed to save') + '</div>';
        }
      } catch {
        msgEl.innerHTML = '<div style="color:#EC526F;font-size:13px;margin-bottom:8px;">Failed to save AI provider.</div>';
      }
    };

    window.removeAiProvider = async function() {
      var msgEl = document.getElementById('aiProviderMsg');
      try {
        await fetch('/settings/ai-provider', { method: 'DELETE' });
        document.getElementById('aiProviderSelect').value = 'reffo';
        document.getElementById('aiApiKeyInput').value = '';
        toggleAiKeyField();
        document.getElementById('removeAiProviderBtn').style.display = 'none';
        msgEl.innerHTML = '<div style="color:#1a8a42;font-size:13px;margin-bottom:8px;">Reverted to Reffo (default).</div>';
      } catch {
        msgEl.innerHTML = '<div style="color:#EC526F;font-size:13px;margin-bottom:8px;">Failed to remove AI provider.</div>';
      }
    };

    // ===== Smart Autofill (Product Lookup) =====
    window.triggerProductLookup = async function(context) {
      var prefix = context === 'detail' ? 'd' : 'ref';
      var nameEl = document.getElementById(prefix === 'd' ? 'dName' : 'refName');
      var catEl = document.getElementById(prefix === 'd' ? 'dCat' : 'refCat');
      var subcatEl = document.getElementById(prefix === 'd' ? 'dSubcat' : 'refSubcat');
      var statusEl = document.getElementById(context + 'AutofillStatus');
      var cardEl = document.getElementById(context + 'AutofillCard');

      var nameVal = nameEl ? nameEl.value.trim() : '';
      var catVal = catEl ? catEl.value : '';
      var subcatVal = subcatEl ? subcatEl.value : '';

      if (!nameVal) {
        if (statusEl) statusEl.textContent = 'Enter a product name first.';
        return;
      }

      // If no category selected, auto-suggest one first
      if (!catVal) {
        if (statusEl) statusEl.innerHTML = '<div class="price-estimate-spinner" style="vertical-align:middle;"></div> Detecting category...';
        try {
          var suggestRes = await fetch('/refs/suggest-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: nameVal })
          });
          if (suggestRes.ok) {
            var suggestion = await suggestRes.json();
            if (suggestion.category && (suggestion.confidence === 'high' || suggestion.confidence === 'medium')) {
              catVal = suggestion.category;
              if (catEl) {
                catEl.value = catVal;
                catEl.dispatchEvent(new Event('change'));
              }
              if (suggestion.subcategory) {
                subcatVal = suggestion.subcategory;
                // Allow subcategory options to populate from the change event above
                await new Promise(function(r) { setTimeout(r, 50); });
                if (subcatEl) {
                  subcatEl.value = subcatVal;
                  subcatEl.dispatchEvent(new Event('change'));
                }
              }
              var fieldsContainerId = context === 'detail' ? 'detailCategoryFields' : 'createCategoryFields';
              renderCategoryFields(fieldsContainerId, catVal, subcatVal, {});
            }
          }
        } catch (_e) {
          // Category suggestion failed — continue with empty category
        }
      }

      if (statusEl) statusEl.innerHTML = '<div class="price-estimate-spinner" style="vertical-align:middle;"></div> Looking up product...';

      try {
        var res = await fetch('/settings/product-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameVal, category: catVal, subcategory: subcatVal })
        });

        if (!res.ok) {
          var errData = await res.json().catch(function() { return {}; });
          if (statusEl) statusEl.textContent = errData.error || 'Lookup failed.';
          return;
        }

        var data = await res.json();
        if (statusEl) statusEl.textContent = data.cached ? 'Loaded from cache.' : 'AI autofill complete.';
        applyAutofillData(context, data);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Lookup failed. Check your AI provider settings.';
      }
    };

    window.applyAutofillData = function(context, data) {
      var prefix = context === 'detail' ? 'd' : 'ref';
      var cardEl = document.getElementById(context + 'AutofillCard');
      var filledFields = [];

      // Store AI image URL and show suggested image card near photos
      if (data.image_url) {
        window._autofillImageUrl[context] = data.image_url;
        renderAiSuggestedImage(context);
      }

      // Fill empty description
      var descEl = document.getElementById(prefix === 'd' ? 'dDesc' : 'refDesc');
      if (descEl && !descEl.value.trim() && data.description) {
        descEl.value = data.description;
        filledFields.push('description');
      }

      // Fill empty SKU
      var skuEl = document.getElementById(prefix === 'd' ? 'dSku' : 'refSku');
      if (skuEl && !skuEl.value.trim() && data.sku) {
        skuEl.value = data.sku;
        filledFields.push('SKU');
      }

      // Fill category-specific attributes (empty fields only)
      if (data.attributes && typeof data.attributes === 'object') {
        var attrContainer = document.getElementById(context === 'detail' ? 'detailCategoryFields' : 'createCategoryFields');
        if (attrContainer) {
          var inputs = attrContainer.querySelectorAll('input, select');
          inputs.forEach(function(inp) {
            var key = inp.getAttribute('data-attr-key');
            if (key && data.attributes[key] && !inp.value) {
              inp.value = String(data.attributes[key]);
              filledFields.push(key);
              // Add AI badge to label
              var label = attrContainer.querySelector('label[for="' + inp.id + '"]');
              if (label && !label.querySelector('.autofill-badge')) {
                label.innerHTML += '<span class="autofill-badge">AI</span>';
              }
            }
          });
        }
      }

      // Price estimate
      if (data.price_estimate && data.price_estimate.typical > 0) {
        var priceContainerId = context === 'detail' ? 'detailPriceEstimate' : 'createPriceEstimate';
        renderPriceEstimate(priceContainerId, data.price_estimate);
      }

      // For detail view: show suggested image card (user clicks "Use Image" to save)
      // Image is no longer auto-downloaded — user chooses via the card near the Media section

      // Show autofill summary card
      if (cardEl) {
        var cardHtml = '<div class="autofill-card"><div class="autofill-header">';
        cardHtml += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B61FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>';
        cardHtml += '<span class="autofill-label">Smart Autofill</span></div>';
        // Image thumbnail + product link
        if (data.image_url || data.product_url) {
          cardHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
          if (data.image_url) {
            cardHtml += '<img src="' + escapeHtml(data.image_url) + '" class="autofill-img-thumb" onerror="this.style.display=\\'none\\'">';
          }
          if (data.product_url) {
            cardHtml += '<a href="' + escapeHtml(data.product_url) + '" target="_blank" class="autofill-link">View product page &rarr;</a>';
          }
          cardHtml += '</div>';
        }
        if (filledFields.length > 0) {
          cardHtml += '<div class="autofill-fields">Filled: ' + filledFields.join(', ') + '</div>';
        }
        cardHtml += '</div>';
        cardEl.innerHTML = cardHtml;
      }
    };

    // Auto-suggest category from title
    var categorySuggestTimer = null;
    function triggerCategorySuggest() {
      if (categorySuggestTimer) clearTimeout(categorySuggestTimer);
      var nameVal = (document.getElementById('refName').value || '').trim();
      var catVal = document.getElementById('refCat').value;
      if (!nameVal || nameVal.length < 3 || catVal) return;
      categorySuggestTimer = setTimeout(async function() {
        try {
          var res = await fetch('/refs/suggest-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: nameVal })
          });
          if (res.ok) {
            var data = await res.json();
            if (data.category && data.confidence === 'high' && !document.getElementById('refCat').value) {
              document.getElementById('refCat').value = data.category;
              document.getElementById('refCat').dispatchEvent(new Event('change'));
              if (data.subcategory) {
                setTimeout(function() {
                  var subcatEl = document.getElementById('refSubcat');
                  if (subcatEl) {
                    subcatEl.value = data.subcategory;
                    subcatEl.dispatchEvent(new Event('change'));
                  }
                }, 100);
              }
            }
          }
        } catch {}
      }, 1000);
    }

    // Wire input listeners on name + category fields to trigger estimate
    document.getElementById('refName').addEventListener('input', function() {
      triggerCreatePriceEstimate();
      triggerCategorySuggest();
    });
    document.getElementById('refCat').addEventListener('change', function() {
      triggerCreatePriceEstimate();
    });
    document.getElementById('refSubcat').addEventListener('change', function() {
      triggerCreatePriceEstimate();
    });

    // ===== Init =====
    let prevOutgoingStatuses = {};

    async function initOutgoingSnapshot() {
      try {
        const res = await fetch('/negotiations?role=buyer');
        const outgoing = await res.json();
        for (const neg of outgoing) prevOutgoingStatuses[neg.id] = neg.status;
      } catch {}
    }

    loadHome();
    switchTab('home');
    initOutgoingSnapshot();
    // Pre-load settings so _aiEnabled is set before any detail view opens
    loadSettings();
    // Check for unread messages + pending negotiations to show notification dots
    Promise.all([
      fetch('/settings/network-messages').then(function(r) { return r.json(); }),
      fetch('/negotiations?role=seller').then(function(r) { return r.json(); })
    ]).then(function(results) {
      var msgs = results[0]; var negs = results[1];
      var unreadMsgs = msgs.filter(function(m) { return !m.read; }).length;
      var pendingNegs = negs.filter(function(n) { return n.status === 'pending'; }).length;
      var total = unreadMsgs + pendingNegs;
      var headerDot = document.getElementById('headerNotifDot');
      var sidebarDot = document.getElementById('sidebarInboxDot');
      if (headerDot) headerDot.style.display = total > 0 ? 'block' : 'none';
      if (sidebarDot) sidebarDot.style.display = total > 0 ? 'block' : 'none';
    }).catch(function() {});

    // Show "Link to Reffo.ai" header button if no API key is configured
    async function updateHeaderOnLoad() {
      try {
        const res = await fetch('/settings');
        const data = await res.json();
        const btn = document.getElementById('headerLinkBtn');
        if (btn) btn.style.display = data.hasApiKey ? 'none' : '';
        // Load profile picture into header avatar
        const avatarBtn = document.getElementById('avatarBtn');
        if (avatarBtn && data.profilePicturePath) {
          const ts = Date.now();
          avatarBtn.innerHTML = '<img src="' + data.profilePicturePath + '?t=' + ts + '" alt="avatar">';
        }
        // Update footer CTA based on API key status
        var footerCtaTitle = document.getElementById('footerCtaTitle');
        var footerCtaDesc = document.getElementById('footerCtaDesc');
        var footerCtaBtn = document.getElementById('footerCtaBtn');
        if (footerCtaTitle && footerCtaDesc && footerCtaBtn) {
          if (data.hasApiKey) {
            footerCtaTitle.textContent = 'Explore Skills';
            footerCtaDesc.textContent = 'Browse and install skills to add capabilities to your node \u2014 from reverse auctions to analytics and more.';
            footerCtaBtn.href = 'https://reffo.ai/skills';
            footerCtaBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Browse Skills';
          } else {
            footerCtaTitle.textContent = 'Connect to Reffo.ai';
            footerCtaDesc.textContent = 'Link your node to Reffo.ai to sync listings, access the skill marketplace, and join the Pelagora network.';
            footerCtaBtn.href = 'https://reffo.ai/api';
            footerCtaBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Get API Key';
          }
        }
      } catch {}
    }
    updateHeaderOnLoad();

    // Check for update on page load (footer button)
    (async function checkFooterUpdate() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        var footerBtn = document.getElementById('footerUpdateBtn');
        if (data.updateAvailable && data.latestVersion) {
          if (footerBtn) footerBtn.style.display = '';
        }
      } catch {}
    })();

    // Check for pending negotiations + unread messages periodically
    setInterval(async () => {
      // Update unified inbox notification dots
      try {
        var results = await Promise.all([
          fetch('/negotiations?role=seller').then(r => r.json()),
          fetch('/settings/network-messages').then(r => r.json())
        ]);
        var incoming = results[0]; var msgs = results[1];
        var pendingCount = incoming.filter(n => n.status === 'pending').length;
        var unreadMsgs = msgs.filter(m => !m.read).length;
        var total = pendingCount + unreadMsgs;
        var notifDot = document.getElementById('headerNotifDot');
        var sidebarDot = document.getElementById('sidebarInboxDot');
        if (notifDot) notifDot.style.display = total > 0 ? 'block' : 'none';
        if (sidebarDot) sidebarDot.style.display = total > 0 ? 'block' : 'none';
      } catch {}

      // Buyer: detect status changes and show toasts
      try {
        const res = await fetch('/negotiations?role=buyer');
        const outgoing = await res.json();
        for (const neg of outgoing) {
          const prev = prevOutgoingStatuses[neg.id];
          if (prev && prev !== neg.status && neg.status !== 'pending' && neg.status !== 'withdrawn') {
            const refLabel = neg.refName || neg.refId;
            if (neg.status === 'accepted') {
              showToast('\u2713 Your offer on "' + refLabel + '" was accepted!', 'accepted');
            } else if (neg.status === 'rejected') {
              showToast('\u2717 Your offer on "' + refLabel + '" was declined.', 'rejected');
            } else if (neg.status === 'countered') {
              const cp = neg.counterPrice ? ' at $' + neg.counterPrice : '';
              showToast('\u21a9 Counter offer received for "' + refLabel + '"' + cp, 'countered');
            } else if (neg.status === 'sold') {
              showToast('\u2713 Deal for "' + refLabel + '" is complete!', 'sold');
            }
          }
          prevOutgoingStatuses[neg.id] = neg.status;
        }
      } catch {}
    }, 10000);

    // ===== Collections =====
    var currentCollectionId = null;

    async function loadCollections() {
      var grid = document.getElementById('collectionsGrid');
      var empty = document.getElementById('collectionsEmpty');
      var detail = document.getElementById('collectionDetail');
      detail.classList.add('hidden');
      grid.parentElement.style.display = '';
      try {
        var res = await fetch('/collections');
        var collections = await res.json();
        if (collections.length === 0) {
          grid.innerHTML = '';
          empty.classList.remove('hidden');
          return;
        }
        empty.classList.add('hidden');
        grid.innerHTML = collections.map(function(c) {
          return '<div style="background:#FCFCFD;border:1px solid #E6E8EC;border-radius:12px;padding:20px;cursor:pointer;transition:all 0.15s;box-shadow:0 1px 3px rgba(15,15,15,0.06);" onclick="openCollectionDetail(\\'' + c.id + '\\')" onmouseover="this.style.boxShadow=\\'0 4px 12px rgba(15,15,15,0.12)\\';this.style.transform=\\'translateY(-1px)\\'" onmouseout="this.style.boxShadow=\\'0 1px 3px rgba(15,15,15,0.06)\\';this.style.transform=\\'none\\'">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
            + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EC526F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>'
            + '<div style="font-size:14px;font-weight:600;color:#23262F;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(c.name) + '</div>'
            + '</div>'
            + (c.description ? '<div style="font-size:12px;color:#777E90;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(c.description) + '</div>' : '')
            + '<div style="font-size:12px;color:#777E90;">' + c.refCount + ' item' + (c.refCount !== 1 ? 's' : '') + '</div>'
            + '</div>';
        }).join('');
      } catch(e) {
        grid.innerHTML = '<p style="color:#777E90;font-size:13px;">Failed to load collections.</p>';
      }
    }
    window.loadCollections = loadCollections;

    async function openCollectionDetail(id) {
      currentCollectionId = id;
      var grid = document.getElementById('collectionsGrid');
      var empty = document.getElementById('collectionsEmpty');
      var detail = document.getElementById('collectionDetail');
      grid.parentElement.style.display = 'none';
      empty.classList.add('hidden');
      detail.classList.remove('hidden');
      try {
        var res = await fetch('/collections/' + id);
        var c = await res.json();
        document.getElementById('collectionDetailName').textContent = c.name;
        document.getElementById('collectionDetailDesc').textContent = c.description || '';
        var refsRes = await fetch('/collections/' + id + '/refs');
        var refs = await refsRes.json();
        var container = document.getElementById('collectionRefs');
        if (refs.length === 0) {
          container.innerHTML = '<p class="empty">No items in this collection</p>';
          return;
        }
        container.innerHTML = '<div class="rows">' + refs.map(function(ref) {
          var statusLabel = statusLabels[ref.listingStatus] || 'Private';
          var statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
          return '<div class="ref-row" onclick="openDetail(\\'' + ref.id + '\\')">'
            + '<div class="row-img"><div class="placeholder">&#x1F4E6;</div></div>'
            + '<div class="row-name">' + escapeHtml(ref.name) + '</div>'
            + '<div class="row-meta"><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></div>'
            + '</div>';
        }).join('') + '</div>';
      } catch(e) {
        document.getElementById('collectionRefs').innerHTML = '<p style="color:#777E90;font-size:13px;">Failed to load collection.</p>';
      }
    }
    window.openCollectionDetail = openCollectionDetail;

    function openNewCollectionModal() {
      var name = prompt('Collection name:');
      if (!name || !name.trim()) return;
      var desc = prompt('Description (optional):') || '';
      fetch('/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      }).then(function(r) { return r.json(); }).then(function() {
        loadCollections();
        showToast('Collection created', 'accepted');
      }).catch(function() { showToast('Failed to create collection', 'rejected'); });
    }
    window.openNewCollectionModal = openNewCollectionModal;

    function editCollection() {
      if (!currentCollectionId) return;
      var name = prompt('New name:', document.getElementById('collectionDetailName').textContent);
      if (!name || !name.trim()) return;
      var desc = prompt('Description:', document.getElementById('collectionDetailDesc').textContent) || '';
      fetch('/collections/' + currentCollectionId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      }).then(function(r) { return r.json(); }).then(function(c) {
        document.getElementById('collectionDetailName').textContent = c.name;
        document.getElementById('collectionDetailDesc').textContent = c.description || '';
        showToast('Collection updated', 'accepted');
      }).catch(function() { showToast('Failed to update collection', 'rejected'); });
    }
    window.editCollection = editCollection;

    function deleteCollection() {
      if (!currentCollectionId) return;
      if (!confirm('Delete this collection? Items in it will NOT be deleted.')) return;
      fetch('/collections/' + currentCollectionId, { method: 'DELETE' })
        .then(function() { currentCollectionId = null; loadCollections(); showToast('Collection deleted', 'accepted'); })
        .catch(function() { showToast('Failed to delete collection', 'rejected'); });
    }
    window.deleteCollection = deleteCollection;

    // ===== Scan Items =====
    var currentScanId = null;
    var currentScanItems = [];
    var currentScanImageUrl = null;

    function handleScanDrop(event) {
      event.preventDefault();
      var zone = document.getElementById('scanUploadZone');
      zone.style.borderColor = '#E6E8EC';
      zone.style.background = '#FCFCFD';
      var files = event.dataTransfer.files;
      if (files.length > 0) uploadScanFile(files[0]);
    }
    window.handleScanDrop = handleScanDrop;

    function handleScanFileSelect(input) {
      if (input.files.length > 0) uploadScanFile(input.files[0]);
    }
    window.handleScanFileSelect = handleScanFileSelect;

    var scanCameraStream = null;

    async function openScanCamera() {
      var container = document.getElementById('scanCameraContainer');
      var video = document.getElementById('scanCameraVideo');
      try {
        scanCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        video.srcObject = scanCameraStream;
        container.classList.remove('hidden');
      } catch(e) {
        showToast('Could not access camera: ' + e.message, 'rejected');
      }
    }
    window.openScanCamera = openScanCamera;

    function closeScanCamera() {
      if (scanCameraStream) {
        scanCameraStream.getTracks().forEach(function(t) { t.stop(); });
        scanCameraStream = null;
      }
      document.getElementById('scanCameraContainer').classList.add('hidden');
    }
    window.closeScanCamera = closeScanCamera;

    function captureScanPhoto() {
      var video = document.getElementById('scanCameraVideo');
      var canvas = document.getElementById('scanCameraCanvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      closeScanCamera();
      canvas.toBlob(function(blob) {
        if (!blob) { showToast('Failed to capture photo', 'rejected'); return; }
        var file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        uploadScanFile(file);
      }, 'image/jpeg', 0.9);
    }
    window.captureScanPhoto = captureScanPhoto;

    async function uploadScanFile(file) {
      var allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        showToast('Only JPEG, PNG, and WebP images are supported', 'rejected');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('Image must be under 10MB', 'rejected');
        return;
      }

      document.getElementById('scanUploadZone').classList.add('hidden');
      document.getElementById('scanProcessing').classList.remove('hidden');
      document.getElementById('scanResults').classList.add('hidden');

      var fd = new FormData();
      fd.append('file', file);

      try {
        var res = await fetch('/scans', { method: 'POST', body: fd });
        var data = await res.json();
        document.getElementById('scanProcessing').classList.add('hidden');

        if (!res.ok) {
          document.getElementById('scanUploadZone').classList.remove('hidden');
          showToast(data.error || 'Scan failed', 'rejected');
          return;
        }

        currentScanId = data.scanId;
        currentScanItems = data.items || [];
        currentScanImageUrl = URL.createObjectURL(file);
        renderScanResults();
        loadScanHistory();
      } catch(e) {
        document.getElementById('scanProcessing').classList.add('hidden');
        document.getElementById('scanUploadZone').classList.remove('hidden');
        showToast('Scan failed: ' + e.message, 'rejected');
      }
    }

    // Track per-item state
    var scanItemStatuses = {};
    var scanRemovedItems = new Set();
    var scanEditingItem = null;
    var scanCollectionsList = [];

    function renderScanResults() {
      if (currentScanItems.length === 0) {
        document.getElementById('scanResults').classList.add('hidden');
        document.getElementById('scanUploadZone').classList.remove('hidden');
        showToast('No items detected in image', 'rejected');
        return;
      }

      scanRemovedItems = new Set();
      scanEditingItem = null;
      // Default all items to for_sale
      currentScanItems.forEach(function(item) {
        if (!scanItemStatuses[item.id]) scanItemStatuses[item.id] = 'for_sale';
      });

      document.getElementById('scanResults').classList.remove('hidden');
      document.getElementById('scanUploadZone').classList.remove('hidden');

      // Set counts
      updateScanCounts();

      // Show scan thumbnail if available
      var thumb = document.getElementById('scanSummaryThumb');
      if (currentScanImageUrl) {
        thumb.src = currentScanImageUrl;
        thumb.style.display = 'block';
      } else {
        thumb.style.display = 'none';
      }

      // Load collections for pickers
      fetch('/collections').then(function(r) { return r.json(); }).then(function(cols) {
        scanCollectionsList = cols;
        var picker = document.getElementById('scanCollectionPicker');
        picker.innerHTML = '<option value="">No folder</option>' + cols.map(function(c) {
          return '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
        }).join('');
      }).catch(function() {});

      renderScanItemCards();
    }

    function updateScanCounts() {
      var total = currentScanItems.length;
      var removed = scanRemovedItems.size;
      var publishable = total - removed;
      document.getElementById('scanResultCount').textContent = total;
      document.getElementById('scanResultCountHeader').textContent = total;
      document.getElementById('scanPublishCount').textContent = publishable;
      document.getElementById('scanPublishFooterCount').textContent = publishable;
      document.getElementById('scanTotalFooterCount').textContent = total;
      document.getElementById('scanPublishBtnCount').textContent = publishable;

      var removedSpan = document.getElementById('scanRemovedFooterCount');
      if (removed > 0) {
        removedSpan.style.display = 'inline';
        document.getElementById('scanRemovedNum').textContent = removed;
      } else {
        removedSpan.style.display = 'none';
      }

      var pubBtn = document.getElementById('scanPublishBtn');
      if (pubBtn) pubBtn.disabled = publishable === 0;

      // Update summary list
      var summaryList = document.getElementById('scanSummaryList');
      if (summaryList) {
        summaryList.innerHTML = currentScanItems.map(function(item) {
          var isRemoved = scanRemovedItems.has(item.id);
          var price = item.priceTypical ? ' ~$' + Number(item.priceTypical).toFixed(0) : '';
          var cond = item.condition ? ' · ' + item.condition : '';
          return '<div style="font-size:12px;color:' + (isRemoved ? '#B1B5C3' : '#23262F') + ';' + (isRemoved ? 'text-decoration:line-through;' : 'font-weight:600;') + '">'
            + escapeHtml(item.name)
            + '<span style="color:#777E90;font-weight:400;">' + price + cond + '</span></div>';
        }).join('');
      }
    }

    function renderScanItemCards() {
      var grid = document.getElementById('scanItemsGrid');
      var statusColors = {
        for_sale: { bg: '#e6f9ed', color: '#1a8a42' },
        willing_to_sell: { bg: '#fff8e1', color: '#e6a200' },
        for_rent: { bg: '#e6f0ff', color: '#1a6aba' },
        private: { bg: '#E6E8EC', color: '#353945' },
      };
      var statusLabels = { for_sale: 'For Sale', willing_to_sell: 'Willing to Sell', for_rent: 'For Rent', private: 'Private' };

      grid.innerHTML = currentScanItems.map(function(item, idx) {
        var isRemoved = scanRemovedItems.has(item.id);
        var isEditing = scanEditingItem === item.id;
        var isSelected = !isRemoved;
        var status = scanItemStatuses[item.id] || 'for_sale';
        var sc = statusColors[status] || statusColors.for_sale;

        // Removed item — compact row
        if (isRemoved) {
          return '<div id="scan-card-' + item.id + '" style="background:#FCFCFD;border:1px solid #E6E8EC;border-radius:12px;padding:12px 16px;opacity:0.45;cursor:pointer;" onclick="restoreScanItem(\\'' + item.id + '\\')">'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<input type="checkbox" disabled style="width:16px;height:16px;opacity:0.5;">'
            + '<div style="flex:1;font-size:14px;color:#777E90;text-decoration:line-through;">' + escapeHtml(item.name) + '</div>'
            + '<span style="font-size:11px;color:#777E90;">Removed — click to restore</span>'
            + '</div></div>';
        }

        var conf = item.confidence != null ? Math.round(item.confidence * 100) + '%' : '';
        var confColor = item.confidence >= 0.85 ? '#1a8a42' : item.confidence >= 0.7 ? '#e6a200' : '#777E90';
        var confBg = item.confidence >= 0.85 ? '#e6f9ed' : item.confidence >= 0.7 ? '#fff8e1' : '#F4F5F6';
        var priceRange = (item.priceLow && item.priceHigh) ? '$' + Number(item.priceLow).toFixed(0) + '\\u2013$' + Number(item.priceHigh).toFixed(0) : '';
        var priceAvg = item.priceTypical ? '(avg $' + Number(item.priceTypical).toFixed(0) + ')' : '';

        var html = '<div id="scan-card-' + item.id + '" style="background:#FCFCFD;border:1px solid #E6E8EC;border-radius:12px;padding:16px;' + (isSelected ? 'box-shadow:0 0 0 2px rgba(236,82,111,0.15);' : '') + '">';
        html += '<div style="display:flex;gap:12px;">';

        // Left: checkbox
        html += '<div style="padding-top:2px;"><input type="checkbox" class="scan-item-cb" data-item-id="' + item.id + '" ' + (isSelected ? 'checked' : '') + ' onchange="updateScanCounts()" style="width:16px;height:16px;accent-color:#EC526F;"></div>';

        // Center: content
        html += '<div style="flex:1;min-width:0;">';

        // Name row + confidence
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
        if (isEditing) {
          html += '<input type="text" value="' + escapeHtml(item.name) + '" class="scan-item-name" data-idx="' + idx + '" style="flex:1;font-size:14px;font-weight:600;color:#23262F;font-family:\\'Poppins\\',sans-serif;border:1px solid #E6E8EC;border-radius:8px;padding:4px 8px;">';
        } else {
          html += '<div style="flex:1;font-size:14px;font-weight:600;color:#23262F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(item.name) + '</div>';
        }
        if (conf) html += '<span style="font-size:11px;font-weight:700;color:' + confColor + ';background:' + confBg + ';padding:2px 8px;border-radius:20px;white-space:nowrap;">' + conf + '</span>';
        html += '</div>';

        // Category/subcategory
        html += '<div style="font-size:12px;color:#777E90;margin-bottom:4px;">' + escapeHtml(item.category || 'Uncategorized') + '</div>';

        // Description (view mode only, 2-line clamp)
        if (!isEditing && item.description) {
          html += '<div style="font-size:13px;color:#353945;margin-bottom:6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(item.description) + '</div>';
        }

        // Price + condition + status row
        html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px;">';
        if (priceRange) {
          html += '<span style="font-size:14px;font-weight:600;color:#23262F;">' + priceRange + '</span>';
          if (priceAvg) html += '<span style="font-size:12px;color:#777E90;">' + priceAvg + '</span>';
        }
        if (item.condition) html += '<span style="font-size:12px;color:#777E90;">' + escapeHtml(item.condition.charAt(0).toUpperCase() + item.condition.slice(1).replace(/_/g, ' ')) + '</span>';

        // Status dropdown
        html += '<select onchange="setScanItemStatus(\\'' + item.id + '\\',this.value)" style="font-size:11px;font-weight:700;padding:3px 24px 3px 10px;border-radius:20px;border:none;cursor:pointer;appearance:none;-webkit-appearance:none;background:' + sc.bg + ' url(\\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22' + encodeURIComponent(sc.color) + '%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>\\') no-repeat right 6px center;color:' + sc.color + ';">';
        ['for_sale','willing_to_sell','for_rent','private'].forEach(function(s) {
          html += '<option value="' + s + '"' + (status === s ? ' selected' : '') + '>' + statusLabels[s] + '</option>';
        });
        html += '</select>';
        html += '</div>';

        // Edit mode fields
        if (isEditing) {
          html += '<div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
          // Description
          html += '<div style="grid-column:1/-1;"><label style="font-size:10px;font-weight:700;color:#777E90;text-transform:uppercase;display:block;margin-bottom:4px;">Description</label>';
          html += '<textarea class="scan-edit-desc" data-item-id="' + item.id + '" rows="2" style="width:100%;border:1px solid #E6E8EC;border-radius:8px;padding:8px;font-size:13px;font-family:\\'Poppins\\',sans-serif;color:#23262F;resize:vertical;">' + escapeHtml(item.description || '') + '</textarea></div>';
          // Category
          html += '<div><label style="font-size:10px;font-weight:700;color:#777E90;text-transform:uppercase;display:block;margin-bottom:4px;">Category</label>';
          html += '<input type="text" class="scan-edit-cat" data-item-id="' + item.id + '" value="' + escapeHtml(item.category || '') + '" style="width:100%;border:1px solid #E6E8EC;border-radius:8px;padding:6px 8px;font-size:13px;font-family:\\'Poppins\\',sans-serif;color:#23262F;"></div>';
          // Condition
          html += '<div><label style="font-size:10px;font-weight:700;color:#777E90;text-transform:uppercase;display:block;margin-bottom:4px;">Condition</label>';
          html += '<select class="scan-edit-cond" data-item-id="' + item.id + '" style="width:100%;border:1px solid #E6E8EC;border-radius:8px;padding:6px 8px;font-size:13px;font-family:\\'Poppins\\',sans-serif;color:#23262F;">';
          ['','new','like_new','good','fair','poor'].forEach(function(c) {
            var label = c ? c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ') : 'Select...';
            html += '<option value="' + c + '"' + ((item.condition || '') === c ? ' selected' : '') + '>' + label + '</option>';
          });
          html += '</select></div>';
          // Price
          html += '<div><label style="font-size:10px;font-weight:700;color:#777E90;text-transform:uppercase;display:block;margin-bottom:4px;">Price ($)</label>';
          html += '<input type="number" class="scan-edit-price" data-item-id="' + item.id + '" value="' + (item.priceTypical || '') + '" min="0" step="0.01" style="width:100%;border:1px solid #E6E8EC;border-radius:8px;padding:6px 8px;font-size:13px;font-family:\\'Poppins\\',sans-serif;color:#23262F;"></div>';
          // Folder
          html += '<div><label style="font-size:10px;font-weight:700;color:#777E90;text-transform:uppercase;display:block;margin-bottom:4px;">Folder</label>';
          html += '<select class="scan-edit-folder" data-item-id="' + item.id + '" style="width:100%;border:1px solid #E6E8EC;border-radius:8px;padding:6px 8px;font-size:13px;font-family:\\'Poppins\\',sans-serif;color:#23262F;">';
          html += '<option value="">No folder</option>';
          scanCollectionsList.forEach(function(c) {
            html += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
          });
          html += '</select></div>';
          html += '</div>';
        }

        html += '</div>'; // end center

        // Right: actions
        html += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:60px;">';
        // Edit/Done button
        html += '<button onclick="toggleScanItemEdit(\\'' + item.id + '\\')" style="font-size:12px;color:#777E90;background:none;border:none;cursor:pointer;font-family:\\'Poppins\\',sans-serif;">' + (isEditing ? 'Done' : 'Edit') + '</button>';
        // Remove
        html += '<button onclick="removeScanItem(\\'' + item.id + '\\')" style="font-size:10px;color:#777E90;background:none;border:none;cursor:pointer;font-family:\\'Poppins\\',sans-serif;transition:color 0.15s;" onmouseover="this.style.color=\\'#E92222\\'" onmouseout="this.style.color=\\'#777E90\\'">Remove</button>';
        html += '</div>';

        html += '</div>'; // end flex row
        html += '</div>'; // end card
        return html;
      }).join('');
    }

    function setScanItemStatus(itemId, status) {
      scanItemStatuses[itemId] = status;
      renderScanItemCards();
    }
    window.setScanItemStatus = setScanItemStatus;

    function toggleScanItemEdit(itemId) {
      if (scanEditingItem === itemId) {
        // Save edits back to currentScanItems
        var item = currentScanItems.find(function(i) { return i.id === itemId; });
        if (item) {
          var nameInput = document.querySelector('.scan-item-name[data-idx]');
          if (nameInput) item.name = nameInput.value;
          var descEl = document.querySelector('.scan-edit-desc[data-item-id="' + itemId + '"]');
          if (descEl) item.description = descEl.value;
          var catEl = document.querySelector('.scan-edit-cat[data-item-id="' + itemId + '"]');
          if (catEl) item.category = catEl.value;
          var condEl = document.querySelector('.scan-edit-cond[data-item-id="' + itemId + '"]');
          if (condEl) item.condition = condEl.value;
          var priceEl = document.querySelector('.scan-edit-price[data-item-id="' + itemId + '"]');
          if (priceEl && priceEl.value) item.priceTypical = parseFloat(priceEl.value);

          // Save to server
          fetch('/scans/' + currentScanId + '/items/' + itemId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: item.name, description: item.description, category: item.category, condition: item.condition, priceTypical: item.priceTypical }),
          }).catch(function() {});
        }
        scanEditingItem = null;
      } else {
        scanEditingItem = itemId;
      }
      renderScanItemCards();
      updateScanCounts();
    }
    window.toggleScanItemEdit = toggleScanItemEdit;

    function removeScanItem(id) {
      scanRemovedItems.add(id);
      renderScanItemCards();
      updateScanCounts();
    }
    window.removeScanItem = removeScanItem;

    function restoreScanItem(id) {
      scanRemovedItems.delete(id);
      renderScanItemCards();
      updateScanCounts();
    }
    window.restoreScanItem = restoreScanItem;

    function toggleScanSelectAll(checked) {
      if (checked) {
        scanRemovedItems.clear();
      } else {
        currentScanItems.forEach(function(i) { scanRemovedItems.add(i.id); });
      }
      renderScanItemCards();
      updateScanCounts();
    }
    window.toggleScanSelectAll = toggleScanSelectAll;

    function bulkSetScanStatus(status) {
      currentScanItems.forEach(function(item) {
        if (!scanRemovedItems.has(item.id)) {
          scanItemStatuses[item.id] = status;
        }
      });
      renderScanItemCards();
    }
    window.bulkSetScanStatus = bulkSetScanStatus;

    function bulkRemoveScanItems() {
      currentScanItems.forEach(function(item) {
        if (!scanRemovedItems.has(item.id)) {
          scanRemovedItems.add(item.id);
        }
      });
      renderScanItemCards();
      updateScanCounts();
    }
    window.bulkRemoveScanItems = bulkRemoveScanItems;

    function toggleScanSummary() {
      var expanded = document.getElementById('scanSummaryExpanded');
      var chevron = document.getElementById('scanSummaryChevron');
      if (expanded.classList.contains('hidden')) {
        expanded.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
      } else {
        expanded.classList.add('hidden');
        chevron.style.transform = '';
      }
    }
    window.toggleScanSummary = toggleScanSummary;

    function openNewCollectionFromScan() {
      var name = prompt('New folder name:');
      if (!name || !name.trim()) return;
      fetch('/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      }).then(function(r) { return r.json(); }).then(function(col) {
        scanCollectionsList.push(col);
        var picker = document.getElementById('scanCollectionPicker');
        picker.innerHTML += '<option value="' + col.id + '">' + escapeHtml(col.name) + '</option>';
        picker.value = col.id;
        showToast('Folder created: ' + col.name, 'accepted');
        // Re-render cards to update folder dropdowns in edit mode
        renderScanItemCards();
      }).catch(function() { showToast('Failed to create folder', 'rejected'); });
    }
    window.openNewCollectionFromScan = openNewCollectionFromScan;

    async function confirmScanItems() {
      if (!currentScanId) return;
      // Collect non-removed items
      var itemIds = [];
      currentScanItems.forEach(function(item) {
        if (!scanRemovedItems.has(item.id)) {
          itemIds.push(item.id);
        }
      });
      if (itemIds.length === 0) {
        showToast('No items to publish', 'rejected');
        return;
      }

      var collectionId = document.getElementById('scanCollectionPicker').value || null;

      // Build per-item listing statuses
      var listingStatuses = {};
      itemIds.forEach(function(id) {
        listingStatuses[id] = scanItemStatuses[id] || 'for_sale';
      });

      // Show loading state
      var pubBtn = document.getElementById('scanPublishBtn');
      var origHtml = pubBtn ? pubBtn.innerHTML : '';
      if (pubBtn) {
        pubBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span>Creating ' + itemIds.length + ' listing(s)...</span>';
        pubBtn.disabled = true;
      }

      try {
        var res = await fetch('/scans/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanId: currentScanId, itemIds: itemIds, collectionId: collectionId, listingStatuses: listingStatuses }),
        });
        var data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Confirm failed', 'rejected');
          if (pubBtn) { pubBtn.innerHTML = origHtml; pubBtn.disabled = false; }
          return;
        }
        showToast(data.confirmed + ' listing' + (data.confirmed !== 1 ? 's' : '') + ' created', 'accepted');
        scanItemStatuses = {};
        scanRemovedItems = new Set();
        currentScanId = null;
        currentScanItems = [];
        document.getElementById('scanResults').classList.add('hidden');
        document.getElementById('scanFileInput').value = '';
      } catch(e) {
        showToast('Failed to confirm items', 'rejected');
        if (pubBtn) { pubBtn.innerHTML = origHtml; pubBtn.disabled = false; }
      }
    }
    window.confirmScanItems = confirmScanItems;

    function dismissScanItem(id) {
      removeScanItem(id);
    }
    window.dismissScanItem = dismissScanItem;

    function clearScanResults() {
      currentScanId = null;
      currentScanItems = [];
      currentScanImageUrl = null;
      scanItemStatuses = {};
      scanRemovedItems = new Set();
      scanEditingItem = null;
      document.getElementById('scanResults').classList.add('hidden');
      document.getElementById('scanFileInput').value = '';
    }
    window.clearScanResults = clearScanResults;

    function retryScan() {
      clearScanResults();
      document.getElementById('scanFileInput').click();
    }
    window.retryScan = retryScan;

    async function loadScanHistory() {
      var container = document.getElementById('scanHistory');
      try {
        var res = await fetch('/scans');
        var scans = await res.json();
        if (scans.length === 0) {
          container.innerHTML = '<p style="color:#777E90;font-size:13px;">No scans yet</p>';
          return;
        }
        container.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px;">' + scans.map(function(s) {
          var statusColor = s.status === 'completed' ? '#1a8a42' : s.status === 'failed' ? '#E92222' : '#e6a200';
          var date = new Date(s.createdAt).toLocaleDateString();
          return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#F4F5F6;border-radius:10px;cursor:pointer;" onclick="viewScan(\\'' + s.id + '\\')">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:13px;font-weight:500;color:#23262F;">' + date + ' &middot; ' + (s.itemCount || 0) + ' items</div>'
            + '<div style="font-size:11px;color:' + statusColor + ';font-weight:500;text-transform:capitalize;">' + s.status + '</div>'
            + '</div>'
            + '<button style="background:none;border:none;cursor:pointer;color:#777E90;font-size:12px;" onclick="event.stopPropagation();deleteScan(\\'' + s.id + '\\')">&times;</button>'
            + '</div>';
        }).join('') + '</div>';
      } catch(e) {
        container.innerHTML = '<p style="color:#777E90;font-size:13px;">Failed to load scan history.</p>';
      }
    }
    window.loadScanHistory = loadScanHistory;

    async function viewScan(id) {
      try {
        var res = await fetch('/scans/' + id);
        var data = await res.json();
        if (!res.ok) { showToast(data.error || 'Failed to load scan', 'rejected'); return; }
        currentScanId = data.id;
        currentScanItems = data.items || [];
        document.getElementById('scanProcessing').classList.add('hidden');
        renderScanResults();
      } catch(e) {
        showToast('Failed to load scan', 'rejected');
      }
    }
    window.viewScan = viewScan;

    async function deleteScan(id) {
      if (!confirm('Delete this scan?')) return;
      try {
        await fetch('/scans/' + id, { method: 'DELETE' });
        loadScanHistory();
        showToast('Scan deleted', 'accepted');
      } catch(e) {
        showToast('Failed to delete scan', 'rejected');
      }
    }
    window.deleteScan = deleteScan;

    async function lookupBarcode() {
      var upc = document.getElementById('barcodeInput').value.trim();
      if (!upc) { showToast('Enter a UPC or barcode number', 'rejected'); return; }
      var container = document.getElementById('barcodeResult');
      container.innerHTML = '<div style="color:#777E90;font-size:13px;">Looking up...</div>';
      try {
        var res = await fetch('/scans/barcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upc: upc }),
        });
        var data = await res.json();
        if (!res.ok) {
          container.innerHTML = '<div style="color:#E92222;font-size:13px;">' + escapeHtml(data.error || 'Lookup failed') + '</div>';
          return;
        }
        var pe = data.price_estimate || {};
        container.innerHTML = '<div style="background:#F4F5F6;border-radius:12px;padding:16px;margin-top:8px;">'
          + '<div style="font-size:14px;font-weight:600;color:#23262F;margin-bottom:4px;">' + escapeHtml(data.description || upc) + '</div>'
          + (pe.typical ? '<div style="font-size:14px;font-weight:700;color:#1a8a42;">~$' + Number(pe.typical).toFixed(0) + '</div>' : '')
          + (pe.low && pe.high ? '<div style="font-size:11px;color:#777E90;">Range: $' + Number(pe.low).toFixed(0) + ' - $' + Number(pe.high).toFixed(0) + '</div>' : '')
          + '<div style="display:flex;gap:8px;margin-top:12px;">'
          + '<button class="btn-primary btn-sm" onclick="createRefFromBarcode()">Create Listing</button>'
          + '<button class="btn-secondary btn-sm" onclick="dismissBarcodeResult()">Dismiss</button>'
          + '<button class="btn-secondary btn-sm" onclick="retryBarcode()" style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>Retry</button>'
          + '</div>'
          + '</div>';
        window._barcodeData = data;
      } catch(e) {
        container.innerHTML = '<div style="color:#E92222;font-size:13px;">Lookup failed</div>';
      }
    }
    window.lookupBarcode = lookupBarcode;

    var barcodeStream = null;
    var barcodeDetectionInterval = null;

    async function toggleBarcodeCamera() {
      var container = document.getElementById('barcodeCameraContainer');
      var video = document.getElementById('barcodeVideo');

      if (barcodeStream) {
        // Stop camera
        barcodeStream.getTracks().forEach(function(t) { t.stop(); });
        barcodeStream = null;
        if (barcodeDetectionInterval) clearInterval(barcodeDetectionInterval);
        barcodeDetectionInterval = null;
        container.classList.add('hidden');
        return;
      }

      // Check for BarcodeDetector support
      if (!('BarcodeDetector' in window)) {
        showToast('Barcode scanning not supported in this browser. Enter the UPC manually.', 'rejected');
        return;
      }

      try {
        barcodeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = barcodeStream;
        container.classList.remove('hidden');

        var detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
        barcodeDetectionInterval = setInterval(async function() {
          try {
            if (video.readyState < 2) return;
            var barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              var code = barcodes[0].rawValue;
              document.getElementById('barcodeInput').value = code;
              toggleBarcodeCamera();
              showToast('Barcode detected: ' + code, 'accepted');
              lookupBarcode();
            }
          } catch(e) {}
        }, 500);
      } catch(e) {
        showToast('Could not access camera: ' + e.message, 'rejected');
      }
    }
    window.toggleBarcodeCamera = toggleBarcodeCamera;

    function createRefFromBarcode() {
      var data = window._barcodeData;
      if (!data) return;
      var pe = data.price_estimate || {};
      var body = {
        name: data.description || document.getElementById('barcodeInput').value.trim(),
        description: data.description || '',
        sku: data.sku || document.getElementById('barcodeInput').value.trim(),
      };
      if (data.attributes) body.attributes = data.attributes;
      if (data.image_url) body.image = data.image_url;
      fetch('/refs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function(r) { return r.json(); }).then(function(ref) {
        showToast('Listing created: ' + ref.name, 'accepted');
        document.getElementById('barcodeResult').innerHTML = '';
        document.getElementById('barcodeInput').value = '';
      }).catch(function() { showToast('Failed to create listing', 'rejected'); });
    }
    window.createRefFromBarcode = createRefFromBarcode;

    function dismissBarcodeResult() {
      document.getElementById('barcodeResult').innerHTML = '';
      window._barcodeData = null;
    }
    window.dismissBarcodeResult = dismissBarcodeResult;

    function retryBarcode() {
      dismissBarcodeResult();
      document.getElementById('barcodeInput').value = '';
      document.getElementById('barcodeInput').focus();
    }
    window.retryBarcode = retryBarcode;

  </script>
</body>
</html>`;
}
