(() => {
  const STORE_KEY = "venue_inventory_main";
  const TEMPLATE_URL = "data.json";
  const CASE_OPTIONS = [12, 18, 24, 30, 36];

  const $ = id => document.getElementById(id);
  const today = () => new Date().toISOString().split("T")[0];

  const els = {
    venue: $("venueName"),
    event: $("eventName"),
    completedBy: $("completedBy"),
    date: $("eventDate"),

    pending: $("pendingInventory"),
    completed: $("completedInventory"),
    grand: $("grandTotal"),

    btnSave: $("btnSave"),
    btnExportExcel: $("btnExportExcel"),
    btnExportPDF: $("btnExportPDF"),
    btnLoadTemplate: $("btnLoadTemplate")
  };

  /* ---------------- STATE ---------------- */

  function getState() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY));
    } catch {
      return null;
    }
  }

  function setState(s) {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }

  function ensureState() {
    let s = getState();
    if (!s) {
      s = {
        meta: { venue: "", event: "", completedBy: "", date: today() },
        items: []
      };
      setState(s);
    }
    return s;
  }

  function syncMeta(s) {
    s.meta.venue = els.venue?.value || "";
    s.meta.event = els.event?.value || "";
    s.meta.completedBy = els.completedBy?.value || "";
    s.meta.date = els.date?.value || today();
  }

  /* ---------------- NORMALIZE (SAFE) ---------------- */

  function normalizeItem(raw, index) {
    return {
      id: raw.id || `item_${index}`,
      name: raw.name || "Unnamed Item",
      category: raw.category || "",
      productType: raw.productType || "",
      brand: raw.brand || "",
      primaryUnit: raw.primaryUnit || "each",
      primaryQty: Number(raw.primaryQty ?? 0),
      caseSize: Number(raw.caseSize ?? 24),
      secondaryUnit: raw.secondaryUnit || "",
      secondaryQty: Number(raw.secondaryQty ?? 0),
      completed: Boolean(raw.completed),
      notes: raw.notes || ""
    };
  }

  /* ---------------- LOAD TEMPLATE (ONCE) ---------------- */

  async function loadTemplateIfEmpty() {
    const s = ensureState();
    if (Array.isArray(s.items) && s.items.length > 0) return;

    try {
      const res = await fetch(TEMPLATE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load data.json");

      const tpl = await res.json();
      s.items = (tpl.items || []).map(normalizeItem);
      setState(s);

      console.info(`Loaded ${s.items.length} inventory items`);
    } catch (err) {
      console.error("Inventory load failed:", err);
    }
  }

  /* ---------------- INVENTORY LOGIC ---------------- */

  function totalCans(i) {
    if (i.primaryUnit === "case") {
      return (i.primaryQty * i.caseSize) + i.secondaryQty;
    }
    return i.primaryQty;
  }

  /* ---------------- RENDER ---------------- */

  function render() {
    const s = ensureState();
    syncMeta(s);
    setState(s);

    els.pending.innerHTML = "";
    els.completed.innerHTML = "";

    let grand = 0;

    s.items.forEach((i, idx) => {
      const total = totalCans(i);
      grand += total;

      const row = `
        <div class="pill">
          <label>
            <input type="checkbox" data-i="${idx}" ${i.completed ? "checked" : ""}>
            <strong>${i.name}</strong>
          </label><br>

          ${i.primaryQty} ${i.primaryUnit}
          ${i.primaryUnit === "case" ? ` @ ${i.caseSize}/case` : ""}<br>
          ${i.secondaryQty} ${i.secondaryUnit || ""}<br>
          <strong>Total cans:</strong> ${total}
        </div>
      `;

      if (i.completed) {
        els.completed.insertAdjacentHTML("beforeend", row);
      } else {
        els.pending.insertAdjacentHTML("beforeend", row);
      }
    });

    els.grand.textContent = grand;
  }

  /* ---------------- EVENTS ---------------- */

  document.body.addEventListener("change", e => {
    if (e.target.type === "checkbox") {
      const s = ensureState();
      const idx = Number(e.target.dataset.i);
      if (!Number.isInteger(idx)) return;

      s.items[idx].completed = e.target.checked;
      setState(s);
      render();
    }
  });

  els.btnSave.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    setState(s);
    alert("Saved");
  };

  els.btnExportExcel.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    setState(s);

    if (!s.meta.completedBy) {
      alert("Please enter who completed the inventory.");
      return;
    }

    const rows = [
      ["Item", "Cases", "Cans/Case", "Loose Cans", "Total Cans", "Completed"]
    ];

    s.items.forEach(i => {
      rows.push([
        i.name,
        i.primaryUnit === "case" ? i.primaryQty : "",
        i.primaryUnit === "case" ? i.caseSize : "",
        i.secondaryQty,
        totalCans(i),
        i.completed ? "Yes" : "No"
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_${s.meta.date}.xlsx`);
  };

  els.btnExportPDF.onclick = () => {
    const s = ensureState();
    syncMeta(s);
    setState(s);

    if (!s.meta.completedBy) {
      alert("Please enter who completed the inventory.");
      return;
    }

    window.open("report.html", "_blank");
  };

  /* ---------------- INIT ---------------- */

  loadTemplateIfEmpty().then(render);
})();