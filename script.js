/* =================================================
   CONFIG
================================================= */
const PACK_SIZES = [6, 12, 18, 24, 32, 40];

/* =================================================
   LOAD PRODUCTS (JSON → localStorage)
================================================= */
let products = [];

fetch("inventory.json")
  .then(res => res.json())
  .then(defaults => {
    const stored = localStorage.getItem("products");
    products = stored
      ? JSON.parse(stored)
      : defaults.map(p => ({
          ...p,
          singles: 0,
          cases: 0
        }));
    save(false);
  });

/* =================================================
   SAVE + RENDER
================================================= */
function save(renderNow = true) {
  localStorage.setItem("products", JSON.stringify(products));
  if (renderNow) render();
}

function render() {
  const el = document.getElementById("inventory");
  el.innerHTML = "";

  products.forEach((p, i) => {
    const totalUnits = p.singles + p.cases * p.pack;

    el.innerHTML += `
      <div class="product">
        <strong>${p.name}</strong> (${p.category})<br>

        Singles
        <input type="number" min="0" value="${p.singles}"
          onchange="products[${i}].singles=this.valueAsNumber||0;save()">

        Cases
        <input type="number" min="0" value="${p.cases}"
          onchange="products[${i}].cases=this.valueAsNumber||0;save()">

        Pack Size
        <select onchange="products[${i}].pack=this.valueAsNumber;save()">
          ${PACK_SIZES.map(size =>
            `<option ${size === p.pack ? "selected" : ""}>${size}</option>`
          ).join("")}
        </select>

        <div class="total">Total Units: ${totalUnits}</div>
      </div>
    `;
  });
}

/* =================================================
   ADD PRODUCT
================================================= */
function addProduct() {
  if (!name.value.trim()) return;

  products.push({
    name: name.value.trim(),
    category: category.value.trim(),
    unit: unit.value,
    singles: 0,
    cases: 0,
    pack: 24
  });

  name.value = "";
  category.value = "";

  save();
}

/* =================================================
   CSV EXPORT WITH SUBTOTALS + GRAND TOTAL
================================================= */
function generateCSV() {
  let csv = "Item,Category,Singles,Cases,Pack,Total Units\n";

  const categoryTotals = {};
  let grandTotal = 0;

  // ITEMIZED INVENTORY
  products.forEach(p => {
    const totalUnits = p.singles + p.cases * p.pack;
    grandTotal += totalUnits;

    if (!categoryTotals[p.category]) {
      categoryTotals[p.category] = 0;
    }
    categoryTotals[p.category] += totalUnits;

    csv += `${p.name},${p.category},${p.singles},${p.cases},${p.pack},${totalUnits}\n`;
  });

  // SPACING
  csv += "\n";

  // CATEGORY SUBTOTALS
  csv += "Category Subtotals\n";
  Object.keys(categoryTotals).forEach(cat => {
    csv += `${cat},${categoryTotals[cat]}\n`;
  });

  // SPACING
  csv += "\n";

  // GRAND TOTAL
  csv += `Grand Total,${grandTotal}\n`;

  // DOWNLOAD CSV
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bartending-inventory-report.csv";
  link.click();

  // OPEN FORMATTED REPORT PAGE
  window.open("report.html", "_blank");
}

/* =================================================
   INIT
================================================= */
render();
