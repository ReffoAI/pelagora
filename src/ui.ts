import { TAXONOMY } from './taxonomy';

export function renderUI(): string {
  const taxonomyJSON = JSON.stringify(TAXONOMY);

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
    body { font-family: 'Poppins', sans-serif; background: #F4F5F6; color: #23262F; line-height: 1.5; }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }

    /* Fade-in animation (from Modal.module.sass) */
    @keyframes showModal { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes fadeIn { 0% { opacity: 0; transform: translateY(3px); } 100% { opacity: 1; transform: translateY(0); } }

    /* Header */
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    h1 { font-size: 1.7rem; font-weight: 700; color: #141416; }
    .bolt { display: inline-block; filter: drop-shadow(0 0 8px rgba(234,82,111,0.4)); }
    .subtitle { color: #777E90; font-size: 14px; line-height: 1.71; margin-bottom: 28px; }

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

    /* Item card — Card.module.sass: 16px radius, deep shadow, image hover scale */
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

    /* Nav tabs — Header.module.sass style */
    .nav-tabs { display: flex; gap: 0; margin-bottom: 24px; background: #FCFCFD; border-radius: 16px; box-shadow: 0 16px 32px -8px rgba(15,15,15,0.12); overflow: hidden; }
    .nav-tab { flex: 1; padding: 16px; text-align: center; cursor: pointer; font-size: 14px; font-weight: 700; color: #777E90; transition: all 0.2s; border-bottom: 3px solid transparent; display: flex; align-items: center; justify-content: center; gap: 8px; user-select: none; }
    .nav-tab.active { color: #EC526F; border-bottom-color: #EC526F; background: rgba(236,82,111,0.03); }
    .nav-tab:hover { color: #141416; }
    .nav-tab .nav-icon { display: flex; align-items: center; }
    .nav-tab .nav-count { display: inline-block; background: #EC526F; color: #FCFCFD; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: 6px; }

    /* Search bar — SearchBar.module.sass */
    .search-bar { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .search-bar > div { flex: 1; min-width: 140px; }
    .search-bar .btn-primary { margin-bottom: 14px; align-self: flex-end; }

    /* Detail view — ImageCarousel.module.sass: flex 3/1, 16px radius */
    .detail-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #EC526F; cursor: pointer; margin-bottom: 16px; font-weight: 600; transition: color 0.2s; }
    .detail-back:hover { color: #DD436C; }
    .detail-back svg { flex-shrink: 0; }
    .detail-gallery { display: flex; gap: 12px; margin-bottom: 24px; }
    .detail-main-img { flex: 3; height: 400px; border-radius: 16px; overflow: hidden; background: #F4F5F6; display: flex; align-items: center; justify-content: center; position: relative; }
    .detail-main-img img { width: 100%; height: 100%; object-fit: cover; }
    .detail-main-img .placeholder { color: #B1B5C3; font-size: 3rem; }
    .detail-side-imgs { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .detail-side-img { flex: 1; border-radius: 16px; overflow: hidden; background: #F4F5F6; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s; }
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
    @media (max-width: 767px) { .detail-columns { flex-direction: column; } .detail-right { flex: none; } .detail-gallery { flex-direction: column; } .detail-main-img { flex: none; height: 240px; } .detail-side-imgs { flex-direction: row; } }

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

    /* Sold negotiation status */
    .neg-card.sold { border-left-color: #1a8a42; }
    .neg-status.sold { background: #e6f9ed; color: #1a8a42; }

    /* Item sub-tabs */
    .item-subtabs { display: flex; gap: 0; margin-bottom: 16px; }
    .item-subtab { padding: 8px 20px; cursor: pointer; font-size: 13px; font-weight: 700; color: #777E90; border-bottom: 2px solid transparent; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.02em; }
    .item-subtab.active { color: #EC526F; border-bottom-color: #EC526F; }
    .item-subtab:hover { color: #EC526F; }

    /* Archive card actions */
    .archive-actions { display: flex; gap: 8px; margin-top: 12px; }
    .archive-reason { font-size: 12px; color: #777E90; font-weight: 500; margin-top: 4px; }

    /* Item group rows */
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <svg class="bolt" width="32" height="56" viewBox="0 0 40 71" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0_bolt)">
          <path d="M38.2716 3.78854C38.2716 3.78854 38.7667 2.8058 38.3666 2.04318C37.9665 1.28055 36.9939 1.38634 36.9939 1.38634H13.1158C13.1158 1.38634 12.4831 1.35329 12.0879 1.72511C11.6928 2.09694 11.5333 2.87255 11.5333 2.87255L2.17826 33.9717C2.17826 33.9717 1.69159 35.1465 2.10971 36.0513C2.52784 36.9562 3.51555 36.8775 3.51555 36.8775H12.0048L2.50338 68.2648C2.50338 68.2648 1.778 69.9001 2.94329 70.7193C4.10858 71.5384 5.31358 70.3035 5.31358 70.3035L39.6806 25.9846C39.6806 25.9846 40.2489 25.3305 39.869 24.3183C39.489 23.3061 38.6423 23.4047 38.6423 23.4047H28.8156L38.2716 3.78884V3.78854Z" fill="black"/>
          <path d="M38.2717 3.78859C38.2717 3.78859 38.7667 2.80584 38.3666 2.04322C37.9666 1.2806 35.8421 0.132507 35.8421 0.132507L35.2449 0.599455L13.1159 1.38722C13.1159 1.38722 12.4831 1.35417 12.088 1.726C11.6928 2.09782 11.5333 2.87343 11.5333 2.87343L2.17837 33.9718C2.17837 33.9718 1.6917 35.1466 2.10982 36.0514C2.52795 36.9563 3.51566 36.8776 3.51566 36.8776H12.0048L2.79675 65.1328L1.43411 67.4081C1.43411 67.4081 0.508245 68.9521 0.915212 69.252C1.43797 69.6377 2.25309 70.2344 2.94304 70.7193C4.10863 71.5378 5.31333 70.3035 5.31333 70.3035L39.6805 25.9846C39.6805 25.9846 40.2488 25.3305 39.8689 24.3183C39.4889 23.3061 38.6421 23.4047 38.6421 23.4047H28.8154L38.2714 3.78889L38.2717 3.78859Z" fill="black"/>
          <path d="M36.3314 2.40738C36.3314 2.40738 36.8264 1.42463 36.4263 0.662012C36.0263 -0.10061 35.0534 0.00517205 35.0534 0.00517205H11.1756C11.1756 0.00517205 10.5428 -0.0279334 10.1477 0.343949C9.75251 0.715831 9.59304 1.49138 9.59304 1.49138L0.238015 32.5907C0.238015 32.5907 -0.24866 33.7655 0.169465 34.6704C0.58759 35.5752 1.5753 35.4965 1.5753 35.4965H10.0645L0.5629 66.8837C0.5629 66.8837 -0.162543 68.519 1.00281 69.3381C2.16816 70.1572 3.37309 68.9223 3.37309 68.9223L37.7402 24.6034C37.7402 24.6034 38.3085 23.9493 37.9286 22.9371C37.5486 21.9249 36.7018 22.0235 36.7018 22.0235H26.875L36.3314 2.40738Z" fill="#EA526F"/>
        </g>
        <defs><clipPath id="clip0_bolt"><rect width="40" height="71" fill="white"/></clipPath></defs>
      </svg>
      <h1>Reffo Beacon</h1>
    </div>
    <p class="subtitle">Decentralized commerce &mdash; your node, your inventory</p>

    <!-- Nav Tabs -->
    <div class="nav-tabs">
      <div class="nav-tab active" data-tab="items" onclick="switchTab('items')">
        <span class="nav-icon"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 0C2.86739 0 2.74021 0.0526784 2.64645 0.146447C2.55268 0.240215 2.5 0.367392 2.5 0.5V2.5H0.5C0.367392 2.5 0.240215 2.55268 0.146447 2.64645C0.0526784 2.74021 0 2.86739 0 3C0 3.13261 0.0526784 3.25979 0.146447 3.35355C0.240215 3.44732 0.367392 3.5 0.5 3.5H2.5V6.5H0.5C0.367392 6.5 0.240215 6.55268 0.146447 6.64645C0.0526784 6.74021 0 6.86739 0 7C0 7.13261 0.0526784 7.25979 0.146447 7.35355C0.240215 7.44732 0.367392 7.5 0.5 7.5H2.5V9.5C2.5 9.63261 2.55268 9.75979 2.64645 9.85355C2.74021 9.94732 2.86739 10 3 10C3.13261 10 3.25979 9.94732 3.35355 9.85355C3.44732 9.75979 3.5 9.63261 3.5 9.5V7.5H6.5V9.5C6.5 9.63261 6.55268 9.75979 6.64645 9.85355C6.74021 9.94732 6.86739 10 7 10C7.13261 10 7.25979 9.94732 7.35355 9.85355C7.44732 9.75979 7.5 9.63261 7.5 9.5V7.5H9.5C9.63261 7.5 9.75979 7.44732 9.85355 7.35355C9.94732 7.25979 10 7.13261 10 7C10 6.86739 9.94732 6.74021 9.85355 6.64645C9.75979 6.55268 9.63261 6.5 9.5 6.5H7.5V3.5H9.5C9.63261 3.5 9.75979 3.44732 9.85355 3.35355C9.94732 3.25979 10 3.13261 10 3C10 2.86739 9.94732 2.74021 9.85355 2.64645C9.75979 2.55268 9.63261 2.5 9.5 2.5H7.5V0.5C7.5 0.367392 7.44732 0.240215 7.35355 0.146447C7.25979 0.0526784 7.13261 0 7 0C6.86739 0 6.74021 0.0526784 6.64645 0.146447C6.55268 0.240215 6.5 0.367392 6.5 0.5V2.5H3.5V0.5C3.5 0.367392 3.44732 0.240215 3.35355 0.146447C3.25979 0.0526784 3.13261 0 3 0ZM6.5 6.5V3.5H3.5V6.5H6.5Z" fill="currentColor"/></svg></span>
        My Items
      </div>
      <div class="nav-tab" data-tab="search" onclick="switchTab('search')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 17 17" fill="none"><path d="M15.067 15.067L11.967 11.96M13.686 7.80798C13.6862 8.97015 13.3418 10.1063 12.6963 11.0727C12.0508 12.0391 11.1332 12.7924 10.0596 13.2373C8.98597 13.6822 7.80452 13.7988 6.66465 13.5723C5.52478 13.3457 4.47768 12.7863 3.65577 11.9647C2.83386 11.143 2.27405 10.0961 2.04712 8.95632C1.8202 7.81652 1.93637 6.63503 2.38092 5.56126C2.82548 4.48748 3.57847 3.56965 4.54466 2.92382C5.51086 2.278 6.64686 1.93318 7.80902 1.93298C9.36744 1.93298 10.862 2.55206 11.964 3.65402C13.0659 4.75599 13.685 6.25057 13.685 7.80898L13.686 7.80798Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
        Search Network
      </div>
      <div class="nav-tab" data-tab="negotiations" onclick="switchTab('negotiations')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 18 19" fill="none"><path d="M17.9703 15.0232C17.9703 15.2577 17.8771 15.4825 17.7114 15.6483C17.5456 15.8141 17.3207 15.9072 17.0863 15.9072H0.854272C0.625098 15.8995 0.407887 15.803 0.248494 15.6382C0.0891013 15.4734 0 15.253 0 15.0237C0 14.7944 0.0891013 14.5741 0.248494 14.4092C0.407887 14.2444 0.625098 14.1479 0.854272 14.1402H0.870272V7.98122C0.886126 5.84877 1.74841 3.80995 3.26743 2.31324C4.78646 0.816524 6.83782 -0.0154876 8.97027 0.000218389C11.1027 -0.0154876 13.1541 0.816524 14.6731 2.31324C16.1921 3.80995 17.0544 5.84877 17.0703 7.98122V14.1402H17.0863C17.3205 14.1402 17.5452 14.2332 17.711 14.3988C17.8768 14.5643 17.97 14.7889 17.9703 15.0232ZM2.67027 14.1392H15.2703V7.98122C15.2703 6.31035 14.6065 4.70792 13.425 3.52645C12.2436 2.34497 10.6411 1.68122 8.97027 1.68122C7.29941 1.68122 5.69698 2.34497 4.5155 3.52645C3.33402 4.70792 2.67027 6.31035 2.67027 7.98122V14.1392ZM6.94627 17.7552C6.70127 17.2552 7.16827 16.7902 7.72027 16.7902H10.2203C10.7723 16.7902 11.2393 17.2602 10.9943 17.7552C10.8847 17.9781 10.7383 18.181 10.5613 18.3552C10.1357 18.7702 9.56472 19.0025 8.97027 19.0025C8.37582 19.0025 7.80489 18.7702 7.37927 18.3552C7.20232 18.1813 7.05594 17.9788 6.94627 17.7562V17.7552Z" fill="currentColor"/></svg></span>
        Negotiations <span id="negCount" class="nav-count hidden">0</span>
      </div>
      <div class="nav-tab" data-tab="settings" onclick="switchTab('settings')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span>
        Settings
      </div>
    </div>

    <!-- Items Tab -->
    <div id="tab-items">
      <div class="item-subtabs">
        <div class="item-subtab active" data-itemtab="active" onclick="switchItemSubTab('active')">Active</div>
        <div class="item-subtab" data-itemtab="archive" onclick="switchItemSubTab('archive')">Archive</div>
      </div>

      <div id="itemSubtabActive">
      <!-- List an Item -->
      <section>
        <h2>List an Item</h2>
        <div id="listMsg"></div>
        <form id="listForm">
          <label for="itemName">Name *</label>
          <input id="itemName" name="name" required placeholder="e.g. Fender Stratocaster">

          <label for="itemDesc">Description</label>
          <textarea id="itemDesc" name="description" placeholder="Condition, details..."></textarea>

          <div class="row">
            <div>
              <label for="itemCat">Category</label>
              <select id="itemCat" name="category"><option value="">Select...</option></select>
            </div>
            <div>
              <label for="itemSubcat">Subcategory</label>
              <select id="itemSubcat" name="subcategory"><option value="">Select...</option></select>
            </div>
          </div>

          <div class="row">
            <div>
              <label for="itemListingStatus">Listing Status</label>
              <select id="itemListingStatus" name="listingStatus">
                <option value="private">Private</option>
                <option value="for_sale">For Sale</option>
                <option value="willing_to_sell">Willing to Sell</option>
              </select>
            </div>
            <div>
              <label for="itemQuantity">Quantity</label>
              <input id="itemQuantity" name="quantity" type="number" min="1" step="1" value="1">
            </div>
          </div>

          <div class="row">
            <div>
              <label for="itemPrice">Price</label>
              <input id="itemPrice" name="price" type="number" min="0" step="0.01" placeholder="0.00">
            </div>
            <div>
              <label for="itemCurrency">Currency</label>
              <select id="itemCurrency" name="currency">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          <label for="itemSku">SKU</label>
          <input id="itemSku" name="sku" placeholder="Optional SKU or part number">

          <details style="margin-bottom:14px;border:2px solid #E6E8EC;border-radius:12px;padding:14px;">
            <summary style="cursor:pointer;font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.02em;">Location Override</summary>
            <p style="font-size:12px;color:#B1B5C3;margin:8px 0;">Leave blank to use your default location from Settings.</p>
            <div class="row">
              <div><label for="itemLocCity">City</label><input id="itemLocCity" placeholder="City"></div>
              <div><label for="itemLocState">State</label><input id="itemLocState" placeholder="State"></div>
              <div><label for="itemLocZip">Zip</label><input id="itemLocZip" placeholder="Zip"></div>
            </div>
            <div class="row">
              <div><label for="itemLocLat">Latitude</label><input id="itemLocLat" type="number" step="any" placeholder="e.g. 28.54"></div>
              <div><label for="itemLocLng">Longitude</label><input id="itemLocLng" type="number" step="any" placeholder="e.g. -81.38"></div>
            </div>
            <div class="row">
              <div>
                <label for="itemSellingScope">Selling Scope</label>
                <select id="itemSellingScope">
                  <option value="">Use default</option>
                  <option value="global">Global</option>
                  <option value="national">National</option>
                  <option value="range">Range (miles)</option>
                </select>
              </div>
              <div>
                <label for="itemSellingRadius">Radius (miles)</label>
                <input id="itemSellingRadius" type="number" min="1" placeholder="250">
              </div>
            </div>
          </details>

          <label>Photos (up to 4)</label>
          <div class="upload-area" onclick="document.getElementById('itemPhotos').click()">
            <div class="upload-icon">+</div>
            <p>Click to upload photos</p>
            <input type="file" id="itemPhotos" accept="image/*" multiple>
          </div>
          <div id="photoPreview" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>

          <label>Video (optional, 1 max)</label>
          <div class="upload-area" onclick="document.getElementById('itemVideo').click()">
            <div class="upload-icon">+</div>
            <p>Click to upload a video</p>
            <input type="file" id="itemVideo" accept="video/*">
          </div>
          <div id="videoPreview" style="margin-bottom:12px;"></div>

          <button type="submit" class="btn-primary">List Item</button>
        </form>
      </section>

      <!-- My Items Grid -->
      <section>
        <h2>My Items</h2>
        <div id="myItems"><p class="empty">Loading...</p></div>
      </section>
      </div>

      <div id="itemSubtabArchive" class="hidden">
      <section>
        <h2>Archived Items</h2>
        <div id="archivedItems"><p class="empty">No archived items</p></div>
      </section>
      </div>
    </div>

    <!-- Item Detail View (hidden by default) -->
    <div id="tab-detail" class="hidden">
      <section id="detailContent"></section>
    </div>

    <!-- Search Tab -->
    <div id="tab-search" class="hidden">
      <section>
        <h2>Search Network</h2>
        <div class="search-bar">
          <div>
            <label for="searchQ">Search</label>
            <input id="searchQ" placeholder="Keywords...">
          </div>
          <div>
            <label for="searchCat">Category</label>
            <select id="searchCat"><option value="">Any</option></select>
          </div>
          <div>
            <label for="searchSubcat">Subcategory</label>
            <select id="searchSubcat"><option value="">Any</option></select>
          </div>
          <div>
            <label for="searchMaxPrice">Max Price</label>
            <input id="searchMaxPrice" type="number" min="0" step="0.01" placeholder="No limit">
          </div>
          <div>
            <label for="searchRadius">Within (miles)</label>
            <input id="searchRadius" type="number" min="1" placeholder="Any distance">
          </div>
          <button id="searchBtn" class="btn-primary"><svg width="16" height="16" viewBox="0 0 17 17" fill="none"><path d="M15.067 15.067L11.967 11.96M13.686 7.80798C13.6862 8.97015 13.3418 10.1063 12.6963 11.0727C12.0508 12.0391 11.1332 12.7924 10.0596 13.2373C8.98597 13.6822 7.80452 13.7988 6.66465 13.5723C5.52478 13.3457 4.47768 12.7863 3.65577 11.9647C2.83386 11.143 2.27405 10.0961 2.04712 8.95632C1.8202 7.81652 1.93637 6.63503 2.38092 5.56126C2.82548 4.48748 3.57847 3.56965 4.54466 2.92382C5.51086 2.278 6.64686 1.93318 7.80902 1.93298C9.36744 1.93298 10.862 2.55206 11.964 3.65402C13.0659 4.75599 13.685 6.25057 13.685 7.80898L13.686 7.80798Z" stroke="white" stroke-width="2" stroke-linecap="round"/></svg> Search</button>
        </div>
        <div id="searchResults"><p class="empty">Enter a query and click Search</p></div>
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
            <span style="font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;">Synced Items</span>
            <div id="syncedCount" style="font-size:24px;font-weight:700;color:#141416;">0</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Default Location</h2>
        <div id="locationMsg"></div>
        <p style="font-size:12px;color:#B1B5C3;margin-bottom:12px;">Set your default location. New items will inherit these values. Street address is stored locally and never shared.</p>
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

  <!-- Proposal Modal (buyer sending offer) -->
  <div id="proposalModal" class="modal-overlay hidden">
    <div class="modal">
      <h3 id="modalTitle">Make a Proposal</h3>
      <input type="hidden" id="modalItemId">
      <input type="hidden" id="modalItemName">
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

  <script>
    const TAXONOMY = ${taxonomyJSON};

    // ===== Tab switching =====
    function switchTab(tab) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      document.getElementById('tab-items').classList.toggle('hidden', tab !== 'items');
      document.getElementById('tab-detail').classList.toggle('hidden', tab !== 'detail');
      document.getElementById('tab-search').classList.toggle('hidden', tab !== 'search');
      document.getElementById('tab-negotiations').classList.toggle('hidden', tab !== 'negotiations');
      document.getElementById('tab-settings').classList.toggle('hidden', tab !== 'settings');
      if (tab === 'negotiations') loadNegotiations();
      if (tab === 'items') loadMyItems();
      if (tab === 'settings') loadSettings();
    }

    function switchNegTab(tab) {
      document.querySelectorAll('.tab[data-negtab]').forEach(t => t.classList.toggle('active', t.dataset.negtab === tab));
      document.getElementById('negIncoming').classList.toggle('hidden', tab !== 'incoming');
      document.getElementById('negOutgoing').classList.toggle('hidden', tab !== 'outgoing');
    }

    function switchItemSubTab(tab) {
      document.querySelectorAll('.item-subtab').forEach(t => t.classList.toggle('active', t.dataset.itemtab === tab));
      document.getElementById('itemSubtabActive').classList.toggle('hidden', tab !== 'active');
      document.getElementById('itemSubtabArchive').classList.toggle('hidden', tab !== 'archive');
      if (tab === 'archive') loadArchivedItems();
      if (tab === 'active') loadMyItems();
    }

    async function loadArchivedItems() {
      const container = document.getElementById('archivedItems');
      try {
        const res = await fetch('/items?archived=true');
        const items = await res.json();
        if (items.length === 0) {
          container.innerHTML = '<p class="empty">No archived items</p>';
          return;
        }

        // Load media for all archived items
        const mediaMap = {};
        await Promise.all(items.map(async item => {
          const mRes = await fetch('/items/' + item.id + '/media');
          mediaMap[item.id] = await mRes.json();
        }));

        container.innerHTML = '<div class="cards">' + items.map(item => {
          const photos = (mediaMap[item.id] || []).filter(m => m.mediaType === 'photo');
          const firstPhoto = photos[0];
          const statusClass = statusBadgeClass[item.listingStatus] || 'badge-private';
          const statusLabel = item.listingStatus === 'archived_sold' ? 'Sold' : 'Deleted';
          const archiveDate = new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          const imgHtml = firstPhoto
            ? '<div class="card-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
            : '<div class="card-img"><span class="placeholder"><svg width="40" height="40" viewBox="0 0 40 71" fill="none"><path d="M36.3314 2.40738C36.3314 2.40738 36.8264 1.42463 36.4263 0.662012C36.0263 -0.10061 35.0534 0.00517205 35.0534 0.00517205H11.1756C11.1756 0.00517205 10.5428 -0.0279334 10.1477 0.343949C9.75251 0.715831 9.59304 1.49138 9.59304 1.49138L0.238015 32.5907C0.238015 32.5907 -0.24866 33.7655 0.169465 34.6704C0.58759 35.5752 1.5753 35.4965 1.5753 35.4965H10.0645L0.5629 66.8837C0.5629 66.8837 -0.162543 68.519 1.00281 69.3381C2.16816 70.1572 3.37309 68.9223 3.37309 68.9223L37.7402 24.6034C37.7402 24.6034 38.3085 23.9493 37.9286 22.9371C37.5486 21.9249 36.7018 22.0235 36.7018 22.0235H26.875L36.3314 2.40738Z" fill="#E6E8EC"/></svg></span></div>';

          return '<div class="card" style="cursor:default;">' +
            imgHtml +
            '<div class="card-body">' +
              '<h3>' + escapeHtml(item.name) + '</h3>' +
              '<div class="card-meta"><span class="badge ' + statusClass + '">' + statusLabel + '</span></div>' +
              '<div class="archive-reason">Archived ' + archiveDate + '</div>' +
              '<div class="archive-actions">' +
                '<button class="btn-secondary btn-sm" onclick="event.stopPropagation(); restoreItem(\\'' + item.id + '\\')">Restore</button>' +
                '<button class="btn-danger btn-sm" onclick="event.stopPropagation(); permanentDeleteItem(\\'' + item.id + '\\')">Delete Forever</button>' +
              '</div>' +
            '</div></div>';
        }).join('') + '</div>';
      } catch {
        container.innerHTML = '<p class="empty">Failed to load archived items</p>';
      }
    }

    window.restoreItem = async function(itemId) {
      try {
        const res = await fetch('/items/' + itemId + '/restore', { method: 'POST' });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        showToast('Item restored', 'accepted');
        loadArchivedItems();
        loadMyItems();
      } catch (err) {
        showToast('Restore failed: ' + err.message, 'rejected');
      }
    };

    window.permanentDeleteItem = async function(itemId) {
      if (!confirm('Permanently delete this item? This cannot be undone. All media and data will be destroyed.')) return;
      try {
        const res = await fetch('/items/' + itemId + '/permanent', { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        showToast('Item permanently deleted', '');
        loadArchivedItems();
      } catch {
        showToast('Failed to permanently delete item', 'rejected');
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

    populateCategories(document.getElementById('itemCat'), () =>
      populateSubcategories(document.getElementById('itemCat'), document.getElementById('itemSubcat'))
    );
    populateCategories(document.getElementById('searchCat'), () =>
      populateSubcategories(document.getElementById('searchCat'), document.getElementById('searchSubcat'))
    );

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

    // ===== File Preview =====
    document.getElementById('itemPhotos').addEventListener('change', function() {
      const preview = document.getElementById('photoPreview');
      preview.innerHTML = '';
      const files = this.files;
      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const url = URL.createObjectURL(files[i]);
        const thumb = document.createElement('div');
        thumb.style.cssText = 'width:72px;height:72px;border-radius:8px;overflow:hidden;background:#F4F5F6;flex-shrink:0;';
        thumb.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">';
        preview.appendChild(thumb);
      }
    });
    document.getElementById('itemVideo').addEventListener('change', function() {
      const preview = document.getElementById('videoPreview');
      preview.innerHTML = '';
      if (this.files[0]) {
        const url = URL.createObjectURL(this.files[0]);
        const thumb = document.createElement('div');
        thumb.style.cssText = 'width:72px;height:72px;border-radius:8px;overflow:hidden;background:#F4F5F6;flex-shrink:0;';
        thumb.innerHTML = '<video src="' + url + '" style="width:100%;height:100%;object-fit:cover;" muted></video>';
        preview.appendChild(thumb);
      }
    });

    // ===== List Form =====
    document.getElementById('listForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('.btn-primary');
      btn.disabled = true;

      try {
        const name = document.getElementById('itemName').value.trim();
        const description = document.getElementById('itemDesc').value.trim();
        const category = document.getElementById('itemCat').value;
        const subcategory = document.getElementById('itemSubcat').value;
        const listingStatus = document.getElementById('itemListingStatus').value;
        const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
        const priceVal = document.getElementById('itemPrice').value;
        const price = priceVal ? parseFloat(priceVal) : 0;
        const currency = document.getElementById('itemCurrency').value;
        const sku = document.getElementById('itemSku').value.trim() || undefined;
        const locCity = document.getElementById('itemLocCity').value.trim() || undefined;
        const locState = document.getElementById('itemLocState').value.trim() || undefined;
        const locZip = document.getElementById('itemLocZip').value.trim() || undefined;
        const locLat = document.getElementById('itemLocLat').value ? parseFloat(document.getElementById('itemLocLat').value) : undefined;
        const locLng = document.getElementById('itemLocLng').value ? parseFloat(document.getElementById('itemLocLng').value) : undefined;
        const sellingScope = document.getElementById('itemSellingScope').value || undefined;
        const sellingRadiusMiles = document.getElementById('itemSellingRadius').value ? parseInt(document.getElementById('itemSellingRadius').value) : undefined;

        const itemRes = await fetch('/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, category, subcategory, listingStatus, quantity, sku,
            locationCity: locCity, locationState: locState, locationZip: locZip,
            locationLat: locLat, locationLng: locLng,
            sellingScope, sellingRadiusMiles })
        });
        if (!itemRes.ok) { const err = await itemRes.json(); throw new Error(err.error || 'Failed to create item'); }
        const item = await itemRes.json();

        // Upload photos and video separately so one failure doesn't kill the other
        const photoFiles = document.getElementById('itemPhotos').files;
        const videoFile = document.getElementById('itemVideo').files[0];
        const uploadErrors = [];
        if (photoFiles.length > 0) {
          const fd = new FormData();
          for (let i = 0; i < Math.min(photoFiles.length, 4); i++) fd.append('files', photoFiles[i]);
          const photoRes = await fetch('/items/' + item.id + '/media', { method: 'POST', body: fd });
          if (!photoRes.ok) {
            let errMsg = 'Photo upload failed';
            try { const err = await photoRes.json(); errMsg = err.error || errMsg; } catch {}
            uploadErrors.push(errMsg);
          }
        }
        if (videoFile) {
          const fd = new FormData();
          fd.append('files', videoFile);
          const videoRes = await fetch('/items/' + item.id + '/media', { method: 'POST', body: fd });
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
            body: JSON.stringify({ itemId: item.id, price, priceCurrency: currency })
          });
        }

        showMsg('listMsg', 'Item added successfully!', true);
        e.target.reset();
        document.getElementById('itemQuantity').value = '1';
        document.getElementById('itemSubcat').innerHTML = '<option value="">Select...</option>';
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('videoPreview').innerHTML = '';
        loadMyItems();
      } catch (err) {
        showMsg('listMsg', err.message, false);
      } finally {
        btn.disabled = false;
      }
    });

    // ===== My Items =====
    async function loadMyItems() {
      const container = document.getElementById('myItems');
      try {
        const [itemsRes, offersRes] = await Promise.all([fetch('/items'), fetch('/offers')]);
        const items = await itemsRes.json();
        const offers = await offersRes.json();

        if (items.length === 0) {
          container.innerHTML = '<p class="empty">No items yet. List your first item above!</p>';
          return;
        }

        const offerMap = {};
        offers.forEach(o => { if (!offerMap[o.itemId]) offerMap[o.itemId] = []; offerMap[o.itemId].push(o); });

        // Load media for all items
        const mediaMap = {};
        await Promise.all(items.map(async item => {
          const mRes = await fetch('/items/' + item.id + '/media');
          mediaMap[item.id] = await mRes.json();
        }));

        container.innerHTML = '<div class="cards">' + items.map(item => {
          const itemOffers = offerMap[item.id] || [];
          const activeOffer = itemOffers.find(o => o.status === 'active');
          const priceStr = activeOffer ? activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2) : '';
          const photos = (mediaMap[item.id] || []).filter(m => m.mediaType === 'photo');
          const firstPhoto = photos[0];
          const catBadges = [item.category, item.subcategory].filter(Boolean).map(b =>
            '<span class="badge badge-cat">' + escapeHtml(b) + '</span>'
          ).join('');
          const statusClass = statusBadgeClass[item.listingStatus] || 'badge-private';
          const statusLabel = statusLabels[item.listingStatus] || 'Private';

          const imgHtml = firstPhoto
            ? '<div class="card-img"><img src="/' + escapeHtml(firstPhoto.filePath) + '" alt=""></div>'
            : '<div class="card-img"><span class="placeholder"><svg width="40" height="40" viewBox="0 0 40 71" fill="none"><path d="M36.3314 2.40738C36.3314 2.40738 36.8264 1.42463 36.4263 0.662012C36.0263 -0.10061 35.0534 0.00517205 35.0534 0.00517205H11.1756C11.1756 0.00517205 10.5428 -0.0279334 10.1477 0.343949C9.75251 0.715831 9.59304 1.49138 9.59304 1.49138L0.238015 32.5907C0.238015 32.5907 -0.24866 33.7655 0.169465 34.6704C0.58759 35.5752 1.5753 35.4965 1.5753 35.4965H10.0645L0.5629 66.8837C0.5629 66.8837 -0.162543 68.519 1.00281 69.3381C2.16816 70.1572 3.37309 68.9223 3.37309 68.9223L37.7402 24.6034C37.7402 24.6034 38.3085 23.9493 37.9286 22.9371C37.5486 21.9249 36.7018 22.0235 36.7018 22.0235H26.875L36.3314 2.40738Z" fill="#E6E8EC"/></svg></span></div>';

          return '<div class="card" onclick="openDetail(\\'' + item.id + '\\')">' +
            imgHtml +
            '<div class="card-body">' +
              '<h3>' + escapeHtml(item.name) + '</h3>' +
              '<div class="card-meta"><span class="badge ' + statusClass + '">' + statusLabel + '</span>' + catBadges +
              (item.reffoSynced ? '<span class="badge badge-synced">Synced</span>' : '') + '</div>' +
              (priceStr ? '<div class="card-price">' + escapeHtml(priceStr) + '</div>' : '') +
              (item.quantity > 1 ? '<div class="card-qty">Qty: ' + item.quantity + '</div>' : '') +
              (item.description ? '<div class="card-desc">' + escapeHtml(item.description) + '</div>' : '') +
            '</div></div>';
        }).join('') + '</div>';
      } catch {
        container.innerHTML = '<p class="empty">Failed to load items</p>';
      }
    }

    // ===== Item Detail / Edit View =====
    async function openDetail(itemId) {
      const container = document.getElementById('detailContent');
      container.innerHTML = '<p class="empty">Loading...</p>';
      switchTab('detail');

      try {
        const [itemRes, mediaRes, offersRes, negRes] = await Promise.all([
          fetch('/items/' + itemId),
          fetch('/items/' + itemId + '/media'),
          fetch('/offers'),
          fetch('/negotiations')
        ]);
        const item = await itemRes.json();
        const media = await mediaRes.json();
        const offers = await offersRes.json();
        const allNegs = await negRes.json();
        const itemNegs = allNegs.filter(n => n.itemId === itemId);
        const itemOffers = offers.filter(o => o.itemId === itemId);
        const activeOffer = itemOffers.find(o => o.status === 'active');

        const photos = media.filter(m => m.mediaType === 'photo');
        const video = media.find(m => m.mediaType === 'video');
        const mainMedia = photos[0] || video;
        const sideMedia = photos.slice(1);

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

        // Build detail HTML
        let html = '<span class="detail-back" onclick="switchTab(\\'items\\')">';
        html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
        html += ' Back to items</span>';

        html += '<div class="detail-gallery">';
        html += '<div class="detail-main-img" id="detailMainImg">' + mainImgHtml + '</div>';
        html += '<div class="detail-side-imgs">' + sideImgsHtml + '</div>';
        html += '</div>';

        html += '<div class="detail-columns">';

        // Left: edit form
        html += '<div class="detail-left">';
        html += '<h2>Edit Item</h2>';
        html += '<div id="detailMsg"></div>';
        html += '<form id="detailForm" data-item-id="' + item.id + '">';
        html += '<label>Name</label><input id="dName" value="' + escapeHtml(item.name) + '">';
        html += '<label>Description</label><textarea id="dDesc">' + escapeHtml(item.description) + '</textarea>';
        html += '<div class="row"><div><label>Category</label><select id="dCat"><option value="">Select...</option></select></div>';
        html += '<div><label>Subcategory</label><select id="dSubcat"><option value="">Select...</option></select></div></div>';
        html += '<div class="row"><div><label>Quantity</label><input id="dQty" type="number" min="1" value="' + item.quantity + '"></div>';
        html += '<div><label>SKU</label><input id="dSku" value="' + escapeHtml(item.sku || '') + '"></div></div>';
        html += '<details style="margin-bottom:14px;border:2px solid #E6E8EC;border-radius:12px;padding:14px;">';
        html += '<summary style="cursor:pointer;font-size:12px;font-weight:600;color:#777E90;text-transform:uppercase;letter-spacing:0.02em;">Location</summary>';
        html += '<div class="row"><div><label>City</label><input id="dLocCity" value="' + escapeHtml(item.locationCity || '') + '"></div>';
        html += '<div><label>State</label><input id="dLocState" value="' + escapeHtml(item.locationState || '') + '"></div>';
        html += '<div><label>Zip</label><input id="dLocZip" value="' + escapeHtml(item.locationZip || '') + '"></div></div>';
        html += '<div class="row"><div><label>Latitude</label><input id="dLocLat" type="number" step="any" value="' + (item.locationLat || '') + '"></div>';
        html += '<div><label>Longitude</label><input id="dLocLng" type="number" step="any" value="' + (item.locationLng || '') + '"></div></div>';
        html += '<div class="row"><div><label>Selling Scope</label><select id="dSellingScope">';
        ['global','national','range'].forEach(s => {
          html += '<option value="' + s + '"' + ((item.sellingScope || 'global') === s ? ' selected' : '') + '>' + ({global:'Global',national:'National',range:'Range (miles)'})[s] + '</option>';
        });
        html += '</select></div>';
        html += '<div><label>Radius (miles)</label><input id="dSellingRadius" type="number" min="1" value="' + (item.sellingRadiusMiles || '') + '"></div></div>';
        html += '</details>';
        html += '</form>';

        // Media management
        html += '<h2 style="margin-top:24px;">Media</h2>';
        html += '<div class="media-thumbs" id="mediaThumbs">';
        media.forEach(m => {
          const isVid = m.mediaType === 'video';
          html += '<div class="media-thumb">';
          html += isVid
            ? '<video src="/' + escapeHtml(m.filePath) + '" muted></video>'
            : '<img src="/' + escapeHtml(m.filePath) + '" alt="">';
          html += '<button class="del-btn" onclick="deleteMedia(\\'' + item.id + '\\', \\'' + m.id + '\\')" title="Delete">&times;</button>';
          html += '</div>';
        });
        html += '</div>';
        html += '<div class="upload-area" onclick="document.getElementById(\\'detailFileInput\\').click()" style="max-width:200px;">';
        html += '<div class="upload-icon">+</div><p>Upload</p>';
        html += '<input type="file" id="detailFileInput" accept="image/*,video/*" multiple onchange="uploadDetailMedia(\\'' + item.id + '\\')">';
        html += '</div>';

        // Negotiations for this item
        if (itemNegs.length > 0) {
          html += '<h2 style="margin-top:24px;">Negotiations</h2>';
          html += renderNegotiationCards(itemNegs, true);
        }

        html += '</div>'; // end detail-left

        // Right: action card
        html += '<div class="detail-right">';
        html += '<div class="action-card">';
        if (activeOffer) {
          html += '<div class="action-price">' + escapeHtml(activeOffer.priceCurrency) + ' ' + activeOffer.price.toFixed(2) + '</div>';
        }
        html += '<div class="action-row"><span class="action-label">Status</span><span class="action-value">';
        html += '<select id="dStatus" style="width:auto;height:36px;padding:0 10px;font-size:14px;border-radius:12px;border:2px solid #E6E8EC;margin:0;font-family:Poppins,sans-serif;font-weight:600;background:#FCFCFD;">';
        ['private','for_sale','willing_to_sell'].forEach(s => {
          html += '<option value="' + s + '"' + (item.listingStatus === s ? ' selected' : '') + '>' + statusLabels[s] + '</option>';
        });
        html += '</select></span></div>';
        html += '<div class="action-row"><span class="action-label">Quantity</span><span class="action-value">' + item.quantity + '</span></div>';
        if (item.category) html += '<div class="action-row"><span class="action-label">Category</span><span class="action-value">' + escapeHtml(item.category) + '</span></div>';
        if (item.subcategory) html += '<div class="action-row"><span class="action-label">Subcategory</span><span class="action-value">' + escapeHtml(item.subcategory) + '</span></div>';
        if (item.sku) html += '<div class="action-row"><span class="action-label">SKU</span><span class="action-value">' + escapeHtml(item.sku) + '</span></div>';
        const locParts = [item.locationCity, item.locationState, item.locationZip].filter(Boolean);
        if (locParts.length > 0) {
          html += '<div class="action-row"><span class="action-label">Location</span><span class="action-value">' + escapeHtml(locParts.join(', ')) + '</span></div>';
        }
        const scopeLabels = { global: 'Global', national: 'National', range: 'Range' };
        if (item.sellingScope) {
          let scopeText = scopeLabels[item.sellingScope] || item.sellingScope;
          if (item.sellingScope === 'range' && item.sellingRadiusMiles) scopeText += ' (' + item.sellingRadiusMiles + ' mi)';
          html += '<div class="action-row"><span class="action-label">Selling Scope</span><span class="action-value">' + escapeHtml(scopeText) + '</span></div>';
        }
        html += '<div class="action-row"><span class="action-label">Share on Reffo</span><span class="action-value">';
        html += '<label class="sync-toggle"><input type="checkbox" ' + (item.reffoSynced ? 'checked' : '') + ' onchange="toggleSync(\\'' + item.id + '\\', this)"><span class="toggle-track"></span></label>';
        html += '</span></div>';
        html += '<div style="margin-top:20px;display:flex;gap:10px;flex-direction:column;">';
        html += '<button class="btn-primary" style="width:100%;" onclick="saveDetail(\\'' + item.id + '\\')">Save Changes</button>';
        html += '<button class="btn-danger" style="width:100%;" onclick="deleteItem(\\'' + item.id + '\\')"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10C18 11.5823 17.5308 13.129 16.6518 14.4446C15.7727 15.7602 14.5233 16.7855 13.0615 17.391C11.5997 17.9965 9.99113 18.155 8.43928 17.8463C6.88743 17.5376 5.46197 16.7757 4.34315 15.6569C3.22433 14.538 2.4624 13.1126 2.15372 11.5607C1.84504 10.0089 2.00347 8.40034 2.60897 6.93853C3.21447 5.47672 4.23985 4.22729 5.55544 3.34824C6.87104 2.46919 8.41775 2 10 2C12.1217 2 14.1566 2.84285 15.6569 4.34315C17.1572 5.84344 18 7.87827 18 10ZM20 10C20 11.9778 19.4135 13.9112 18.3147 15.5557C17.2159 17.2002 15.6541 18.4819 13.8268 19.2388C11.9996 19.9957 9.98891 20.1937 8.0491 19.8079C6.10929 19.422 4.32746 18.4696 2.92894 17.0711C1.53041 15.6725 0.578004 13.8907 0.192152 11.9509C-0.193701 10.0111 0.00433284 8.00043 0.761209 6.17317C1.51809 4.3459 2.79981 2.78412 4.4443 1.6853C6.08879 0.58649 8.02219 0 10 0C12.6522 0 15.1957 1.05357 17.0711 2.92893C18.9464 4.8043 20 7.34784 20 10ZM5 9C4.73479 9 4.48043 9.10536 4.2929 9.29289C4.10536 9.48043 4 9.73478 4 10C4 10.2652 4.10536 10.5196 4.2929 10.7071C4.48043 10.8946 4.73479 11 5 11H15C15.2652 11 15.5196 10.8946 15.7071 10.7071C15.8946 10.5196 16 10.2652 16 10C16 9.73478 15.8946 9.48043 15.7071 9.29289C15.5196 9.10536 15.2652 9 15 9H5Z" fill="currentColor"/></svg> Archive Item</button>';
        html += '</div>';
        html += '</div>'; // end action-card
        html += '</div>'; // end detail-right

        html += '</div>'; // end detail-columns

        container.innerHTML = html;

        // Populate category selects in detail form
        const dCat = document.getElementById('dCat');
        const dSubcat = document.getElementById('dSubcat');
        populateCategories(dCat, () => populateSubcategories(dCat, dSubcat));
        dCat.value = item.category || '';
        populateSubcategories(dCat, dSubcat);
        dSubcat.value = item.subcategory || '';
      } catch (err) {
        container.innerHTML = '<p class="empty">Failed to load item details</p>';
      }
    }
    window.openDetail = openDetail;

    window.setMainImage = function(src) {
      document.getElementById('detailMainImg').innerHTML = '<img src="' + src + '" alt="">';
    };

    window.saveDetail = async function(itemId) {
      try {
        const dLocLat = document.getElementById('dLocLat');
        const dLocLng = document.getElementById('dLocLng');
        const res = await fetch('/items/' + itemId, {
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
          })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        showMsg('detailMsg', 'Saved!', true);
        openDetail(itemId);
      } catch (err) {
        showMsg('detailMsg', err.message, false);
      }
    };

    window.deleteMedia = async function(itemId, mediaId) {
      if (!confirm('Delete this media?')) return;
      await fetch('/items/' + itemId + '/media/' + mediaId, { method: 'DELETE' });
      openDetail(itemId);
    };

    window.uploadDetailMedia = async function(itemId) {
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
        const res = await fetch('/items/' + itemId + '/media', { method: 'POST', body: fd });
        if (!res.ok) {
          try { const err = await res.json(); errors.push(err.error || 'Photo upload failed'); }
          catch { errors.push('Photo upload failed (server error ' + res.status + ')'); }
        }
      }
      if (videos.length > 0) {
        const fd = new FormData();
        videos.forEach(f => fd.append('files', f));
        const res = await fetch('/items/' + itemId + '/media', { method: 'POST', body: fd });
        if (!res.ok) {
          try { const err = await res.json(); errors.push(err.error || 'Video upload failed'); }
          catch { errors.push('Video upload failed (server error ' + res.status + ')'); }
        }
      }
      if (errors.length > 0) alert(errors.join('\\n'));
      input.value = '';
      openDetail(itemId);
    };

    window.deleteItem = async function(itemId) {
      if (!confirm('Archive this item? You can restore it later from the Archive tab.')) return;
      try {
        const res = await fetch('/items/' + itemId, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to archive');
        showToast('Item archived', '');
        switchTab('items');
        loadMyItems();
      } catch {
        alert('Failed to archive item');
      }
    };

    // ===== Search Network =====
    document.getElementById('searchBtn').addEventListener('click', async () => {
      const container = document.getElementById('searchResults');
      const btn = document.getElementById('searchBtn');
      btn.disabled = true;
      container.innerHTML = '<p class="empty">Searching peers...</p>';

      try {
        const params = new URLSearchParams();
        const q = document.getElementById('searchQ').value.trim();
        const c = document.getElementById('searchCat').value;
        const sc = document.getElementById('searchSubcat').value;
        const maxPrice = document.getElementById('searchMaxPrice').value;
        const radiusVal = document.getElementById('searchRadius').value;

        if (q) params.set('q', q);
        if (c) params.set('c', c);
        if (sc) params.set('sc', sc);
        if (maxPrice) params.set('maxPrice', maxPrice);

        // If radius specified, fetch default location and pass lat/lng/radius
        if (radiusVal) {
          try {
            const locRes = await fetch('/settings/location');
            const locData = await locRes.json();
            if (locData.locationLat && locData.locationLng) {
              params.set('lat', String(locData.locationLat));
              params.set('lng', String(locData.locationLng));
              params.set('radius', radiusVal);
            }
          } catch {}
        }

        const res = await fetch('/search?' + params.toString());
        const data = await res.json();

        if (data.results.length === 0) {
          container.innerHTML = '<p class="empty">No peers responded. Are other beacons running?</p>';
          return;
        }

        let cards = '';
        lastSearchResults = [];
        data.results.forEach(peer => {
          const peerItems = peer.items || [];
          const peerOffers = peer.offers || [];
          const peerMedia = peer.media || {};
          const peerHttpPort = peer.httpPort || 0;
          const offerMap = {};
          peerOffers.forEach(o => { if (!offerMap[o.itemId]) offerMap[o.itemId] = []; offerMap[o.itemId].push(o); });

          peerItems.forEach(item => {
            const itemOffers = offerMap[item.id] || [];
            const activeOffer = itemOffers.find(o => o.status === 'active');
            const priceStr = activeOffer ? activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2) : '';
            const badges = [item.category, item.subcategory].filter(Boolean).map(b =>
              '<span class="badge badge-cat">' + escapeHtml(b) + '</span>'
            ).join('');
            const statusClass = statusBadgeClass[item.listingStatus] || 'badge-for-sale';
            const statusLabel = statusLabels[item.listingStatus] || '';
            const itemMedia = peerMedia[item.id] || [];
            const firstPhoto = itemMedia.find(m => m.mediaType === 'photo');

            let actionBtn = '';
            if (item.listingStatus === 'for_sale' && activeOffer) {
              actionBtn = '<button class="btn-primary btn-sm" onclick="event.stopPropagation(); openBuyModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\', ' + activeOffer.price + ', \\'' + escapeHtml(activeOffer.priceCurrency) + '\\')"><svg width="12" height="12" viewBox="0 0 13 14" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.3231 4.33301H2.66709C2.48518 4.33295 2.30518 4.37002 2.1381 4.44199C1.97098 4.51473 1.8203 4.62052 1.69511 4.75299C1.57019 4.88603 1.47385 5.04327 1.41209 5.215C1.35099 5.38639 1.32515 5.56837 1.3361 5.75L1.66911 11.083C1.69023 11.4216 1.83968 11.7394 2.08699 11.9717C2.33429 12.2039 2.66084 12.3332 3.0001 12.333H9.99009C10.3294 12.3332 10.6559 12.2039 10.9032 11.9717C11.1505 11.7394 11.3 11.4216 11.3211 11.083L11.6541 5.75C11.6661 5.56833 11.6402 5.38615 11.5781 5.215C11.5163 5.04327 11.42 4.88603 11.2951 4.75299C11.1706 4.62002 11.02 4.51412 10.8528 4.44186C10.6856 4.36961 10.5053 4.33255 10.3231 4.33301Z" fill="white"/><path d="M3.16212 3.66602C3.15445 3.2234 3.23504 2.78368 3.39912 2.37253C3.5632 1.96137 3.80751 1.58703 4.11781 1.2713C4.42811 0.955576 4.79818 0.704808 5.20643 0.53363C5.61468 0.362453 6.05296 0.274292 6.49565 0.274292C6.93833 0.274292 7.37658 0.362453 7.78483 0.53363C8.19308 0.704808 8.56315 0.955576 8.87346 1.2713C9.18376 1.58703 9.42809 1.96137 9.59217 2.37253C9.75626 2.78368 9.83681 3.2234 9.82914 3.66602V5.00003C9.82247 5.17233 9.74931 5.33535 9.62504 5.4549C9.50078 5.57444 9.33507 5.6412 9.16264 5.6412C8.99021 5.6412 8.82447 5.57444 8.70021 5.4549C8.57594 5.33535 8.50281 5.17233 8.49614 5.00003V3.66602C8.49614 3.13558 8.28542 2.6269 7.91035 2.25183C7.53528 1.87676 7.02657 1.66602 6.49614 1.66602C5.9657 1.66602 5.45699 1.87676 5.08192 2.25183C4.70685 2.6269 4.49614 3.13558 4.49614 3.66602V5.00003C4.49614 5.17693 4.42585 5.34659 4.30076 5.47168C4.17568 5.59677 4.00604 5.66702 3.82914 5.66702C3.65224 5.66702 3.48258 5.59677 3.35749 5.47168C3.23241 5.34659 3.16212 5.17693 3.16212 5.00003V3.66602Z" fill="white"/></svg> Buy at ' + escapeHtml(activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2)) + '</button>';
            } else if (item.listingStatus === 'willing_to_sell') {
              actionBtn = '<button class="btn-secondary btn-sm" onclick="event.stopPropagation(); openOfferModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\')">Make Offer</button>';
            }

            const idx = lastSearchResults.length;
            lastSearchResults.push({ item: item, peer: peer, offer: activeOffer || null, media: itemMedia, httpPort: peerHttpPort });

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
      } catch {
        container.innerHTML = '<p class="empty">Search failed</p>';
      } finally {
        btn.disabled = false;
      }
    });

    // ===== Remote Item Detail (read-only) =====
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

      const catBadges = [item.category, item.subcategory].filter(Boolean).map(b =>
        '<span class="badge badge-cat">' + escapeHtml(b) + '</span>'
      ).join('');
      const statusClass = statusBadgeClass[item.listingStatus] || 'badge-for-sale';
      const statusLabel = statusLabels[item.listingStatus] || '';

      let actionBtn = '';
      if (item.listingStatus === 'for_sale' && offer) {
        actionBtn = '<button class="btn-primary" style="width:100%;" onclick="openBuyModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\', ' + offer.price + ', \\'' + escapeHtml(offer.priceCurrency) + '\\')"><svg width="12" height="12" viewBox="0 0 13 14" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.3231 4.33301H2.66709C2.48518 4.33295 2.30518 4.37002 2.1381 4.44199C1.97098 4.51473 1.8203 4.62052 1.69511 4.75299C1.57019 4.88603 1.47385 5.04327 1.41209 5.215C1.35099 5.38639 1.32515 5.56837 1.3361 5.75L1.66911 11.083C1.69023 11.4216 1.83968 11.7394 2.08699 11.9717C2.33429 12.2039 2.66084 12.3332 3.0001 12.333H9.99009C10.3294 12.3332 10.6559 12.2039 10.9032 11.9717C11.1505 11.7394 11.3 11.4216 11.3211 11.083L11.6541 5.75C11.6661 5.56833 11.6402 5.38615 11.5781 5.215C11.5163 5.04327 11.42 4.88603 11.2951 4.75299C11.1706 4.62002 11.02 4.51412 10.8528 4.44186C10.6856 4.36961 10.5053 4.33255 10.3231 4.33301Z" fill="white"/><path d="M3.16212 3.66602C3.15445 3.2234 3.23504 2.78368 3.39912 2.37253C3.5632 1.96137 3.80751 1.58703 4.11781 1.2713C4.42811 0.955576 4.79818 0.704808 5.20643 0.53363C5.61468 0.362453 6.05296 0.274292 6.49565 0.274292C6.93833 0.274292 7.37658 0.362453 7.78483 0.53363C8.19308 0.704808 8.56315 0.955576 8.87346 1.2713C9.18376 1.58703 9.42809 1.96137 9.59217 2.37253C9.75626 2.78368 9.83681 3.2234 9.82914 3.66602V5.00003C9.82247 5.17233 9.74931 5.33535 9.62504 5.4549C9.50078 5.57444 9.33507 5.6412 9.16264 5.6412C8.99021 5.6412 8.82447 5.57444 8.70021 5.4549C8.57594 5.33535 8.50281 5.17233 8.49614 5.00003V3.66602C8.49614 3.13558 8.28542 2.6269 7.91035 2.25183C7.53528 1.87676 7.02657 1.66602 6.49614 1.66602C5.9657 1.66602 5.45699 1.87676 5.08192 2.25183C4.70685 2.6269 4.49614 3.13558 4.49614 3.66602V5.00003C4.49614 5.17693 4.42585 5.34659 4.30076 5.47168C4.17568 5.59677 4.00604 5.66702 3.82914 5.66702C3.65224 5.66702 3.48258 5.59677 3.35749 5.47168C3.23241 5.34659 3.16212 5.17693 3.16212 5.00003V3.66602Z" fill="white"/></svg> Buy at ' + escapeHtml(offer.priceCurrency + ' ' + offer.price.toFixed(2)) + '</button>';
      } else if (item.listingStatus === 'willing_to_sell') {
        actionBtn = '<button class="btn-secondary" style="width:100%;" onclick="openOfferModal(\\'' + escapeHtml(item.id) + '\\', \\'' + escapeHtml(item.name) + '\\', \\'' + escapeHtml(peer.beaconId) + '\\')">Make Offer</button>';
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

      // Left: item info
      html += '<div class="detail-left">';
      html += '<h1 style="font-size:24px;font-weight:700;color:#141416;margin-bottom:12px;">' + escapeHtml(item.name) + '</h1>';
      html += '<div class="card-meta" style="margin-bottom:12px;"><span class="badge ' + statusClass + '">' + statusLabel + '</span>' + catBadges + '</div>';
      if (item.description) {
        html += '<p style="font-size:15px;color:#353945;line-height:1.71;margin-bottom:16px;">' + escapeHtml(item.description) + '</p>';
      }
      const remoteLoc = [item.locationCity, item.locationState, item.locationZip].filter(Boolean);
      if (remoteLoc.length > 0) {
        html += '<p style="font-size:14px;color:#777E90;margin-bottom:8px;">Near ' + escapeHtml(remoteLoc.join(', ')) + '</p>';
      }
      html += '<div class="beacon-id" style="margin-top:8px;">Seller beacon: ' + escapeHtml(peer.beaconId) + '</div>';
      html += '</div>'; // end detail-left

      // Right: action card
      html += '<div class="detail-right">';
      html += '<div class="action-card">';
      if (offer) {
        html += '<div class="action-price">' + escapeHtml(offer.priceCurrency) + ' ' + offer.price.toFixed(2) + '</div>';
      }
      html += '<div class="action-row"><span class="action-label">Status</span><span class="action-value">' + statusLabel + '</span></div>';
      if (item.quantity > 1) html += '<div class="action-row"><span class="action-label">Qty available</span><span class="action-value">' + item.quantity + '</span></div>';
      if (item.category) html += '<div class="action-row"><span class="action-label">Category</span><span class="action-value">' + escapeHtml(item.category) + '</span></div>';
      if (item.subcategory) html += '<div class="action-row"><span class="action-label">Subcategory</span><span class="action-value">' + escapeHtml(item.subcategory) + '</span></div>';
      if (actionBtn) html += '<div style="margin-top:20px;">' + actionBtn + '</div>';
      html += '</div>'; // end action-card
      html += '</div>'; // end detail-right

      html += '</div>'; // end detail-columns

      container.innerHTML = html;
    };

    // ===== Proposal Modal =====
    window.openBuyModal = function(itemId, itemName, sellerBeaconId, price, currency) {
      document.getElementById('modalItemId').value = itemId;
      document.getElementById('modalItemName').value = itemName;
      document.getElementById('modalSellerBeaconId').value = sellerBeaconId;
      document.getElementById('modalPrice').value = price;
      document.getElementById('modalCurrency').value = currency;
      document.getElementById('modalMessage').value = 'Accepting listed price';
      document.getElementById('modalTitle').textContent = 'Buy: ' + itemName;
      document.getElementById('modalSendBtn').textContent = 'Send Proposal';
      document.getElementById('modalMsg').innerHTML = '';
      document.getElementById('proposalModal').classList.remove('hidden');
    };

    window.openOfferModal = function(itemId, itemName, sellerBeaconId) {
      document.getElementById('modalItemId').value = itemId;
      document.getElementById('modalItemName').value = itemName;
      document.getElementById('modalSellerBeaconId').value = sellerBeaconId;
      document.getElementById('modalPrice').value = '';
      document.getElementById('modalCurrency').value = 'USD';
      document.getElementById('modalMessage').value = '';
      document.getElementById('modalTitle').textContent = 'Make Offer: ' + itemName;
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
            itemId: document.getElementById('modalItemId').value,
            itemName: document.getElementById('modalItemName').value,
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
            '<button class="btn-primary btn-sm" onclick="openRespondModal(\\'' + n.id + '\\', \\'' + escapeHtml(n.itemName || n.itemId.slice(0,8)) + '\\', ' + n.price + ', \\'' + escapeHtml(n.priceCurrency) + '\\', \\'' + escapeHtml(n.message || '') + '\\')">Respond</button>' +
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
            '<span class="neg-item-name">' + escapeHtml(n.itemName || n.itemId.slice(0, 8)) + '</span>' +
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
        if (!groups[n.itemId]) groups[n.itemId] = { itemName: n.itemName || n.itemId.slice(0, 8), negs: [] };
        groups[n.itemId].negs.push(n);
      });
      const tab = isSeller ? 'incoming' : 'outgoing';
      return Object.keys(groups).map(itemId => {
        const g = groups[itemId];
        const total = g.negs.length;
        const pendingCount = g.negs.filter(n => n.status === 'pending' || n.status === 'countered').length;
        const latestStatus = g.negs[0].status;
        const latestDate = new Date(g.negs[0].updatedAt || g.negs[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const countClass = pendingCount > 0 ? 'neg-group-count has-pending' : 'neg-group-count';
        const countLabel = pendingCount > 0 ? total + ' (' + pendingCount + ' active)' : String(total);
        const displayStatus = negStatusLabels[latestStatus] || latestStatus;
        return '<div class="neg-group-row" onclick="showItemNegotiations(\\'' + escapeHtml(itemId) + '\\', ' + (isSeller ? 'true' : 'false') + ', \\'' + tab + '\\')">' +
          '<div class="neg-group-left">' +
            '<span class="neg-group-name">' + escapeHtml(g.itemName) + '</span>' +
            '<span class="' + countClass + '">' + countLabel + '</span>' +
          '</div>' +
          '<div class="neg-group-right">' +
            '<span class="neg-status ' + latestStatus + '">' + displayStatus + '</span>' +
            '<span class="neg-group-date">' + latestDate + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    window.showItemNegotiations = function(itemId, isSeller, tab) {
      const source = isSeller ? cachedIncoming : cachedOutgoing;
      const filtered = source.filter(n => n.itemId === itemId);
      const containerId = tab === 'incoming' ? 'negIncoming' : 'negOutgoing';
      const container = document.getElementById(containerId);
      const itemName = filtered.length > 0 ? escapeHtml(filtered[0].itemName || itemId.slice(0, 8)) : escapeHtml(itemId.slice(0, 8));
      let html = '<span class="neg-group-back" onclick="renderNegGroupedView(\\'' + tab + '\\')">';
      html += '<svg width="6" height="10" viewBox="0 0 4 6" fill="none"><path d="M3.4711 0.2C3.5961 0.325075 3.66632 0.494669 3.66632 0.6715C3.66632 0.848331 3.5961 1.01792 3.4711 1.143L1.6091 3L3.4711 4.862C3.59116 4.98806 3.65718 5.15606 3.65505 5.33013C3.65293 5.5042 3.58284 5.67055 3.45974 5.79364C3.33665 5.91674 3.17031 5.98683 2.99623 5.98895C2.82216 5.99107 2.65416 5.92506 2.5281 5.805L0.200102 3.471C0.0751014 3.34592 0.00488281 3.17633 0.00488281 2.9995C0.00488281 2.82267 0.0751014 2.65308 0.200102 2.528L2.5291 0.2C2.65414 0.0753044 2.82352 0.00527954 3.0001 0.00527954C3.17669 0.00527954 3.34607 0.0753044 3.4711 0.2Z" fill="#EC526F"/></svg>';
      html += ' Back to all items</span>';
      html += '<h3 style="font-size:18px;font-weight:700;color:#141416;margin-bottom:16px;">' + itemName + '</h3>';
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
        const badge = document.getElementById('negCount');
        if (pendingCount > 0) {
          badge.textContent = pendingCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      } catch {
        document.getElementById('negIncoming').innerHTML = '<p class="empty">Failed to load</p>';
        document.getElementById('negOutgoing').innerHTML = '<p class="empty">Failed to load</p>';
      }
    }

    // ===== Respond Modal (seller) =====
    window.openRespondModal = function(negId, itemName, price, currency, message) {
      document.getElementById('respondNegId').value = negId;
      document.getElementById('respondModalTitle').textContent = 'Respond: ' + itemName;
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
      if (!confirm('Mark this deal as sold? This will decrement the item quantity.')) return;
      try {
        const res = await fetch('/negotiations/' + negId + '/mark-sold', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        showToast('Deal marked as sold!', 'sold');
        loadNegotiations();
        loadMyItems();
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

    window.toggleSync = async function(itemId, checkbox) {
      const sync = checkbox.checked;
      try {
        const res = await fetch('/settings/sync-item/' + itemId, {
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
          showToast(sync ? 'Item marked for sync (remote pending)' : 'Item unsynced locally (remote pending)', 'accepted');
        } else {
          showToast(sync ? 'Item synced to Reffo.ai' : 'Item removed from Reffo.ai', sync ? 'accepted' : '');
        }
        // Refresh items list to update synced badges
        loadMyItems();
      } catch (err) {
        showToast('Sync failed: ' + err.message, 'rejected');
      }
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

    loadMyItems();
    initOutgoingSnapshot();

    // Check for pending negotiations periodically
    setInterval(async () => {
      // Seller: update incoming badge
      try {
        const res = await fetch('/negotiations?role=seller');
        const incoming = await res.json();
        const pendingCount = incoming.filter(n => n.status === 'pending').length;
        const badge = document.getElementById('negCount');
        if (pendingCount > 0) {
          badge.textContent = pendingCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      } catch {}

      // Buyer: detect status changes and show toasts
      try {
        const res = await fetch('/negotiations?role=buyer');
        const outgoing = await res.json();
        for (const neg of outgoing) {
          const prev = prevOutgoingStatuses[neg.id];
          if (prev && prev !== neg.status && neg.status !== 'pending' && neg.status !== 'withdrawn') {
            const itemLabel = neg.itemName || neg.itemId;
            if (neg.status === 'accepted') {
              showToast('\u2713 Your offer on "' + itemLabel + '" was accepted!', 'accepted');
            } else if (neg.status === 'rejected') {
              showToast('\u2717 Your offer on "' + itemLabel + '" was declined.', 'rejected');
            } else if (neg.status === 'countered') {
              const cp = neg.counterPrice ? ' at $' + neg.counterPrice : '';
              showToast('\u21a9 Counter offer received for "' + itemLabel + '"' + cp, 'countered');
            } else if (neg.status === 'sold') {
              showToast('\u2713 Deal for "' + itemLabel + '" is complete!', 'sold');
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
