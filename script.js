(() => {
  const STORE_KEY = "venue_inventory_v1";
  const TEMPLATE_URL = "data.json";

  const els = {
    venue: document.getElementById("venueName"),
    event: document.getElementById("eventName"),
    bartender: document.getElementById("bartenderName"),
    date: document.getElementById("eventDate"),

    inventoryRoot: document.getElementById("inventoryRoot"),
    totalsRoot: document.getElementById("totalsRoot"),
    grandTotal: document.getElementById("grandTotal"),

    search: document.getElementById("search"),

    btnLoadTemplate: document.getElementById("btnLoadTemplate"),
    btnAddItem: document.getElementById("btnAddItem"),
    btnExportJSON: document.getElementById("btnExportJSON"),
    btnSave: document.getElementById("btnSave"),
    btnReport: document.getElementById("btnReport"),
    btnReset: document.getElementById("btnReset"),
    btnClearSearch: document.getElementById("btnClearSearch"),
    btnExportExcel: document.getElementById("btnExportExcel"),
    btnExportPDF: document.getElementById("btnExportPDF"),

    modal: document.getElementById("modalAddItem"),
    addItemForm: document.getElementById("addItemForm"),
    btnCancelAdd: document.getElementById("btnCancelAdd"),

    newCategory: document.getElementById("newCategory"),
    newProductType: document.getElementById("newProductType"),
    newBrand: document.getElementById("newBrand"),
    newName: document.getElementById("newName"),
    newUnit: document.getElementById("newUnit"),
    newQty: document.getElementById("newQty"),
    newNotes: document.getElementById("newNotes"),
  };

  function safeId() {
    return Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function getState() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function setState(state) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function ensureState() {
    let state = getState();
    if (!state) {
      state = { meta: { venue: "", event: "", bartender: "", date: todayISO() }, items: [] };
      setState(state);
    }
    return state;
  }

  function syncMetaToUI(state) {
    els.venue.value = state.meta.venue || "";
    els.event.value = state.meta.event || "";
    els.bartender.value = state.meta.bartender || "";
    els.date.value = state.meta.date || todayISO();
  }

  function syncMetaFromUI(state) {
    state.meta.venue = els.venue.value.trim();
    state.meta.event = els.event.value.trim();
    state.meta.bartender = els.bartender.value.trim();
    state.meta.date = els.date.value || todayISO();
  }

  function requireBartender(state) {
    if (!state.meta.bartender) {
      alert("Please enter the bartender’s name before exporting.");
      return false;
    }
    return true;
  }

  function normalizeItem(raw) {
    return {
      id: raw.id || safeId(),
      category: raw.category || "Other",
      productType: raw.productType || "",
      brand: raw.brand || "",
      name: raw.name || "Unnamed",
      unit: raw.unit || "each",
      qty: Number.isFinite(Number(raw.qty)) ? Number(raw.qty) : 0,
      notes: raw.notes || "",
      checked: !!raw.checked,
    };
  }

  function groupByCategory(items) {
    const m = new Map();
    for (const it of items) {
      const cat = it.category || "Other";
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat).push(it);
    }
    return m;
  }

  function matchesSearch(item, q) {
    if (!q) return true;
    const hay = [
      item.category, item.productType, item.brand, item.name, item.unit, item.notes
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function render() {
    const state = ensureState();
    syncMetaToUI(state);

    const q = (els.search?.value || "").trim().toLowerCase();

    state.items = (state.items || []).map(normalizeItem);
    setState(state);

    const items = state.items;
    const grouped = groupByCategory(items);
    const categories = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

    const html = categories.map(cat => {
      const list = grouped.get(cat)
        .filter(it => matchesSearch(it, q))
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      if (q && list.length === 0) return "";

      const subtotal = list.reduce((acc, it) => acc + Number(it.qty || 0), 0);

      const rows = list.map(it => `
        <div class="item" data-id="${escapeHtml(it.id)}">
          <div class="itemTop">
            <div>
              <div class="itemName">${escapeHtml(it.name)}</div>
              <div class="itemMeta">
                ${escapeHtml([it.brand, it.productType].filter(Boolean).join(" • ")) || "—"}
                &nbsp;•&nbsp; <span class="pill">${escapeHtml(it.unit || "each")}</span>
              </div>
            </div>

            <div class="itemActions">
              <button class="iconbtn" type="button" data-action="toggle" aria-label="Toggle checked">
                ${it.checked ? "✅" : "☐"}
              </button>
              <button class="iconbtn" type="button" data-action="delete" aria-label="Delete item">🗑️</button>
            </div>
          </div>

          <div class="itemBottom">
            <div class="qty">
              <button class="qtybtn" type="button" data-action="dec">−</button>
              <div class="qtyval" data-role="qty">${Number(it.qty || 0)}</div>
              <button class="qtybtn" type="button" data-action="inc">+</button>
            </div>

            <label class="field" style="flex:1; min-width:220px;">
              <span class="field__label">Unit Type</span>
              <select class="input" data-role="unit">
                ${["bottle","can","case","pack","box","bag","each"].map(u => `
                  <option value="${u}" ${u === (it.unit || "each") ? "selected" : ""}>${u}</option>
                `).join("")}
              </select>
            </label>

            <label class="field" style="flex:1; min-width:240px;">
              <span class="field__label">Notes</span>
              <input class="input" data-role="notes" type="text"
                     value="${escapeHtml(it.notes)}" placeholder="Optional notes..." />
            </label>
          </div>
        </div>
      `).join("");

      return `
        <div class="section">
          <div class="section__head">
            <div>
              <div class="section__title">${escapeHtml(cat)}</div>
              <div class="section__sub">Subtotal (visible): <strong>${subtotal}</strong></div>
            </div>
            <div class="pill">${list.length} items</div>
          </div>
          ${rows || `<div class="item"><div class="pill pill--warn">No matches in this category.</div></div>`}
        </div>
      `;
    }).join("");

    els.inventoryRoot.innerHTML = html || `<div class="pill pill--warn">No items yet. Tap “Load Template” or “+ Add Item”.</div>`;

    // Totals (all items, not filtered)
    const totals = new Map();
    let grand = 0;
    for (const it of items) {
      const qty = Number(it.qty || 0);
      grand += qty;
      totals.set(it.category || "Other", (totals.get(it.category || "Other") || 0) + qty);
    }

    const totalCats = Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    els.totalsRoot.innerHTML = totalCats.map(([cat, qty]) => `
      <div class="totalLine">
        <div class="totalLine__label">${escapeHtml(cat)}</div>
        <div class="totalLine__value">${qty}</div>
      </div>
    `).join("");

    els.grandTotal.textContent = String(grand);
  }

  function updateItem(id, patch) {
    const state = ensureState();
    const idx = (state.items || []).findIndex(it => it.id === id);
    if (idx === -1) return;
    state.items[idx] = { ...state.items[idx], ...patch };
    syncMetaFromUI(state);
    setState(state);
    render();
  }

  function deleteItem(id) {
    const state = ensureState();
    state.items = (state.items || []).filter(it => it.id !== id);
    syncMetaFromUI(state);
    setState(state);
    render();
  }

  function saveNow() {
    const state = ensureState();
    syncMetaFromUI(state);
    setState(state);
    render();
  }

  async function loadTemplate() {
    const proceed = confirm("Load template from data.json?\n\nThis will replace your current item list (your event info stays).");
    if (!proceed) return;

    const state = ensureState();
    syncMetaFromUI(state);

    try {
      const res = await fetch(TEMPLATE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load data.json");
      const tpl = await res.json();

      const tplItems = Array.isArray(tpl.items) ? tpl.items : [];
      state.items = tplItems.map(normalizeItem); // give IDs
      setState(state);
      render();
      alert("Template loaded.");
    } catch (e) {
      console.error(e);
      alert("Could not load data.json. Confirm it exists in the same folder and GitHub Pages is enabled.");
    }
  }

  function openAddModal() {
    // reset fields
    els.newCategory.value = "";
    els.newProductType.value = "";
    els.newBrand.value = "";
    els.newName.value = "";
    els.newUnit.value = "bottle";
    els.newQty.value = 0;
    els.newNotes.value = "";

    // iOS-safe open
    if (els.modal?.showModal) els.modal.showModal();
    else els.modal?.setAttribute("open", "open");
  }

  function closeAddModal() {
    if (els.modal?.close) els.modal.close();
    else els.modal?.removeAttribute("open");
  }

  function addItemFromModal() {
    const state = ensureState();
    syncMetaFromUI(state);

    const item = normalizeItem({
      id: safeId(),
      category: els.newCategory.value.trim(),
      productType: els.newProductType.value.trim(),
      brand: els.newBrand.value.trim(),
      name: els.newName.value.trim(),
      unit: els.newUnit.value,
      qty: Number(els.newQty.value || 0),
      notes: els.newNotes.value.trim(),
      checked: false
    });

    if (!item.category || !item.name) {
      alert("Category and Item Name are required.");
      return;
    }

    state.items.push(item);
    setState(state);
    closeAddModal();
    render();
  }

  function exportJSON() {
    const state = ensureState();
    syncMetaFromUI(state);

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventory_${(state.meta.venue || "venue").replaceAll(" ", "_")}_${state.meta.date || todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function exportExcel() {
    const state = ensureState();
    syncMetaFromUI(state);
    if (!requireBartender(state)) return;

    const rows = [
      ["Venue", state.meta.venue],
      ["Event", state.meta.event],
      ["Bartender", state.meta.bartender],
      ["Date", state.meta.date],
      [],
      ["Category", "Item Name", "Brand", "Product Type", "Unit Type", "Quantity", "Notes"]
    ];

    (state.items || []).forEach(it => {
      rows.push([
        it.category || "",
        it.name || "",
        it.brand || "",
        it.productType || "",
        it.unit || "",
        Number(it.qty || 0),
        it.notes || ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");

    const file = `Inventory_${(state.meta.venue || "Venue").replaceAll(" ", "_")}_${state.meta.date || todayISO()}.xlsx`;
    XLSX.writeFile(wb, file);
  }

  function exportPDF() {
    const state = ensureState();
    syncMetaFromUI(state);
    if (!requireBartender(state)) return;
    window.open("report.html", "_blank");
  }

  // Events
  els.btnSave?.addEventListener("click", saveNow);
  els.btnLoadTemplate?.addEventListener("click", loadTemplate);
  els.btnAddItem?.addEventListener("click", openAddModal);
  els.btnExportJSON?.addEventListener("click", exportJSON);
  els.btnExportExcel?.addEventListener("click", exportExcel);
  els.btnExportPDF?.addEventListener("click", exportPDF);
  els.btnReport?.addEventListener("click", exportPDF);

  els.btnClearSearch?.addEventListener("click", () => {
    if (els.search) els.search.value = "";
    render();
  });

  els.search?.addEventListener("input", render);

  els.btnReset?.addEventListener("click", () => {
    const ok = confirm("Reset ALL saved inventory data on this device?");
    if (!ok) return;
    localStorage.removeItem(STORE_KEY);
    render();
  });

  els.btnCancelAdd?.addEventListener("click", closeAddModal);

  els.addItemForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    addItemFromModal();
  });

  // Inventory click/input delegation
  els.inventoryRoot?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const itemEl = btn.closest(".item");
    if (!itemEl) return;
    const id = itemEl.getAttribute("data-id");
    const action = btn.getAttribute("data-action");

    const state = ensureState();
    const item = (state.items || []).find(x => x.id === id);
    if (!item) return;

    if (action === "inc") updateItem(id, { qty: Number(item.qty || 0) + 1 });
    if (action === "dec") updateItem(id, { qty: Math.max(0, Number(item.qty || 0) - 1) });
    if (action === "toggle") updateItem(id, { checked: !item.checked });
    if (action === "delete") {
      const ok = confirm(`Delete "${item.name}"?`);
      if (ok) deleteItem(id);
    }
  });

  els.inventoryRoot?.addEventListener("input", (e) => {
    const itemEl = e.target.closest(".item");
    if (!itemEl) return;
    const id = itemEl.getAttribute("data-id");

    if (e.target.matches('[data-role="notes"]')) {
      updateItem(id, { notes: e.target.value });
    }
    if (e.target.matches('[data-role="unit"]')) {
      updateItem(id, { unit: e.target.value });
    }
  });

  // Initial
  render();
})();