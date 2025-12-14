(() => {
  const STORE_KEY = "inventory_state_LOCKED";

  const DEFAULT_ITEMS = [
    {
      name: "Miller Lite",
      primaryUnit: "case",
      caseSize: 24,
      primaryQty: 0,
      secondaryUnit: "can",
      secondaryQty: 0,
      completed: false
    },
    {
      name: "Michelob Ultra",
      primaryUnit: "case",
      caseSize: 30,
      primaryQty: 0,
      secondaryUnit: "can",
      secondaryQty: 0,
      completed: false
    },
    {
      name: "Shiner",
      primaryUnit: "case",
      caseSize: 24,
      primaryQty: 0,
      secondaryUnit: "can",
      secondaryQty: 0,
      completed: false
    },
    {
      name: "Ketel One Vodka",
      primaryUnit: "bottle",
      primaryQty: 0,
      secondaryUnit: "",
      secondaryQty: 0,
      completed: false
    }
  ];

  const $ = id => document.getElementById(id);

  const els = {
    pending: $("pendingInventory"),
    completed: $("completedInventory"),
    grand: $("grandTotal"),
    completedBy: $("completedBy"),
    btnSave: $("btnSave"),
    btnExportExcel: $("btnExportExcel"),
    btnExportPDF: $("btnExportPDF")
  };

  /* ===============================
     STATE (LOCKED)
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

  function initStateOnce() {
    let s = getState();
    if (!s) {
      s = {
        meta: { completedBy: "" },
        items: DEFAULT_ITEMS
      };
      setState(s);
      console.warn("Inventory initialized ONCE");
    }
    return s;
  }

  /* ===============================
     LOGIC
  ================================ */
  function totalCans(i) {
    if (i.primaryUnit === "case") {
      return (i.primaryQty * i.caseSize) + i.secondaryQty;
    }
    return i.primaryQty;
  }

  function render() {
    const s = getState();
    if (!s) return;

    els.pending.innerHTML = "";
    els.completed.innerHTML = "";

    let grand = 0;

    s.items.forEach((i, idx) => {
      const total = totalCans(i);
      grand += total;

      const row = `
        <div style="border:1px solid #ccc;padding:8px;margin-bottom:6px;">
          <label>
            <input type="checkbox" data-i="${idx}" ${i.completed ? "checked" : ""}>
            <strong>${i.name}</strong>
          </label><br>
          ${i.primaryQty} ${i.primaryUnit}${i.primaryUnit === "case" ? ` @ ${i.caseSize}/case` : ""}<br>
          ${i.secondaryQty} ${i.secondaryUnit}<br>
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

  /* ===============================
     EVENTS
  ================================ */
  document.body.addEventListener("change", e => {
    if (e.target.type === "checkbox") {
      const s = getState();
      const idx = Number(e.target.dataset.i);
      s.items[idx].completed = e.target.checked;
      setState(s);
      render();
    }
  });

  els.btnSave.onclick = () => {
    const s = getState();
    s.meta.completedBy = els.completedBy.value;
    setState(s);
    alert("Saved");
  };

  els.btnExportExcel.onclick = () => {
    const s = getState();
    if (!els.completedBy.value) {
      alert("Enter completed by");
      return;
    }

    const rows = [["Item", "Total Cans", "Completed"]];
    s.items.forEach(i => {
      rows.push([i.name, totalCans(i), i.completed ? "Yes" : "No"]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Inventory.xlsx");
  };

  els.btnExportPDF.onclick = () => {
    if (!els.completedBy.value) {
      alert("Enter completed by");
      return;
    }
    window.open("report.html", "_blank");
  };

  /* ===============================
     INIT (NO RESET EVER)
  ================================ */
  initStateOnce();
  render();
})();