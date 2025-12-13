(() => {
  const STORE_KEY = "venue_inventory_v2";
  const TEMPLATE_URL = "data.json";

  const $ = id => document.getElementById(id);

  const els = {
    venue: $("venueName"),
    event: $("eventName"),
    bartender: $("bartenderName"),
    date: $("eventDate"),

    inventory: $("inventoryRoot"),
    totals: $("totalsRoot"),
    grand: $("grandTotal"),

    btnLoadTemplate: $("btnLoadTemplate"),
    btnAddItem: $("btnAddItem"),
    btnSave: $("btnSave"),
    btnExportExcel: $("btnExportExcel"),
    btnExportPDF: $("btnExportPDF"),
    btnReport: $("btnReport")
  };

  const uid = () => Math.random().toString(36).slice(2);

  const today = () => new Date().toISOString().split("T")[0];

  const getState = () => JSON.parse(localStorage.getItem(STORE_KEY));
  const setState = s => localStorage.setItem(STORE_KEY, JSON.stringify(s));

  function ensureState() {
    let s = getState();
    if (!s) {
      s = { meta: { venue: "", event: "", bartender: "", date: today() }, items: [] };
      setState(s);
    }
    return s;
  }

  function syncMeta(state) {
    state.meta.venue = els.venue.value.trim();
    state.meta.event = els.event.value.trim();
    state.meta.bartender = els.bartender.value.trim();
    state.meta.date = els.date.value || today();
  }

  function requireBartender(state) {
    if (!state.meta.bartender) {
      alert("Bartender name is required.");
      return false;
    }
    return true;
  }

  function normalize(item) {
    return {
      id: item.id || uid(),
      category: item.category,
      productType: item.productType || "",
      brand: item.brand || "",
      name: item.name,
      primaryUnit: item.primaryUnit,
      primaryQty: Number(item.primaryQty || 0),
      secondaryUnit: item.secondaryUnit || "",
      secondaryQty: Number(item.secondaryQty || 0),
      notes: item.notes || ""
    };
  }

  function render() {
    const s = ensureState();
    syncMeta(s);

    s.items = s.items.map(normalize);
    setState(s);

    let grand = 0;

    els.inventory.innerHTML = s.items.map(it => {
      grand += it.primaryQty + it.secondaryQty;

      return `
      <div class="item" data-id="${it.id}">
        <div class="itemTop">
          <div>
            <div class="itemName">${it.name}</div>
            <div class="itemMeta">${it.brand} • ${it.productType}</div>
          </div>
          <button class="iconbtn" data-action="delete">🗑️</button>
        </div>

        <div class="dual-qty">
          <div class="qty-group">
            <button data-action="dec-primary">−</button>
            <span>${it.primaryQty}</span>
            <button data-action="inc-primary">+</button>
            <small>${it.primaryUnit}</small>
          </div>

          ${it.secondaryUnit ? `
          <div class="qty-group">
            <button data-action="dec-secondary">−</button>
            <span>${it.secondaryQty}</span>
            <button data-action="inc-secondary">+</button>
            <small>${it.secondaryUnit}</small>
          </div>
          ` : ""}
        </div>
      </div>`;
    }).join("");

    els.grand.textContent = grand;
  }

  function updateItem(id, patch) {
    const s = ensureState();
    const i = s.items.find(x => x.id === id);
    if (!i) return;
    Object.assign(i, patch);
    setState(s);
    render();
  }

  els.inventory.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const itemEl = btn.closest(".item");
    const id = itemEl.dataset.id;
    const s = ensureState();
    const it = s.items.find(x => x.id === id);
    if (!it) return;

    const a = btn.dataset.action;

    if (a === "inc-primary") updateItem(id, { primaryQty: it.primaryQty + 1 });
    if (a === "dec-primary") updateItem(id, { primaryQty: Math.max(0, it.primaryQty - 1) });
    if (a === "inc-secondary") updateItem(id, { secondaryQty: it.secondaryQty + 1 });
    if (a === "dec-secondary") updateItem(id, { secondaryQty: Math.max(0, it.secondaryQty - 1) });

    if (a === "delete" && confirm(`Delete ${it.name}?`)) {
      s.items = s.items.filter(x => x.id !== id);
      setState(s);
      render();
    }
  });

  els.btnLoadTemplate.onclick = async () => {
    if (!confirm("Load default template? This replaces current items.")) return;
    const s = ensureState();
    syncMeta(s);
    const r = await fetch(TEMPLATE_URL);
    const j = await r.json();
    s.items = j.items.map(normalize);
    setState(s);
    render();
  };

  els.btnSave.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    setState(s);
    alert("Saved");
  };

  els.btnExportPDF.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    if (!requireBartender(s)) return;
    window.open("report.html", "_blank");
  };

  els.btnReport.onclick = els.btnExportPDF;

  els.btnExportExcel.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    if (!requireBartender(s)) return;

    const rows = [
      ["Item", "Primary Qty", "Primary Unit", "Secondary Qty", "Secondary Unit"]
    ];

    s.items.forEach(i => {
      rows.push([
        i.name,
        i.primaryQty,
        i.primaryUnit,
        i.secondaryQty,
        i.secondaryUnit
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_${s.meta.date}.xlsx`);
  };

  render();
})();