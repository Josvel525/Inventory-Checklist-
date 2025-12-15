(() => {
  // =========================
  // Inventory Checklist - Hardened Runtime
  // Now uses dropdowns for quantity and case size, and a status bar for messages.
  // =========================

  const STORE_KEY = "inventory_state_LOCKED_MAIN"; // DO NOT CHANGE AGAIN
  const CASE_SIZES = [12, 18, 24, 30, 36]; // Available options for cans/case
  const MAX_QTY_DROPDOWN = 30; // Max quantity for non-case/loose dropdowns

  // Default items (replace/expand anytime)
  // Added an 'id' field for robust tracking
  const DEFAULT_ITEMS = [
    { id: crypto.randomUUID(), category: "Beer", productType: "Beer", name: "Miller Lite", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },
    { id: crypto.randomUUID(), category: "Beer", productType: "Beer", name: "Michelob Ultra", primaryUnit: "case", caseSize: 30, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },
    { id: crypto.randomUUID(), category: "Beer", productType: "Beer", name: "Dos Equis", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },
    { id: crypto.randomUUID(), category: "Beer", productType: "Beer", name: "Shiner", primaryUnit: "case", caseSize: 24, primaryQty: 0, secondaryUnit: "can", secondaryQty: 0, completed: false },

    { id: crypto.randomUUID(), category: "Liquor", productType: "Vodka", name: "Ketel One Vodka", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },
    { id: crypto.randomUUID(), category: "Liquor", productType: "Rum", name: "Malibu Rum", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },
    { id: crypto.randomUUID(), category: "Liquor", productType: "Whiskey", name: "Jack Daniel's", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },

    { id: crypto.randomUUID(), category: "Wine", productType: "White Wine", name: "Pinot Grigio", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },
    { id: crypto.randomUUID(), category: "Mixers", productType: "Juice", name: "Lime Juice", primaryUnit: "bottle", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },
    { id: crypto.randomUUID(), category: "Mixers", productType: "Soda", name: "Diet Coke", primaryUnit: "can", caseSize: 0, primaryQty: 0, secondaryUnit: "", secondaryQty: 0, completed: false },
  ];


  // --- Utility Functions ---

  function safeJsonParse(str, fallback = {}) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error("Error parsing JSON from localStorage:", e);
      return fallback;
    }
  }

  function totalCans(i) {
    if (i.primaryUnit === 'can' || i.primaryUnit === 'pack') {
      // For items counted in cans/packs, the total is just the primary quantity.
      return (Number(i.primaryQty) || 0) + (Number(i.secondaryQty) || 0);
    }
    if (i.primaryUnit === 'case') {
      return (
        (Number(i.primaryQty) || 0) * (Number(i.caseSize) || 0) +
        (Number(i.secondaryQty) || 0)
      );
    }
    return 0; // Bottles, bags, etc., don't count towards 'cans' total.
  }

  function normalizeItem(item) {
    // Ensures all items have required keys for rendering
    return {
        id: item.id || crypto.randomUUID(),
        category: item.category || 'Uncategorized',
        productType: item.productType || '',
        name: item.name || 'Unnamed Item',
        primaryUnit: item.primaryUnit || 'unit',
        caseSize: Number(item.caseSize) || 0,
        primaryQty: Number(item.primaryQty) || 0,
        secondaryUnit: item.secondaryUnit || '',
        secondaryQty: Number(item.secondaryQty) || 0,
        completed: !!item.completed,
    };
  }

  // --- State Management ---

  function ensureState() {
    let state = safeJsonParse(localStorage.getItem(STORE_KEY));
    if (!state || !Array.isArray(state.items) || state.items.length === 0) {
      // Initialize with default template if state is empty or invalid
      state = {
        meta: { venue: "", event: "", bartender: "", date: "" },
        items: DEFAULT_ITEMS.map(i => ({...i, id: i.id || crypto.randomUUID()}))
      };
      // Ensure all items have IDs
    }
    return state;
  }

  function setState(s) {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
    renderAll(s);
  }

  // --- Status/Error Message Implementation ---
  function status(message, isError = false) {
    const el = document.getElementById('statusMessage');
    if (!el) return;

    el.textContent = message;
    el.className = isError ? 'status status--error' : 'status status--ok';

    // Clear after a delay unless it's an error
    setTimeout(() => {
      if (!isError) {
        el.textContent = '';
        el.className = 'status';
      }
    }, 4000);
  }

  // --- Helper to generate SELECT options ---
  function generateOptions(values, selectedValue, includeZero = true) {
    let options = '';
    // Use an array of numbers from 0 up to the limit if `values` is not an array
    const countLimit = Array.isArray(values) ? values : Array.from({ length: MAX_QTY_DROPDOWN + 1 }, (_, i) => i);

    if (includeZero && !Array.isArray(values)) { // Ensure 0 is the first option only if generating up to MAX_QTY_DROPDOWN
      options += `<option value="0" ${selectedValue == 0 ? 'selected' : ''}>0</option>`;
      const start = countLimit[0] === 0 ? 1 : 0; // start at 1 if 0 was added
      for (let i = start; i < countLimit.length; i++) {
        options += `<option value="${countLimit[i]}" ${selectedValue == countLimit[i] ? 'selected' : ''}>${countLimit[i]}</option>`;
      }
    } else {
      // If values are explicit (like CASE_SIZES or loose cans), include all.
      if (includeZero) {
        options += `<option value="0" ${selectedValue == 0 ? 'selected' : ''}>0</option>`;
      }
      countLimit.forEach(val => {
        if (val === 0 && includeZero) return; // Skip 0 if already added or not needed
        options += `<option value="${val}" ${selectedValue == val ? 'selected' : ''}>${val}</option>`;
      });
    }

    return options;
  }

  // --- Event Handlers & Core Logic ---

  function handleInputChange(event) {
    const s = ensureState();
    const itemId = event.target.closest('[data-id]').dataset.id;
    const item = s.items.find(i => i.id === itemId);

    if (!item) return;

    const name = event.target.name;
    let value = event.target.value;

    if (name === 'completed') {
        value = event.target.checked;
    } else if (name === 'primaryQty' || name === 'secondaryQty' || name === 'caseSize') {
        // Handle dropdowns for quantity and caseSize
        value = Number(value);
        if (name === 'caseSize') {
            // Recalculate secondary options to match new caseSize, then re-render row
            item.caseSize = value;
            setState(s); // Re-render to update the secondaryQty dropdown options
            return; // Exit to prevent double-render
        }
    }

    item[name] = value;
    setState(s);
  }


  function syncMetaToState(s) {
    s.meta.venue = document.getElementById("venueName")?.value || "";
    s.meta.event = document.getElementById("eventName")?.value || "";
    s.meta.date = document.getElementById("eventDate")?.value || "";

    const memberSelect = document.getElementById("memberSelect");
    const customInput = document.getElementById("bartenderName");

    if (memberSelect?.value === 'custom') {
      s.meta.completedBy = customInput?.value || "";
    } else {
      s.meta.completedBy = memberSelect?.value || "";
    }
  }

  // --- Render Functions ---

  function renderMeta(s) {
    document.getElementById("venueName").value = s.meta.venue || "";
    document.getElementById("eventName").value = s.meta.event || "";
    document.getElementById("eventDate").value = s.meta.date || "";

    const memberSelect = document.getElementById("memberSelect");
    const customInput = document.getElementById("bartenderName");
    const customWrap = document.getElementById("customMemberWrap");

    // Sync from state to UI
    let found = false;
    for (const option of memberSelect.options) {
        if (option.value === s.meta.completedBy) {
            memberSelect.value = s.meta.completedBy;
            customWrap.style.display = 'none';
            found = true;
            break;
        }
    }

    if (!found && s.meta.completedBy) {
        memberSelect.value = 'custom';
        customInput.value = s.meta.completedBy;
        customWrap.style.display = 'block';
    } else if (!s.meta.completedBy) {
        memberSelect.value = '';
        customWrap.style.display = 'none';
        customInput.value = '';
    } else if (memberSelect.value !== 'custom') {
        customWrap.style.display = 'none';
        customInput.value = '';
    }

    memberSelect.onchange = () => {
        if (memberSelect.value === 'custom') {
            customWrap.style.display = 'block';
        } else {
            customWrap.style.display = 'none';
        }
        syncMetaToState(s);
        setState(s);
    };

    document.querySelectorAll('.field input').forEach(input => {
      input.oninput = () => {
        syncMetaToState(s);
        setState(s);
      };
    });
  }

  function renderInventory(items) {
    const root = document.getElementById("inventoryRoot");
    if (!root) return;

    // Sort: Uncompleted first, then by Category, then by name
    items.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });

    let currentCategory = null;
    let html = `
      <div class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th class="th-unit">Category</th>
              <th>Item</th>
              <th class="th-qty align-right">Primary Unit</th>
              <th class="th-casesize align-right">Cans/Case</th>
              <th class="th-qty align-right">Loose Unit</th>
              <th class="th-qty align-right">Total Cans</th>
              <th class="th-completed">Done</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.map(normalizeItem).forEach((i, index) => {
        if (i.category !== currentCategory) {
            html += `
                <tr class="category-header">
                    <td colspan="7">
                        ${i.category}
                    </td>
                </tr>
            `;
            currentCategory = i.category;
        }

        const isCaseItem = i.primaryUnit === 'case';
        const isCompletedClass = i.completed ? 'is-completed' : '';
        const idAttr = `data-id="${i.id}"`;

        // 1. Primary Quantity Dropdown Options (0 to MAX_QTY_DROPDOWN)
        const qtyOptions = generateOptions(null, i.primaryQty);

        // 2. Case Size Dropdown Options (12, 18, 24, 30, 36)
        const caseSizeOptions = generateOptions(CASE_SIZES, i.caseSize);

        // 3. Loose/Secondary Quantity Dropdown Options (0 to caseSize, or 0 to MAX_QTY_DROPDOWN)
        let secondaryLimit = null;
        if (isCaseItem && i.caseSize > 0) {
            secondaryLimit = Array.from({ length: i.caseSize }, (_, j) => j);
        } else if (!isCaseItem && i.secondaryUnit) {
            secondaryLimit = Array.from({ length: MAX_QTY_DROPDOWN + 1 }, (_, j) => j);
        }

        const secondaryOptions = secondaryLimit ? generateOptions(secondaryLimit, i.secondaryQty) : generateOptions(null, i.secondaryQty);


        html += `
            <tr ${idAttr} class="${isCompletedClass}">
                <td class="td-unit">${i.productType || i.category}</td>
                <td>${i.name}</td>

                <td class="td-qty align-right">
                    <div class="input-wrap">
                        <select name="primaryQty" onchange="handleInputChange(event)" class="select-qty">
                            ${qtyOptions}
                        </select>
                        <span class="unit-label">${i.primaryUnit}</span>
                    </div>
                </td>

                <td class="td-casesize align-right">
                    ${isCaseItem ? `
                        <div class="input-wrap">
                            <select name="caseSize" onchange="handleInputChange(event)" class="select-qty select-casesize">
                                ${caseSizeOptions}
                            </select>
                            <span class="unit-label">cans/case</span>
                        </div>
                    ` : '&mdash;'}
                </td>

                <td class="td-qty align-right">
                    ${isCaseItem || i.secondaryUnit ? `
                        <div class="input-wrap">
                            <select name="secondaryQty" onchange="handleInputChange(event)" class="select-qty">
                                ${secondaryOptions}
                            </select>
                            <span class="unit-label">${isCaseItem ? 'loose' : i.secondaryUnit}</span>
                        </div>
                    ` : '&mdash;'}
                </td>

                <td class="td-qty align-right total-cans">${totalCans(i)}</td>

                <td class="td-completed">
                    <label class="checkbox-label">
                        <input type="checkbox" name="completed" onchange="handleInputChange(event)" ${i.completed ? 'checked' : ''} />
                    </label>
                </td>
            </tr>
        `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    root.innerHTML = html;
  }

  function renderTotals(items) {
    const root = document.getElementById("totalsRoot");
    if (!root) return;

    const total = items.reduce((acc, i) => acc + totalCans(i), 0);

    let html = `
        <div class="stamp">
            <div class="stamp__label">Total Cans/Equivalents</div>
            <div class="stamp__value">${total.toLocaleString()}</div>
        </div>
    `;
    root.innerHTML = html;
  }

  function renderAll(s) {
    renderMeta(s);
    renderInventory(s.items);
    renderTotals(s.items);
  }

  // --- Action Functions ---

  function loadDefaultTemplate() {
    // Cannot use confirm(), so we proceed with overwrite and message the user.
    const s = {
      meta: {
        venue: "",
        event: "",
        bartender: "",
        date: ""
      },
      items: DEFAULT_ITEMS.map(i => ({...i, id: crypto.randomUUID()})),
    };
    setState(s);
    status("Default template loaded. Existing data was overwritten.");
  }

  function loadTemplateFromCSV(csvText) {
      // Logic to parse CSV and map it to inventory items
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
          status("CSV is empty or invalid.", true);
          return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const itemCol = headers.indexOf('item');
      const unitCol = headers.indexOf('unit');
      const qtyCol = headers.indexOf('qty');
      const categoryCol = headers.indexOf('category');

      if (itemCol === -1 || unitCol === -1 || qtyCol === -1) {
          status("CSV headers missing: Item, Unit, or Qty.", true);
          return;
      }

      const newItems = lines.slice(1).map(line => {
          const values = line.match(/(?:\"([^\"]*)\"|([^,]*))/g) // Regex for basic CSV parsing including quoted fields
              .filter(v => v !== undefined && v !== ',');

          const item = values[itemCol]?.replace(/"/g, '').trim() || 'Unnamed Item';
          const unit = values[unitCol]?.replace(/"/g, '').trim() || 'unit';
          const qty = Number(values[qtyCol]?.replace(/"/g, '').trim()) || 0;
          const category = values[categoryCol]?.replace(/"/g, '').trim() || 'Other';

          // Simple logic to guess primary/secondary units and caseSize from the CSV data
          let primaryUnit = unit;
          let secondaryUnit = '';
          let primaryQty = qty;
          let secondaryQty = 0;
          let caseSize = 0;

          if (unit === 'case' || unit === 'pack') {
              primaryUnit = unit;
              primaryQty = qty;
              // Set a default common case size, user can adjust with dropdown
              caseSize = unit === 'case' ? 24 : 18;
          } else if (unit === 'can' || unit === 'bottle') {
              // If initial data is in cans/bottles, just treat it as primary unit.
              // We'll leave the secondaryUnit blank for simplicity.
              primaryUnit = unit;
          }

          return normalizeItem({
              id: crypto.randomUUID(),
              category: category,
              productType: category, // Use category as product type for simplicity
              name: item,
              primaryUnit: primaryUnit,
              caseSize: caseSize,
              primaryQty: primaryQty,
              secondaryUnit: secondaryUnit,
              secondaryQty: secondaryQty,
              completed: false
          });
      }).filter(i => i.name !== 'Unnamed Item');

      if (newItems.length === 0) {
          status("No valid items found in CSV data.", true);
          return;
      }

      const s = ensureState();
      s.items = newItems;
      setState(s);
      status(`Successfully loaded ${newItems.length} items from CSV.`);
  }

  function exportExcel() {
    const s = ensureState();
    syncMetaToState(s);
    setState(s);

    if (!s.meta.completedBy) {
      status("Enter the bartender name (Inventory completed by) before exporting.", true);
      return;
    }
    if (!window.XLSX) {
      status("Excel export library (XLSX) not loaded on this page.", true);
      return;
    }

    const rows = [["Item", "Primary Unit Count", "Primary Unit Type", "Cans/Case", "Loose Unit Count", "Loose Unit Type", "Total Cans/Equiv.", "Completed"]];
    s.items.map(normalizeItem).forEach(i => {
      rows.push([
        i.name,
        i.primaryQty,
        i.primaryUnit,
        i.primaryUnit === 'case' ? i.caseSize : '',
        i.secondaryQty,
        i.secondaryUnit,
        totalCans(i),
        i.completed ? "Yes" : "No"
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_${(s.meta.date || "date")}.xlsx`);
    status("Exported Excel.");
  }

  // Export PDF / Report: open report.html if present.
  function openReport() {
    const s = ensureState();
    syncMetaToState(s);
    setState(s);

    if (!s.meta.completedBy) {
      status("Enter the bartender name (Inventory completed by) before exporting.", true);
      return;
    }
    // We cannot use confirm, so we just open the report
    window.open("report.html", "_blank");
  }

  // --- Initialization ---

  function init() {
    const initialState = ensureState();
    renderAll(initialState);

    // Button event listeners
    const btnSave = document.getElementById("btnSave");
    if (btnSave) {
      btnSave.addEventListener("click", () => {
        syncMetaToState(initialState);
        setState(initialState);
        status("Inventory saved.");
      });
    }

    const btnReport = document.getElementById("btnReport");
    if (btnReport) {
      btnReport.addEventListener("click", openReport);
    }

    const btnLoadTemplate = document.getElementById("btnLoadTemplate");
    if (btnLoadTemplate) {
      btnLoadTemplate.addEventListener("click", loadDefaultTemplate);
    }

    const btnExportExcel = document.getElementById("btnExportExcel");
    if (btnExportExcel) {
      if (window.XLSX) {
        btnExportExcel.addEventListener("click", exportExcel);
      } else {
        btnExportExcel.addEventListener("click", () => status("Excel export library (XLSX) not loaded on this page.", true));
      }
    }

    const btnExportPDF = document.getElementById("btnExportPDF");
    if (btnExportPDF) {
      btnExportPDF.addEventListener("click", openReport); // Re-use the report HTML for "PDF"
    }

    // CSV Load Button Logic
    const btnLoadCSV = document.getElementById("btnLoadCSV");
    if (btnLoadCSV) {
        // Create a hidden file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    loadTemplateFromCSV(event.target.result);
                };
                reader.onerror = () => {
                    status("Error reading CSV file.", true);
                };
                reader.readAsText(file);
            }
        };
        document.body.appendChild(fileInput);

        btnLoadCSV.addEventListener("click", () => {
            fileInput.click();
        });
    }
  }

  init();

  // Expose for global use in HTML (onchange events)
  window.handleInputChange = handleInputChange;
})();

