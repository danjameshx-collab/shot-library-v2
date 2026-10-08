    /* ============================================================
       PART F — Add / Edit Company form, Add / Edit Person form
       ============================================================ */
    const formOverlay = document.getElementById("prospect-form-overlay");
    const prospectForm = document.getElementById("prospect-form");
    let editingCompanyId = null;

    function populateSelect(id, options, valueKey, labelKey) {
      const sel = document.getElementById(id);
      sel.innerHTML = "";
      options.forEach(opt => {
        const o = document.createElement("option");
        if (typeof opt === "string") { o.value = opt; o.textContent = opt; }
        else { o.value = opt[valueKey]; o.textContent = opt[labelKey]; }
        sel.appendChild(o);
      });
    }
    populateSelect("f-tier", TIER_OPTIONS, "value", "label");
    populateSelect("f-status", STATUS_OPTIONS, "value", "label");

    let companyDupeConfirmed = false;

    /* Name-only matching used by the CSV importer too (see
       buildCompanyImportPlan) — kept in sync so "Save Company" and "Import"
       never disagree about what counts as a duplicate. */
    function findDuplicateCompany(name, excludeId) {
      const nameKey = name.trim().toLowerCase();
      return companies.find(c => {
        if (c.id === excludeId) return false;
        return c.name.trim().toLowerCase() === nameKey;
      }) || null;
    }

    function openCompanyForm(company) {
      editingCompanyId = company ? company.id : null;
      companyDupeConfirmed = false;
      document.getElementById("form-modal-eyebrow").textContent = company ? "Edit Company" : "New Company";
      document.getElementById("form-modal-title").textContent = company ? "Edit Company" : "Add Company";
      document.getElementById("form-submit-btn").textContent = company ? "Save Changes" : "Save Company";

      document.getElementById("f-company").value = company ? company.name : "";
      document.getElementById("f-tier").value = company ? company.tier : "tier1";
      document.getElementById("f-status").value = company ? company.status : "new";
      document.getElementById("f-startday").value = company ? company.startDay : new Date().toISOString().slice(0, 10);
      document.getElementById("f-duplicate-warning").style.display = "none";

      formOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
      setTimeout(() => document.getElementById("f-company").focus(), 100);
    }

    function closeCompanyForm() {
      formOverlay.classList.remove("open");
      if (!nodeOverlay.classList.contains("open") && !sequenceOverlay.classList.contains("open")) {
        document.body.classList.remove("modal-lock");
      }
    }

    document.getElementById("form-cancel-btn").addEventListener("click", closeCompanyForm);
    document.getElementById("form-modal-close").addEventListener("click", closeCompanyForm);
    formOverlay.addEventListener("click", e => { if (e.target === formOverlay) closeCompanyForm(); });
    document.getElementById("f-company").addEventListener("input", () => {
      companyDupeConfirmed = false;
      document.getElementById("f-duplicate-warning").style.display = "none";
      document.getElementById("form-submit-btn").textContent = editingCompanyId ? "Save Changes" : "Save Company";
    });

    prospectForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("f-company").value.trim();
      if (!name) return;

      if (!editingCompanyId && !companyDupeConfirmed) {
        const dupe = findDuplicateCompany(name, null);
        if (dupe) {
          const warn = document.getElementById("f-duplicate-warning");
          warn.textContent = `⚠ "${dupe.name}" already exists — submit again to add anyway.`;
          warn.style.display = "flex";
          companyDupeConfirmed = true;
          document.getElementById("form-submit-btn").textContent = "Add Anyway";
          return;
        }
      }

      const newTier = document.getElementById("f-tier").value;
      const newStatus = document.getElementById("f-status").value;
      const newStartDay = document.getElementById("f-startday").value;

      if (editingCompanyId) {
        const c = companies.find(x => x.id === editingCompanyId);
        setCompanyTier(c, newTier);
        if (c.status !== newStatus) logActivity(c, `Status changed to ${optionByValue(STATUS_OPTIONS, newStatus).label}`);
        if (newStatus === "meeting_booked") captureBookedViaMechanism(c);
        Object.assign(c, {
          name,
          status: newStatus,
          startDay: newStartDay || c.startDay
        });
        /* Tier change can shift which mechanism set applies, and Start Day
           shifts every cadence date. */
        autoAdvanceCadence(c);
        syncDealForCompany(c);
        if (currentProspect && currentProspect.id === c.id) renderCompanySummary(currentProspect);
      } else {
        const c = normalizeCompany({
          id: "co_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name,
          tier: newTier, status: newStatus,
          startDay: newStartDay,
          lastInteraction: Date.now(),
          createdAt: Date.now(),
          notes: "",
          seenState: {},
          activity: []
        });
        logActivity(c, "Company created");
        companies.push(c);
        invalidateLookupIndexes();
        syncDealForCompany(c);
      }
      saveCompanies();
      renderCurrentView();
      closeCompanyForm();
    });

    /* -- Person form -- */
    const personFormOverlay = document.getElementById("person-form-overlay");
    const personForm = document.getElementById("person-form");
    let editingPersonId = null;

    function refreshCompanySelect(preselectId) {
      const sel = document.getElementById("p-company");
      sel.innerHTML = "";
      companies.forEach(co => {
        const o = document.createElement("option");
        o.value = co.id; o.textContent = co.name;
        sel.appendChild(o);
      });
      if (preselectId) sel.value = preselectId;
    }

    let personDupeConfirmed = false;

    /* Same email-first, name+company-fallback matching used by the CSV
       importer (see buildPeopleImportPlan). */
    function findDuplicatePerson(name, email, companyId, excludeId) {
      const emailKey = email ? email.trim().toLowerCase() : null;
      const nameKey = name.trim().toLowerCase();
      return people.find(p => {
        if (p.id === excludeId) return false;
        if (emailKey && p.email && p.email.trim().toLowerCase() === emailKey) return true;
        if (!emailKey && p.name.trim().toLowerCase() === nameKey && p.companyId === companyId) return true;
        return false;
      }) || null;
    }

    function openPersonForm(person, presetCompanyId) {
      editingPersonId = person ? person.id : null;
      personDupeConfirmed = false;
      document.getElementById("person-form-modal-eyebrow").textContent = person ? "Edit Person" : "New Person";
      document.getElementById("person-form-modal-title").textContent = person ? "Edit Person" : "Add Person";
      document.getElementById("person-form-submit-btn").textContent = person ? "Save Changes" : "Save Person";

      refreshCompanySelect(person ? person.companyId : (presetCompanyId || (companies[0] && companies[0].id)));
      document.getElementById("p-name").value = person ? person.name : "";
      document.getElementById("p-jobtitle").value = person ? (person.jobTitle || "") : "";
      document.getElementById("p-linkedin").value = person ? (person.linkedin || "") : "";
      document.getElementById("p-email").value = person ? (person.email || "") : "";
      document.getElementById("p-phone").value = person ? (person.phone || "") : "";
      document.getElementById("p-primary").checked = person ? !!person.isPrimary : (presetCompanyId ? peopleAt(presetCompanyId).length === 0 : false);
      document.getElementById("p-duplicate-warning").style.display = "none";

      personFormOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
      setTimeout(() => document.getElementById("p-name").focus(), 100);
    }

    function closePersonForm() {
      personFormOverlay.classList.remove("open");
      if (!nodeOverlay.classList.contains("open") && !sequenceOverlay.classList.contains("open")) {
        document.body.classList.remove("modal-lock");
      }
    }

    document.getElementById("person-form-cancel-btn").addEventListener("click", closePersonForm);
    document.getElementById("person-form-modal-close").addEventListener("click", closePersonForm);
    personFormOverlay.addEventListener("click", e => { if (e.target === personFormOverlay) closePersonForm(); });
    ["p-name", "p-email", "p-company"].forEach(id => {
      const resetDupe = () => {
        personDupeConfirmed = false;
        document.getElementById("p-duplicate-warning").style.display = "none";
        document.getElementById("person-form-submit-btn").textContent = editingPersonId ? "Save Changes" : "Save Person";
      };
      document.getElementById(id).addEventListener("input", resetDupe);
      document.getElementById(id).addEventListener("change", resetDupe);
    });

    personForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("p-name").value.trim();
      const companyId = document.getElementById("p-company").value;
      if (!name || !companyId) return;
      const email = document.getElementById("p-email").value.trim();
      const isPrimary = document.getElementById("p-primary").checked;

      if (!editingPersonId && !personDupeConfirmed) {
        const dupe = findDuplicatePerson(name, email, companyId, null);
        if (dupe) {
          const warn = document.getElementById("p-duplicate-warning");
          const dupeCo = companyById(dupe.companyId);
          warn.textContent = `⚠ "${dupe.name}"${dupeCo ? ` at ${dupeCo.name}` : ""} already exists${dupe.email ? ` (${dupe.email})` : ""} — submit again to add anyway.`;
          warn.style.display = "flex";
          personDupeConfirmed = true;
          document.getElementById("person-form-submit-btn").textContent = "Add Anyway";
          return;
        }
      }

      if (isPrimary) {
        peopleAt(companyId).forEach(p => { if (!editingPersonId || p.id !== editingPersonId) p.isPrimary = false; });
      }

      const co = companyById(companyId);
      if (editingPersonId) {
        const p = people.find(x => x.id === editingPersonId);
        Object.assign(p, {
          name, companyId,
          jobTitle: document.getElementById("p-jobtitle").value.trim(),
          linkedin: document.getElementById("p-linkedin").value.trim(),
          email: document.getElementById("p-email").value.trim(),
          phone: document.getElementById("p-phone").value.trim(),
          isPrimary
        });
        if (co) logActivity(co, `Updated contact: ${name}`);
      } else {
        people.push({
          id: "pe_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name, companyId,
          jobTitle: document.getElementById("p-jobtitle").value.trim(),
          linkedin: document.getElementById("p-linkedin").value.trim(),
          email: document.getElementById("p-email").value.trim(),
          phone: document.getElementById("p-phone").value.trim(),
          isPrimary
        });
        if (co) logActivity(co, `Added contact: ${name}`);
        invalidateLookupIndexes();
      }
      savePeople();
      if (co) saveCompanies();
      renderCurrentView();
      if (currentProspect && currentProspect.id === companyId) {
        renderCompanySummary(currentProspect);
        renderCompanyContacts(currentProspect);
      }
      closePersonForm();
    });

    /* -- Deal form -- */
    const dealFormOverlay = document.getElementById("deal-form-overlay");
    const dealForm = document.getElementById("deal-form");
    let editingDealId = null;

    function refreshDealCompanySelect(preselectId) {
      const sel = document.getElementById("d-company");
      sel.innerHTML = "";
      companies.forEach(co => {
        const o = document.createElement("option");
        o.value = co.id; o.textContent = co.name;
        sel.appendChild(o);
      });
      if (preselectId) sel.value = preselectId;
    }
    populateSelect("d-stage", DEAL_STAGE_OPTIONS, "value", "label");

    function openDealForm(deal, presetCompanyId) {
      editingDealId = deal ? deal.id : null;
      document.getElementById("deal-form-modal-eyebrow").textContent = deal ? "Edit Deal" : "New Deal";
      document.getElementById("deal-form-modal-title").textContent = deal ? "Edit Deal" : "Add Deal";
      document.getElementById("deal-form-submit-btn").textContent = deal ? "Save Changes" : "Save Deal";

      refreshDealCompanySelect(deal ? deal.companyId : (presetCompanyId || (companies[0] && companies[0].id)));
      document.getElementById("d-name").value = deal ? deal.name : "";
      document.getElementById("d-value").value = deal ? deal.value : "";
      document.getElementById("d-closedate").value = deal ? (deal.closeDate || "") : "";
      document.getElementById("d-stage").value = deal ? deal.stage : "won";

      dealFormOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
      setTimeout(() => document.getElementById("d-name").focus(), 100);
    }

    function closeDealForm() {
      dealFormOverlay.classList.remove("open");
      if (!nodeOverlay.classList.contains("open") && !sequenceOverlay.classList.contains("open")) {
        document.body.classList.remove("modal-lock");
      }
    }

    document.getElementById("deal-form-cancel-btn").addEventListener("click", closeDealForm);
    document.getElementById("deal-form-modal-close").addEventListener("click", closeDealForm);
    dealFormOverlay.addEventListener("click", e => { if (e.target === dealFormOverlay) closeDealForm(); });

    dealForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("d-name").value.trim();
      const companyId = document.getElementById("d-company").value;
      if (!name || !companyId) return;
      const payload = {
        name, companyId,
        value: Number(document.getElementById("d-value").value) || 0,
        closeDate: document.getElementById("d-closedate").value,
        stage: document.getElementById("d-stage").value
      };

      const co = companyById(companyId);
      if (editingDealId) {
        const d = deals.find(x => x.id === editingDealId);
        if (co && d.stage !== payload.stage) logActivity(co, `Deal "${name}" stage changed to ${optionByValue(DEAL_STAGE_OPTIONS, payload.stage).label}`);
        Object.assign(d, payload);
      } else {
        deals.push(Object.assign({
          id: "de_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          createdAt: Date.now()
        }, payload));
        if (co) logActivity(co, `Added deal: ${name} (${formatCurrency(payload.value)})`);
      }
      saveDeals();
      if (co) saveCompanies();
      renderCurrentView();
      closeDealForm();
    });
