const PACK_SIZES = [6, 12, 18, 24, 32, 40];

let products = [];

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

  el.innerHTML = "";

  products.forEach((p, i) => {
    const totalUnits = (p.singles || 0) + (p.cases || 0) * (p.pack || 24);

    el.innerHTML += `
      <div class="product">
        <div class="rowTop">
          <strong>${p.name}</strong>
          <span class="pill">${p.category || "Uncategorized"}</span>
        </div>

        <div class="grid">
          <label>
            <span>Singles</span>
            <input type="number" min="0" value="${p.singles || 0}"
              onchange="products[${i}].singles=this.valueAsNumber||0;save()">
          </label>

          <label>
            <span>Cases</span>
            <input type="number" min="0" value="${p.cases || 0}"
              onchange="products[${i}].cases=this.valueAsNumber||0;save()">
          </label>

          <label>
            <span>Pack</span>
            <select onchange="products[${i}].pack=this.valueAsNumber;save()">
              ${PACK_SIZES.map(size =>
                `<option ${size === (p.pack || 24) ? "selected" : ""}>${size}</option>`
              ).join("")}
            </select>
          </label>
        </div>

        <div class="total">Total Units: ${totalUnits}</div>
      </div>
    `;
  });
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
    pack: 24
  });

  document.getElementById("name").value = "";
  document.getElementById("category").value = "";

  save(true);
}

function generateCSV() {
  let csv = "Item,Category,Singles,Cases,Pack,Total Units\n";
  const categoryTotals = {};
  let grandTotal = 0;

  products.forEach(p => {
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
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bartending-inventory-report.csv";
  link.click();

  window.open("report.html", "_blank");
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
      ? JSON.parse(stored)
      : defaults.map(p => ({ ...p, singles: 0, cases: 0 }));
    save(false);      // save storage
    render();         // ✅ CRITICAL: render after load
  })
  .catch(err => {
    console.error(err);
    // fallback: try localStorage anyway
    const stored = localStorage.getItem("products");
    products = stored ? JSON.parse(stored) : [];
    render();
  });
