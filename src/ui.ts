import { TAXONOMY } from './taxonomy';
import { CATEGORY_SCHEMAS } from '@reffo/protocol';

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
  <title>Reffo Beacon</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg width='40' height='71' viewBox='0 0 40 71' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23c)'%3E%3Cpath d='M38.27 3.79s.5-.98.1-1.75c-.4-.76-1.37-.66-1.37-.66H13.12s-.63-.03-1.03.34c-.4.37-.55 1.15-.55 1.15L2.18 33.97s-.49 1.18-.07 2.08c.42.9 1.4.83 1.4.83h8.49l-9.5 31.39s-.73 1.63.43 2.45c1.17.82 2.37-.41 2.37-.41L39.68 25.98s.57-.65.19-1.67c-.38-1.01-1.23-.91-1.23-.91H28.82l9.45-19.61z' fill='%23000'/%3E%3Cpath d='M36.33 2.41s.5-.98.1-1.75C36.03-.1 35.05.01 35.05.01H11.18s-.63-.03-1.03.34c-.4.37-.55 1.15-.55 1.15L.24 32.59s-.49 1.18-.07 2.08c.42.9 1.4.83 1.4.83h8.49L.56 66.88s-.73 1.64.44 2.45c1.16.82 2.37-.42 2.37-.42L37.74 24.6s.57-.65.19-1.67c-.38-1.01-1.23-.91-1.23-.91H26.88l9.45-19.61z' fill='%23EA526F'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='c'%3E%3Crect width='40' height='71' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Poppins', sans-serif; background: #F4F5F6; color: #23262F; line-height: 1.5; min-height: 100vh; display: flex; flex-direction: column; }
    .app-content { flex: 1; }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }

    /* Fade-in animation (from Modal.module.sass) */
    @keyframes showModal { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes fadeIn { 0% { opacity: 0; transform: translateY(3px); } 100% { opacity: 1; transform: translateY(0); } }

    /* Header */
    h1 { font-size: 1.25rem; font-weight: 700; color: #141416; margin: 0; }
    .bolt { display: inline-block; filter: drop-shadow(0 0 8px rgba(234,82,111,0.4)); }

    /* App Header — sticky bar */
    .app-header { position: sticky; top: 0; z-index: 100; background: #FCFCFD; border-bottom: 1px solid #E6E8EC; padding: 0 24px; }
    .app-header-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 16px; }
    .app-header-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; flex-shrink: 0; }
    .app-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .header-settings-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #E6E8EC; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; position: relative; color: #777E90; }
    .header-settings-btn:hover { border-color: #141416; color: #141416; }
    .header-settings-btn .notif-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: #EC526F; display: none; }

    /* Avatar dropdown */
    .header-avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #E6E8EC; background: #FCFCFD; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: border-color 0.2s; overflow: hidden; font-size: 14px; font-weight: 700; color: #EC526F; font-family: 'Poppins', sans-serif; }
    .header-avatar:hover { border-color: #EC526F; }
    .header-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-dropdown { position: absolute; right: 0; top: 100%; margin-top: 8px; width: 220px; background: #FCFCFD; border: 1px solid #E6E8EC; border-radius: 16px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); padding: 8px 0; z-index: 200; display: none; }
    .avatar-dropdown.open { display: block; }
    .avatar-dropdown .dd-item { display: block; width: 100%; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #23262F; cursor: pointer; transition: background 0.15s; border: none; background: none; text-align: left; font-family: 'Poppins', sans-serif; }
    .avatar-dropdown .dd-item:hover { background: #F4F5F6; }
    .avatar-dropdown .dd-divider { height: 1px; background: #E6E8EC; margin: 4px 0; }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .app-header-inner { gap: 8px; }
      .app-header-logo h1 { display: none; }
      .search-filter-segment { padding: 0 10px; }
    }

    /* List Ref Modal */
    .list-ref-modal .modal { width: 640px; max-height: 90vh; overflow-y: auto; }

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
    @media (max-width: 768px) { .search-filter-segment { padding: 0 10px; } }

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
    .card-price { font-size: 16px; font-weight: 700; color: #1a8a42; margin-top: 4px; }
    .card-qty { font-size: 12px; color: #777E90; margin-top: 4px; font-weight: 500; }
    .card-desc { font-size: 14px; color: #777E90; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.71; }

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
    .detail-main-img img { width: 100%; height: 100%; object-fit: cover; }
    .detail-main-img .placeholder { color: #B1B5C3; font-size: 3rem; }
    .detail-side-imgs { flex: 1; display: flex; flex-direction: column; gap: 12px; height: 100%; }
    .detail-side-img { flex: 1; min-height: 0; border-radius: 16px; overflow: hidden; background: #F4F5F6; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s; }
    .detail-side-img:hover { opacity: 0.85; }
    .detail-side-img img { width: 100%; height: 100%; object-fit: cover; }
    .detail-side-img .placeholder { color: #E6E8EC; font-size: 1.5rem; }
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
    .payment-card-amount { font-size: 40px; font-weight: 700; color: #141416; line-height: 1.2; }
    .payment-card-amount small { font-size: 14px; font-weight: 500; color: #777E90; display: block; margin-top: 4px; }
    .payment-card-thumb { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; background: #F4F5F6; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
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

    @media (max-width: 767px) {
      .deal-body { max-width: 100%; padding-right: 0; }
      .info-item { width: 100%; }
      .payment-card { position: static; }
    }

    /* Sold negotiation status */
    .neg-card.sold { border-left-color: #1a8a42; }
    .neg-status.sold { background: #e6f9ed; color: #1a8a42; }

    /* Ref sub-tabs */
    .ref-subtabs { display: flex; gap: 0; margin-bottom: 16px; }
    .ref-subtab { padding: 8px 20px; cursor: pointer; font-size: 13px; font-weight: 700; color: #777E90; border-bottom: 2px solid transparent; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.02em; }
    .ref-subtab.active { color: #EC526F; border-bottom-color: #EC526F; }
    .ref-subtab:hover { color: #EC526F; }

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
    .app-footer { border-top: 1px solid #E6E8EC; background: #FCFCFD; padding: 32px 24px; }
    .app-footer-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .app-footer-brand { display: flex; align-items: center; gap: 8px; }
    .app-footer-brand span { font-size: 14px; font-weight: 600; color: #141416; }
    .app-footer-links { display: flex; align-items: center; gap: 16px; font-size: 14px; }
    .app-footer-links a { color: #777E90; text-decoration: none; transition: color 0.2s; }
    .app-footer-links a:hover { color: #141416; }
    .app-footer-links .sep { color: #E6E8EC; }
    .app-footer-copy { font-size: 14px; color: #777E90; }
    @media (max-width: 768px) {
      .app-footer-inner { flex-direction: column; text-align: center; gap: 12px; }
    }
  </style>
</head>
<body>
  <!-- App Header -->
  <div class="app-header">
    <div class="app-header-inner">
      <div class="app-header-logo" onclick="switchTab('refs')">
        <svg class="bolt" width="24" height="42" viewBox="0 0 40 71" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_bolt)">
            <path d="M38.27 3.79s.5-.98.1-1.75c-.4-.76-1.37-.66-1.37-.66H13.12s-.63-.03-1.03.34c-.4.37-.55 1.15-.55 1.15L2.18 33.97s-.49 1.18-.07 2.08c.42.9 1.4.83 1.4.83h8.49l-9.5 31.39s-.73 1.63.43 2.45c1.17.82 2.37-.41 2.37-.41L39.68 25.98s.57-.65.19-1.67c-.38-1.01-1.23-.91-1.23-.91H28.82l9.45-19.61z" fill="black"/>
            <path d="M36.33 2.41s.5-.98.1-1.75C36.03-.1 35.05.01 35.05.01H11.18s-.63-.03-1.03.34c-.4.37-.55 1.15-.55 1.15L.24 32.59s-.49 1.18-.07 2.08c.42.9 1.4.83 1.4.83h8.49L.56 66.88s-.73 1.64.44 2.45c1.16.82 2.37-.42 2.37-.42L37.74 24.6s.57-.65.19-1.67c-.38-1.01-1.23-.91-1.23-.91H26.88l9.45-19.61z" fill="#EA526F"/>
          </g>
          <defs><clipPath id="clip0_bolt"><rect width="40" height="71" fill="white"/></clipPath></defs>
        </svg>
        <h1>Reffo Beacon</h1>
      </div>

      <!-- Header actions: bell + avatar -->
      <div class="app-header-actions">
        <button class="header-settings-btn" onclick="switchTab('negotiations')" title="Negotiations">
          <svg width="18" height="18" viewBox="0 0 18 19" fill="none"><path d="M17.97 15.02c0 .24-.09.46-.26.63-.16.17-.39.26-.62.26H.85c-.23-.01-.45-.1-.61-.27a.87.87 0 010-1.23c.16-.16.38-.26.61-.27h.02V7.98c.02-2.13.88-4.17 2.4-5.67C4.79.82 6.84-.02 8.97 0c2.13-.02 4.18.82 5.7 2.31 1.52 1.5 2.38 3.5 2.4 5.67v6.16h.02c.23 0 .46.09.62.26.17.17.26.39.26.62zM2.67 14.14h12.6V7.98c0-1.67-.66-3.27-1.85-4.45-1.18-1.18-2.78-1.85-4.45-1.85s-3.27.67-4.45 1.85C3.33 4.71 2.67 6.31 2.67 7.98v6.16zm4.28 3.62c-.25-.5.22-.97.77-.97h2.5c.55 0 1.02.47.77.97-.11.22-.26.42-.43.6-.43.41-1 .65-1.6.65-.59 0-1.16-.24-1.59-.65-.18-.17-.32-.38-.43-.6z" fill="currentColor"/></svg>
          <span class="notif-dot" id="headerNotifDot"></span>
        </button>
        <div style="position:relative;" id="avatarContainer">
          <button class="header-avatar" onclick="toggleAvatarDropdown()" title="Menu" id="avatarBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <div class="avatar-dropdown" id="avatarDropdown">
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('refs');">My Refs</button>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('negotiations');">Negotiations</button>
            <div class="dd-divider"></div>
            <button class="dd-item" onclick="closeAvatarDropdown(); switchTab('settings');">Settings</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="app-content">
  <div class="container">
    <!-- Search Filter Bar -->
    <div style="margin-bottom:24px;">
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
    </div>

    <!-- Refs Tab -->
    <div id="tab-refs">
      <div class="ref-subtabs">
        <div class="ref-subtab active" data-reftab="active" onclick="switchRefSubTab('active')">Active</div>
        <div class="ref-subtab" data-reftab="archive" onclick="switchRefSubTab('archive')">Archive</div>
      </div>

      <div id="refSubtabActive">
      <section>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;border:none;padding:0;">My Refs</h2>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="layout-toggle">
              <button id="layoutCardBtn" class="active" onclick="setRefLayout('card')" title="Card view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </button>
              <button id="layoutRowBtn" onclick="setRefLayout('row')" title="Row view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></svg>
              </button>
            </div>
            <button class="btn-primary btn-sm" onclick="openListRefModal()">+ New Ref</button>
          </div>
        </div>
        <div id="myRefs"><p class="empty">Loading...</p></div>
      </section>
      </div>

      <div id="refSubtabArchive" class="hidden">
      <section>
        <h2>Archived Refs</h2>
        <div id="archivedRefs"><p class="empty">No archived refs</p></div>
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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
          <h2 style="margin:0;border:none;padding:0;">Search Results</h2>
          <div style="display:flex;align-items:center;gap:10px;">
            <select id="searchRadiusSelect" style="font-size:13px;border:1px solid #E6E8EC;border-radius:8px;padding:4px 8px;font-family:'Poppins',sans-serif;height:32px;display:none;" onchange="executeHeaderSearch()">
              <option value="10">10 miles</option>
              <option value="25">25 miles</option>
              <option value="50" selected>50 miles</option>
              <option value="100">100 miles</option>
              <option value="200">200 miles</option>
              <option value="500">500 miles</option>
            </select>
            <select id="searchSortSelect" style="font-size:13px;border:1px solid #E6E8EC;border-radius:8px;padding:4px 8px;font-family:'Poppins',sans-serif;height:32px;">
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
        <div id="searchResults"><p class="empty">Use the search bar above to find refs</p></div>
      </section>
    </div>

    <!-- Negotiations Tab -->
    <div id="tab-negotiations" class="hidden">
      <section>
        <h2>Negotiations</h2>
        <div class="tabs">
          <div class="tab active" data-negtab="incoming" onclick="switchNegTab('incoming')">Incoming</div>
          <div class="tab" data-negtab="outgoing" onclick="switchNegTab('outgoing')">Sent</div>
        </div>
        <div id="negIncoming"></div>
        <div id="negOutgoing" class="hidden"></div>
      </section>
    </div>

    <!-- Settings Tab -->
    <div id="tab-settings" class="hidden">
      <section>
        <h2>Reffo.ai Connection</h2>
        <div id="settingsMsg"></div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
          <div id="syncStatusDot" style="width:12px;height:12px;border-radius:50%;background:#E6E8EC;flex-shrink:0;"></div>
          <span id="syncStatusText" style="font-size:14px;font-weight:500;color:#777E90;">Not connected</span>
          <button id="retryConnectionBtn" class="btn-primary btn-sm" style="display:none;font-size:12px;padding:4px 12px;" onclick="retryConnection()">Retry</button>
        </div>
        <div id="syncErrorDetail" style="font-size:12px;color:#F5A623;margin-bottom:16px;display:none;"></div>
        <div style="display:flex;gap:10px;align-items:flex-end;">
          <div style="flex:1;">
            <label for="settingsApiKey">API Key</label>
            <input id="settingsApiKey" type="password" placeholder="rfk_xxxxxxxxxxxx">
          </div>
          <button class="btn-primary" style="margin-bottom:14px;" onclick="saveApiKey()">Save</button>
          <button class="btn-danger btn-sm" style="margin-bottom:14px;" id="removeKeyBtn" onclick="removeApiKey()">Remove</button>
        </div>
        <p style="font-size:12px;color:#B1B5C3;margin-top:-6px;">Get your API key at <a href="https://reffo.ai/account" target="_blank" style="color:#EC526F;">reffo.ai/account</a></p>
      </section>

      <section>
        <h2>Sync Status</h2>
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div>
            <span style="font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;">Synced Refs</span>
            <div id="syncedCount" style="font-size:24px;font-weight:700;color:#141416;">0</div>
          </div>
        </div>
      </section>

      <section>
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

      <section>
        <h2>Beacon Info</h2>
        <div class="action-card" style="position:static;">
          <div class="action-row"><span class="action-label">Beacon ID</span><span class="action-value" id="settingsBeaconId" style="word-break:break-all;font-size:12px;"></span></div>
          <div class="action-row"><span class="action-label">Version</span><span class="action-value" id="settingsVersion"></span></div>
          <div class="action-row"><span class="action-label">Uptime</span><span class="action-value" id="settingsUptime"></span></div>
        </div>
      </section>
    </div>
  </div>

  <!-- List Ref Modal -->
  <div id="listRefModal" class="modal-overlay hidden list-ref-modal">
    <div class="modal">
      <h3>List a Ref</h3>
      <div id="listMsg"></div>
      <form id="listForm">
        <label for="refName">Name *</label>
        <input id="refName" name="name" required placeholder="e.g. Fender Stratocaster">

        <label for="refDesc">Description</label>
        <textarea id="refDesc" name="description" placeholder="Condition, details..."></textarea>

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

        <div id="createCategoryFields"></div>

        <div class="row">
          <div>
            <label for="refListingStatus">Listing Status</label>
            <select id="refListingStatus" name="listingStatus">
              <option value="private">Private</option>
              <option value="for_sale">For Sale</option>
              <option value="willing_to_sell">Willing to Sell</option>
            </select>
          </div>
          <div>
            <label for="refQuantity">Quantity</label>
            <input id="refQuantity" name="quantity" type="number" min="1" step="1" value="1">
          </div>
        </div>

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

        <label>Photos (up to 4)</label>
        <div class="upload-area" onclick="document.getElementById('refPhotos').click()">
          <div class="upload-icon">+</div>
          <p>Click to upload photos</p>
          <input type="file" id="refPhotos" accept="image/*" multiple>
        </div>
        <div id="photoPreview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>

        <label>Video (optional, 1 max)</label>
        <div class="upload-area" onclick="document.getElementById('refVideo').click()">
          <div class="upload-icon">+</div>
          <p>Click to upload a video</p>
          <input type="file" id="refVideo" accept="video/*">
        </div>
        <div id="videoPreview" style="margin-bottom:12px;"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" class="btn-secondary" onclick="closeListRefModal()">Cancel</button>
          <button type="submit" class="btn-primary">List Ref</button>
        </div>
      </form>
    </div>
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

  <!-- Toast container -->
  <div id="toast-container"></div>
  </div><!-- end app-content -->

  <!-- Footer -->
  <footer class="app-footer">
    <div class="app-footer-inner">
      <div class="app-footer-brand">
        <svg width="20" height="36" viewBox="0 0 40 71" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M36.33 2.41s.5-.98.1-1.75C36.03-.1 35.05.01 35.05.01H11.18s-.63-.03-1.03.34c-.4.37-.55 1.15-.55 1.15L.24 32.59s-.49 1.18-.07 2.08c.42.9 1.4.83 1.4.83h8.49L.56 66.88s-.73 1.64.44 2.45c1.16.82 2.37-.42 2.37-.42L37.74 24.6s.57-.65.19-1.67c-.38-1.01-1.23-.91-1.23-.91H26.88l9.45-19.61z" fill="#EA526F"/>
        </svg>
        <span>Reffo Beacon</span>
      </div>
      <div class="app-footer-links">
        <a href="mailto:help@reffo.ai">Support</a>
        <span class="sep">|</span>
        <a href="https://reffo.ai/about" target="_blank" rel="noopener noreferrer">About</a>
      </div>
      <div class="app-footer-copy">&copy; <script>document.write(new Date().getFullYear())</script> Reffo.ai</div>
    </div>
  </footer>

  <script>
    const TAXONOMY = ${taxonomyJSON};
    const CATEGORY_SCHEMAS_UI = ${categorySchemaJSON};
    const DEFAULT_SCHEMA_UI = ${JSON.stringify(defaultSchemaForUI)};

    // ===== Tab switching =====
    function switchTab(tab) {
      document.getElementById('tab-refs').classList.toggle('hidden', tab !== 'refs');
      document.getElementById('tab-detail').classList.toggle('hidden', tab !== 'detail');
      document.getElementById('tab-search').classList.toggle('hidden', tab !== 'search');
      document.getElementById('tab-negotiations').classList.toggle('hidden', tab !== 'negotiations');
      document.getElementById('tab-settings').classList.toggle('hidden', tab !== 'settings');
      // Show/hide search filter bar
      var sfb = document.getElementById('searchFilterBar');
      if (sfb) sfb.parentElement.style.display = (tab === 'refs' || tab === 'search') ? '' : 'none';
      if (tab === 'negotiations') loadNegotiations();
      if (tab === 'refs') loadMyRefs();
      if (tab === 'settings') loadSettings();
    }

    function switchNegTab(tab) {
      document.querySelectorAll('.tab[data-negtab]').forEach(t => t.classList.toggle('active', t.dataset.negtab === tab));
      document.getElementById('negIncoming').classList.toggle('hidden', tab !== 'incoming');
      document.getElementById('negOutgoing').classList.toggle('hidden', tab !== 'outgoing');
    }

    function switchRefSubTab(tab) {
      document.querySelectorAll('.ref-subtab').forEach(t => t.classList.toggle('active', t.dataset.reftab === tab));
      document.getElementById('refSubtabActive').classList.toggle('hidden', tab !== 'active');
      document.getElementById('refSubtabArchive').classList.toggle('hidden', tab !== 'archive');
      if (tab === 'archive') loadArchivedRefs();
      if (tab === 'active') loadMyRefs();
    }

    async function loadArchivedRefs() {
      const container = document.getElementById('archivedRefs');
      try {
        const res = await fetch('/refs?archived=true');
        const refs = await res.json();
        if (refs.length === 0) {
          container.innerHTML = '<p class="empty">No archived refs</p>';
          return;
        }

        // Load media for all archived refs
        const mediaMap = {};
        await Promise.all(refs.map(async ref => {
          const mRes = await fetch('/refs/' + ref.id + '/media');
          mediaMap[ref.id] = await mRes.json();
        }));

        container.innerHTML = '<div class="cards">' + refs.map(ref => {
          const photos = (mediaMap[ref.id] || []).filter(m => m.mediaType === 'photo');
          const firstPhoto = photos[0];
          const statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
          const statusLabel = ref.listingStatus === 'archived_sold' ? 'Sold' : 'Deleted';
          const archiveDate = new Date(ref.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          const imgHtml = firstPhoto
            ? '<div class="card-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
            : '<div class="card-img"><span class="placeholder"><svg width="40" height="40" viewBox="0 0 40 71" fill="none"><path d="M36.3314 2.40738C36.3314 2.40738 36.8264 1.42463 36.4263 0.662012C36.0263 -0.10061 35.0534 0.00517205 35.0534 0.00517205H11.1756C11.1756 0.00517205 10.5428 -0.0279334 10.1477 0.343949C9.75251 0.715831 9.59304 1.49138 9.59304 1.49138L0.238015 32.5907C0.238015 32.5907 -0.24866 33.7655 0.169465 34.6704C0.58759 35.5752 1.5753 35.4965 1.5753 35.4965H10.0645L0.5629 66.8837C0.5629 66.8837 -0.162543 68.519 1.00281 69.3381C2.16816 70.1572 3.37309 68.9223 3.37309 68.9223L37.7402 24.6034C37.7402 24.6034 38.3085 23.9493 37.9286 22.9371C37.5486 21.9249 36.7018 22.0235 36.7018 22.0235H26.875L36.3314 2.40738Z" fill="#E6E8EC"/></svg></span></div>';

          return '<div class="card" style="cursor:default;">' +
            imgHtml +
            '<div class="card-body">' +
              '<h3>' + escapeHtml(ref.name) + '</h3>' +
              '<div class="card-meta"><span class="badge ' + statusClass + '">' + statusLabel + '</span></div>' +
              '<div class="archive-reason">Archived ' + archiveDate + '</div>' +
              '<div class="archive-actions">' +
                '<button class="btn-secondary btn-sm" onclick="event.stopPropagation(); restoreRef(\\'' + ref.id + '\\')">Restore</button>' +
                '<button class="btn-danger btn-sm" onclick="event.stopPropagation(); permanentDeleteRef(\\'' + ref.id + '\\')">Delete Forever</button>' +
              '</div>' +
            '</div></div>';
        }).join('') + '</div>';
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
      if (category) {
        for (var key in CATEGORY_SCHEMAS_UI) {
          if (key.indexOf(category + '|') === 0) return CATEGORY_SCHEMAS_UI[key];
        }
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

    const statusLabels = { private: 'Private', for_sale: 'For Sale', willing_to_sell: 'Willing to Sell', archived_sold: 'Sold (Archived)', archived_deleted: 'Deleted (Archived)' };
    const statusBadgeClass = { private: 'badge-private', for_sale: 'badge-for-sale', willing_to_sell: 'badge-willing', archived_sold: 'badge-archived-sold', archived_deleted: 'badge-archived-deleted' };
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
      document.getElementById('refVideo').value = '';
      renderVideoPreview();
    };

    document.getElementById('refPhotos').addEventListener('change', function() {
      var files = this.files;
      for (var i = 0; i < files.length; i++) {
        if (selectedPhotos.length < 4) selectedPhotos.push(files[i]);
      }
      this.value = '';
      renderPhotoPreview();
    });

    document.getElementById('refVideo').addEventListener('change', function() {
      if (this.files[0]) {
        selectedVideo = this.files[0];
      }
      this.value = '';
      renderVideoPreview();
    });

    // ===== List Form =====
    document.getElementById('listForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('.btn-primary');
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

        const refRes = await fetch('/refs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, category, subcategory, listingStatus, quantity, sku,
            locationCity: locCity, locationState: locState, locationZip: locZip,
            locationLat: locLat, locationLng: locLng,
            sellingScope, sellingRadiusMiles, condition, attributes })
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
        if (uploadErrors.length > 0) console.warn('Media upload issues:', uploadErrors.join('; '));

        // Create offer if price > 0 and not private
        if (listingStatus !== 'private' && price > 0) {
          await fetch('/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refId: ref.id, price, priceCurrency: currency })
          });
        }

        showMsg('listMsg', 'Ref added successfully!', true);
        e.target.reset();
        document.getElementById('refQuantity').value = '1';
        document.getElementById('refSubcat').innerHTML = '<option value="">Select...</option>';
        document.getElementById('createCategoryFields').innerHTML = '';
        selectedPhotos = [];
        selectedVideo = null;
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('videoPreview').innerHTML = '';
        closeListRefModal();
        loadMyRefs();
      } catch (err) {
        showMsg('listMsg', err.message, false);
      } finally {
        btn.disabled = false;
      }
    });

    // ===== My Refs =====
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

        if (refLayout === 'row') {
          container.innerHTML = '<div class="rows">' + refs.map(ref => {
            const refOffers = offerMap[ref.id] || [];
            const activeOffer = refOffers.find(o => o.status === 'active');
            const priceStr = activeOffer ? activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2) : '';
            const photos = (mediaMap[ref.id] || []).filter(m => m.mediaType === 'photo');
            const firstPhoto = photos[0];
            const statusClass = statusBadgeClass[ref.listingStatus] || 'badge-private';
            const statusLabel = statusLabels[ref.listingStatus] || 'Private';
            const attrSummary = buildAttributeSummary(ref.category, ref.subcategory, ref.attributes, ref.condition);

            const imgHtml = firstPhoto
              ? '<div class="row-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
              : '<div class="row-img"><span class="placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></span></div>';

            return '<div class="ref-row" onclick="openDetail(\\'' + ref.id + '\\')">' +
              imgHtml +
              '<span class="row-name">' + escapeHtml(ref.name) + '</span>' +
              '<div class="row-meta">' +
                '<span class="badge ' + statusClass + '" style="font-size:10px;padding:0 8px;line-height:22px;">' + statusLabel + '</span>' +
                (ref.category ? '<span class="badge badge-cat" style="font-size:10px;padding:0 8px;line-height:22px;">' + escapeHtml(ref.category) + '</span>' : '') +
                (ref.condition ? '<span class="badge" style="font-size:10px;padding:0 8px;line-height:22px;background:#B1B5C3;color:#fff;">' + escapeHtml(ref.condition.replace(/_/g, ' ')) + '</span>' : '') +
                (priceStr ? '<span class="row-price">' + escapeHtml(priceStr) + '</span>' : '') +
                (attrSummary ? '<span class="row-qty">' + escapeHtml(attrSummary) + '</span>' : '') +
                (ref.quantity > 1 ? '<span class="row-qty">Qty: ' + ref.quantity + '</span>' : '') +
                (ref.reffoSynced ? '<span class="badge badge-synced" style="font-size:10px;padding:0 8px;line-height:22px;">Synced</span>' : '') +
              '</div>' +
            '</div>';
          }).join('') + '</div>';
        } else {
          container.innerHTML = '<div class="cards">' + refs.map(ref => {
            const refOffers = offerMap[ref.id] || [];
            const activeOffer = refOffers.find(o => o.status === 'active');
            const priceStr = activeOffer ? activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2) : '';
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
                (ref.reffoSynced ? '<span class="badge badge-synced">Synced</span>' : '') + '</div>' +
                (priceStr ? '<div class="card-price">' + escapeHtml(priceStr) + '</div>' : '') +
                (cardAttrSummary ? '<div class="card-desc" style="font-size:12px;color:#777E90;margin-top:4px;">' + escapeHtml(cardAttrSummary) + '</div>' : '') +
                (ref.quantity > 1 ? '<div class="card-qty">Qty: ' + ref.quantity + '</div>' : '') +
                (ref.description ? '<div class="card-desc">' + escapeHtml(ref.description) + '</div>' : '') +
              '</div></div>';
          }).join('') + '</div>';
        }
      } catch {
        container.innerHTML = '<p class="empty">Failed to load refs</p>';
      }
    }

    // ===== Ref Detail / Edit View =====
    async function openDetail(refId) {
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
            : '<img src="/' + escapeHtml(mainMedia.filePath) + '" alt="">')
          : '<span class="placeholder">No media</span>';

        let sideImgsHtml = '';
        for (let i = 0; i < 3; i++) {
          const sm = sideMedia[i];
          if (sm) {
            sideImgsHtml += '<div class="detail-side-img"><img src="/' + escapeHtml(sm.filePath) + '" alt="" onclick="setMainImage(this.src)"></div>';
          } else {
            sideImgsHtml += '<div class="detail-side-img"><span class="placeholder">+</span></div>';
          }
        }

        const priceDisplay = activeOffer ? escapeHtml(activeOffer.priceCurrency) + ' ' + activeOffer.price.toFixed(2) : 'No price';
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

        // Build detail HTML
        let html = '<span class="detail-back" onclick="switchTab(\\'refs\\')">';
        html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
        html += ' Back to refs</span>';

        html += '<div class="detail-gallery">';
        html += '<div class="detail-main-img" id="detailMainImg">' + mainImgHtml + '</div>';
        html += '<div class="detail-side-imgs">' + sideImgsHtml + '</div>';
        html += '</div>';

        html += '<div class="detail-columns">';

        // ===== Left: DealBody =====
        html += '<div class="detail-left deal-body">';
        html += '<h1 class="deal-title">' + escapeHtml(ref.name) + '</h1>';
        html += '<div id="detailMsg"></div>';

        // Posted By
        html += '<div class="deal-posted-by">';
        html += '<div class="avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="3"/></svg></div>';
        html += '<div><div class="poster-name">Your Beacon</div><div class="poster-label">' + escapeHtml(ref.beaconId ? ref.beaconId.slice(0, 16) + '...' : '') + '</div></div>';
        html += '</div>';

        // Description
        if (ref.description) {
          html += '<div class="deal-content">' + escapeHtml(ref.description) + '</div>';
        }

        // Information grid
        html += '<div class="deal-heading">Information</div>';
        html += '<div class="info-grid">';
        html += '<div class="info-item" onclick="document.getElementById(\\'editFormSection\\').style.display=\\'block\\';document.getElementById(\\'editFormSection\\').scrollIntoView({behavior:\\'smooth\\'})">';
        html += '<div class="info-icon teal"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8BC5E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></div>';
        html += '<span class="info-type">View Details</span></div>';
        html += '<div class="info-item" onclick="document.getElementById(\\'editFormSection\\').style.display=\\'block\\';document.getElementById(\\'dLocCity\\').scrollIntoView({behavior:\\'smooth\\'})">';
        html += '<div class="info-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92A5EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>';
        html += '<span class="info-type">Location</span></div>';
        html += '<div class="info-item">';
        html += '<div class="info-icon orange"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FA8F54" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>';
        html += '<span class="info-type">' + escapeHtml(ref.category || 'Category') + (ref.subcategory ? ' / ' + escapeHtml(ref.subcategory) : '') + '</span></div>';
        html += '<div class="info-item">';
        html += '<div class="info-icon green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#58C27D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>';
        html += '<span class="info-type">' + (conditionDisplay || 'Condition') + '</span></div>';
        html += '</div>';

        // Edit form (collapsible)
        html += '<div id="editFormSection" style="display:none;">';
        html += '<div class="deal-heading">Edit Ref</div>';
        html += '<form id="detailForm" data-ref-id="' + ref.id + '">';
        html += '<label>Name</label><input id="dName" value="' + escapeHtml(ref.name) + '">';
        html += '<label>Description</label><textarea id="dDesc">' + escapeHtml(ref.description) + '</textarea>';
        html += '<div class="row"><div><label>Category</label><select id="dCat"><option value="">Select...</option></select></div>';
        html += '<div><label>Subcategory</label><select id="dSubcat"><option value="">Select...</option></select></div></div>';
        html += '<div id="detailCategoryFields"></div>';
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
        html += '</form>';
        html += '</div>';

        // Media management
        html += '<div class="deal-heading">Media</div>';
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
        html += '<input type="file" id="detailFileInput" accept="image/*,video/*" multiple onchange="uploadDetailMedia(\\'' + ref.id + '\\')">';
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

        // Header: price + user avatar
        html += '<div class="payment-card-header">';
        html += '<div class="payment-card-amount">' + priceDisplay;
        html += '</div>';
        html += '<div class="payment-card-thumb">';
        html += '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>';
        html += '</div></div>';

        // Category + status below price
        html += '<div style="padding:0 30px 10px;">';
        html += '<div style="margin-bottom:6px;">';
        html += '<select id="dStatus" style="width:auto;height:32px;padding:0 10px;font-size:13px;border-radius:10px;border:1px solid #E6E8EC;margin:0;font-family:Poppins,sans-serif;font-weight:600;background:#fff;">';
        ['private','for_sale','willing_to_sell'].forEach(s => {
          html += '<option value="' + s + '"' + (ref.listingStatus === s ? ' selected' : '') + '>' + statusLabels[s] + '</option>';
        });
        html += '</select></div>';
        const catParts = [ref.category, ref.subcategory].filter(Boolean);
        if (catParts.length > 0) {
          html += '<div style="font-size:13px;color:#777E90;font-weight:500;">' + escapeHtml(catParts.join(' / ')) + '</div>';
        }
        html += '</div>';

        // Buttons row
        html += '<div class="payment-card-buttons">';
        html += '<button class="button-stroke" onclick="navigator.clipboard.writeText(location.origin + \\'/refs/' + ref.id + '\\').then(function(){ showToast(\\'Link copied!\\',\\'\\'); })"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share</button>';
        html += '<button class="button-gradient" onclick="saveDetail(\\'' + ref.id + '\\')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes</button>';
        html += '</div>';

        // Invoice rows
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

        // Hidden invoice rows (future use)
        html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Commission</span><span class="invoice-value">$0.00</span></div>';
        html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Referral Fee</span><span class="invoice-value">$0.00</span></div>';
        html += '<div class="invoice-row" style="display:none;"><span class="invoice-label">Tax</span><span class="invoice-value">$0.00</span></div>';

        // Sync toggle + footer
        html += '<div class="invoice-row"><span class="invoice-label">Share on Reffo</span><span class="invoice-value">';
        html += '<label class="sync-toggle"><input type="checkbox" ' + (ref.reffoSynced ? 'checked' : '') + ' onchange="toggleSync(\\'' + ref.id + '\\', this)"><span class="toggle-track"></span></label>';
        html += '</span></div>';

        if (listedDate) {
          let footerText = 'Listed ' + listedDate;
          if (ref.listingStatus === 'for_sale' || ref.listingStatus === 'willing_to_sell') footerText += ' · Open to negotiation';
          html += '<div class="payment-card-footer">' + footerText + '</div>';
        }

        // Archive button
        html += '<div style="padding:0 30px 20px;">';
        html += '<button class="btn-danger" style="width:100%;" onclick="deleteRef(\\'' + ref.id + '\\')"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10C18 11.5823 17.5308 13.129 16.6518 14.4446C15.7727 15.7602 14.5233 16.7855 13.0615 17.391C11.5997 17.9965 9.99113 18.155 8.43928 17.8463C6.88743 17.5376 5.46197 16.7757 4.34315 15.6569C3.22433 14.538 2.4624 13.1126 2.15372 11.5607C1.84504 10.0089 2.00347 8.40034 2.60897 6.93853C3.21447 5.47672 4.23985 4.22729 5.55544 3.34824C6.87104 2.46919 8.41775 2 10 2C12.1217 2 14.1566 2.84285 15.6569 4.34315C17.1572 5.84344 18 7.87827 18 10ZM20 10C20 11.9778 19.4135 13.9112 18.3147 15.5557C17.2159 17.2002 15.6541 18.4819 13.8268 19.2388C11.9996 19.9957 9.98891 20.1937 8.0491 19.8079C6.10929 19.422 4.32746 18.4696 2.92894 17.0711C1.53041 15.6725 0.578004 13.8907 0.192152 11.9509C-0.193701 10.0111 0.00433284 8.00043 0.761209 6.17317C1.51809 4.3459 2.79981 2.78412 4.4443 1.6853C6.08879 0.58649 8.02219 0 10 0C12.6522 0 15.1957 1.05357 17.0711 2.92893C18.9464 4.8043 20 7.34784 20 10ZM5 9C4.73479 9 4.48043 9.10536 4.2929 9.29289C4.10536 9.48043 4 9.73478 4 10C4 10.2652 4.10536 10.5196 4.2929 10.7071C4.48043 10.8946 4.73479 11 5 11H15C15.2652 11 15.5196 10.8946 15.7071 10.7071C15.8946 10.5196 16 10.2652 16 10C16 9.73478 15.8946 9.48043 15.7071 9.29289C15.5196 9.10536 15.2652 9 15 9H5Z" fill="currentColor"/></svg> Archive Ref</button>';
        html += '</div>';

        html += '</div>'; // end payment-card
        html += '</div>'; // end detail-right

        html += '</div>'; // end detail-columns

        container.innerHTML = html;

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
      } catch (err) {
        container.innerHTML = '<p class="empty">Failed to load ref details</p>';
      }
    }
    window.openDetail = openDetail;

    window.setMainImage = function(src) {
      document.getElementById('detailMainImg').innerHTML = '<img src="' + src + '" alt="">';
    };

    window.saveDetail = async function(refId) {
      try {
        const dLocLat = document.getElementById('dLocLat');
        const dLocLng = document.getElementById('dLocLng');
        const detailCatAttrs = collectCategoryAttrs('detailCategoryFields', document.getElementById('dCat').value, document.getElementById('dSubcat').value);
        const detailCondition = detailCatAttrs._condition || null;
        delete detailCatAttrs._condition;
        const detailAttributes = Object.keys(detailCatAttrs).length > 0 ? detailCatAttrs : null;
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
            listingStatus: document.getElementById('dStatus').value,
            locationCity: document.getElementById('dLocCity').value.trim() || null,
            locationState: document.getElementById('dLocState').value.trim() || null,
            locationZip: document.getElementById('dLocZip').value.trim() || null,
            locationLat: dLocLat && dLocLat.value ? parseFloat(dLocLat.value) : null,
            locationLng: dLocLng && dLocLng.value ? parseFloat(dLocLng.value) : null,
            sellingScope: document.getElementById('dSellingScope').value,
            sellingRadiusMiles: document.getElementById('dSellingRadius').value ? parseInt(document.getElementById('dSellingRadius').value) : null,
            condition: detailCondition,
            attributes: detailAttributes,
          })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        showMsg('detailMsg', 'Saved!', true);
        openDetail(refId);
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
        switchTab('refs');
        loadMyRefs();
      } catch {
        alert('Failed to archive ref');
      }
    };

    // ===== Search Network =====
    function renderSearchResults(data) {
      const container = document.getElementById('searchResults');
      if (data.results.length === 0) {
        container.innerHTML = '<p class="empty">No peers responded. Are other beacons running?</p>';
        return;
      }

      let cards = '';
      lastSearchResults = [];
      data.results.forEach(peer => {
        const peerRefs = peer.refs || [];
        const peerOffers = peer.offers || [];
        const peerMedia = peer.media || {};
        const peerHttpPort = peer.httpPort || 0;
        const offerMap = {};
        peerOffers.forEach(o => { if (!offerMap[o.refId]) offerMap[o.refId] = []; offerMap[o.refId].push(o); });

        peerRefs.forEach(item => {
          const refOffers = offerMap[item.id] || [];
          const activeOffer = refOffers.find(o => o.status === 'active');
          const priceStr = activeOffer ? activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2) : '';
          const badges = [item.category, item.subcategory].filter(Boolean).map(b =>
            '<span class="badge badge-cat">' + escapeHtml(b) + '</span>'
          ).join('');
          const statusClass = statusBadgeClass[item.listingStatus] || 'badge-for-sale';
          const statusLabel = statusLabels[item.listingStatus] || '';
          const refMedia = peerMedia[item.id] || [];
          const firstPhoto = refMedia.find(m => m.mediaType === 'photo');

          let actionBtn = '';
          if (item.listingStatus === 'for_sale' && activeOffer) {
            actionBtn = '<button class="btn-primary btn-sm" onclick="event.stopPropagation(); openBuyModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\', ' + activeOffer.price + ', \\'' + escapeHtml(activeOffer.priceCurrency) + '\\')"><svg width="12" height="12" viewBox="0 0 13 14" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.3231 4.33301H2.66709C2.48518 4.33295 2.30518 4.37002 2.1381 4.44199C1.97098 4.51473 1.8203 4.62052 1.69511 4.75299C1.57019 4.88603 1.47385 5.04327 1.41209 5.215C1.35099 5.38639 1.32515 5.56837 1.3361 5.75L1.66911 11.083C1.69023 11.4216 1.83968 11.7394 2.08699 11.9717C2.33429 12.2039 2.66084 12.3332 3.0001 12.333H9.99009C10.3294 12.3332 10.6559 12.2039 10.9032 11.9717C11.1505 11.7394 11.3 11.4216 11.3211 11.083L11.6541 5.75C11.6661 5.56833 11.6402 5.38615 11.5781 5.215C11.5163 5.04327 11.42 4.88603 11.2951 4.75299C11.1706 4.62002 11.02 4.51412 10.8528 4.44186C10.6856 4.36961 10.5053 4.33255 10.3231 4.33301Z" fill="white"/><path d="M3.16212 3.66602C3.15445 3.2234 3.23504 2.78368 3.39912 2.37253C3.5632 1.96137 3.80751 1.58703 4.11781 1.2713C4.42811 0.955576 4.79818 0.704808 5.20643 0.53363C5.61468 0.362453 6.05296 0.274292 6.49565 0.274292C6.93833 0.274292 7.37658 0.362453 7.78483 0.53363C8.19308 0.704808 8.56315 0.955576 8.87346 1.2713C9.18376 1.58703 9.42809 1.96137 9.59217 2.37253C9.75626 2.78368 9.83681 3.2234 9.82914 3.66602V5.00003C9.82247 5.17233 9.74931 5.33535 9.62504 5.4549C9.50078 5.57444 9.33507 5.6412 9.16264 5.6412C8.99021 5.6412 8.82447 5.57444 8.70021 5.4549C8.57594 5.33535 8.50281 5.17233 8.49614 5.00003V3.66602C8.49614 3.13558 8.28542 2.6269 7.91035 2.25183C7.53528 1.87676 7.02657 1.66602 6.49614 1.66602C5.9657 1.66602 5.45699 1.87676 5.08192 2.25183C4.70685 2.6269 4.49614 3.13558 4.49614 3.66602V5.00003C4.49614 5.17693 4.42585 5.34659 4.30076 5.47168C4.17568 5.59677 4.00604 5.66702 3.82914 5.66702C3.65224 5.66702 3.48258 5.59677 3.35749 5.47168C3.23241 5.34659 3.16212 5.17693 3.16212 5.00003V3.66602Z" fill="white"/></svg> Buy at ' + escapeHtml(activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2)) + '</button>';
          } else if (item.listingStatus === 'willing_to_sell') {
            actionBtn = '<button class="btn-secondary btn-sm" onclick="event.stopPropagation(); openOfferModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\')">Make Offer</button>';
          }

          const idx = lastSearchResults.length;
          lastSearchResults.push({ item: item, peer: peer, offer: activeOffer || null, media: refMedia, httpPort: peerHttpPort });

          const imgHtml = (firstPhoto && peerHttpPort)
            ? '<div class="card-img"><img src="http://' + location.hostname + ':' + peerHttpPort + '/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
            : '<div class="card-img"><span class="placeholder"><svg width="40" height="40" viewBox="0 0 40 71" fill="none"><path d="M36.3314 2.40738C36.3314 2.40738 36.8264 1.42463 36.4263 0.662012C36.0263 -0.10061 35.0534 0.00517205 35.0534 0.00517205H11.1756C11.1756 0.00517205 10.5428 -0.0279334 10.1477 0.343949C9.75251 0.715831 9.59304 1.49138 9.59304 1.49138L0.238015 32.5907C0.238015 32.5907 -0.24866 33.7655 0.169465 34.6704C0.58759 35.5752 1.5753 35.4965 1.5753 35.4965H10.0645L0.5629 66.8837C0.5629 66.8837 -0.162543 68.519 1.00281 69.3381C2.16816 70.1572 3.37309 68.9223 3.37309 68.9223L37.7402 24.6034C37.7402 24.6034 38.3085 23.9493 37.9286 22.9371C37.5486 21.9249 36.7018 22.0235 36.7018 22.0235H26.875L36.3314 2.40738Z" fill="#E6E8EC"/></svg></span></div>';

          cards += '<div class="card result-card" onclick="openRemoteDetail(' + idx + ')">' +
            imgHtml +
            '<div class="card-body">' +
              '<h3>' + escapeHtml(item.name) + '</h3>' +
              '<div class="card-meta"><span class="badge ' + statusClass + '">' + statusLabel + '</span>' + badges + '</div>' +
              (priceStr ? '<div class="card-price">' + escapeHtml(priceStr) + '</div>' : '') +
              (item.description ? '<div class="card-desc">' + escapeHtml(item.description) + '</div>' : '') +
              (function() {
                const lp = [item.locationCity, item.locationState, item.locationZip].filter(Boolean);
                return lp.length > 0 ? '<div style="font-size:12px;color:#777E90;margin-top:4px;font-weight:500;">Near ' + escapeHtml(lp.join(', ')) + '</div>' : '';
              })() +
              '<div class="beacon-id">Beacon: ' + escapeHtml(peer.beaconId.slice(0, 16)) + '...</div>' +
              (actionBtn ? '<div style="margin-top:10px;">' + actionBtn + '</div>' : '') +
            '</div></div>';
        });
      });

      container.innerHTML = '<p style="font-size:14px;color:#777E90;margin-bottom:12px;font-weight:500;">' +
        data.peers + ' peer(s) responded</p><div class="cards">' + cards + '</div>';
    }

    async function executeHeaderSearch() {
      switchTab('search');
      const container = document.getElementById('searchResults');
      container.innerHTML = '<p class="empty">Searching peers...</p>';

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

    // ===== Remote Ref Detail (read-only) =====
    window.openRemoteDetail = function(idx) {
      const entry = lastSearchResults[idx];
      if (!entry) return;
      const item = entry.item;
      const peer = entry.peer;
      const offer = entry.offer;
      const mediaList = entry.media || [];
      const httpPort = entry.httpPort || 0;
      const baseUrl = httpPort ? 'http://' + location.hostname + ':' + httpPort : '';

      const container = document.getElementById('detailContent');
      switchTab('detail');

      const photos = mediaList.filter(m => m.mediaType === 'photo');
      const mainPhoto = photos[0];
      const sidePhotos = photos.slice(1);
      const thumbSrc = (mainPhoto && baseUrl) ? baseUrl + '/' + escapeHtml(mainPhoto.filePath) : '';

      let mainImgHtml = (mainPhoto && baseUrl)
        ? '<img src="' + baseUrl + '/' + escapeHtml(mainPhoto.filePath) + '" alt="">'
        : '<span class="placeholder">No media</span>';

      let sideImgsHtml = '';
      for (let i = 0; i < 3; i++) {
        const sm = sidePhotos[i];
        if (sm && baseUrl) {
          const src = baseUrl + '/' + escapeHtml(sm.filePath);
          sideImgsHtml += '<div class="detail-side-img"><img src="' + src + '" alt="" onclick="setMainImage(this.src)"></div>';
        } else {
          sideImgsHtml += '<div class="detail-side-img"><span class="placeholder">+</span></div>';
        }
      }

      const statusLabel = statusLabels[item.listingStatus] || '';
      const priceDisplay = offer ? escapeHtml(offer.priceCurrency) + ' ' + offer.price.toFixed(2) : 'Make an offer';
      const remoteLoc = [item.locationCity, item.locationState, item.locationZip].filter(Boolean);
      const conditionDisplay = item.condition ? item.condition.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) : '';

      // Build action buttons for remote detail
      let purchaseBtn = '';
      let negotiateBtn = '';
      if (item.listingStatus === 'for_sale' && offer) {
        purchaseBtn = '<button class="button-gradient" onclick="openBuyModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\', ' + offer.price + ', \\'' + escapeHtml(offer.priceCurrency) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Purchase</button>';
        negotiateBtn = '<button class="button-stroke" onclick="openOfferModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Negotiate</button>';
      } else if (item.listingStatus === 'willing_to_sell') {
        purchaseBtn = '<button class="button-gradient" onclick="openOfferModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Make an Offer</button>';
      }

      let html = '';
      html += '<span class="detail-back" onclick="switchTab(\\'search\\')">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
      html += ' Back to Search</span>';

      html += '<div class="detail-gallery">';
      html += '<div class="detail-main-img" id="detailMainImg">' + mainImgHtml + '</div>';
      html += '<div class="detail-side-imgs">' + sideImgsHtml + '</div>';
      html += '</div>';

      html += '<div class="detail-columns">';

      // ===== Left: DealBody =====
      html += '<div class="detail-left deal-body">';
      html += '<h1 class="deal-title">' + escapeHtml(item.name) + '</h1>';

      // Posted By
      html += '<div class="deal-posted-by">';
      html += '<div class="avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
      html += '<div><div class="poster-name">Seller Beacon</div><div class="poster-label">' + escapeHtml(peer.beaconId.slice(0, 16)) + '...</div></div>';
      html += '</div>';

      // Description
      if (item.description) {
        html += '<div class="deal-content">' + escapeHtml(item.description) + '</div>';
      }

      // Information grid
      html += '<div class="deal-heading">Information</div>';
      html += '<div class="info-grid">';
      html += '<div class="info-item">';
      html += '<div class="info-icon blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92A5EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>';
      html += '<span class="info-type">' + (remoteLoc.length > 0 ? 'Near ' + escapeHtml(remoteLoc.join(', ')) : 'Location N/A') + '</span></div>';
      html += '<div class="info-item">';
      html += '<div class="info-icon teal"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8BC5E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></div>';
      html += '<span class="info-type">' + escapeHtml(item.category || 'General') + (item.subcategory ? ' / ' + escapeHtml(item.subcategory) : '') + '</span></div>';
      html += '<div class="info-item">';
      html += '<div class="info-icon orange"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FA8F54" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
      html += '<span class="info-type">Beacon: ' + escapeHtml(peer.beaconId.slice(0, 12)) + '...</span></div>';
      html += '<div class="info-item">';
      html += '<div class="info-icon green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#58C27D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>';
      html += '<span class="info-type">' + (conditionDisplay || 'Condition N/A') + '</span></div>';
      html += '</div>';

      html += '</div>'; // end detail-left deal-body

      // ===== Right: PaymentCard =====
      html += '<div class="detail-right">';
      html += '<div class="payment-card">';

      // Header: price + seller avatar
      html += '<div class="payment-card-header">';
      html += '<div class="payment-card-amount">' + priceDisplay;
      html += '</div>';
      html += '<div class="payment-card-thumb">';
      html += '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#777E90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      html += '</div></div>';

      // Status badge + category below price
      html += '<div style="padding:0 30px 10px;">';
      html += '<div style="margin-bottom:6px;"><span class="badge badge-' + (item.listingStatus === 'for_sale' ? 'for-sale' : 'willing-to-sell') + '">' + statusLabel + '</span></div>';
      const remoteCatParts = [item.category, item.subcategory].filter(Boolean);
      if (remoteCatParts.length > 0) {
        html += '<div style="font-size:13px;color:#777E90;font-weight:500;">' + escapeHtml(remoteCatParts.join(' / ')) + '</div>';
      }
      html += '</div>';

      // Buttons row
      html += '<div class="payment-card-buttons">';
      html += '<button class="button-stroke" onclick="navigator.clipboard.writeText(location.href).then(function(){ showToast(\\'Link copied!\\',\\'\\'); })"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share</button>';
      if (negotiateBtn) html += negotiateBtn;
      if (purchaseBtn) html += purchaseBtn;
      html += '</div>';

      // Invoice rows
      if (offer) {
        html += '<div class="invoice-row"><span class="invoice-label">Item Price</span><span class="invoice-value">' + escapeHtml(offer.priceCurrency + ' ' + offer.price.toFixed(2)) + '</span></div>';
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
        html += '<div class="invoice-row invoice-row-bg"><span class="invoice-label" style="font-weight:600;color:#141416;">Total</span><span class="invoice-value" style="font-size:16px;">' + escapeHtml(offer.priceCurrency + ' ' + offer.price.toFixed(2)) + '</span></div>';
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
        switchTab('negotiations');
        switchNegTab('outgoing');
        loadNegotiations();
      } catch (err) {
        document.getElementById('modalMsg').innerHTML = '<div class="msg err">' + escapeHtml(err.message) + '</div>';
      } finally {
        btn.disabled = false;
      }
    };

    // ===== Negotiations =====
    let cachedIncoming = [];
    let cachedOutgoing = [];

    function renderNegotiationCards(negs, isSeller) {
      if (negs.length === 0) return '<p class="empty">No negotiations yet</p>';
      return negs.map(n => {
        let actions = '';
        if (isSeller && n.role === 'seller' && n.status === 'pending') {
          // Single "Respond" button opens the respond modal
          actions = '<div class="neg-actions">' +
            '<button class="btn-primary btn-sm" onclick="openRespondModal(\\'' + n.id + '\\', \\'' + escapeHtml(n.refName || n.refId.slice(0,8)) + '\\', ' + n.price + ', \\'' + escapeHtml(n.priceCurrency) + '\\', \\'' + escapeHtml(n.message || '') + '\\')">Respond</button>' +
            '</div>';
        } else if (isSeller && n.role === 'seller' && n.status === 'accepted') {
          actions = '<div class="neg-actions">' +
            '<button class="btn-primary btn-sm" onclick="markAsSold(\\'' + n.id + '\\')">Mark as Sold</button>' +
            '</div>';
        } else if (!isSeller && n.role === 'buyer' && n.status === 'pending') {
          actions = '<div class="neg-actions"><button class="btn-secondary btn-sm" onclick="withdrawNeg(\\'' + n.id + '\\')">Withdraw</button></div>';
        }

        const displayStatus = negStatusLabels[n.status] || n.status;

        let details = '<strong>' + escapeHtml(n.priceCurrency) + ' ' + n.price.toFixed(2) + '</strong>';
        if (n.message) details += ' &mdash; ' + escapeHtml(n.message);
        if (n.counterPrice) details += '<br>Counter: <strong>' + escapeHtml(n.priceCurrency) + ' ' + n.counterPrice.toFixed(2) + '</strong>';
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

    function renderGroupedNegotiations(negs, isSeller) {
      if (negs.length === 0) return '<p class="empty">No negotiations yet</p>';
      const groups = {};
      negs.forEach(n => {
        if (!groups[n.refId]) groups[n.refId] = { refName: n.refName || n.refId.slice(0, 8), negs: [] };
        groups[n.refId].negs.push(n);
      });
      const tab = isSeller ? 'incoming' : 'outgoing';
      return Object.keys(groups).map(refId => {
        const g = groups[refId];
        const total = g.negs.length;
        const pendingCount = g.negs.filter(n => n.status === 'pending' || n.status === 'countered').length;
        const latestStatus = g.negs[0].status;
        const latestDate = new Date(g.negs[0].updatedAt || g.negs[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const countClass = pendingCount > 0 ? 'neg-group-count has-pending' : 'neg-group-count';
        const countLabel = pendingCount > 0 ? total + ' (' + pendingCount + ' active)' : String(total);
        const displayStatus = negStatusLabels[latestStatus] || latestStatus;
        return '<div class="neg-group-row" onclick="showRefNegotiations(\\'' + escapeHtml(refId) + '\\', ' + (isSeller ? 'true' : 'false') + ', \\'' + tab + '\\')">' +
          '<div class="neg-group-left">' +
            '<span class="neg-group-name">' + escapeHtml(g.refName) + '</span>' +
            '<span class="' + countClass + '">' + countLabel + '</span>' +
          '</div>' +
          '<div class="neg-group-right">' +
            '<span class="neg-status ' + latestStatus + '">' + displayStatus + '</span>' +
            '<span class="neg-group-date">' + latestDate + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    window.showRefNegotiations = function(refId, isSeller, tab) {
      const source = isSeller ? cachedIncoming : cachedOutgoing;
      const filtered = source.filter(n => n.refId === refId);
      const containerId = tab === 'incoming' ? 'negIncoming' : 'negOutgoing';
      const container = document.getElementById(containerId);
      const refName = filtered.length > 0 ? escapeHtml(filtered[0].refName || refId.slice(0, 8)) : escapeHtml(refId.slice(0, 8));
      let html = '<span class="neg-group-back" onclick="renderNegGroupedView(\\'' + tab + '\\')">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
      html += ' Back to all refs</span>';
      html += '<h3 style="font-size:18px;font-weight:700;color:#141416;margin-bottom:16px;">' + refName + '</h3>';
      html += renderNegotiationCards(filtered, isSeller);
      container.innerHTML = html;
    };

    window.renderNegGroupedView = function(tab) {
      if (tab === 'incoming') {
        document.getElementById('negIncoming').innerHTML = renderGroupedNegotiations(cachedIncoming, true);
      } else {
        document.getElementById('negOutgoing').innerHTML = renderGroupedNegotiations(cachedOutgoing, false);
      }
    };

    async function loadNegotiations() {
      try {
        const [incRes, outRes] = await Promise.all([
          fetch('/negotiations?role=seller'),
          fetch('/negotiations?role=buyer')
        ]);
        cachedIncoming = await incRes.json();
        cachedOutgoing = await outRes.json();

        document.getElementById('negIncoming').innerHTML = renderGroupedNegotiations(cachedIncoming, true);
        document.getElementById('negOutgoing').innerHTML = renderGroupedNegotiations(cachedOutgoing, false);

        const pendingCount = cachedIncoming.filter(n => n.status === 'pending').length;
        const notifDot = document.getElementById('headerNotifDot');
        if (pendingCount > 0) {
          notifDot.style.display = 'block';
        } else {
          notifDot.style.display = 'none';
        }
      } catch {
        document.getElementById('negIncoming').innerHTML = '<p class="empty">Failed to load</p>';
        document.getElementById('negOutgoing').innerHTML = '<p class="empty">Failed to load</p>';
      }
    }

    // ===== Respond Modal (seller) =====
    window.openRespondModal = function(negId, refName, price, currency, message) {
      document.getElementById('respondNegId').value = negId;
      document.getElementById('respondModalTitle').textContent = 'Respond: ' + refName;
      document.getElementById('respondOfferPrice').textContent = currency + ' ' + parseFloat(price).toFixed(2);
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
    async function loadSettings() {
      try {
        const res = await fetch('/settings');
        const data = await res.json();
        document.getElementById('settingsBeaconId').textContent = data.beaconId || '';
        document.getElementById('settingsVersion').textContent = data.version || '';
        const uptime = data.uptime || 0;
        const hours = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        document.getElementById('settingsUptime').textContent = hours + 'h ' + mins + 'm';
        document.getElementById('syncedCount').textContent = data.syncedItemCount || '0';

        const dot = document.getElementById('syncStatusDot');
        const text = document.getElementById('syncStatusText');
        const retryBtn = document.getElementById('retryConnectionBtn');
        const errorDetail = document.getElementById('syncErrorDetail');
        if (data.connected) {
          dot.style.background = '#1a8a42';
          text.textContent = 'Connected to Reffo.ai';
          text.style.color = '#1a8a42';
          retryBtn.style.display = 'none';
          errorDetail.style.display = 'none';
        } else if (data.hasApiKey) {
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
        } else {
          dot.style.background = '#E6E8EC';
          text.textContent = 'Not connected';
          text.style.color = '#777E90';
          retryBtn.style.display = 'none';
          errorDetail.style.display = 'none';
        }

        if (data.hasApiKey) {
          document.getElementById('settingsApiKey').value = '';
          document.getElementById('settingsApiKey').placeholder = data.apiKey;
        }
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
    let refLayout = 'card';
    window.setRefLayout = function(layout) {
      refLayout = layout;
      document.getElementById('layoutCardBtn').classList.toggle('active', layout === 'card');
      document.getElementById('layoutRowBtn').classList.toggle('active', layout === 'row');
      loadMyRefs();
    };

    // ===== List Ref Modal =====
    window.openListRefModal = function() {
      document.getElementById('listRefModal').classList.remove('hidden');
    };

    window.closeListRefModal = function() {
      document.getElementById('listRefModal').classList.add('hidden');
    };

    // ===== Init =====
    let prevOutgoingStatuses = {};

    async function initOutgoingSnapshot() {
      try {
        const res = await fetch('/negotiations?role=buyer');
        const outgoing = await res.json();
        for (const neg of outgoing) prevOutgoingStatuses[neg.id] = neg.status;
      } catch {}
    }

    loadMyRefs();
    initOutgoingSnapshot();

    // Check for pending negotiations periodically
    setInterval(async () => {
      // Seller: update incoming badge
      try {
        const res = await fetch('/negotiations?role=seller');
        const incoming = await res.json();
        const pendingCount = incoming.filter(n => n.status === 'pending').length;
        const notifDot = document.getElementById('headerNotifDot');
        if (pendingCount > 0) {
          notifDot.style.display = 'block';
        } else {
          notifDot.style.display = 'none';
        }
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
  </script>
</body>
</html>`;
}
