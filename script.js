(() => {
  const STORE_KEY = "venue_inventory_main";

  /* ===============================
     HARD-CODED DEFAULT INVENTORY
     (removes fetch/GitHub issues)
  ================================ */
  const DEFAULT_ITEMS = [
    {
      name: "Miller Lite",
      primaryUnit: "case",
      caseSize: 24,
      primaryQty: 0,
      secondaryUnit: "can",
      secondaryQty: 0
    },
    {
      name: "Michelob Ultra",
      primaryUnit: "case",
      caseSize: 30,
      primaryQty: 0,
      secondaryUnit: "can",
      secondaryQty: 0
    },
    {
      name: "Shiner",
      primaryUnit: "case",
      caseSize: 24,
      primaryQty: 0,
      secondaryUnit: "can",
      secondaryQty: 0
    },
    {
      name: "Ketel One Vodka",
      primaryUnit: "bottle",
      primaryQty: 0,
      secondaryUnit: "",
      secondaryQty: 0
    }
  ];

  const root = document.getElementById("inventoryRoot");
  const grandEl = document.getElementById("grandTotal");

  if (!root) {
    alert("inventoryRoot not found in DOM");
    return;
  }

  /* ===============================
     STATE
  ================================ */
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
    if (!s || !Array.isArray(s.items) || s.items.length === 0) {
      s = {
        meta: { venue: "", event: "", bartender: "", date: "" },
        items: DEFAULT_ITEMS.map(i => ({ ...i }))
      };
      setState(s);
      console.warn("Default inventory injected");
    }
    return s;
  }

  function totalCans(i) {
    if (i.primaryUnit === "case") {
      return (i.primaryQty * i.caseSize) + i.secondaryQty;
    }
    return i.primaryQty;
  }

  function render() {
    const s = ensureState();
    let grand = 0;

    root.innerHTML = s.items.map((i, idx) => {
      const total = totalCans(i);
      grand += total;

      return `
        <div style="border:1px solid #ccc;padding:10px;margin-bottom:8px;">
          <strong>${i.name}</strong><br>
          ${i.primaryQty} ${i.primaryUnit}(s)
          ${i.primaryUnit === "case" ? ` @ ${i.caseSize}/case` : ""}<br>
          ${i.secondaryQty} ${i.secondaryUnit || ""}<br>
          <strong>Total cans:</strong> ${total}<br><br>

          <button data-i="${idx}" data-a="cp">+ case</button>
          <button data-i="${idx}" data-a="cm">− case</button>
          <button data-i="${idx}" data-a="lp">+ can</button>
          <button data-i="${idx}" data-a="lm">− can</button>
        </div>
      `;
    }).join("");

    grandEl.textContent = grand;
  }

  root.addEventListener("click", e => {
    const btn = e.target;
    const idx = btn.dataset.i;
    if (idx == null) return;

    const s = ensureState();
    const it = s.items[idx];

    switch (btn.dataset.a) {
      case "cp": it.primaryQty++; break;
      case "cm": it.primaryQty = Math.max(0, it.primaryQty - 1); break;
      case "lp": it.secondaryQty++; break;
      case "lm": it.secondaryQty = Math.max(0, it.secondaryQty - 1); break;
    }

    setState(s);
    render();
  });

  render();
})();