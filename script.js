(() => {
  // =========================
  // Inventory Checklist - Hardened Runtime
  // Works even if IDs change.
  // =========================

  const STORE_KEY = "inventory_state_LOCKED_MAIN"; // DO NOT CHANGE AGAIN
  const CASE_SIZES = [12, 18, 24, 30, 36];

  // Default items (replace/expand anytime)
  const DEFAULT_ITEMS = [
    { name: "Miller Lite", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },
    { name: "Michelob Ultra", primaryUnit: "case", caseSize: 30, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },
    { name: "Dos Equis", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },
    { name: "Shiner", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },

    { name: "Jack Daniel's", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },
    { name: "Malibu Rum", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },
    { name: "Ketel One Vodka", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false }
  ];

  // ---------- helpers ----------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function findButtonByText(text) {
    const btns = qsa("button");
    return btns.find(b => (b.textContent || "").trim().toLowerCase() === text.toLowerCase());
  }

  function safeJsonParse(v) {
    try { return JSON.parse(v); } catch { return null; }
  }

  function getState() {
    return safeJsonParse(localStorage.getItem(STORE_KEY));
  }

  function setState(s) {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }

  function ensureState() {
    let s = getState();
    if (!s || !Array.isArray(s.items)) {
      s = {
        meta: { venue: "", event: "", completedBy: "", date: "" },
        items: DEFAULT_ITEMS.map(x => ({ ...x }))
      };
      setState(s);
      status(`Initialized default inventory (${s.items.length} items).`);
    }
    return s;
  }

  function normalizeItem(i) {
    return {
      name: String(i.name || "Unnamed Item"),
      primaryUnit: i.primaryUnit || "each",
      caseSize: Number.isFinite(+i.caseSize) ? +i.caseSize : 24,
      primaryQty: Number.isFinite(+i.primaryQty) ? +i.primaryQty : 0,
      secondaryUnit: i.secondaryUnit || "",
      secondaryQty: Number.isFinite(+i.secondaryQty) ? +i.secondaryQty : 0,
      completed: !!i.completed
    };
  }

  function totalCans(i) {
    if (i.primaryUnit === "case") return (i.primaryQty * (i.caseSize || 0)) + (i.secondaryQty || 0);
    // for non-case items, treat primaryQty as “each”
    return i.primaryQty || 0;
  }

  // ---------- UI wiring (robust) ----------
  // Try your known IDs first (from your UI), otherwise fallback by structure/text.
  const elVenue = qs("#venueName") || qs('input[placeholder*="Venue"]') || null;
  const elEvent = qs("#eventName") || qs('input[placeholder*="Event"]') || null;
  const elDate = qs("#eventDate") || qs('input[type="date"]') || null;

  // Completed by: you said you want editable (NOT stuck at “Member”)
  // If you have a select + custom input, we use it. If not, we create one.
  const memberSelect = qs("#memberSelect");
  const customNameInput = qs("#bartenderName");
  const customWrap = qs("#customMemberWrap");

  // Inventory container: your page shows an “Inventory” section; we try common IDs; else fallback to the section after the “Inventory” heading.
  let inventoryRoot = qs("#inventoryRoot");
  if (!inventoryRoot) {
    // fallback: find the heading containing "Inventory" then next element
    const headings = qsa("h1,h2,h3,header,section");
    const invMarker = headings.find(h => (h.textContent || "").toLowerCase().includes("inventory"));
    if (invMarker) {
      // try next sibling container
      inventoryRoot = invMarker.nextElementSibling || invMarker.parentElement;
    }
  }
  if (!inventoryRoot) {
    // final fallback: create at bottom
    inventoryRoot = document.createElement("div");
    document.body.appendChild(inventoryRoot);
  }

  const grandTotalEl = qs("#grandTotal") || qs("[data-grand-total]") || null;

  const btnSave = qs("#btnSave") || findButtonByText("Save") || null;
  const btnExportExcel = qs("#btnExportExcel") || findButtonByText("Export Excel") || null;
  const btnExportPDF = qs("#btnExportPDF") || findButtonByText("Export PDF") || null;
  const btnLoadTemplate = qs("#btnLoadTemplate") || findButtonByText("Load Template") || null;
  const btnReport = qs("#btnReport") || findButtonByText("Report") || null;

  // Status line (visible)
  const statusBar = document.createElement("div");
  statusBar.style.cssText = "position:sticky;top:0;z-index:9999;background:#111827;color:#fff;padding:8px 10px;font:14px system-ui;opacity:.92";
  statusBar.textContent = "Inventory script loaded.";
  document.body.prepend(statusBar);

  function status(msg) {
    statusBar.textContent = msg;
    console.log("[Inventory]", msg);
  }

  // Create Pending/Completed sections INSIDE inventoryRoot (so we don't depend on your HTML having them)
  const shell = document.createElement("div");
  shell.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0;">
      <div style="flex:1;min-width:280px;">
        <h3 style="margin:6px 0;">Pending</h3>
        <div id="__pending"></div>
      </div>
      <div style="flex:1;min-width:280px;">
        <h3 style="margin:6px 0;">Completed</h3>
        <div id="__completed"></div>
      </div>
    </div>
  `;
  inventoryRoot.innerHTML = ""; // replace whatever was there (it was empty anyway)
  inventoryRoot.appendChild(shell);

  const pendingEl = qs("#__pending", shell);
  const completedEl = qs("#__completed", shell);

  // Editable completed-by field if your current UI is select-only or missing
  let completedByInput = qs("#completedBy");
  if (!completedByInput) {
    completedByInput = document.createElement("input");
    completedByInput.type = "text";
    completedByInput.placeholder = "Inventory completed by (full name)";
    completedByInput.style.cssText = "width:100%;max-width:520px;padding:10px;border:1px solid #ddd;border-radius:10px;margin:8px 0;";
    // put it near top (after status bar)
    statusBar.insertAdjacentElement("afterend", completedByInput);
  }

  function readCompletedBy() {
    // If your page has memberSelect/custom, we respect it. Otherwise we use the input we created.
    if (memberSelect) {
      const v = memberSelect.value || "";
      if (v === "custom") return (customNameInput?.value || "").trim();
      return v.trim();
    }
    return (completedByInput.value || "").trim();
  }

  function syncMetaToState(s) {
    s.meta.venue = (elVenue?.value || "").trim();
    s.meta.event = (elEvent?.value || "").trim();
    s.meta.date = (elDate?.value || "").trim();
    s.meta.completedBy = readCompletedBy();
  }

  function render() {
    const s = ensureState();
    // Normalize defensively (never drop items)
    s.items = s.items.map(normalizeItem);
    setState(s);

    pendingEl.innerHTML = "";
    completedEl.innerHTML = "";

    let grand = 0;

    s.items.forEach((i, idx) => {
      const total = totalCans(i);
      grand += total;

      const card = document.createElement("div");
      card.style.cssText = "border:1px solid #e5e7eb;border-radius:14px;padding:10px;margin:8px 0;background:#fff";

      const topRow = document.createElement("div");
      topRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;";

      const left = document.createElement("div");
      left.innerHTML = `
        <label style="display:flex;align-items:center;gap:10px;font-weight:700;">
          <input type="checkbox" data-idx="${idx}" ${i.completed ? "checked" : ""} />
          <span>${i.name}</span>
        </label>
        <div style="font-size:13px;opacity:.8;margin-top:4px;">
          Total cans: <strong>${total}</strong>
        </div>
      `;

      const controls = document.createElement("div");
      controls.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end;";

      // Qty controls: cases + loose cans (only show case size dropdown for case items)
      const caseCtl = document.createElement("div");
      caseCtl.style.cssText = "display:flex;gap:6px;align-items:center;border:1px solid #eee;border-radius:12px;padding:6px;";

      const btnDecCase = document.createElement("button");
      btnDecCase.textContent = "−";
      btnDecCase.dataset.action = "decCase";
      btnDecCase.dataset.idx = String(idx);

      const caseVal = document.createElement("span");
      caseVal.style.cssText = "min-width:26px;text-align:center;font-weight:700;";
      caseVal.textContent = String(i.primaryQty);

      const btnIncCase = document.createElement("button");
      btnIncCase.textContent = "+";
      btnIncCase.dataset.action = "incCase";
      btnIncCase.dataset.idx = String(idx);

      const caseLabel = document.createElement("span");
      caseLabel.style.cssText = "font-size:12px;opacity:.8;";
      caseLabel.textContent = i.primaryUnit;

      caseCtl.append(btnDecCase, caseVal, btnIncCase, caseLabel);

      const canCtl = document.createElement("div");
      canCtl.style.cssText = "display:flex;gap:6px;align-items:center;border:1px solid #eee;border-radius:12px;padding:6px;";

      const btnDecCan = document.createElement("button");
      btnDecCan.textContent = "−";
      btnDecCan.dataset.action = "decCan";
      btnDecCan.dataset.idx = String(idx);

      const canVal = document.createElement("span");
      canVal.style.cssText = "min-width:26px;text-align:center;font-weight:700;";
      canVal.textContent = String(i.secondaryQty);

      const btnIncCan = document.createElement("button");
      btnIncCan.textContent = "+";
      btnIncCan.dataset.action = "incCan";
      btnIncCan.dataset.idx = String(idx);

      const canLabel = document.createElement("span");
      canLabel.style.cssText = "font-size:12px;opacity:.8;";
      canLabel.textContent = i.secondaryUnit || "";

      canCtl.append(btnDecCan, canVal, btnIncCan, canLabel);

      controls.appendChild(caseCtl);

      if (i.primaryUnit === "case") {
        // case size dropdown
        const sel = document.createElement("select");
        sel.dataset.action = "caseSize";
        sel.dataset.idx = String(idx);
        sel.style.cssText = "padding:6px;border-radius:10px;border:1px solid #eee;";
        CASE_SIZES.forEach(n => {
          const opt = document.createElement("option");
          opt.value = String(n);
          opt.textContent = `${n}/case`;
          if (n === i.caseSize) opt.selected = true;
          sel.appendChild(opt);
        });
        controls.appendChild(sel);
        controls.appendChild(canCtl);
      }

      topRow.append(left, controls);
      card.appendChild(topRow);

      if (i.completed) completedEl.appendChild(card);
      else pendingEl.appendChild(card);
    });

    if (grandTotalEl) grandTotalEl.textContent = String(grand);
    status(`Loaded ${s.items.length} items. Saved under "${STORE_KEY}". Total cans: ${grand}`);
  }

  function saveMetaOnly() {
    const s = ensureState();
    syncMetaToState(s);
    setState(s);
    status("Saved.");
  }

  // ---------- events ----------
  inventoryRoot.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const idx = Number(btn.dataset.idx);
    if (!Number.isInteger(idx)) return;

    const s = ensureState();
    s.items = s.items.map(normalizeItem);

    const it = s.items[idx];
    if (!it) return;

    if (action === "incCase") it.primaryQty += 1;
    if (action === "decCase") it.primaryQty = Math.max(0, it.primaryQty - 1);
    if (action === "incCan") it.secondaryQty += 1;
    if (action === "decCan") it.secondaryQty = Math.max(0, it.secondaryQty - 1);

    setState(s);
    render();
  });

  inventoryRoot.addEventListener("change", (e) => {
    const t = e.target;

    // checkbox completed
    if (t.matches('input[type="checkbox"][data-idx]')) {
      const idx = Number(t.dataset.idx);
      const s = ensureState();
      s.items = s.items.map(normalizeItem);
      if (s.items[idx]) s.items[idx].completed = !!t.checked;
      setState(s);
      render();
      return;
    }

    // case size selector
    if (t.matches('select[data-action="caseSize"][data-idx]')) {
      const idx = Number(t.dataset.idx);
      const s = ensureState();
      s.items = s.items.map(normalizeItem);
      if (s.items[idx]) s.items[idx].caseSize = Number(t.value);
      setState(s);
      render();
      return;
    }

    // your member select toggles custom field
    if (t === memberSelect) {
      if (customWrap) customWrap.style.display = (memberSelect.value === "custom") ? "block" : "none";
    }
  });

  if (btnSave) btnSave.addEventListener("click", () => saveMetaOnly());

  // Load Template button: replaces items with DEFAULT_ITEMS (safe reset)
  if (btnLoadTemplate) {
    btnLoadTemplate.addEventListener("click", () => {
      if (!confirm("Load default template and replace current items?")) return;
      const s = ensureState();
      s.items = DEFAULT_ITEMS.map(x => ({ ...x }));
      syncMetaToState(s);
      setState(s);
      render();
    });
  }

  // Export Excel: requires xlsx library; if missing, we warn.
  if (btnExportExcel) {
    btnExportExcel.addEventListener("click", () => {
      const s = ensureState();
      syncMetaToState(s);
      setState(s);

      if (!s.meta.completedBy) {
        alert("Enter the bartender name (Inventory completed by) before exporting.");
        return;
      }
      if (!window.XLSX) {
        alert("Excel export library (XLSX) not loaded on this page.");
        return;
      }

      const rows = [["Item", "Cases", "Cans/Case", "Loose Cans", "Total Cans", "Completed"]];
      s.items.map(normalizeItem).forEach(i => {
        rows.push([
          i.name,
          i.primaryUnit === "case" ? i.primaryQty : "",
          i.primaryUnit === "case" ? i.caseSize : "",
          i.primaryUnit === "case" ? i.secondaryQty : "",
          totalCans(i),
          i.completed ? "Yes" : "No"
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      XLSX.writeFile(wb, `Inventory_${(s.meta.date || "date")}.xlsx`);
      status("Exported Excel.");
    });
  }

  // Export PDF / Report: open report.html if present.
  function openReport() {
    const s = ensureState();
    syncMetaToState(s);
    setState(s);

    if (!s.meta.completedBy) {
      alert("Enter the bartender name (Inventory completed by) before exporting.");
      return;
    }
    window.open("report.html", "_blank");
  }

  if (btnExportPDF) btnExportPDF.addEventListener("click", openReport);
  if (btnReport) btnReport.addEventListener("click", openReport);

  // ---------- init ----------
  // Ensure state exists and render.
  ensureState();
  render();
})();