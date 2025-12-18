document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addProductForm");
  if (!form) return;

  ensureProductsLoaded().catch(err => console.warn("Unable to seed products before adding", err));

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("name")?.value || "";
    const category = document.getElementById("category")?.value || "";
    const unit = document.getElementById("unit")?.value || "each";
    const pack = parseInt(document.getElementById("pack")?.value, 10) || 24;

    const added = addNewProduct({ name, category, unit, pack });

    if (!added) {
      alert("Please enter a product name before saving.");
      return;
    }

    form.reset();
    alert("Product saved! Returning to inventory.");
    window.location.href = "index.html";
  });
});
