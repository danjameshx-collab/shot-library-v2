    /* ============================================================
       PART H — Global Search (⌘K), searches Companies + People + Deals
       ============================================================ */
    const quickSearchInput = document.getElementById("quick-search-input");
    const globalSearchResults = document.getElementById("global-search-results");

    function gsResultRow(type, id, avatarHtml, name, sub) {
      return `<div class="gs-result" data-type="${type}" data-id="${id}">
      ${avatarHtml}
      <span class="gs-result-text"><span class="gs-result-name">${name}</span><span class="gs-result-sub">${sub}</span></span>
    </div>`;
    }

    function renderGlobalSearch(q) {
      if (!q) {
        globalSearchResults.classList.remove("open");
        globalSearchResults.innerHTML = "";
        return;
      }
      const ql = q.toLowerCase();
      const coMatches = companies.filter(c => c.name.toLowerCase().includes(ql)).slice(0, 5);
      const peMatches = people.filter(p => p.name.toLowerCase().includes(ql) || (p.email || "").toLowerCase().includes(ql)).slice(0, 5);
      const deMatches = deals.filter(d => d.name.toLowerCase().includes(ql)).slice(0, 5);

      if (!coMatches.length && !peMatches.length && !deMatches.length) {
        globalSearchResults.innerHTML = `<div class="gs-empty">No matches for "${q}"</div>`;
        globalSearchResults.classList.add("open");
        return;
      }

      let html = "";
      if (coMatches.length) {
        html += `<div class="gs-group-label">Companies</div>`;
        html += coMatches.map(c => {
          const avatar = `<div class="prospect-avatar" style="width:26px;height:26px;font-size:9.5px;background:${colorForString(c.name)}">${initials(c.name)}</div>`;
          return gsResultRow("company", c.id, avatar, c.name, optionByValue(TIER_OPTIONS, c.tier).label);
        }).join("");
      }
      if (peMatches.length) {
        html += `<div class="gs-group-label">People</div>`;
        html += peMatches.map(p => {
          const avatar = `<div class="prospect-avatar" style="width:26px;height:26px;font-size:9.5px;background:${colorForString(p.name)}">${initials(p.name)}</div>`;
          const co = companyById(p.companyId);
          return gsResultRow("person", p.id, avatar, p.name, co ? co.name : (p.email || ""));
        }).join("");
      }
      if (deMatches.length) {
        html += `<div class="gs-group-label">Deals</div>`;
        html += deMatches.map(d => {
          const avatar = `<div class="prospect-avatar" style="width:26px;height:26px;font-size:9.5px;background:${colorForString(d.name)}">$</div>`;
          const co = companyById(d.companyId);
          return gsResultRow("deal", d.id, avatar, d.name, `${formatCurrency(d.value)}${co ? " · " + co.name : ""}`);
        }).join("");
      }
      globalSearchResults.innerHTML = html;
      globalSearchResults.classList.add("open");

      globalSearchResults.querySelectorAll(".gs-result").forEach(el => {
        el.addEventListener("click", () => {
          const type = el.dataset.type, id = el.dataset.id;
          globalSearchResults.classList.remove("open");
          quickSearchInput.value = "";
          if (type === "company") {
            const co = companyById(id);
            if (co) { switchView("companies"); openSequenceModal(co); }
          } else if (type === "person") {
            const p = people.find(x => x.id === id);
            if (p) { switchView("people"); openPersonForm(p); }
          } else if (type === "deal") {
            const d = deals.find(x => x.id === id);
            if (d) { switchView("deals"); openDealForm(d); }
          }
        });
      });
    }

    let globalSearchDebounce;
    quickSearchInput.addEventListener("input", e => {
      clearTimeout(globalSearchDebounce);
      const q = e.target.value.trim();
      globalSearchDebounce = setTimeout(() => renderGlobalSearch(q), 150);
    });
    quickSearchInput.addEventListener("focus", () => {
      if (quickSearchInput.value.trim()) renderGlobalSearch(quickSearchInput.value.trim());
    });
    document.addEventListener("click", e => {
      if (!e.target.closest("#global-search-results") && e.target !== quickSearchInput) {
        globalSearchResults.classList.remove("open");
      }
    });
    document.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        quickSearchInput.focus();
        quickSearchInput.select();
      }
      if (e.key === "Escape" && globalSearchResults.classList.contains("open")) {
        globalSearchResults.classList.remove("open");
      }
    });

    /* ============================================================
       Status View — sub-tabs generated from STATUS_OPTIONS (includes Pipeline)
       ============================================================ */
    function renderStatusSubtabs() {
      const wrap = document.getElementById("status-subtabs");
      wrap.innerHTML = STATUS_OPTIONS.map((opt, i) =>
        `<button type="button" class="kanban-mode-btn${opt.value === statusViewTab ? " active" : ""}" data-status="${opt.value}">${opt.label}</button>`
      ).join("");
      wrap.querySelectorAll(".kanban-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          statusViewTab = btn.dataset.status;
          wrap.querySelectorAll(".kanban-mode-btn").forEach(b => b.classList.toggle("active", b === btn));
          filterState.status = statusViewTab;
          renderTable();
          renderActiveFilters();
        });
      });
    }

    /* ============================================================
       Boot — invoked once by the auth gate (PART 0, top of this script)
       after the first confirmed signed-in session, instead of running
       unconditionally on page load.
       ============================================================ */
    async function bootApp() {
      loadColumnVisibility();
      loadColumnOrder();
      /* Paint instantly from whatever was cached last time (if anything),
         then correct with the real server load a moment later — see
         writeCache()/loadFromCache() above for why this is safe. */
      if (loadFromCache()) {
        renderStatusSubtabs();
        renderTableHead();
        renderTable();
        renderActiveFilters();
        updateInboxBadge();
      }
      await loadData();
      inboxServerLoaded = true;
      renderStatusSubtabs();
      renderTableHead();
      renderTable();
      renderActiveFilters();
      updateInboxBadge();
    }
