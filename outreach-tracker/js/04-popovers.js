    /* ============================================================
       PART D — Popovers (filters + inline pill editing)
       ============================================================ */
    let activePopover = null;
    function closePopover() {
      if (activePopover) { activePopover.remove(); activePopover = null; }
    }
    document.addEventListener("click", e => {
      if (activePopover && !activePopover.contains(e.target) && !e.target.closest(".filter-chip") && !e.target.closest(".editable-pill") && !e.target.closest("#columns-btn") && !e.target.closest("#bulk-action-bar") && !e.target.closest(".closing-date-btn") && !e.target.closest(".followup-date-btn") && !e.target.closest(".followup-method-btn") && !e.target.closest(".followup-type-btn")) {
        closePopover();
      }
    });

    function positionPopover(pop, anchor) {
      const r = anchor.getBoundingClientRect();
      pop.style.position = "fixed";
      pop.style.top = (r.bottom + 6) + "px";
      let left = r.left;
      const maxLeft = window.innerWidth - 270;
      if (left > maxLeft) left = maxLeft;
      pop.style.left = left + "px";
    }

    /* Places a popover beside its anchor (right, falling back to left) and
       clamps fully inside the viewport — used for the calendar, which is tall
       enough to get clipped by a "drop below" placement near the bottom of a
       scrolling modal. */
    function positionPopoverBeside(pop, anchor) {
      const r = anchor.getBoundingClientRect();
      const popRect = pop.getBoundingClientRect();
      const gap = 10;
      let left = r.right + gap;
      if (left + popRect.width > window.innerWidth - 12) {
        left = r.left - popRect.width - gap;
      }
      if (left < 12) left = 12;
      let top = r.top + r.height / 2 - popRect.height / 2;
      const maxTop = window.innerHeight - popRect.height - 12;
      if (top > maxTop) top = maxTop;
      if (top < 12) top = 12;
      pop.style.position = "fixed";
      pop.style.top = top + "px";
      pop.style.left = left + "px";
    }

    function openPopover(anchor, buildFn) {
      closePopover();
      const pop = document.createElement("div");
      pop.className = "crm-popover";
      document.body.appendChild(pop);
      buildFn(pop);
      positionPopover(pop, anchor);
      pop.classList.add("open");
      activePopover = pop;
      return pop;
    }

    /* -- Filter popovers -- */
    function buildSingleSelectFilter(pop, field, options) {
      options.forEach(opt => {
        const row = document.createElement("div");
        row.className = `popover-option${filterState[field] === opt.value ? " selected" : ""}`;
        row.innerHTML = `<span class="popover-dot" style="background:${opt.dot || opt.color || 'var(--muted-soft)'}"></span><span>${opt.label}</span>`;
        row.addEventListener("click", () => {
          filterState[field] = filterState[field] === opt.value ? null : opt.value;
          closePopover();
          renderCurrentView();
          renderActiveFilters();
        });
        pop.appendChild(row);
      });
      const clear = document.createElement("div");
      clear.className = "popover-clear";
      clear.textContent = "Clear filter";
      clear.addEventListener("click", () => { filterState[field] = null; closePopover(); renderCurrentView(); renderActiveFilters(); });
      pop.appendChild(clear);
    }

    function buildCompanyOfFilter(pop) {
      companies.forEach(co => {
        const row = document.createElement("div");
        row.className = `popover-option${filterState.companyOf === co.id ? " selected" : ""}`;
        row.innerHTML = `<span>${co.name}</span>`;
        row.addEventListener("click", () => {
          filterState.companyOf = filterState.companyOf === co.id ? null : co.id;
          closePopover();
          renderCurrentView();
          renderActiveFilters();
        });
        pop.appendChild(row);
      });
      const clear = document.createElement("div");
      clear.className = "popover-clear";
      clear.textContent = "Clear filter";
      clear.addEventListener("click", () => { filterState.companyOf = null; closePopover(); renderTable(); renderActiveFilters(); });
      pop.appendChild(clear);
    }

    function openFilterPopoverFor(field) {
      const btn = document.querySelector(`.filter-chip[data-field="${field}"]`);
      openPopover(btn, pop => {
        if (field === "tier") buildSingleSelectFilter(pop, "tier", TIER_OPTIONS);
        else if (field === "status") buildSingleSelectFilter(pop, "status", STATUS_OPTIONS);
        else if (field === "companyOf") buildCompanyOfFilter(pop);
        else if (field === "dealStage") buildSingleSelectFilter(pop, "dealStage", DEAL_STAGE_OPTIONS);
      });
    }

    document.querySelectorAll(".filter-chip").forEach(btn => {
      btn.addEventListener("click", () => openFilterPopoverFor(btn.dataset.field));
    });

    /* -- Columns visibility popover -- */
    document.getElementById("columns-btn").addEventListener("click", e => {
      const bv2 = baseView();
      openPopover(e.currentTarget, pop => {
        const heading = document.createElement("div");
        heading.className = "popover-heading";
        heading.textContent = "Show columns";
        pop.appendChild(heading);
        COLUMN_DEFS[bv2].forEach(c => {
          const row = document.createElement("div");
          row.className = `popover-option${columnVisibility[bv2][c.key] ? " selected" : ""}`;
          row.innerHTML = `<input type="checkbox" ${columnVisibility[bv2][c.key] ? "checked" : ""} /><span>${c.label}</span>`;
          row.addEventListener("click", () => {
            columnVisibility[bv2][c.key] = !columnVisibility[bv2][c.key];
            saveColumnVisibility();
            applyColumnVisibility();
            row.classList.toggle("selected", columnVisibility[bv2][c.key]);
            row.querySelector('input[type="checkbox"]').checked = columnVisibility[bv2][c.key];
          });
          pop.appendChild(row);
        });
      });
    });

    function renderActiveFilters() {
      const row = document.getElementById("active-filters-row");
      row.innerHTML = "";
      document.querySelectorAll(".filter-chip").forEach(btn => {
        const field = btn.dataset.field;
        btn.classList.toggle("active-filter", !!filterState[field]);
      });

      const addTag = (label, onRemove) => {
        const tag = document.createElement("span");
        tag.className = "active-filter-tag";
        tag.innerHTML = `${label}<span>×</span>`;
        tag.addEventListener("click", () => { onRemove(); renderCurrentView(); renderActiveFilters(); });
        row.appendChild(tag);
      };
      if (activeView === "companies" || activeView === "board" || activeView === "statusview" || activeView === "people" || activeView === "active") {
        if (filterState.tier) addTag(`Tier: ${optionByValue(TIER_OPTIONS, filterState.tier).label}`, () => filterState.tier = null);
      }
      if (activeView === "companies" || activeView === "tiers" || activeView === "people" || activeView === "active") {
        if (filterState.status) addTag(`Status: ${optionByValue(STATUS_OPTIONS, filterState.status).label}`, () => filterState.status = null);
      }
      if (activeView === "people" || activeView === "deals") {
        if (filterState.companyOf) {
          const co = companyById(filterState.companyOf);
          addTag(`Company: ${co ? co.name : "—"}`, () => filterState.companyOf = null);
        }
      }
      if (activeView === "deals") {
        if (filterState.dealStage) addTag(`Stage: ${optionByValue(DEAL_STAGE_OPTIONS, filterState.dealStage).label}`, () => filterState.dealStage = null);
      }
    }

    /* -- Inline pill editing popovers (Companies table only: tier/status) -- */
    function openFieldPopover(anchorEl, company, field) {
      const list = field === "tier" ? TIER_OPTIONS : STATUS_OPTIONS;
      // Reused inside the sequence modal (z-index:100) as well as the plain
      // table — .popover-elevated keeps it above the modal backdrop in both.
      openPopover(anchorEl, pop => {
        pop.classList.add("popover-elevated");
        list.forEach(opt => {
          const row = document.createElement("div");
          row.className = `popover-option${company[field] === opt.value ? " selected" : ""}`;
          row.innerHTML = `<span class="popover-dot" style="background:${opt.dot || opt.color || 'var(--muted-soft)'}"></span><span>${opt.label}</span>`;
          row.addEventListener("click", () => {
            if (field === "status") {
              setCompanyStatus(company, opt.value);
            } else {
              setCompanyTier(company, opt.value);
            }
            saveCompanies();
            closePopover();
            renderCurrentView();
            if (currentProspect && currentProspect.id === company.id) {
              if (field === "tier" || field === "status") {
                // Tier/Status changes can move the company in or out of the
                // Closing Room, or swap which tier's sequence applies — re-run
                // the full modal setup rather than just the summary pills so
                // the diagram/closing-room panel below stays in sync.
                flushPendingNotes();
                openSequenceModal(currentProspect);
              } else {
                renderCompanySummary(currentProspect);
              }
            }
          });
          pop.appendChild(row);
        });
      });
    }

    function openDealStagePopover(anchorEl, deal) {
      openPopover(anchorEl, pop => {
        DEAL_STAGE_OPTIONS.forEach(opt => {
          const row = document.createElement("div");
          row.className = `popover-option${deal.stage === opt.value ? " selected" : ""}`;
          row.innerHTML = `<span class="popover-dot" style="background:${opt.dot || opt.color || 'var(--muted-soft)'}"></span><span>${opt.label}</span>`;
          row.addEventListener("click", () => {
            deal.stage = opt.value;
            const co = companyById(deal.companyId);
            if (co) { logActivity(co, `Deal "${deal.name}" stage changed to ${opt.label}`); saveCompanies(); }
            saveDeals();
            closePopover();
            renderCurrentView();
          });
          pop.appendChild(row);
        });
      });
    }
