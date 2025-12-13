const STORE_KEY = "venue_inventory_v1";

const els = {
  venue: document.getElementById("venueName"),
  event: document.getElementById("eventName"),
  bartender: document.getElementById("bartenderName"),
  date: document.getElementById("eventDate"),

  inventory: document.getElementById("inventoryRoot"),
  totals: document.getElementById("totalsRoot"),
  grand: document.getElementById("grandTotal"),

  btnSave: document.getElementById("btnSave"),
  btnReport: document.getElementById("btnReport"),
  btnExportExcel: document.getElementById("btnExportExcel"),
  btnExportPDF: document.getElementById("btnExportPDF"),
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function ensureState() {
  let s = JSON.parse(localStorage.getItem(STORE_KEY));
  if (!s) {
    s = { meta: { date: today() }, items: [] };
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }
  return s;
}

function syncFromUI(state) {
  state.meta.venue = els.venue.value.trim();
  state.meta.event = els.event.value.trim();
  state.meta.bartender = els.bartender.value.trim();
  state.meta.date = els.date.value || today();
}

function requireBartender(state) {
  if (!state.meta.bartender) {
    alert("Bartender name is required before exporting.");
    return false;
  }
  return true;
}

function saveState() {
  const s = ensureState();
  syncFromUI(s);
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

function exportExcel() {
  const s = ensureState();
  syncFromUI(s);
  if (!requireBartender(s)) return;

  const rows = [
    ["Venue", s.meta.venue],
    ["Event", s.meta.event],
    ["Bartender", s.meta.bartender],
    ["Date", s.meta.date],
    [],
    ["Category", "Item", "Unit", "Quantity", "Notes"]
  ];

  s.items.forEach(i => {
    rows.push([
      i.category,
      i.name,
      i.unit,
      i.qty,
      i.notes || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  XLSX.writeFile(
    wb,
    `Inventory_${s.meta.venue || "Venue"}_${s.meta.date}.xlsx`
  );
}

els.btnSave.onclick = saveState;

els.btnExportExcel.onclick = exportExcel;

els.btnExportPDF.onclick = () => {
  const s = ensureState();
  syncFromUI(s);
  if (!requireBartender(s)) return;
  window.open("report.html", "_blank");
};

els.btnReport.onclick = els.btnExportPDF;
