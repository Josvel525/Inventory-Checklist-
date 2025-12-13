(() => {
  const STORE_KEY = "venue_inventory_v4";
  const TEMPLATE_URL = "data.json";
  const CASE_OPTIONS = [12, 18, 24, 30, 36];

  const $ = id => document.getElementById(id);

  const els = {
    venue: $("venueName"),
    event: $("eventName"),
    bartender: $("bartenderName"),
    date: $("eventDate"),

    inventory: $("inventoryRoot"),
    grand: $("grandTotal"),

    btnLoadTemplate: $("btnLoadTemplate"),
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

  function syncMeta(s) {
    s.meta.venue = els.venue.value.trim();
    s.meta.event = els.event.value.trim();
    s.meta.bartender = els.bartender.value.trim();
    s.meta.date = els.date.value || today();
  }

  function requireBartender(s) {
    if (!s.meta.bartender) {
      alert("Bartender name is required before export.");
      return false;
    }
    return true;
  }

  function normalize(i) {
    return {
      id: i.id || uid(),
      category: i.category,
      productType: i.productType || "",
      brand: i.brand || "",
      name: i.name,
      primaryUnit: i.primaryUnit,
      caseSize: i.caseSize || 24,
      primaryQty: Number(i.primaryQty || 0),
      secondaryUnit: i.secondaryUnit || "",
      secondaryQty: Number(i.secondaryQty || 0),
      notes: i.notes || ""
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

      const caseDropdown = it.primaryUnit === "case"
        ? `
          <label class="field">
            <span class="field__label">Cans per case</span>
            <select data-role="caseSize" class="input">
              ${CASE_OPTIONS.map(n =>
                `<option value="${n}" ${n === it.caseSize ? "selected" : ""}>${n}</option>`
              ).join("")}
            </select>
          </label>
        `
        : "";

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

          ${caseDropdown}
        </div>
      `;
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

  els.inventory.addEventListener("change", e => {
    if (e.target.matches('[data-role="caseSize"]')) {
      const itemEl = e.target.closest(".item");
      updateItem(itemEl.dataset.id, { caseSize: Number(e.target.value) });
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
      ["Item", "Cases", "Cans/Case", "Loose Cans"]
    ];

    s.items.forEach(i => {
      rows.push([
        i.name,
        i.primaryUnit === "case" ? i.primaryQty : "",
        i.primaryUnit === "case" ? i.caseSize : "",
        i.secondaryQty
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_${s.meta.date}.xlsx`);
  };

  render();
})();