    /* ============================================================
       PART C — Table render, filter, sort, search (Companies + People)
       ============================================================ */
    let activeView = "companies";
    let selectedIds = new Set();
    let tierViewTab = "tier1";
    let statusViewTab = "new";
    /* Tier View and Status View both reuse the Companies table renderer with a
       locked filter — baseView() collapses them to "companies" wherever the
       rest of the code branches on activeView for table-shape decisions. */
    function baseView() {
      return (activeView === "tiers" || activeView === "statusview" || activeView === "pipelineview" || activeView === "active") ? "companies" : activeView;
    }
    /* Active keeps its own sort (Next Due asc) separate from Companies'. */
    function sortView() { return activeView === "active" ? "active" : baseView(); }
    const filterState = { tier: null, status: null, companyOf: null, dealStage: null, search: "" };
    const sortState = {
      companies: { column: "lastInteraction", direction: "desc" },
      active: { column: "nextDue", direction: "asc" },
      people: { column: "company", direction: "asc" },
      deals: { column: "closeDate", direction: "asc" }
    };

    /* ---- Column visibility (hide/show data in the table view), per view ---- */
    const COLUMN_DEFS = {
      companies: [
        { key: "tier", label: "Tier", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "lastInteraction", label: "Last Interaction", sortable: true },
        /* activeOnly columns only exist on the Active tab (08-active.js) — the
           Companies table stays a scanning surface. */
        { key: "currentStep", label: "Current Step", sortable: true, activeOnly: true },
        { key: "nextDue", label: "Next Due", sortable: true, activeOnly: true }
      ],
      people: [
        { key: "company", label: "Company", sortable: true },
        { key: "tier", label: "Tier", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "email", label: "Email", sortable: false },
        { key: "phone", label: "Phone", sortable: false },
        { key: "linkedin", label: "LinkedIn", sortable: false }
      ],
      deals: [
        { key: "company", label: "Company", sortable: true },
        { key: "value", label: "Value", sortable: true },
        { key: "stage", label: "Stage", sortable: false },
        { key: "closeDate", label: "Close Date", sortable: true }
      ]
    };
    const COLUMNS_STORAGE_KEY = "lincko-crm-columns-v1";
    let columnVisibility = { companies: {}, people: {}, deals: {} };
    function loadColumnVisibility() {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(COLUMNS_STORAGE_KEY)) || {}; } catch (e) { saved = {}; }
      ["companies", "people", "deals"].forEach(view => {
        COLUMN_DEFS[view].forEach(c => {
          columnVisibility[view][c.key] = (saved[view] && saved[view][c.key] !== undefined) ? saved[view][c.key] !== false : true;
        });
      });
    }
    function saveColumnVisibility() {
      try { localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columnVisibility)); } catch (e) { }
    }

    /* ---- Column order (drag-to-reorder headers), per view ---- */
    /* The identity column (Company / Person / Deal) and the trailing actions
       column are structural, not reorderable — only the columns listed in
       COLUMN_DEFS[view] can be dragged, and this array is just their order. */
    const COLUMN_ORDER_STORAGE_KEY = "lincko-crm-column-order-v1";
    let columnOrder = { companies: [], people: [], deals: [] };
    function loadColumnOrder() {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY)) || {}; } catch (e) { saved = {}; }
      ["companies", "people", "deals"].forEach(view => {
        const defaultKeys = COLUMN_DEFS[view].map(c => c.key);
        const savedKeys = Array.isArray(saved[view]) ? saved[view].filter(k => defaultKeys.includes(k)) : [];
        const missing = defaultKeys.filter(k => !savedKeys.includes(k));
        columnOrder[view] = savedKeys.length ? [...savedKeys, ...missing] : defaultKeys.slice();
      });
    }
    function saveColumnOrder() {
      try { localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder)); } catch (e) { }
    }
    function orderedColumnDefs(view) {
      const defByKey = {};
      COLUMN_DEFS[view].forEach(c => defByKey[c.key] = c);
      const order = columnOrder[view] && columnOrder[view].length ? columnOrder[view] : COLUMN_DEFS[view].map(c => c.key);
      return order.map(k => defByKey[k]).filter(d => d && (!d.activeOnly || activeView === "active"));
    }
    /* Wires drag-to-reorder onto the th elements for the reorderable columns
       of the currently-rendered thead. Dropping a column inserts it directly
       before whichever column it's released over. */
    function wireColumnDrag(theadTr, view) {
      let draggedKey = null;
      theadTr.querySelectorAll("th.col-draggable").forEach(th => {
        th.addEventListener("dragstart", e => {
          draggedKey = th.dataset.colKey;
          th.classList.add("col-dragging");
          e.dataTransfer.setData("text/plain", draggedKey);
          e.dataTransfer.effectAllowed = "move";
        });
        th.addEventListener("dragend", () => {
          th.classList.remove("col-dragging");
          theadTr.querySelectorAll("th.col-drag-over").forEach(el => el.classList.remove("col-drag-over"));
          draggedKey = null;
        });
        th.addEventListener("dragover", e => {
          if (!draggedKey || draggedKey === th.dataset.colKey) return;
          e.preventDefault();
          th.classList.add("col-drag-over");
        });
        th.addEventListener("dragleave", () => th.classList.remove("col-drag-over"));
        th.addEventListener("drop", e => {
          e.preventDefault();
          th.classList.remove("col-drag-over");
          const fromKey = e.dataTransfer.getData("text/plain");
          const toKey = th.dataset.colKey;
          if (!fromKey || fromKey === toKey) return;
          const order = columnOrder[view].slice();
          const fromIdx = order.indexOf(fromKey);
          const toIdx = order.indexOf(toKey);
          if (fromIdx === -1 || toIdx === -1) return;
          order.splice(fromIdx, 1);
          order.splice(order.indexOf(toKey), 0, fromKey);
          columnOrder[view] = order;
          saveColumnOrder();
          renderTableHead();
          renderTable();
        });
      });
    }
    const EYE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6 0 9.5 6.5 9.5 6.5a17.4 17.4 0 0 1-2.9 3.9M6.6 6.6C3.7 8.4 2.5 10.5 2.5 10.5S6 17 12 17c1.2 0 2.3-.2 3.3-.6"></path><path d="M9.9 14.1a3 3 0 1 0 4.2-4.2"></path><path d="M2 2l20 20"></path></svg>`;
    function applyColumnVisibility() {
      const bv2 = baseView();
      COLUMN_DEFS[bv2].forEach(c => {
        const visible = columnVisibility[bv2][c.key];
        document.querySelectorAll(`[data-col="${c.key}"]`).forEach(el => {
          el.style.display = visible ? "" : "none";
        });
      });
      document.querySelectorAll(".col-toggle-btn").forEach(btn => {
        const key = btn.dataset.toggleCol;
        const visible = columnVisibility[bv2] ? columnVisibility[bv2][key] !== false : true;
        btn.classList.toggle("col-visible", visible);
        btn.classList.toggle("col-hidden", !visible);
        btn.querySelector(".col-toggle-icon").innerHTML = visible ? EYE_ICON : EYE_OFF_ICON;
      });
    }
    document.querySelectorAll(".col-toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const bv2 = baseView();
        const key = btn.dataset.toggleCol;
        columnVisibility[bv2][key] = !(columnVisibility[bv2][key] !== false);
        saveColumnVisibility();
        applyColumnVisibility();
      });
    });

    function relativeTime(ms) {
      const diff = Date.now() - ms;
      const mins = Math.round(diff / 60000);
      if (mins < 60) return mins <= 1 ? "Just now" : `${mins}m ago`;
      const hours = Math.round(diff / 3600000);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.round(diff / 86400000);
      if (days < 30) return `${days}d ago`;
      const months = Math.round(days / 30);
      return `${months}mo ago`;
    }

    function matchesCompanyFilters(c) {
      /* Pipeline board is a fixed view — always just Pipeline + Meeting Booked. */
      if (activeView === "pipelineview" && c.status !== "pipeline" && c.status !== "meeting_booked") return false;
      if (activeView === "active" && !isActiveOutbound(c)) return false;
      if (filterState.tier && c.tier !== filterState.tier) return false;
      if (filterState.status && c.status !== filterState.status) return false;
      if (filterState.search) {
        const q = filterState.search.toLowerCase();
        const contact = primaryContactFor(c.id);
        const hay = `${c.name} ${contact ? contact.name : ""} ${contact ? contact.email : ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }
    /* People inherit tier/status from their company (people records don't
       carry these fields themselves). */
    function matchesPersonFilters(p) {
      if (filterState.companyOf && p.companyId !== filterState.companyOf) return false;
      const co = companyById(p.companyId);
      if (filterState.tier && (!co || co.tier !== filterState.tier)) return false;
      if (filterState.status && (!co || co.status !== filterState.status)) return false;
      if (filterState.search) {
        const q = filterState.search.toLowerCase();
        const hay = `${p.name} ${p.email} ${p.jobTitle} ${co ? co.name : ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }

    function matchesDealFilters(d) {
      if (filterState.companyOf && d.companyId !== filterState.companyOf) return false;
      if (filterState.dealStage && d.stage !== filterState.dealStage) return false;
      if (filterState.search) {
        const q = filterState.search.toLowerCase();
        const co = companyById(d.companyId);
        const hay = `${d.name} ${co ? co.name : ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }

    function getFilteredSorted() {
      const bv2 = baseView();
      const s = sortState[sortView()];
      const dir = s.direction === "asc" ? 1 : -1;
      if (bv2 === "companies") {
        resetActiveStepCache();
        let rows = companies.filter(matchesCompanyFilters);
        rows = rows.slice().sort((a, b) => {
          let av, bv;
          if (s.column === "tier") { av = TIER_RANK[a.tier]; bv = TIER_RANK[b.tier]; }
          else if (s.column === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
          // Blank due (sequence complete) sorts last either direction.
          else if (s.column === "nextDue") { av = activeStepInfo(a).due || "9999"; bv = activeStepInfo(b).due || "9999"; }
          else if (s.column === "currentStep") { av = activeStepInfo(a).label; bv = activeStepInfo(b).label; }
          else { av = a[s.column]; bv = b[s.column]; }
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return rows;
      } else if (bv2 === "people") {
        let rows = people.filter(matchesPersonFilters);
        rows = rows.slice().sort((a, b) => {
          let av, bv;
          if (s.column === "company") { av = (companyById(a.companyId) || {}).name || ""; bv = (companyById(b.companyId) || {}).name || ""; av = av.toLowerCase(); bv = bv.toLowerCase(); }
          else if (s.column === "tier") {
            av = TIER_RANK[(companyById(a.companyId) || {}).tier]; if (av === undefined) av = 99;
            bv = TIER_RANK[(companyById(b.companyId) || {}).tier]; if (bv === undefined) bv = 99;
          }
          else if (s.column === "status") { av = (companyById(a.companyId) || {}).status || ""; bv = (companyById(b.companyId) || {}).status || ""; }
          else if (s.column === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
          else { av = (a[s.column] || "").toLowerCase(); bv = (b[s.column] || "").toLowerCase(); }
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return rows;
      } else {
        let rows = deals.filter(matchesDealFilters);
        rows = rows.slice().sort((a, b) => {
          let av, bv;
          if (s.column === "company") { av = (companyById(a.companyId) || {}).name || ""; bv = (companyById(b.companyId) || {}).name || ""; av = av.toLowerCase(); bv = bv.toLowerCase(); }
          else if (s.column === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
          else if (s.column === "value") { av = Number(a.value) || 0; bv = Number(b.value) || 0; }
          else if (s.column === "closeDate") { av = a.closeDate || ""; bv = b.closeDate || ""; }
          else { av = (a[s.column] || "").toLowerCase(); bv = (b[s.column] || "").toLowerCase(); }
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return rows;
      }
    }

    const bulkTh = `<th class="bulk-th"><input type="checkbox" id="select-all-checkbox" /></th>`;
    const FIRST_COLUMN_LABEL = { companies: "Company", people: "Person", deals: "Deal" };
    /* The identity column (name/avatar) always stays first and is never
       draggable — everything else in COLUMN_DEFS[view] is user-reorderable
       via drag-and-drop, order persisted through columnOrder. */
    function renderTableHead() {
      const thead = document.getElementById("table-head");
      const view = baseView();
      const firstLabel = FIRST_COLUMN_LABEL[view];
      const middleCells = orderedColumnDefs(view).map(def => {
        const sortAttr = def.sortable ? ` data-sort="${def.key}"` : "";
        const sortArrow = def.sortable ? ` <span class="sort-arrow" data-arrow="${def.key}"></span>` : "";
        return `<th class="col-draggable${def.sortable ? " sortable" : ""}" draggable="true" data-col-key="${def.key}" data-col="${def.key}"${sortAttr}>${def.label}${sortArrow}</th>`;
      }).join("");
      thead.innerHTML = `<tr>
      ${bulkTh}
      <th class="sortable" data-sort="name">${firstLabel} <span class="sort-arrow" data-arrow="name"></span></th>
      ${middleCells}
      <th></th>
    </tr>`;
      thead.querySelectorAll("th.sortable").forEach(th => {
        th.addEventListener("click", () => {
          const col = th.dataset.sort;
          const s = sortState[sortView()];
          if (s.column === col) { s.direction = s.direction === "asc" ? "desc" : "asc"; }
          else { s.column = col; s.direction = "asc"; }
          renderTable();
        });
      });
      wireColumnDrag(thead.querySelector("tr"), view);
      const selectAllCb = document.getElementById("select-all-checkbox");
      selectAllCb.addEventListener("change", () => {
        const rows = getFilteredSorted();
        if (selectAllCb.checked) { rows.forEach(r => selectedIds.add(r.id)); }
        else { rows.forEach(r => selectedIds.delete(r.id)); }
        renderTable();
      });
    }

    /* Per-column <td> builders, keyed to match COLUMN_DEFS[view] — kept
       separate from the fixed identity/actions cells so a row's cell order
       can follow columnOrder (see companyRowHtml et al below) without the
       markup itself needing to change per drag-reorder. */
    const COMPANY_CELL_BUILDERS = {
      tier: c => {
        const tierOpt = optionByValue(TIER_OPTIONS, c.tier);
        return `<td data-col="tier">
        <button type="button" class="crm-pill editable-pill" data-field="tier" style="background:${tierOpt.tint};color:${tierOpt.textColor};border-color:${tierOpt.tint}">${tierOpt.label}</button>
      </td>`;
      },
      status: c => {
        const statusOpt = optionByValue(STATUS_OPTIONS, c.status);
        return `<td data-col="status">
        <button type="button" class="crm-pill editable-pill" data-field="status" style="background:${statusOpt.tint};color:${statusOpt.textColor}">
          <span class="dot" style="background:${statusOpt.pillDot || statusOpt.dot}"></span>${statusOpt.label}
        </button>
      </td>`;
      },
      lastInteraction: c => {
        const overdue = CLOSING_ROOM_STATUSES.includes(c.status) && computeClosingOverdue(c);
        return `<td class="muted-cell" data-col="lastInteraction"${overdue ? ' title="Follow-up is due or overdue"' : ""}>${relativeTime(c.lastInteraction)}</td>`;
      },
      currentStep: c => activeStepCellHtml(c),
      nextDue: c => nextDueCellHtml(c)
    };
    /* Whether the whole row should carry the red "needs attention" wash —
       either the Closing Room follow-up is overdue, or the current mechanism
       has been opened and its manual step hasn't been checked off yet. */
    function companyNeedsAttention(c) {
      return (CLOSING_ROOM_STATUSES.includes(c.status) && computeClosingOverdue(c)) || needsManualAction(c);
    }
    function companyRowHtml(c) {
      const avatarColor = colorForString(c.name);
      const contact = primaryContactFor(c.id);
      const middleCells = orderedColumnDefs("companies").map(def => COMPANY_CELL_BUILDERS[def.key](c)).join("");
      return `
      <td>
        <div class="prospect-cell">
          <div class="prospect-avatar" style="background:${avatarColor}">${initials(c.name)}</div>
          <div class="prospect-name-col">
            <span class="prospect-name" title="${c.name}">${c.name}</span>
            <span class="prospect-company" title="${contact ? `${contact.name}${contact.jobTitle ? " · " + contact.jobTitle : ""}` : "No contact yet"}">${contact ? `${contact.name}${contact.jobTitle ? " · " + contact.jobTitle : ""}` : "No contact yet"}</span>
          </div>
        </div>
      </td>
      ${middleCells}
      <td>
        <div style="display:flex; gap:2px;">
          <button type="button" class="edit-icon-btn" data-action="edit" title="Edit company">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
          </button>
          <button type="button" class="edit-icon-btn delete-icon-btn" data-action="delete" title="Delete company">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path></svg>
          </button>
        </div>
      </td>`;
    }

    const PERSON_CELL_BUILDERS = {
      company: p => {
        const co = companyById(p.companyId);
        return `<td data-col="company"><button type="button" class="crm-pill company-link-pill" style="background:#f2f4f2;color:var(--muted)" data-company-id="${p.companyId}">${co ? co.name : "—"}</button></td>`;
      },
      tier: p => {
        const co = companyById(p.companyId);
        const tierOpt = optionByValue(TIER_OPTIONS, co ? co.tier : null);
        return `<td data-col="tier"><span class="crm-pill" title="Inherited from the company's Tier" style="background:${tierOpt.tint};color:${tierOpt.textColor};cursor:default;">${tierOpt.label}</span></td>`;
      },
      status: p => {
        const co = companyById(p.companyId);
        const statusOpt = optionByValue(STATUS_OPTIONS, co ? co.status : null);
        return `<td data-col="status"><span class="crm-pill" title="Inherited from the company's Status" style="background:${statusOpt.tint};color:${statusOpt.textColor};cursor:default;"><span class="dot" style="background:${statusOpt.pillDot || statusOpt.dot}"></span>${statusOpt.label}</span></td>`;
      },
      email: p => `<td class="muted-cell" data-col="email">${p.email || "—"}</td>`,
      phone: p => `<td class="muted-cell" data-col="phone">${p.phone || "—"}</td>`,
      linkedin: p => {
        const href = p.linkedin ? (/^https?:\/\//i.test(p.linkedin) ? p.linkedin : `https://${p.linkedin}`) : null;
        return `<td data-col="linkedin">${href ? `<a class="summary-link" href="${href}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${p.linkedin}</a>` : `<span class="muted-cell">—</span>`}</td>`;
      }
    };
    function personRowHtml(p) {
      const avatarColor = colorForString(p.name);
      const middleCells = orderedColumnDefs("people").map(def => PERSON_CELL_BUILDERS[def.key](p)).join("");
      return `
      <td>
        <div class="prospect-cell">
          <div class="prospect-avatar" style="background:${avatarColor}">${initials(p.name)}</div>
          <div class="prospect-name-col">
            <span class="prospect-name" title="${p.name}">${p.name}${p.isPrimary ? ' <span class="primary-badge">Primary</span>' : ""}</span>
            <span class="prospect-company" title="${p.jobTitle || "—"}">${p.jobTitle || "—"}</span>
          </div>
        </div>
      </td>
      ${middleCells}
      <td>
        <div style="display:flex; gap:2px;">
          <button type="button" class="edit-icon-btn" data-action="edit" title="Edit person">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
          </button>
          <button type="button" class="edit-icon-btn delete-icon-btn" data-action="delete" title="Delete person">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path></svg>
          </button>
        </div>
      </td>`;
    }

    const DEAL_CELL_BUILDERS = {
      company: d => {
        const co = companyById(d.companyId);
        return `<td data-col="company"><button type="button" class="crm-pill company-link-pill" style="background:#f2f4f2;color:var(--muted)" data-company-id="${d.companyId}">${co ? co.name : "—"}</button></td>`;
      },
      value: d => `<td class="muted-cell" data-col="value">${formatCurrency(d.value)}</td>`,
      stage: d => {
        const stageOpt = optionByValue(DEAL_STAGE_OPTIONS, d.stage);
        return `<td data-col="stage">
        <button type="button" class="crm-pill editable-pill" data-field="stage" style="background:${stageOpt.tint};color:${stageOpt.textColor}">
          <span class="dot" style="background:${stageOpt.pillDot || stageOpt.dot}"></span>${stageOpt.label}
        </button>
      </td>`;
      },
      closeDate: d => `<td class="muted-cell" data-col="closeDate">${d.closeDate || "—"}</td>`
    };
    function dealRowHtml(d) {
      const avatarColor = colorForString(d.name);
      const middleCells = orderedColumnDefs("deals").map(def => DEAL_CELL_BUILDERS[def.key](d)).join("");
      return `
      <td>
        <div class="prospect-cell">
          <div class="prospect-avatar" style="background:${avatarColor}">$</div>
          <div class="prospect-name-col">
            <span class="prospect-name" title="${d.name}">${d.name}</span>
            <span class="prospect-company deal-value">${formatCurrency(d.value)}</span>
          </div>
        </div>
      </td>
      ${middleCells}
      <td>
        <div style="display:flex; gap:2px;">
          <button type="button" class="edit-icon-btn" data-action="edit" title="Edit deal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
          </button>
          <button type="button" class="edit-icon-btn delete-icon-btn" data-action="delete" title="Delete deal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path></svg>
          </button>
        </div>
      </td>`;
    }

    /* Row actions (select checkbox, editable pills, company link, edit/
       delete) used to get their own addEventListener() per row, per render —
       at a few thousand rows that's tens of thousands of listener
       allocations on every render (each keystroke in search, each sort
       click, each filter toggle). Delegating to a single listener on
       #table-body, wired once, removes that cost entirely; the row markup
       already carries the data-action/data-field/data-company-id
       attributes this reads. */
    let _tableBodyDelegated = false;
    function wireTableBodyDelegation() {
      if (_tableBodyDelegated) return;
      _tableBodyDelegated = true;
      const tbody = document.getElementById("table-body");
      tbody.addEventListener("click", e => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        const bv2 = baseView();
        const id = tr.dataset.id;
        const record = bv2 === "companies" ? companyById(id)
          : bv2 === "people" ? people.find(p => p.id === id)
          : deals.find(d => d.id === id);
        if (!record) return;

        const checkbox = e.target.closest(".row-select-checkbox");
        if (checkbox) {
          e.stopPropagation();
          if (checkbox.checked) selectedIds.add(id); else selectedIds.delete(id);
          renderBulkBar();
          const selectAllCb = document.getElementById("select-all-checkbox");
          if (selectAllCb) selectAllCb.checked = getFilteredSorted().every(r => selectedIds.has(r.id));
          return;
        }

        const editablePill = e.target.closest(".editable-pill");
        if (editablePill) {
          e.stopPropagation();
          if (bv2 === "deals") openDealStagePopover(editablePill, record);
          else openFieldPopover(editablePill, record, editablePill.dataset.field);
          return;
        }

        const companyPill = e.target.closest(".company-link-pill");
        if (companyPill) {
          e.stopPropagation();
          const co = companyById(companyPill.dataset.companyId);
          if (co) { switchView("companies"); openSequenceModal(co); }
          return;
        }

        const editBtn = e.target.closest('[data-action="edit"]');
        if (editBtn) {
          e.stopPropagation();
          if (bv2 === "companies") openCompanyForm(record);
          else if (bv2 === "people") openPersonForm(record);
          else openDealForm(record);
          return;
        }

        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
          e.stopPropagation();
          if (bv2 === "companies") deleteCompany(id);
          else if (bv2 === "people") deletePerson(id);
          else deleteDeal(id);
          return;
        }

        if (e.target.closest(".bulk-td") || e.target.closest("a")) return;

        if (bv2 === "companies") openSequenceModal(record);
        else if (bv2 === "people") openPersonForm(record);
        else openDealForm(record);
      });
    }

    /* ---- Row virtualization ---------------------------------------------
       renderTable() used to build a <tr> for every record — 2,201 DOM
       subtrees on companies, 7,202 on people — on every sort click, filter
       toggle, search keystroke and mutation. That was ~2.7s per render at
       current data, and it was the dominant remaining cost once the network
       payload came down.

       Only rows in or near the viewport are built now; everything above and
       below is represented by two spacer rows whose heights keep the page
       scrollbar honest. The page itself is the scroller (.crm-table-wrap is
       overflow-x only), so the window is the scroll source and the sticky
       thead keeps working untouched.

       Spacers carry no data-id, so the delegated row click handler ignores
       them, and bulk select-all still operates on getFilteredSorted() rather
       than on what happens to be rendered. */
    const VIRTUAL_OVERSCAN = 10;
    const ROW_HEIGHT_FALLBACK = 48;
    let virtualRows = [];
    let virtualView = null;
    let virtualRange = null;
    const measuredRowHeight = {};

    function buildRowEl(record, bv) {
      const tr = document.createElement("tr");
      tr.dataset.id = record.id;
      const bulkTd = `<td class="bulk-td"><input type="checkbox" class="row-select-checkbox" data-id="${record.id}" ${selectedIds.has(record.id) ? "checked" : ""} /></td>`;
      tr.innerHTML = bulkTd + (bv === "companies" ? companyRowHtml(record) : bv === "people" ? personRowHtml(record) : dealRowHtml(record));
      if (bv === "companies") tr.classList.toggle("row-alert", companyNeedsAttention(record));
      return tr;
    }

    function spacerRow(height, colCount) {
      const tr = document.createElement("tr");
      tr.className = "virtual-spacer";
      tr.setAttribute("aria-hidden", "true");
      tr.innerHTML = `<td colspan="${colCount}" style="padding:0;border:none;height:${height}px"></td>`;
      return tr;
    }

    function renderVirtualWindow(force) {
      const bv = virtualView;
      if (!bv) return;
      const tbody = document.getElementById("table-body");
      const total = virtualRows.length;
      if (!total) { tbody.replaceChildren(); virtualRange = null; return; }

      const colCount = document.querySelectorAll("#table-head th").length || 8;
      const rowH = measuredRowHeight[bv] || ROW_HEIGHT_FALLBACK;
      const tbodyTop = tbody.getBoundingClientRect().top + window.scrollY;
      const firstVisible = Math.floor((window.scrollY - tbodyTop) / rowH);
      const perScreen = Math.ceil(window.innerHeight / rowH);
      const start = Math.max(0, Math.min(total - 1, firstVisible - VIRTUAL_OVERSCAN));
      const end = Math.max(start + 1, Math.min(total, firstVisible + perScreen + VIRTUAL_OVERSCAN));

      if (!force && virtualRange && virtualRange.start === start && virtualRange.end === end) return;
      virtualRange = { start, end };

      const frag = document.createDocumentFragment();
      if (start > 0) frag.appendChild(spacerRow(start * rowH, colCount));
      for (let i = start; i < end; i++) frag.appendChild(buildRowEl(virtualRows[i], bv));
      if (end < total) frag.appendChild(spacerRow((total - end) * rowH, colCount));
      // replaceChildren, not innerHTML = "" then append: emptying the tbody
      // first collapses the page height, and the browser clamps the scroll
      // offset to the shorter document before the new rows go in — which
      // teleports the viewport every time you scroll.
      tbody.replaceChildren(frag);

      // Learn the real row height from the first window we draw, then redraw
      // once with it so the spacers (and therefore the scrollbar) are right.
      if (!measuredRowHeight[bv]) {
        const sample = tbody.querySelector("tr:not(.virtual-spacer)");
        const h = sample ? sample.offsetHeight : 0;
        if (h > 0) {
          measuredRowHeight[bv] = h;
          if (h !== rowH) { virtualRange = null; renderVirtualWindow(true); return; }
        }
      }
      applyColumnVisibility();
    }

    let _virtualScrollWired = false;
    function wireVirtualScroll() {
      if (_virtualScrollWired) return;
      _virtualScrollWired = true;
      let queued = false;
      const onScroll = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; renderVirtualWindow(false); });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
    }

    function renderTable() {
      wireTableBodyDelegation();
      wireVirtualScroll();
      const rows = getFilteredSorted();
      const bv2 = baseView();
      const countLabel = activeView === "active"
        ? `${rows.length} active compan${rows.length === 1 ? "y" : "ies"}`
        : bv2 === "companies"
        ? `${rows.length} of ${companies.length} compan${companies.length === 1 ? "y" : "ies"}`
        : bv2 === "people"
          ? `${rows.length} of ${people.length} ${people.length === 1 ? "person" : "people"}`
          : `${deals.length} deal${deals.length === 1 ? "" : "s"}`;
      document.getElementById("prospect-count-label").textContent = countLabel;
      document.getElementById("empty-state").style.display = rows.length ? "none" : "block";
      document.getElementById("empty-state").textContent = activeView === "active" ? "No companies are mid-sequence." : bv2 === "companies" ? "No companies match these filters." : bv2 === "people" ? "No people match these filters." : "No deals match these filters.";

      virtualRows = rows;
      virtualView = bv2;
      renderVirtualWindow(true);

      const selectAllCb = document.getElementById("select-all-checkbox");
      if (selectAllCb) selectAllCb.checked = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
      updateSortArrows();
      applyColumnVisibility();
      renderBulkBar();
    }

    function updateSortArrows() {
      const s = sortState[sortView()];
      document.querySelectorAll(".sort-arrow").forEach(el => {
        const col = el.dataset.arrow;
        el.textContent = col === s.column ? (s.direction === "asc" ? "▲" : "▼") : "";
      });
    }

    /* ============================================================
       PART C.1b — Bulk actions
       ============================================================ */
    function renderBulkBar() {
      const bar = document.getElementById("bulk-action-bar");
      if (!bar) return;
      const bv2 = baseView();
      if (bv2 !== "companies" && bv2 !== "people" && bv2 !== "deals") {
        bar.style.display = "none"; bar.innerHTML = ""; return;
      }
      if (selectedIds.size === 0) { bar.style.display = "none"; bar.innerHTML = ""; return; }

      let actionsHtml = "";
      if (bv2 === "companies") {
        actionsHtml = `
        <button type="button" class="btn btn-secondary" id="bulk-set-tier">Set Tier</button>
        <button type="button" class="btn btn-secondary" id="bulk-set-status">Set Status</button>
        <button type="button" class="btn btn-secondary" id="bulk-set-startdate">Set Start Date</button>
        <button type="button" class="btn btn-secondary" id="bulk-delete" style="color:var(--red);">Delete</button>`;
      } else if (bv2 === "deals") {
        actionsHtml = `
        <button type="button" class="btn btn-secondary" id="bulk-set-stage">Set Stage</button>
        <button type="button" class="btn btn-secondary" id="bulk-delete" style="color:var(--red);">Delete</button>`;
      } else {
        actionsHtml = `<button type="button" class="btn btn-secondary" id="bulk-delete" style="color:var(--red);">Delete</button>`;
      }

      bar.style.display = "flex";
      bar.innerHTML = `<span class="bulk-count">${selectedIds.size} selected</span>${actionsHtml}<button type="button" class="bulk-clear-btn" id="bulk-clear">Clear</button>`;

      document.getElementById("bulk-clear").addEventListener("click", () => { selectedIds.clear(); renderTable(); });
      document.getElementById("bulk-delete").addEventListener("click", bulkDelete);
      if (bv2 === "companies") {
        document.getElementById("bulk-set-tier").addEventListener("click", e => openBulkOptionsPopover(e.currentTarget, TIER_OPTIONS, "tier"));
        document.getElementById("bulk-set-status").addEventListener("click", e => openBulkOptionsPopover(e.currentTarget, STATUS_OPTIONS, "status"));
        document.getElementById("bulk-set-startdate").addEventListener("click", e => openBulkStartDatePopover(e.currentTarget));
      } else if (bv2 === "deals") {
        document.getElementById("bulk-set-stage").addEventListener("click", e => openBulkOptionsPopover(e.currentTarget, DEAL_STAGE_OPTIONS, "stage"));
      }
    }

    /* Bulk "Set Start Date" — same underlying setCompanyStartDay() as the
       single-company button in the summary grid, just applied across every
       selected company so a freshly-imported batch can all begin their
       sequence on the same day in one action. */
    function openBulkStartDatePopover(anchorEl) {
      const ids = Array.from(selectedIds);
      const first = ids.length ? companyById(ids[0]) : null;
      const pop = openPopover(anchorEl, popEl => {
        buildCalendarPopover(popEl, (first && first.startDay) || localDateStr(Date.now()), newDate => {
          ids.forEach(id => {
            const c = companyById(id);
            if (c) setCompanyStartDay(c, newDate, true);
          });
          saveCompanies();
          renderTable();
        });
      });
      positionPopoverBeside(pop, anchorEl);
    }

    async function bulkDelete() {
      const n = selectedIds.size;
      const ok = await showConfirm({
        title: `Delete ${n} selected item${n === 1 ? "" : "s"}?`,
        confirmLabel: `Delete ${n} Item${n === 1 ? "" : "s"}`
      });
      if (!ok) return;
      if (baseView() === "companies") {
        selectedIds.forEach(id => {
          people.filter(p => p.companyId === id).forEach(p => queueDelete("people", p.id));
          deals.filter(d => d.companyId === id).forEach(d => queueDelete("deals", d.id));
          people = people.filter(p => p.companyId !== id);
          deals = deals.filter(d => d.companyId !== id);
        });
        selectedIds.forEach(id => queueDelete("companies", id));
        companies = companies.filter(c => !selectedIds.has(c.id));
        saveCompanies(); savePeople(); saveDeals();
      } else if (baseView() === "people") {
        selectedIds.forEach(id => queueDelete("people", id));
        people = people.filter(p => !selectedIds.has(p.id));
        savePeople();
      } else {
        selectedIds.forEach(id => queueDelete("deals", id));
        deals = deals.filter(d => !selectedIds.has(d.id));
        saveDeals();
      }
      selectedIds.clear();
      renderTable();
    }

    function openBulkOptionsPopover(anchorEl, options, field) {
      openPopover(anchorEl, pop => {
        options.forEach(opt => {
          const row = document.createElement("div");
          row.className = "popover-option";
          row.innerHTML = `<span class="popover-dot" style="background:${opt.dot || opt.color || 'var(--muted-soft)'}"></span><span>${opt.label}</span>`;
          row.addEventListener("click", () => {
            if (baseView() === "companies") {
              selectedIds.forEach(id => {
                const c = companyById(id);
                if (!c) return;
                if (field === "status") {
                  setCompanyStatus(c, opt.value, "bulk");
                } else {
                  setCompanyTier(c, opt.value, true);
                }
              });
              saveCompanies();
            } else if (baseView() === "deals") {
              selectedIds.forEach(id => {
                const d = deals.find(x => x.id === id);
                if (d) {
                  d.stage = opt.value;
                  const co = companyById(d.companyId);
                  if (co) logActivity(co, `Deal "${d.name}" stage changed to ${opt.label} (bulk)`);
                }
              });
              saveDeals(); saveCompanies();
            }
            closePopover();
            renderTable();
          });
          pop.appendChild(row);
        });
      });
    }

    /* ============================================================
       PART C.2 — Pipeline Board (Kanban)
       ============================================================ */
    function companySearchMatch(c) {
      if (!filterState.search) return true;
      const q = filterState.search.toLowerCase();
      const contact = primaryContactFor(c.id);
      const hay = `${c.name} ${contact ? contact.name : ""}`.toLowerCase();
      return hay.includes(q);
    }

    /* ============================================================
       PART C.3 — Reports dashboard
       ============================================================ */
    function renderReports() {
      const wrap = document.getElementById("reports-wrap");
      const totalCompanies = companies.length;
      const totalPeople = people.length;
      const wonDeals = deals.filter(d => d.stage === "won");
      const wonValue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const churnedDeals = deals.filter(d => d.stage === "churned");
      const churnedValue = churnedDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      const statsHtml = `
      <div class="reports-grid">
        <div class="stat-card"><span class="stat-label">Total Companies</span><span class="stat-value">${totalCompanies}</span><span class="stat-sub">${totalPeople} contact${totalPeople === 1 ? "" : "s"} across them</span></div>
        <div class="stat-card"><span class="stat-label">Won Deal Value</span><span class="stat-value">${formatCurrency(wonValue)}</span><span class="stat-sub">${wonDeals.length} deal${wonDeals.length === 1 ? "" : "s"} won</span></div>
        <div class="stat-card"><span class="stat-label">Churned Deal Value</span><span class="stat-value">${formatCurrency(churnedValue)}</span><span class="stat-sub">${churnedDeals.length} deal${churnedDeals.length === 1 ? "" : "s"} churned</span></div>
        <div class="stat-card"><span class="stat-label">Avg. Contacts / Company</span><span class="stat-value">${totalCompanies ? (totalPeople / totalCompanies).toFixed(1) : "0"}</span><span class="stat-sub">People records linked to a company</span></div>
      </div>`;

      function barSection(title, options, counter) {
        const max = Math.max(1, ...options.map(o => counter(o.value)));
        const rows = options.map(o => {
          const count = counter(o.value);
          const pct = Math.round((count / max) * 100);
          const color = (o.dot && o.dot !== "#fff") ? o.dot : (o.color || o.tint || "var(--green)");
          return `<div class="bar-row">
          <span class="bar-label"><span class="popover-dot" style="background:${color}"></span>${o.label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${color};"></div></div>
          <span class="bar-value">${count}</span>
        </div>`;
        }).join("");
        return `<div class="report-section"><h3>${title}</h3>${rows}</div>`;
      }

      wrap.innerHTML = statsHtml
        + barSection("Companies by Tier", TIER_OPTIONS, v => companies.filter(c => c.tier === v).length)
        + barSection("Companies by Status", STATUS_OPTIONS, v => companies.filter(c => c.status === v).length);
    }

    /* ============================================================
       PART C.4 — Analytics (sequence performance)
       Derived entirely from Seen tracking (seenState timestamps) and Status —
       there's no real email-open webhook in a static tool, so "opens" here
       means "marked Seen in the sequence view", which is the ground truth
       this CRM already collects per touch.
       ============================================================ */
    function renderAnalytics() {
      const wrap = document.getElementById("analytics-wrap");
      const totalOpens = companies.reduce((sum, c) => sum + Object.values(c.seenState || {}).filter(v => v && v.seen).length, 0);
      const bookedCount = companies.filter(c => c.status === "meeting_booked" || c.status === "won").length;
      const engagedCount = companies.filter(c => Object.values(c.seenState || {}).some(v => v && v.seen)).length;
      const overallConversion = engagedCount ? Math.round(bookedCount / engagedCount * 100) : 0;

      const statsHtml = `
      <div class="reports-grid">
        <div class="stat-card"><span class="stat-label">Total Opens Tracked</span><span class="stat-value">${totalOpens}</span><span class="stat-sub">Touches marked Seen, across every prospect</span></div>
        <div class="stat-card"><span class="stat-label">Calls Booked</span><span class="stat-value">${bookedCount}</span><span class="stat-sub">Status = Meeting Booked or Won</span></div>
        <div class="stat-card"><span class="stat-label">Engaged Prospects</span><span class="stat-value">${engagedCount}</span><span class="stat-sub">At least one touch marked Seen</span></div>
        <div class="stat-card"><span class="stat-label">Open → Booked Conversion</span><span class="stat-value">${overallConversion}%</span><span class="stat-sub">Of engaged prospects, went on to book</span></div>
      </div>`;

      function tierTouchSection(tierKey) {
        const tier = OUTBOUND_SYSTEM[tierKey];
        const sendNodes = tier.sequence.filter(n => n.type === "send");
        const tierCompanies = companies.filter(c => c.tier === tierKey);
        const openCounts = sendNodes.map(n => tierCompanies.filter(c => c.seenState[n.id] && c.seenState[n.id].seen).length);
        const max = Math.max(1, ...openCounts);
        const rows = sendNodes.map((n, i) => {
          const count = openCounts[i];
          const seenCompanies = tierCompanies.filter(c => c.seenState[n.id] && c.seenState[n.id].seen);
          const bookedFromThis = seenCompanies.filter(c => c.status === "meeting_booked" || c.status === "won").length;
          const convPct = count ? Math.round(bookedFromThis / count * 100) : 0;
          const pct = Math.round((count / max) * 100);
          return `<div class="bar-row">
          <span class="bar-label">${n.mechanism}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:var(--green);"></div></div>
          <span class="bar-value">${count}</span>
          <span class="bar-conv">${convPct}% booked</span>
        </div>`;
        }).join("");
        return `<div class="report-section"><h3>${tier.label} — Opens &amp; Conversion by Touch</h3>${rows || '<p class="contacts-empty">No companies in this tier yet.</p>'}</div>`;
      }

      function bookedViaSection() {
        const counts = {};
        companies.forEach(c => {
          if (c.bookedViaMechanism) counts[c.bookedViaMechanism] = (counts[c.bookedViaMechanism] || 0) + 1;
        });
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (!entries.length) {
          return `<div class="report-section"><h3>Which Touch Books the Call</h3><p class="contacts-empty">No booked calls attributed yet — attribution captures automatically the first time a prospect's status is set to Meeting Booked.</p></div>`;
        }
        const max = Math.max(1, ...entries.map(e => e[1]));
        const rows = entries.map(([id, count]) => {
          const node = NODE_INDEX[id];
          const label = node ? (node.mechanism || node.label) : id;
          const pct = Math.round((count / max) * 100);
          return `<div class="bar-row">
          <span class="bar-label">${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:var(--purple);"></div></div>
          <span class="bar-value">${count}</span>
        </div>`;
        }).join("");
        return `<div class="report-section"><h3>Which Touch Books the Call</h3><p class="opened-caption" style="margin:0 0 14px;">The mechanism most recently marked Seen at the moment each prospect's status flipped to Meeting Booked.</p>${rows}</div>`;
      }

      wrap.innerHTML = statsHtml
        + tierTouchSection("tier1")
        + tierTouchSection("tier2")
        + tierTouchSection("tier3")
        + bookedViaSection();
    }

    let searchDebounce;
    document.getElementById("search-input").addEventListener("input", e => {
      clearTimeout(searchDebounce);
      const val = e.target.value;
      searchDebounce = setTimeout(() => { filterState.search = val; renderCurrentView(); }, 150);
    });

    const TABLE_VIEWS = ["companies", "people", "deals", "tiers", "statusview", "pipelineview", "active"];

    function renderCurrentView() {
      if (TABLE_VIEWS.includes(activeView)) renderTable();
      else if (activeView === "inbox") renderInbox();
      else if (activeView === "board") renderBoard();
      else if (activeView === "reports") renderReports();
      else if (activeView === "analytics") renderAnalytics();
      updateInboxBadge();
    }

    function switchView(view) {
      if (activeView === view) return;
      activeView = view;
      selectedIds.clear();
      filterState.tier = null; filterState.status = null;
      filterState.companyOf = null; filterState.dealStage = null;
      filterState.search = "";
      document.getElementById("search-input").value = "";
      if (view === "tiers") filterState.tier = tierViewTab;
      if (view === "statusview") filterState.status = statusViewTab;

      const titles = { companies: "Companies", people: "People", deals: "Deals", board: "Board", pipelineview: "Pipeline", reports: "Reports", analytics: "Analytics", tiers: "Tiers", statusview: "Status", active: "Active", inbox: "Inbox" };
      const placeholders = { companies: "Search companies, domains, contacts…", people: "Search people, emails, companies…", deals: "Search deals, companies…", board: "Search companies…", pipelineview: "Search companies…", reports: "", analytics: "", tiers: "Search companies…", statusview: "Search companies…", active: "Search active companies…", inbox: "" };
      document.getElementById("search-input").placeholder = placeholders[view];
      document.getElementById("crm-title").textContent = titles[view];
      document.getElementById("new-record-btn-label").textContent = view === "people" ? "New Person" : view === "deals" ? "New Deal" : "New Company";
      if (view === "reports" || view === "analytics") {
        document.getElementById("prospect-count-label").textContent = `Snapshot — ${formatDateLong(new Date())}`;
      }

      ["companies", "people", "deals", "board", "pipelineview", "reports", "analytics", "tiers", "statusview", "active", "inbox"].forEach(v => {
        const navEl = document.getElementById("nav-" + v);
        if (navEl) navEl.classList.toggle("active", view === v);
      });

      const nonTableView = view === "reports" || view === "analytics" || view === "inbox";
      document.querySelector('.filter-chip[data-field="tier"]').style.display = (view === "companies" || view === "board" || view === "statusview" || view === "people" || view === "active") ? "" : "none";
      document.querySelector('.filter-chip[data-field="status"]').style.display = (view === "companies" || view === "tiers" || view === "people" || view === "active") ? "" : "none";
      document.querySelector('.filter-chip[data-field="companyOf"]').style.display = (view === "people" || view === "deals") ? "" : "none";
      document.querySelector('.filter-chip[data-field="dealStage"]').style.display = view === "deals" ? "" : "none";
      document.getElementById("col-toggle-group").style.display = (view === "companies" || view === "tiers" || view === "statusview" || view === "pipelineview" || view === "active") ? "" : "none";
      document.querySelectorAll(".col-toggle-btn.active-only").forEach(btn => { btn.style.display = view === "active" ? "" : "none"; });
      document.getElementById("filter-row").style.display = nonTableView ? "none" : "";
      document.getElementById("active-filters-row").style.display = nonTableView ? "none" : "";

      document.getElementById("columns-btn").style.display = TABLE_VIEWS.includes(view) ? "" : "none";
      document.getElementById("export-btn").style.display = TABLE_VIEWS.includes(view) ? "" : "none";
      document.getElementById("import-btn").style.display = TABLE_VIEWS.includes(view) ? "" : "none";
      document.getElementById("find-duplicates-btn").style.display = TABLE_VIEWS.includes(view) ? "" : "none";
      document.getElementById("download-pdf-btn").style.display = (view === "reports" || view === "analytics") ? "" : "none";
      document.getElementById("new-prospect-btn").style.display = nonTableView ? "none" : "";
      document.getElementById("view-pill-label").textContent = view === "board" ? "Board View" : view === "inbox" ? "Task List" : nonTableView ? "Dashboard" : "Table View";

      document.getElementById("table-view-wrap").style.display = TABLE_VIEWS.includes(view) ? "" : "none";
      document.getElementById("board-wrap").style.display = view === "board" ? "" : "none";
      document.getElementById("reports-wrap").style.display = view === "reports" ? "" : "none";
      document.getElementById("analytics-wrap").style.display = view === "analytics" ? "" : "none";
      document.getElementById("inbox-wrap").style.display = view === "inbox" ? "" : "none";
      document.getElementById("status-subtabs").style.display = view === "statusview" ? "flex" : "none";
      document.getElementById("empty-state").style.display = "none";

      if (TABLE_VIEWS.includes(view)) {
        renderTableHead();
        renderTable();
      } else if (view === "inbox") {
        renderInbox();
      } else if (view === "board") {
        renderBoard();
      } else if (view === "reports") {
        renderReports();
      } else if (view === "analytics") {
        renderAnalytics();
      }
      renderActiveFilters();
    }
    document.getElementById("nav-companies").addEventListener("click", () => switchView("companies"));
    document.getElementById("nav-people").addEventListener("click", () => switchView("people"));
    document.getElementById("nav-active").addEventListener("click", () => switchView("active"));
    document.getElementById("nav-inbox").addEventListener("click", () => switchView("inbox"));
    document.getElementById("nav-board").addEventListener("click", () => switchView("board"));
    document.getElementById("nav-reports").addEventListener("click", () => switchView("reports"));
    document.getElementById("new-prospect-btn").addEventListener("click", () => {
      if (activeView === "people") openPersonForm(null);
      else if (activeView === "deals") openDealForm(null);
      else openCompanyForm(null);
    });
