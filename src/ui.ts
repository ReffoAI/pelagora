import { TAXONOMY } from './taxonomy';

export function renderUI(): string {
  const taxonomyJSON = JSON.stringify(TAXONOMY);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reffo Beacon</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.5; }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 1.6rem; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .bolt { display: inline-block; filter: drop-shadow(0 0 6px #ff2d95) drop-shadow(0 0 12px #ff2d95); }
    .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 24px; }
    h2 { font-size: 1.2rem; margin-bottom: 12px; color: #222; border-bottom: 2px solid #4a90d9; padding-bottom: 4px; }
    section { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; color: #555; }
    input, select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; margin-bottom: 12px; }
    input:focus, select:focus { outline: none; border-color: #4a90d9; box-shadow: 0 0 0 2px rgba(74,144,217,0.2); }
    .row { display: flex; gap: 12px; }
    .row > div { flex: 1; }
    button { background: #4a90d9; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-size: 0.9rem; cursor: pointer; }
    button:hover { background: #357abd; }
    button:disabled { background: #aaa; cursor: not-allowed; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-top: 12px; }
    .card { border: 1px solid #e0e0e0; border-radius: 6px; padding: 14px; background: #fafafa; }
    .card h3 { font-size: 1rem; margin-bottom: 4px; }
    .card .meta { font-size: 0.8rem; color: #888; margin-bottom: 6px; }
    .card .price { font-size: 1.1rem; font-weight: 700; color: #2a7a2a; }
    .card .desc { font-size: 0.85rem; color: #555; margin-top: 4px; }
    .card .badge { display: inline-block; background: #e8f0fe; color: #4a90d9; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; margin-right: 4px; }
    .msg { padding: 10px; border-radius: 4px; margin-bottom: 12px; font-size: 0.85rem; }
    .msg.ok { background: #e6f4ea; color: #1e7e34; }
    .msg.err { background: #fce8e6; color: #c5221f; }
    .empty { color: #999; font-style: italic; margin-top: 8px; }
    .search-bar { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
    .search-bar > div { flex: 1; min-width: 140px; }
    .search-bar button { margin-bottom: 12px; align-self: flex-end; }
    .beacon-id { font-size: 0.75rem; color: #999; word-break: break-all; }
    .badge-private { background: #e0e0e0; color: #666; }
    .badge-for-sale { background: #e6f4ea; color: #1e7e34; }
    .badge-willing { background: #fff8e1; color: #f57f17; }
    .status-select { width: auto; display: inline-block; font-size: 0.75rem; padding: 2px 6px; margin: 4px 0; }
    .btn-delete { background: #dc3545; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; margin-top: 6px; }
    .btn-delete:hover { background: #c82333; }
    .card-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
  </style>
</head>
<body>
  <div class="container">
    <h1><svg class="bolt" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" fill="#ff2d95" stroke="#ff2d95" stroke-width="1" stroke-linejoin="round"/></svg> Reffo Beacon</h1>
    <p class="subtitle">Decentralized commerce &mdash; your node, your inventory</p>

    <!-- List an Item -->
    <section>
      <h2>List an Item</h2>
      <div id="listMsg"></div>
      <form id="listForm">
        <label for="itemName">Name *</label>
        <input id="itemName" name="name" required placeholder="e.g. Fender Stratocaster">

        <label for="itemDesc">Description</label>
        <input id="itemDesc" name="description" placeholder="Condition, details...">

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

        <button type="submit">List Item</button>
      </form>
    </section>

    <!-- My Items -->
    <section>
      <h2>My Items</h2>
      <div id="myItems"><p class="empty">Loading...</p></div>
    </section>

    <!-- Search Network -->
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
        <button id="searchBtn">Search</button>
      </div>
      <div id="searchResults"><p class="empty">Enter a query and click Search</p></div>
    </section>
  </div>

  <script>
    const TAXONOMY = ${taxonomyJSON};

    // Populate category dropdowns
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

    // Init dropdowns
    populateCategories(document.getElementById('itemCat'), () =>
      populateSubcategories(document.getElementById('itemCat'), document.getElementById('itemSubcat'))
    );
    populateCategories(document.getElementById('searchCat'), () =>
      populateSubcategories(document.getElementById('searchCat'), document.getElementById('searchSubcat'))
    );

    // Show message
    function showMsg(elId, text, ok) {
      const el = document.getElementById(elId);
      el.innerHTML = '<div class="msg ' + (ok ? 'ok' : 'err') + '">' + text + '</div>';
      setTimeout(() => el.innerHTML = '', 4000);
    }

    // List form submit
    document.getElementById('listForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;

      try {
        const name = document.getElementById('itemName').value.trim();
        const description = document.getElementById('itemDesc').value.trim();
        const category = document.getElementById('itemCat').value;
        const subcategory = document.getElementById('itemSubcat').value;
        const listingStatus = document.getElementById('itemListingStatus').value;
        const priceVal = document.getElementById('itemPrice').value;
        const price = priceVal ? parseFloat(priceVal) : 0;
        const currency = document.getElementById('itemCurrency').value;

        // Create item
        const itemRes = await fetch('/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, category, subcategory, listingStatus })
        });
        if (!itemRes.ok) {
          const err = await itemRes.json();
          throw new Error(err.error || 'Failed to create item');
        }
        const item = await itemRes.json();

        // Create offer only if not private and price > 0
        if (listingStatus !== 'private' && price > 0) {
          const offerRes = await fetch('/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: item.id, price, priceCurrency: currency })
          });
          if (!offerRes.ok) {
            const err = await offerRes.json();
            throw new Error(err.error || 'Failed to create offer');
          }
        }

        showMsg('listMsg', 'Item added successfully!', true);
        e.target.reset();
        document.getElementById('itemSubcat').innerHTML = '<option value="">Select...</option>';
        loadMyItems();
      } catch (err) {
        showMsg('listMsg', err.message, false);
      } finally {
        btn.disabled = false;
      }
    });

    // Load my items
    async function loadMyItems() {
      const container = document.getElementById('myItems');
      try {
        const [itemsRes, offersRes] = await Promise.all([
          fetch('/items'),
          fetch('/offers')
        ]);
        const items = await itemsRes.json();
        const offers = await offersRes.json();

        if (items.length === 0) {
          container.innerHTML = '<p class="empty">No items yet. List your first item above!</p>';
          return;
        }

        const offerMap = {};
        offers.forEach(o => {
          if (!offerMap[o.itemId]) offerMap[o.itemId] = [];
          offerMap[o.itemId].push(o);
        });

        const statusLabels = { private: 'Private', for_sale: 'For Sale', willing_to_sell: 'Willing to Sell' };
        const statusBadgeClass = { private: 'badge-private', for_sale: 'badge-for-sale', willing_to_sell: 'badge-willing' };

        container.innerHTML = '<div class="cards">' + items.map(item => {
          const itemOffers = offerMap[item.id] || [];
          const activeOffer = itemOffers.find(o => o.status === 'active');
          const priceStr = activeOffer ? activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2) : '';
          const catBadges = [item.category, item.subcategory].filter(Boolean).map(b =>
            '<span class="badge">' + escapeHtml(b) + '</span>'
          ).join('');
          const statusClass = statusBadgeClass[item.listingStatus] || 'badge-private';
          const statusLabel = statusLabels[item.listingStatus] || 'Private';
          const statusBadge = '<span class="badge ' + statusClass + '">' + statusLabel + '</span>';
          return '<div class="card">' +
            '<h3>' + escapeHtml(item.name) + '</h3>' +
            '<div class="meta">' + statusBadge + catBadges + '</div>' +
            (priceStr ? '<div class="price">' + escapeHtml(priceStr) + '</div>' : '') +
            (item.description ? '<div class="desc">' + escapeHtml(item.description) + '</div>' : '') +
            '<div class="card-actions">' +
              '<select class="status-select" data-item-id="' + item.id + '" onchange="updateStatus(this)">' +
                '<option value="private"' + (item.listingStatus === 'private' ? ' selected' : '') + '>Private</option>' +
                '<option value="for_sale"' + (item.listingStatus === 'for_sale' ? ' selected' : '') + '>For Sale</option>' +
                '<option value="willing_to_sell"' + (item.listingStatus === 'willing_to_sell' ? ' selected' : '') + '>Willing to Sell</option>' +
              '</select>' +
              '<button class="btn-delete" onclick="deleteItem(\\'' + item.id + '\\')">Delete</button>' +
            '</div>' +
            '</div>';
        }).join('') + '</div>';
      } catch {
        container.innerHTML = '<p class="empty">Failed to load items</p>';
      }
    }

    // Search network
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

        if (q) params.set('q', q);
        if (c) params.set('c', c);
        if (sc) params.set('sc', sc);
        if (maxPrice) params.set('maxPrice', maxPrice);

        const res = await fetch('/search?' + params.toString());
        const data = await res.json();

        if (data.results.length === 0) {
          container.innerHTML = '<p class="empty">No peers responded. Are other beacons running?</p>';
          return;
        }

        let cards = '';
        data.results.forEach(peer => {
          const peerItems = peer.items || [];
          const peerOffers = peer.offers || [];
          const offerMap = {};
          peerOffers.forEach(o => {
            if (!offerMap[o.itemId]) offerMap[o.itemId] = [];
            offerMap[o.itemId].push(o);
          });

          peerItems.forEach(item => {
            const itemOffers = offerMap[item.id] || [];
            const activeOffer = itemOffers.find(o => o.status === 'active');
            const priceStr = activeOffer ? activeOffer.priceCurrency + ' ' + activeOffer.price.toFixed(2) : 'No price';
            const badges = [item.category, item.subcategory].filter(Boolean).map(b =>
              '<span class="badge">' + escapeHtml(b) + '</span>'
            ).join('');
            cards += '<div class="card">' +
              '<h3>' + escapeHtml(item.name) + '</h3>' +
              '<div class="meta">' + badges + '</div>' +
              '<div class="price">' + escapeHtml(priceStr) + '</div>' +
              (item.description ? '<div class="desc">' + escapeHtml(item.description) + '</div>' : '') +
              '<div class="beacon-id">Beacon: ' + escapeHtml(peer.beaconId.slice(0, 16)) + '...</div>' +
              '</div>';
          });
        });

        container.innerHTML = '<p style="font-size:0.85rem;color:#666;margin-bottom:8px;">' +
          data.peers + ' peer(s) responded</p><div class="cards">' + cards + '</div>';
      } catch {
        container.innerHTML = '<p class="empty">Search failed</p>';
      } finally {
        btn.disabled = false;
      }
    });

    function escapeHtml(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    // Update listing status inline
    window.updateStatus = async function(selectEl) {
      const itemId = selectEl.dataset.itemId;
      const listingStatus = selectEl.value;
      try {
        const res = await fetch('/items/' + itemId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingStatus })
        });
        if (!res.ok) throw new Error('Failed to update');
        loadMyItems();
      } catch {
        alert('Failed to update status');
        loadMyItems();
      }
    };

    // Delete item with confirmation
    window.deleteItem = async function(itemId) {
      if (!confirm('Delete this item? This cannot be undone.')) return;
      try {
        const res = await fetch('/items/' + itemId, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        loadMyItems();
      } catch {
        alert('Failed to delete item');
      }
    };

    // Load items on page load
    loadMyItems();
  </script>
</body>
</html>`;
}
