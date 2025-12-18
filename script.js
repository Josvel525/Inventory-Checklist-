const PACK_SIZES = [1, 6, 12, 18, 24, 32, 40];
const REPORT_FILENAME = "bartending-inventory-report.csv";

// fallback data so the app renders even if inventory.json cannot be fetched (e.g. file:// usage)
const DEFAULT_INVENTORY = [
  { name: "Diet Coke", category: "Non-Alcoholic", unit: "can", pack: 24 },
  { name: "Coke Zero", category: "Non-Alcoholic", unit: "can", pack: 24 },
  { name: "Sprite", category: "Non-Alcoholic", unit: "can", pack: 24 },
  { name: "Ginger Beer (Fever-Tree)", category: "Non-Alcoholic", unit: "can", pack: 24 },
  { name: "Pineapple Juice (Dole)", category: "Non-Alcoholic", unit: "can", pack: 24 },
  { name: "Topo Chico", category: "Mixers / Water", unit: "bottle", pack: 12 },
  { name: "Lime Juice (Country Fare)", category: "Mixers / Water", unit: "bottle", pack: 12 },
  { name: "Cranberry Juice (Ocean Spray)", category: "Mixers / Water", unit: "bottle", pack: 12 },
  { name: "Diet Tonic Water (H-E-B)", category: "Mixers / Water", unit: "bottle", pack: 12 },
  { name: "Miller Lite", category: "Beer", unit: "can", pack: 24 },
  { name: "Dos Equis", category: "Beer", unit: "can", pack: 24 },
  { name: "Shiner", category: "Beer", unit: "can", pack: 24 },
  { name: "Karbach Love Street", category: "Beer", unit: "can", pack: 18 },
  { name: "Michelob Ultra", category: "Beer", unit: "can", pack: 24 },
  { name: "Modelo", category: "Beer", unit: "can", pack: 24 },
  { name: "Jack Daniel's", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Malibu Coconut Rum", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Svedka Raspberry", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Ketel One", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Bombay Sapphire Gin", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "El Jimador Tequila (Silver)", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Titos Vodka", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Dewarcs White Label", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Bacardi Superior", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Triple Sec", category: "Spirits", unit: "bottle", pack: 6 },
  { name: "Ryan Patrick Pinot Grigio", category: "Wine", unit: "bottle", pack: 12 },
  { name: "Old Mountain Sauvignon Blanc", category: "Wine", unit: "bottle", pack: 12 },
  { name: "Old Mountain Cabernet Sauvignon", category: "Wine", unit: "bottle", pack: 12 },
  { name: "Introvert Pinot Noir", category: "Wine", unit: "bottle", pack: 12 },
  { name: "Ice Bags", category: "Supplies", unit: "bag", pack: 1 },
  { name: "Bags of Cups", category: "Supplies", unit: "stack", pack: 1 }
];

let products = [];

function loadProductsForExport() {
  try {
    const stored = localStorage.getItem("products");
    const parsed = stored ? normalizeProducts(JSON.parse(stored)) : [];
    if (parsed.length) return parsed;
  } catch (err) {
    console.warn("Unable to read products from storage", err);
  }
  return products.length ? normalizeProducts(products) : [];
}

function normalizeProducts(list) {
  return (list || []).map(p => ({
    ...p,
    singles: Number.isFinite(p.singles) ? p.singles : 0,
    cases: Number.isFinite(p.cases) ? p.cases : 0,
    pack: parseInt(p.pack, 10) || 24,
    completed: Boolean(p.completed)
  }));
}

function save(renderNow = true) {
  localStorage.setItem("products", JSON.stringify(products));
  if (renderNow) render();
}

function renderLoading() {
  const el = document.getElementById("inventory");
  if (!el) return;
  el.innerHTML = `<div class="product loading">Loading inventory…</div>`;
}

function render() {
  const el = document.getElementById("inventory");
  if (!el) return;

  if (!products.length) {
    el.innerHTML = `<div class="product loading">No products loaded.</div>`;
    return;
  }

  const activeProducts = products.filter(p => !p.completed);

  if (!activeProducts.length) {
    el.innerHTML = `<div class="product loading">All products are completed. Add new items to continue.</div>`;
    return;
  }

  el.innerHTML = products.reduce((markup, p, i) => {
    if (p.completed) return markup;
    const totalUnits = getTotalUnits(p);

    return markup + `
      <div class="product">
        <div class="rowTop">
          <div class="rowInfo">
            <strong>${p.name}</strong>
            <span class="pill">${p.category || "Uncategorized"}</span>
          </div>
          <button class="secondary" onclick="completeProduct(${i})">Complete</button>
        </div>

        <div class="grid countsGrid">
          ${quantityControl("Singles", p.singles || 0, i, "singles")}
          ${quantityControl("Cases", p.cases || 0, i, "cases")}

          <label>
            <span>Pack</span>
            <select onchange="products[${i}].pack=parseInt(this.value, 10);save()">
              ${packOptions(p.pack).map(size =>
                `<option value="${size}" ${size === (p.pack || 24) ? "selected" : ""}>${size}</option>`
              ).join("")}
            </select>
          </label>
        </div>

        <div class="total">Total Units: ${totalUnits}</div>
      </div>
    `;
  }, "");
}

