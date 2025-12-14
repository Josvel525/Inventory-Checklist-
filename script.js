(() => {
  // =========================
  // Inventory App Logic
  // =========================

  const STORE_KEY = "inventory_state_v2"; 
  
  // 1. DATA CONFIGURATION (Matched to your CSV)
  const DEFAULT_ITEMS = [
    // Beer
    { category: "Beer", name: "Miller Lite", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0 },
    { category: "Beer", name: "Dos Equis", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0 },
    { category: "Beer", name: "Michelob Ultra", primaryUnit: "case", caseSize: 30, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0 },
    { category: "Beer", name: "Modelo", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0 },
    { category: "Beer", name: "Crawford Bock", primaryUnit: "can", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Beer", name: "Shiner", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0 },
    { category: "Beer", name: "Karbach Love St", primaryUnit: "pack", caseSize: 18, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0 },
    
    // Non-Alcoholic
    { category: "Non-Alcoholic", name: "Diet Coke", primaryUnit: "can", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Non-Alcoholic", name: "Coke Zero", primaryUnit: "can", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Non-Alcoholic", name: "Sprite", primaryUnit: "can", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Non-Alcoholic", name: "Topo Chico", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    
    // Wine
    { category: "Wine", name: "Pinot Grigio (Ryan P)", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Wine", name: "Sauv Blanc (Old Mtn)", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Wine", name: "Cab Sauv (Old Mtn)", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    
    // Spirits
    { category: "Spirits", name: "Jack Daniel's", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Spirits", name: "Tito's Vodka", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Spirits", name: "Bombay Sapphire", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Spirits", name: "Bacardi Superior", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    
    // Supplies
    { category: "Supplies", name: "Ice Bags", primaryUnit: "bag", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 },
    { category: "Supplies", name: "Cup Stacks", primaryUnit: "stack", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0 }
  ];

  // 2. STATE MANAGEMENT
  let state = {
    meta: { venue: "", event: "", date: new Date().toISOString().split('T')[0], bartender: "" },
    items: JSON.parse(JSON.stringify(DEFAULT_ITEMS))
  };

  const loadState = () => {
    const s = localStorage.getItem(STORE_KEY);
    if (s) {
      try {
        const parsed = JSON.parse(s);
        // Merge saved items with default items to ensure structure exists
        state = { ...state, ...parsed };
        // If stored items list is shorter than default (new items added), merge them
        if (state.items.length < DEFAULT_ITEMS.length) {
            // Simple merge strategy: add missing by name
            DEFAULT_ITEMS.forEach(d => {
                if(!state.items.find(i => i.name === d.name)) state.items.push(d);
            })
        }
      } catch (e) { console.error("Save file corrupted", e); }
    }
  };

  const saveState = () => {
    // Sync UI inputs to state before saving
    state.meta.venue = document.getElementById('venueName')?.value || "";
    state.meta.event = document.getElementById('eventName')?.value || "";
    state.meta.date = document.getElementById('eventDate')?.value || "";
    state.meta.bartender = document.getElementById('bartenderName')?.value || "";
    
    // Items are live-updated in 'input' events, but let's be safe
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    showToast("Progress Saved!");
  };

  // 3. UI RENDERING
  const render = () => {
    // Fill Meta
    if(document.getElementById('venueName')) document.getElementById('venueName').value = state.meta.venue;
    if(document.getElementById('eventName')) document.getElementById('eventName').value = state.meta.event;
    if(document.getElementById('eventDate')) document.getElementById('eventDate').value = state.meta.date;
    if(document.getElementById('bartenderName')) document.getElementById('bartenderName').value = state.meta.bartender;

    const root = document.getElementById('inventoryRoot');
    if (!root) return; // We might be on report page

    root.innerHTML = '';
    
    // Group by Category
    const grouped = state.items.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {});

    Object.keys(grouped).forEach(cat => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'inv-group';
      groupDiv.innerHTML = `<div class="inv-group__header">${cat}</div>`;
      
      grouped[cat].forEach(item => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        
        // Check if secondary unit exists
        const hasSecondary = item.secondaryUnit && item.secondaryUnit !== "";

        el.innerHTML = `
          <div class="inv-info">
            <h4>${item.name}</h4>
            <span>${item.caseSize > 0 ? `${item.caseSize}/${item.primaryUnit}` : item.primaryUnit}</span>
          </div>
          <div class="inv-inputs">
            <div class="qty-wrap">
              <label>${item.primaryUnit}</label>
              <input type="number" class="input qty-input" data-name="${item.name}" data-field="primaryQty" value="${item.primaryQty}">
            </div>
            ${hasSecondary ? `
            <div class="qty-wrap">
              <label>${item.secondaryUnit}</label>
              <input type="number" class="input qty-input" data-name="${item.name}" data-field="secondaryQty" value="${item.secondaryQty}">
            </div>` : ''}
          </div>
        `;
        groupDiv.appendChild(el);
      });
      root.appendChild(groupDiv);
    });

    // Attach listeners
    document.querySelectorAll('.qty-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const name = e.target.dataset.name;
        const field = e.target.dataset.field;
        const item = state.items.find(i => i.name === name);
        if (item) item[field] = parseFloat(e.target.value) || 0;
        localStorage.setItem(STORE_KEY, JSON.stringify(state)); // Auto-save on type
      });
    });
  };

  // 4. EXPORT LOGIC (Pivot & PDF)
  
  // A. PIVOT EXCEL EXPORT
  const exportExcelPivot = () => {
    saveState();
    if (!window.XLSX) return alert("XLSX library not loaded.");
    
    const wb = XLSX.utils.book_new();
    const rows = [];
    
    // Title
    rows.push(["INVENTORY SUMMARY REPORT"]);
    rows.push([`Venue: ${state.meta.venue}`, `Event: ${state.meta.event}`, `Date: ${state.meta.date}`]);
    rows.push([]); // spacer

    // Headers
    rows.push(["Category", "Product", "Unit", "Qty", "Product Type"]);

    let grandTotal = 0;

    // Sort items by Category
    const categories = [...new Set(state.items.map(i => i.category))];
    
    categories.forEach(cat => {
      // Header for Category
      rows.push([cat.toUpperCase(), "", "", "", ""]);
      
      const catItems = state.items.filter(i => i.category === cat);
      let catTotal = 0;

      catItems.forEach(item => {
        // Row 1: Primary Unit
        if (item.primaryQty > 0 || item.caseSize > 0) { // Show if tracked, even if 0
             rows.push(["", item.name, item.primaryUnit, item.primaryQty, item.category]);
             catTotal += item.primaryQty;
        }
        // Row 2: Secondary Unit (if exists)
        if (item.secondaryUnit && (item.secondaryQty > 0 || item.primaryQty > 0)) {
             rows.push(["", item.name + " (Loose)", item.secondaryUnit, item.secondaryQty, item.category]);
             // Note: usually we don't add loose cans to case totals directly without conversion, 
             // but for a simple sum we track units. 
             // If you want total UNITS:
             catTotal += item.secondaryQty;
        }
      });

      // Subtotal
      rows.push(["", `TOTAL ${cat.toUpperCase()}`, "", catTotal, ""]);
      rows.push([]); // Spacer
      grandTotal += catTotal;
    });

    rows.push(["GRAND TOTAL UNITS", "", "", grandTotal, ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // Styling widths (basic)
    ws['!cols'] = [{wch:15}, {wch:25}, {wch:10}, {wch:10}, {wch:15}];

    XLSX.utils.book_append_sheet(wb, ws, "Pivot Report");
    XLSX.writeFile(wb, `Inventory_Pivot_${state.meta.date}.xlsx`);
  };

  // B. HELPER: Toast
  const showToast = (msg) => {
    const div = document.createElement('div');
    div.style.cssText = "position:fixed; bottom:20px; right:20px; background:#10b981; color:white; padding:10px 20px; border-radius:8px; animation: fadeOut 2s forwards; z-index:999;";
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000);
  };

  // 5. INITIALIZATION
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    
    if (document.getElementById('inventoryRoot')) {
      // We are on Index page
      render();
      
      document.getElementById('btnSave')?.addEventListener('click', saveState);
      
      document.getElementById('btnExportExcel')?.addEventListener('click', exportExcelPivot);
      
      document.getElementById('btnReport')?.addEventListener('click', () => {
        saveState();
        window.open('report.html', '_blank');
      });
      
      // Load CSS Animation for toast
      const style = document.createElement('style');
      style.innerHTML = `@keyframes fadeOut { 0% {opacity:1;} 80% {opacity:1;} 100% {opacity:0;} }`;
      document.head.appendChild(style);
    } 
    else if (document.getElementById('reportRoot')) {
      // We are on Report page (Logic handled inside report.html, but we can share state logic)
      // Since report.html is separate file, it will read localStorage independently.
    }
  });

})();

