(() => {
  /* ===============================
     STORAGE (LOCKED + MIGRATION)
  ================================ */
  const STORE_KEY = "venue_inventory_main";
  const LEGACY_KEYS = [
    "venue_inventory_v1",
    "venue_inventory_v2",
    "venue_inventory_v3",
    "venue_inventory_v4",
    "venue_inventory_v5"
  ];
  const TEMPLATE_URL = "data.json";
  const CASE_OPTIONS = [12, 18, 24, 30, 36];

  /* ===============================
     HELPERS
  ================================ */
  const $ = id => document.getElementById(id);
  const today = () => new Date().toISOString().split("T")[0];
  const uid = () => Math.random().toString(36).slice(2);

  const els = {
    venue: $("venueName"),
    event: $("eventName"),
    memberSelect: $("memberSelect"),
    bartender: $("bartenderName"),
    customWrap: $("customMemberWrap"),
    date: $("eventDate"),

    inventory: $("inventoryRoot"),
    grand: $("grandTotal"),

    btnLoadTemplate: $("btnLoadTemplate"),
    btnSave: $("btnSave"),
    btnReport: $("btnReport"),
    btnExportExcel: $("btnExportExcel"),
    btnExportPDF: $("btnExportPDF")
  };

  /* ===============================
     STORAGE CORE
  ================================ */
  function migrateLegacyInventory() {
    if (localStorage.getItem(STORE_KEY)) return;

    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) {
        localStorage.setItem(STORE_KEY, legacy);
        console.warn(`Migrated inventory from ${key}`);
        return;
      }
    }
  }

  const getState = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY));
    } catch {
      return null;
    }
  };

  const setState = s =>
    localStorage.setItem(STORE_KEY, JSON.stringify(s));

  function ensureState() {
    let s = getState();
    if (!s) {
      s = { meta: { venue:"", event:"", bartender:"", date: today() }, items: [] };
      setState(s);
    }
    return s;
  }

  /* ===============================
     META
  ================================ */
  function syncMeta(s) {
    s.meta.venue = els.venue?.value?.trim() || "";
    s.meta.event = els.event?.value?.trim() || "";
    s.meta.date = els.date?.value || today();

    if (els.memberSelect?.value === "custom") {
      s.meta.bartender = els.bartender?.value?.trim() || "";
    } else {
      s.meta.bartender = els.memberSelect?.value || "";
    }
  }

  function requireBartender(s) {
    if (!s.meta.bartender) {
      alert("Please select who completed the inventory.");
      return false;
    }
    return true;
  }

  /* ===============================
     INVENTORY LOGIC
  ================================ */
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

  function totalCans(i) {
    if (i.primaryUnit === "case") {
      return (i.primaryQty * i.caseSize) + i.secondaryQty;
    }
    return i.primaryQty;
  }

  /* ===============================
     AUTO-BOOTSTRAP TEMPLATE
  ================================ */
  async function ensureInventoryLoaded() {
    const s = ensureState();

    if (Array.isArray(s.items) && s.items.length > 0) {
      return;
    }

    try {
      const res = await fetch(TEMPLATE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Template fetch failed");

      const tpl = await res.json();
      s.items = (tpl.items || []).map(normalize);
      setState(s);

      console.warn("Inventory auto-loaded from data.json");
    } catch (err) {
      console.error("Failed to auto-load template:", err);
    }
  }

  /* ===============================
     RENDER
  ================================ */
  function render() {
    const s = ensureState();
    syncMeta(s);
    setState(s);

    let grand = 0;

    els.inventory.innerHTML = (s.items || []).map(i => {
      const total = totalCans(i);
      grand += total;

      return `
        <div class="pill" style="margin-bottom:8px;">
          <strong>${i.name}</strong><br/>
          ${i.primaryQty} ${i.primaryUnit}(s) @ ${i.caseSize}/case +
          ${i.secondaryQty} ${i.secondaryUnit || ""}<br/>
          <strong>Total cans:</strong> ${total}
        </div>
      `;
    }).join("") || `<div class="pill">No inventory loaded.</div>`;

    els.grand.textContent = grand;
  }

  /* ===============================
     EVENTS
  ================================ */
  els.memberSelect?.addEventListener("change", () => {
    els.customWrap.style.display =
      els.memberSelect.value === "custom" ? "block" : "none";
  });

  els.btnSave.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    setState(s);
    alert("Saved");
  };

  els.btnReport.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    setState(s);
    if (!requireBartender(s)) return;
    window.open("report.html", "_blank");
  };

  els.btnExportPDF.onclick = els.btnReport;

  els.btnExportExcel.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    setState(s);
    if (!requireBartender(s)) return;

    const rows = [
      ["Item", "Cases", "Cans/Case", "Loose Cans", "Total Cans"]
    ];

    s.items.forEach(i => {
      rows.push([
        i.name,
        i.primaryQty,
        i.caseSize,
        i.secondaryQty,
        totalCans(i)
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_${s.meta.date}.xlsx`);
  };

  /* ===============================
     INIT (ORDER MATTERS)
  ================================ */
  migrateLegacyInventory();
  ensureInventoryLoaded().then(render);
})();