function completeProduct(index) {
  if (!products[index]) return;
  products[index].completed = true;
  save();
}

function addProduct() {
  const n = document.getElementById("name").value.trim();
  const c = document.getElementById("category").value.trim();
  const u = document.getElementById("unit").value;

  if (!n) return;

  products.unshift({
    name: n,
    category: c || "Uncategorized",
    unit: u,
    singles: 0,
    cases: 0,
    pack: 24,
    completed: false
  });

  document.getElementById("name").value = "";
  document.getElementById("category").value = "";

  save(true);
}

async function generateCSV() {
  const dataset = loadProductsForExport();

  if (!dataset.length) {
    alert("No products available to export yet.");
    return;
  }

  let csv = "Item,Category,Singles,Cases,Pack,Total Units\n";
  const categoryTotals = {};
  let grandTotal = 0;

  dataset.forEach(p => {
    const totalUnits = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);
    grandTotal += totalUnits;
    categoryTotals[p.category] = (categoryTotals[p.category] || 0) + totalUnits;

    csv += `${p.name},${p.category},${p.singles || 0},${p.cases || 0},${p.pack || 24},${totalUnits}\n`;
  });

  csv += "\nCategory Subtotals\n";
  Object.keys(categoryTotals).forEach(cat => {
    csv += `${cat},${categoryTotals[cat]}\n`;
  });

  csv += `\nGrand Total,${grandTotal}\n`;

  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, REPORT_FILENAME);

  window.open("report.html", "_blank");
  await promptShareReport(blob, REPORT_FILENAME);
}

function packOptions(currentPack) {
  const merged = new Set([...PACK_SIZES, currentPack || 24]);
  return Array.from(merged).sort((a, b) => a - b);
}

function quantityControl(label, value, index, field) {
  return `
    <label class="quantityControl">
      <span>${label}</span>
      <div class="stepper" role="group" aria-label="${label}">
        <button type="button" class="stepperButton" aria-label="Decrease ${label.toLowerCase()}" onclick="changeCount(${index}, '${field}', -1)">-</button>
        <div class="stepperValue" aria-live="polite">${value}</div>
        <button type="button" class="stepperButton" aria-label="Increase ${label.toLowerCase()}" onclick="changeCount(${index}, '${field}', 1)">+</button>
      </div>
    </label>
  `;
}

function changeCount(index, field, delta) {
  const product = products[index];
  if (!product || (field !== "singles" && field !== "cases")) return;

  const next = Math.max(0, (product[field] || 0) + delta);
  product[field] = next;
  save();
}

function getTotalUnits(product) {
  return (product.singles || 0) + (product.cases || 0) * (product.pack || 24);
}

function triggerDownload(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

async function promptShareReport(blob, filename) {
  const smsNumber = "+15555551234"; // placeholder SMS number
  const shareText = `Inventory report ready to send to ${smsNumber}. Attach ${filename} if prompted.`;

  const shareableFile = createShareableFile(blob, filename);
  const shareData = shareableFile
    ? { files: [shareableFile], title: "Bartending Inventory Report", text: shareText }
    : { title: "Bartending Inventory Report", text: shareText };

  if (navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      console.warn("Share was cancelled or failed", err);
    }
  }

  alert(`Tap OK to open your messages app and send the report to ${smsNumber}. Attach ${filename} from your downloads if prompted.`);
  openSmsDraft(smsNumber, shareText);
}

function createShareableFile(blob, filename) {
  if (typeof File !== "undefined") {
    try {
      return new File([blob], filename, { type: "text/csv" });
    } catch (err) {
      console.warn("Could not create File from blob", err);
    }
  }
  return null;
}

function openSmsDraft(number, bodyText = "Inventory report is ready to send.") {
  const sanitizedNumber = (number || "").replace(/[^+\d]/g, "");
  const delimiter = /iPad|iPhone|iPod/i.test(navigator.userAgent || "") ? "&" : "?";
  const smsLink = `sms:${sanitizedNumber}${bodyText ? `${delimiter}body=${encodeURIComponent(bodyText)}` : ""}`;

  // using location.href is more reliable for deep links than window.open
  window.location.href = smsLink;
}

/* INIT */
renderLoading();

fetch("inventory.json")
  .then(res => {
    if (!res.ok) throw new Error("inventory.json not found");
    return res.json();
  })
  .then(defaults => {
    const stored = localStorage.getItem("products");
    products = stored
      ? normalizeProducts(JSON.parse(stored))
      : normalizeProducts(defaults.map(p => ({ ...p, singles: 0, cases: 0 })));
    save(false);      // save storage
    render();         // ✅ CRITICAL: render after load
  })
  .catch(err => {
    console.error(err);
    // fallback: try localStorage first, otherwise seed with built-in defaults
    const stored = localStorage.getItem("products");
    products = stored
      ? normalizeProducts(JSON.parse(stored))
      : normalizeProducts(DEFAULT_INVENTORY.map(p => ({ ...p, singles: 0, cases: 0 })));
    save(false);
    render();
  });
