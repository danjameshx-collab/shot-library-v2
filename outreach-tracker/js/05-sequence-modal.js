    /* ============================================================
       PART E — Sequence full-screen modal integration
       ============================================================ */
    const sequenceOverlay = document.getElementById("sequence-overlay");

    function summaryField(label, value, isEmpty, hasPill) {
      return `<div class="summary-field"><span class="summary-label">${label}</span><span class="summary-value${isEmpty ? " empty" : ""}${hasPill ? " has-pill" : ""}">${value}</span></div>`;
    }

    /* "Next up" panel at the top of the company sidebar: the one touch to do
       next and when it's due, from the same activeStepInfo the Active tab's
       Current Step / Next Due columns use. Clicking it scrolls the sequence
       to the highlighted row (see refreshNextTouch). */
    function nextUpHtml(company) {
      if (!company.startDay) {
        if (!["new", "in_sequence"].includes(company.status)) return "";
        return `<div class="next-up is-idle"><span class="summary-label">Next Up</span>
          <span class="next-up-main">Sequence not started</span>
          <span class="next-up-sub">Set a Sequence Start date below to schedule every touch.</span></div>`;
      }
      if (!isActiveOutbound(company)) return "";
      activeStepCache.delete(company.id);
      const info = activeStepInfo(company);
      if (info.complete) {
        return `<div class="next-up is-done"><span class="summary-label">Next Up</span><span class="next-up-main">Sequence complete</span></div>`;
      }
      const dateText = info.due ? formatDateLong(new Date(info.due + "T00:00:00")) : "";
      const when = info.today ? "Due today" : info.overdue ? `Overdue · was due ${dateText}` : info.due ? `Due ${dateText}` : "";
      const cls = info.overdue ? " is-overdue" : info.today ? " is-today" : "";
      return `<button type="button" class="next-up${cls}" title="Show in the sequence">
        <span class="summary-label">Next Up</span>
        <span class="next-up-main">${info.mechanism ? `<span class="next-up-mech">${info.mechanism}</span>` : ""}${info.label}</span>
        ${when ? `<span class="next-up-sub">${when}</span>` : ""}</button>`;
    }

    function renderCompanySummary(company) {
      const grid = document.getElementById("prospect-summary");
      const tierOpt = optionByValue(TIER_OPTIONS, company.tier);
      const statusOpt = optionByValue(STATUS_OPTIONS, company.status);
      /* Tier/Status mirror the table's editable-pill treatment (click to open
         the same field popover). */
      grid.innerHTML = `
      ${nextUpHtml(company)}
      <div class="summary-row">
        ${summaryField("Last Interaction", relativeTime(company.lastInteraction), false)}
        ${summaryField("Tier", `<button type="button" class="crm-pill editable-pill" data-field="tier" style="background:${tierOpt.tint};color:${tierOpt.textColor};border-color:${tierOpt.tint}">${tierOpt.label}</button>`, false, true)}
      </div>
      <div class="summary-row">
        ${summaryField("Status", `<button type="button" class="crm-pill editable-pill" data-field="status" style="background:${statusOpt.tint};color:${statusOpt.textColor}"><span class="dot" style="background:${statusOpt.pillDot || statusOpt.dot}"></span>${statusOpt.label}</button>`, false, true)}
        ${summaryField("Sequence Start", `<button type="button" class="closing-date-btn startdate-btn" title="Every cadence date (Day 1/4/7…) is calculated from this">${company.startDay ? formatDateShort(company.startDay) : "Not started"}</button>`, false, true)}
      </div>`;

      grid.querySelectorAll(".editable-pill").forEach(el => {
        el.addEventListener("click", e => {
          e.stopPropagation();
          openFieldPopover(el, company, el.dataset.field);
        });
      });

      const nextUpBtn = grid.querySelector("button.next-up");
      if (nextUpBtn) {
        nextUpBtn.addEventListener("click", () => {
          const target = document.querySelector("#diagram-root .is-next");
          if (!target) return;
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.remove("flash");
          void target.offsetWidth;
          target.classList.add("flash");
        });
      }

      const startDateBtn = grid.querySelector(".startdate-btn");
      if (startDateBtn) {
        startDateBtn.addEventListener("click", e => {
          e.stopPropagation();
          const pop = openPopover(startDateBtn, popEl => {
            buildCalendarPopover(popEl, company.startDay || localDateStr(Date.now()), newDate => {
              setCompanyStartDay(company, newDate, false);
              saveCompanies();
              /* Full rebuild, not just the summary pills — Start Day shifts
                 every "Day N · Date" label and can re-tick cadence checkboxes,
                 so the sequence diagram needs to reflect that immediately. */
              openSequenceModal(company);
              renderCurrentView();
            }, company.startDay ? () => {
              clearCompanyStartDay(company);
              saveCompanies();
              openSequenceModal(company);
              renderCurrentView();
            } : null);
          });
          positionPopoverBeside(pop, startDateBtn);
        });
      }
    }

    function renderCompanyContacts(company) {
      const wrap = document.getElementById("prospect-contacts");
      const contacts = peopleAt(company.id);
      const rowsHtml = contacts.length ? contacts.map(p => {
        const href = p.linkedin ? (/^https?:\/\//i.test(p.linkedin) ? p.linkedin : `https://${p.linkedin}`) : null;
        return `<div class="contact-row" data-person-id="${p.id}">
        <div class="prospect-avatar" style="background:${colorForString(p.name)}; width:30px; height:30px; font-size:10.5px;">${initials(p.name)}</div>
        <div class="contact-info">
          <span class="contact-name">${p.name}${p.isPrimary ? ' <span class="primary-badge">Primary</span>' : ""}</span>
          <span class="contact-meta">${p.jobTitle || "—"} ${p.email ? " · " + p.email : ""}${p.phone ? " · " + p.phone : ""}${href ? ` · <a class="summary-link" href="${href}" target="_blank" rel="noopener" onclick="event.stopPropagation()">LinkedIn</a>` : ""}</span>
        </div>
        <button type="button" class="edit-icon-btn contact-edit-btn" title="Edit contact">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
        </button>
        <button type="button" class="edit-icon-btn delete-icon-btn contact-delete-btn" title="Delete contact">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path></svg>
        </button>
      </div>`;
      }).join("") : `<p class="contacts-empty">No contacts yet.</p>`;

      wrap.innerHTML = `
      <div class="contacts-header">
        <span class="summary-label">Contacts (${contacts.length})</span>
        <button type="button" class="btn btn-secondary" id="add-contact-btn" style="padding:6px 12px; font-size:11.5px;">+ Add Contact</button>
      </div>
      <div class="contacts-list">${rowsHtml}</div>`;

      document.getElementById("add-contact-btn").addEventListener("click", () => {
        openPersonForm(null, company.id);
      });
      wrap.querySelectorAll(".contact-row").forEach(row => {
        row.querySelector(".contact-edit-btn").addEventListener("click", () => {
          const person = people.find(p => p.id === row.dataset.personId);
          if (person) openPersonForm(person);
        });
        row.querySelector(".contact-delete-btn").addEventListener("click", () => {
          deletePerson(row.dataset.personId);
        });
      });
    }

    /* ---- Activity / audit trail ---- */
    function logActivity(company, text) {
      if (!company) return;
      if (!Array.isArray(company.activity)) company.activity = [];
      company.activity.unshift({ ts: Date.now(), text });
      if (company.activity.length > 50) company.activity.length = 50;
    }

    /* Attributes a booked call to whichever mechanism was most recently marked
       Seen at the moment status flips to Meeting Booked — a one-time capture
       (first attribution sticks) that powers the Analytics "booked via" view. */
    function captureBookedViaMechanism(c) {
      if (c.bookedViaMechanism) return;
      let latest = null;
      Object.keys(c.seenState || {}).forEach(id => {
        const v = c.seenState[id];
        if (v && v.seen && (!latest || v.ts > latest.ts)) latest = { id, ts: v.ts };
      });
      if (latest) c.bookedViaMechanism = latest.id;
    }

    /* ---- Follow-up cadence: every 3 days from Start Day, tickable ----
       Cadence touches map 1:1 onto the sequence's own nodes in order: each
       "send" node is one touch, each "branch" node's not-opened chips are the
       follow-up touches — so the checkbox lives right on the matching card.
       When the Super Loom is marked Public Posted, 3 social-media touches are
       inserted before its email follow-ups and everything after shifts down,
       elongating the whole cadence. */
    const SUPER_LOOM_SEND_ID = "t1-super-loom";
    const SOCIAL_FOLLOWUP_COUNT = 3;
    function socialChipId(branchId, i) { return `${branchId}-social-${i}`; }

    function buildCadenceIndexMap(tierKey, superLoomPosted) {
      const tier = OUTBOUND_SYSTEM[tierKey];
      const map = {};
      const indexMechanism = [];
      let idx = 0;
      let currentMechanism = null;
      if (tier) {
        tier.sequence.forEach(node => {
          if (node.type === "send") {
            currentMechanism = node.mechanism;
            map[node.id] = idx; indexMechanism[idx] = currentMechanism; idx += 1;
          } else if (node.type === "branch") {
            if (superLoomPosted && node.parentId === SUPER_LOOM_SEND_ID) {
              for (let i = 1; i <= SOCIAL_FOLLOWUP_COUNT; i++) { map[socialChipId(node.id, i)] = idx; indexMechanism[idx] = currentMechanism; idx += 1; }
            }
            node.notOpened.chips.forEach(c => { map[c.id] = idx; indexMechanism[idx] = currentMechanism; idx += 1; });
          }
        });
      }
      return { map, total: idx || 8, indexMechanism };
    }

    /* The mechanism owning the furthest-checked cadence touch — i.e. which
       sequence the prospect is currently in, as a raw mechanism string.
       Ticks are cumulative by definition (checking a later touch implies
       every earlier one happened too), so the single highest checked index
       tells you exactly which sequence the prospect is currently in. Used by
       isCurrentMechanismSeen. */
    function currentMechanismRaw(company) {
      const tier = OUTBOUND_SYSTEM[company.tier];
      if (!tier) return null;
      const superLoomPosted = company.tier === "tier1" && !!company.superLoomPosted;
      const cad = buildCadenceIndexMap(company.tier, superLoomPosted);
      const checks = company.cadenceChecks || [];
      let lastIdx = -1;
      for (let i = 0; i < checks.length; i++) { if (checks[i]) lastIdx = i; }
      if (lastIdx === -1) return null;
      return cad.indexMechanism[lastIdx] || null;
    }

    /* True once the prospect has opened/watched their current mechanism —
       the moment that happens, the very next required step is the manual
       Instant Reply/Call touch from the Opened flow (same "Manual" chip
       badge shown inside the sequence modal). Used to flag the table's
       Pipeline cell for companies still in the tiered sequence (not the
       Closing Room, which has its own overdue signal). */
    function isCurrentMechanismSeen(company) {
      const mechanism = currentMechanismRaw(company);
      if (!mechanism) return false;
      const tier = OUTBOUND_SYSTEM[company.tier];
      if (!tier) return false;
      const sendNode = tier.sequence.find(n => n.type === "send" && n.mechanism === mechanism);
      if (!sendNode) return false;
      // seenState is keyed by the send node's own id (see renderStatusBar,
      // which calls isSeen(node.id) on the same tier.sequence "send" nodes).
      const seenEntry = company.seenState && company.seenState[sendNode.id];
      return !!(seenEntry && seenEntry.seen);
    }

    /* Every manual touch (Manual tagged, cadence-dated) that has reached its
       scheduled date and isn't ticked off in manualStepsDone yet — social
       touches (Tier 1, Super Loom posted) plus manual send steps like the
       Cold Call. This is what makes the row go red AGAIN once a later manual
       touch comes due, even after an earlier manual step was already handled. */
    function pendingManualTouches(company) {
      if (!company.startDay) return []; // sequence not started — no touch can be due
      const tier = OUTBOUND_SYSTEM[company.tier];
      if (!tier) return [];
      const superLoomPosted = company.tier === "tier1" && !!company.superLoomPosted;
      const cad = buildCadenceIndexMap(company.tier, superLoomPosted);
      const schedule = computeCadenceSchedule(company);
      const todayStr = localDateStr(Date.now());
      const pending = [];
      const pushIfDue = (id) => {
        const idx = cad.map[id];
        if (idx === undefined) return;
        const dueStr = schedule.dates[idx];
        if (todayStr >= dueStr && !company.manualStepsDone[id]) pending.push(id);
      };
      if (superLoomPosted) {
        for (let s = 1; s <= SOCIAL_FOLLOWUP_COUNT; s++) pushIfDue(socialChipId(`${SUPER_LOOM_SEND_ID}-branch`, s));
      }
      /* A manual send step (Cold Call) comes due on sequence PROGRESS, not
         a calendar date: the moment the previous mechanism's final follow-up
         is checked off (follow-up 6 of the VSL Loom on tier 2, the Physical
         Good's last follow-up on tier 1), the row goes red until the call
         is logged. autoAdvanceCadence ticks touches as their dates arrive,
         so schedule-driven dueness still lands here; working the sequence
         faster than the schedule now flags immediately too.
         The very FIRST send node (idx 0 — Strategy Doc on tier 2, Super Loom
         on tier 1) has no earlier touch to gate on, so it's due the moment
         its own scheduled date arrives, same as pushIfDue above — otherwise
         a manual opener that's overdue but never marked Seen would never
         flag the row at all. */
      tier.sequence.forEach(node => {
        if (node.type === "send") {
          if (!node.manual) return;
          const idx = cad.map[node.id];
          if (idx === undefined) return;
          if (company.manualStepsDone[node.id]) return;
          if (idx === 0) { pushIfDue(node.id); return; }
          const prevTouchDone = !!(company.cadenceChecks && company.cadenceChecks[idx - 1]);
          if (prevTouchDone) pending.push(node.id);
        } else if (node.type === "branch") {
          /* Cold Call's own repeat touches (Call Attempt 2-6, followUpsManual)
             are each individually manual — every attempt needs its own dial
             logged, not just the first. computeCadenceSchedule already
             freezes/delays the schedule off these same "-no-" ids (see
             buildCadenceScheduleEntries), so checking them here too, the same
             calendar-due way as pushIfDue above, keeps the row red in sync
             with whatever's actually blocking the schedule — previously only
             the mechanism's first send step and Instant Reply were checked,
             so a missed Call Attempt 3 (say) never flagged the row at all. */
          node.notOpened.chips.forEach(c => { if (c.manual) pushIfDue(c.id); });
        }
      });
      return pending;
    }

    /* The manual flag stays live until manualStepHandledFor is checked off
       for THIS specific current mechanism — so if the pipeline later moves
       to a new mechanism that also gets opened, the flag correctly comes
       back (a stale "done" from a prior mechanism doesn't suppress it).
       Independently, any due-but-unticked social touch also re-triggers it. */
    function needsManualAction(company) {
      if (CLOSING_ROOM_STATUSES.includes(company.status)) return false;
      const currentMechanismDue = isCurrentMechanismSeen(company) && company.manualStepHandledFor !== currentMechanismRaw(company);
      return currentMechanismDue || pendingManualTouches(company).length > 0;
    }
    /* Human-readable list of every currently-outstanding manual item — used as
       the row's tooltip so it's clear WHY it's still red (e.g. Instant Reply
       handled but a Social Media Follow-Up independently came due same day). */
    function pendingManualActionsSummary(company) {
      const items = [];
      if (isCurrentMechanismSeen(company) && company.manualStepHandledFor !== currentMechanismRaw(company)) {
        items.push(`${currentMechanismRaw(company)} — Instant Reply/Call due`);
      }
      const pending = pendingManualTouches(company);
      const social = pending.filter(id => id.indexOf("-social-") > -1).length;
      if (social > 0) items.push(`${social} Social Media Follow-Up${social > 1 ? "s" : ""} due`);
      /* Manual send steps (the opener itself, or later ones like Cold Call) —
         one line each, by mechanism name. Manual follow-up chips (Cold Call's
         own repeat Call Attempts) get their own line by label instead, since
         they don't carry a "mechanism" field. */
      pending.forEach(id => {
        const node = NODE_INDEX[id];
        if (!node) return;
        if (node.kind === "send" && node.manual) items.push(`${node.mechanism} — manual step due`);
        else if (node.kind === "chip" && node.manual && id.indexOf("-social-") === -1) items.push(`${node.label} due`);
      });
      return items;
    }
    /* Single source of truth for "the current mechanism's Instant Reply is
       handled" — shared by the table's quick checkmark and the modal's
       Instant Reply checkbox for that same mechanism, so they always agree. */
    function setManualStepHandled(company, checked) {
      const mechanism = currentMechanismRaw(company);
      if (checked) {
        if (isCurrentMechanismSeen(company)) company.manualStepHandledFor = mechanism;
        logActivity(company, `Manual step handled for ${mechanism}`);
      } else {
        company.manualStepHandledFor = null;
        logActivity(company, `Manual step reopened for ${mechanism}`);
      }
      saveCompanies();
    }
    /* Closing a company (Status → Won/Churned/Lost) auto-creates or reuses a
       linked Deal so it shows up in the Deals tab without a manual step. Each
       company tracks at most one auto-managed deal via autoDealId, reused on
       every later close so re-closing never spawns duplicates. Moving OFF a
       closed status leaves the deal as-is (a historical record, not deleted).
       Deal Value/Close Date stay manual — only stage is kept in sync. */
    function syncDealForCompany(company) {
      if (!company || !["won", "churned", "lost"].includes(company.status)) return;
      let deal = company.autoDealId ? deals.find(d => d.id === company.autoDealId) : null;
      if (!deal) deal = deals.find(d => d.companyId === company.id);
      if (deal) {
        company.autoDealId = deal.id;
        if (deal.stage !== company.status) {
          deal.stage = company.status;
          saveDeals();
        }
      } else {
        deal = {
          id: "de_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          companyId: company.id,
          name: company.name,
          value: 0,
          stage: company.status,
          closeDate: localDateStr(Date.now()),
          createdAt: Date.now()
        };
        deals.push(deal);
        company.autoDealId = deal.id;
        logActivity(company, `Deal auto-created (${optionByValue(DEAL_STAGE_OPTIONS, company.status).label})`);
        saveDeals();
      }
    }
    /* "10 July 2026" — used everywhere a cadence/seen date is shown in the modal. */
    function formatDateLong(d) {
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }

    function cadenceDateRaw(startDay, index) {
      const start = startDay ? new Date(startDay + "T00:00:00") : new Date();
      const d = new Date(start.getTime() + index * 3 * 24 * 60 * 60 * 1000);
      return localDateStr(d.getTime());
    }

    function cadenceDateLabel(startDay, index) {
      return formatDateLong(new Date(cadenceDateRaw(startDay, index) + "T00:00:00"));
    }

    function addDaysToDateStr(dateStr, days) {
      const d = new Date(dateStr + "T00:00:00");
      d.setDate(d.getDate() + days);
      return localDateStr(d.getTime());
    }
    function daysBetweenDateStrs(fromStr, toStr) {
      const a = new Date(fromStr + "T00:00:00").getTime();
      const b = new Date(toStr + "T00:00:00").getTime();
      return Math.round((b - a) / (24 * 60 * 60 * 1000));
    }

    /* Same traversal as buildCadenceIndexMap (same order, so indices line up
       1:1), but keeping each touch's manual flag and owning mechanism/send
       node alongside its id — computeCadenceSchedule needs both to know
       which touches can freeze/shift the schedule. */
    function buildCadenceScheduleEntries(tierKey, superLoomPosted) {
      const tier = OUTBOUND_SYSTEM[tierKey];
      const entries = [];
      let currentMechanism = null;
      let currentSendNodeId = null;
      if (tier) {
        tier.sequence.forEach(node => {
          if (node.type === "send") {
            currentMechanism = node.mechanism;
            currentSendNodeId = node.id;
            entries.push({ id: node.id, manual: !!node.manual, mechanism: currentMechanism, sendNodeId: currentSendNodeId, isMechanismStart: true });
          } else if (node.type === "branch") {
            if (superLoomPosted && node.parentId === SUPER_LOOM_SEND_ID) {
              for (let i = 1; i <= SOCIAL_FOLLOWUP_COUNT; i++) {
                entries.push({ id: socialChipId(node.id, i), manual: true, mechanism: currentMechanism, sendNodeId: currentSendNodeId, isMechanismStart: false });
              }
            }
            node.notOpened.chips.forEach(c => {
              entries.push({ id: c.id, manual: !!c.manual, mechanism: currentMechanism, sendNodeId: currentSendNodeId, isMechanismStart: false });
            });
          }
        });
      }
      return entries;
    }

    /* Delay-aware cadence schedule. Every manual-tagged touch — a mechanism's
       own manual send step (Cold Call), its manual follow-ups, every
       mechanism's Instant Reply/Call (keyed off when its deliverable was
       actually seen) — can freeze and shift the
       schedule: if it's overdue and still unchecked, every LATER touch stops
       auto-ticking (frozenFromIndex) until it's resolved; once it IS checked
       (even late), the gap between its due date and when it was actually
       checked (manualStepsCompletedAt) permanently pushes every later date
       forward by that many days. Non-manual touches never trigger a shift
       themselves, only inherit whatever delay already accumulated before
       them. Recomputed fresh every time — nothing here is cached, so it's
       always consistent with the latest saved state. */
    function computeCadenceSchedule(company) {
      const superLoomPosted = company.tier === "tier1" && !!company.superLoomPosted;
      const entries = buildCadenceScheduleEntries(company.tier, superLoomPosted);
      /* No start date yet — the sequence hasn't started, so no touch has a
         scheduled date. Callers treat a blank date as "not due". */
      if (!company.startDay) {
        return { dates: entries.map(() => ""), total: entries.length || 8, frozenFromIndex: null, frozenId: null, pausedFromIndex: null, pausedId: null };
      }
      const todayStr = localDateStr(Date.now());
      const dates = [];
      let cumulativeDelayDays = 0;
      let frozenFromIndex = null;
      let frozenId = null;
      /* Paused: the first manual touch not yet done stops every touch after
         it, whatever its date — none of them can be ticked, by the calendar
         or by hand, until it's done (frozenFromIndex is the narrower "it's
         overdue, so later dates slide" case). An Instant Reply that's owed
         (its mechanism was seen) pauses the same way. */
      let pausedFromIndex = null;
      let pausedId = null;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const baseDate = cadenceDateRaw(company.startDay, i);
        const dueDate = addDaysToDateStr(baseDate, cumulativeDelayDays);
        dates.push(dueDate);
        if (pausedFromIndex === null && entry.manual && !(company.manualStepsDone && company.manualStepsDone[entry.id])) {
          pausedFromIndex = i + 1;
          pausedId = entry.id;
        }

        /* While the first unresolved manual touch is due, the whole schedule
           after it is ON HOLD: nothing later auto-ticks (frozenFromIndex),
           and every later date slides forward one day for each day it waits
           (the pending delay is projected to today). Ticking it today lands
           every date exactly where it was shown, since a late tick shifts
           the schedule by the same amount. A send's own manual step is
           checked before its Instant Reply, which can only follow the send. */
        if (entry.manual) {
          const done = !!(company.manualStepsDone && company.manualStepsDone[entry.id]);
          if (done) {
            const completedAt = (company.manualStepsCompletedAt && company.manualStepsCompletedAt[entry.id]) || dueDate;
            const delay = daysBetweenDateStrs(dueDate, completedAt);
            if (delay > 0) cumulativeDelayDays += delay;
          } else if (todayStr >= dueDate && frozenFromIndex === null) {
            frozenFromIndex = i + 1;
            frozenId = entry.id;
            cumulativeDelayDays += daysBetweenDateStrs(dueDate, todayStr);
          }
        }

        /* Instant Reply has no cadence index of its own — its "due date" is
           the day its mechanism was actually seen, and it holds the schedule
           from that same day ("immediately"). Evaluated right after that
           mechanism's own send-step date, so it only ever affects touches
           strictly after the send itself. */
        if (entry.isMechanismStart) {
          const seenEntry = company.seenState && company.seenState[entry.sendNodeId];
          if (seenEntry && seenEntry.seen) {
            const instantId = `${entry.sendNodeId}-branch-op-1`;
            const seenDateStr = localDateStr(seenEntry.ts);
            const doneAt = company.manualStepsCompletedAt && company.manualStepsCompletedAt[instantId];
            if (!doneAt && pausedFromIndex === null) {
              pausedFromIndex = i + 1;
              pausedId = instantId;
            }
            if (doneAt) {
              const delay = daysBetweenDateStrs(seenDateStr, doneAt);
              if (delay > 0) cumulativeDelayDays += delay;
            } else if (todayStr >= seenDateStr && frozenFromIndex === null) {
              frozenFromIndex = i + 1;
              frozenId = instantId;
              cumulativeDelayDays += daysBetweenDateStrs(seenDateStr, todayStr);
            }
          }
        }
      }
      return { dates, total: entries.length || 8, frozenFromIndex, frozenId, pausedFromIndex, pausedId };
    }

    /* Every cadence touch (the "Day N · Date: X" checkboxes) auto-ticks itself
       once its (delay-adjusted, see computeCadenceSchedule) scheduled date
       arrives — these represent automated sends, so there's nothing for a
       rep to manually confirm. The separate "Manual" tick-off system
       (manualStepsDone / manualStepHandledFor — Instant Reply, a manual send
       step, and a rep's own follow-through on a social touch) is untouched
       here and stays 100% manual, exactly as before — except that an overdue,
       still-unchecked manual touch now freezes every LATER touch from
       auto-ticking until it's resolved (frozenFromIndex).
       Once a prospect reaches Pipeline/Meeting Booked/Won/Churned/Lost, the
       automated sequence stops applying to them entirely — no further cadence
       touches get auto-ticked, matching the Closing Room's own manual-only
       follow-up model. Returns true if anything changed (caller decides
       whether to persist/re-render). */
    function autoAdvanceCadence(company) {
      if (!company || CLOSING_ROOM_STATUSES.includes(company.status)) return false;
      if (!company.startDay) return false; // sequence not started — nothing can be due
      if (!Array.isArray(company.cadenceChecks)) company.cadenceChecks = [];
      const schedule = computeCadenceSchedule(company);
      const todayStr = localDateStr(Date.now());
      let changed = false;
      for (let i = 0; i < schedule.total; i++) {
        /* Behind an unfinished manual step nothing has gone out: clear any
           tick there (one made by hand, or left over from a different
           schedule, e.g. before a tier change). */
        if (schedule.pausedFromIndex !== null && i >= schedule.pausedFromIndex) {
          if (company.cadenceChecks[i]) { company.cadenceChecks[i] = false; changed = true; }
          continue;
        }
        if (company.cadenceChecks[i]) continue;
        if (schedule.frozenFromIndex !== null && i >= schedule.frozenFromIndex) continue;
        if (todayStr >= schedule.dates[i]) {
          company.cadenceChecks[i] = true;
          changed = true;
        }
      }
      return changed;
    }

    /* A booked meeting logs itself the moment its date has fully passed in
       California time (see pacificDateStr) — dropped straight into the
       meeting history with empty notes, same shape as a manual "Mark as
       Held", just without the notes modal popping open unattended. Returns
       true if anything changed (caller decides whether to persist/re-render). */
    function autoLogPastMeeting(company) {
      if (!company || !company.nextMeetingDate) return false;
      if (pacificDateStr(Date.now()) <= company.nextMeetingDate) return false;
      if (!Array.isArray(company.meetingLog)) company.meetingLog = [];
      const id = "mtg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      company.meetingLog.unshift({ id, date: company.nextMeetingDate, notes: "" });
      company.nextMeetingDate = "";
      company.lastInteraction = Date.now();
      return true;
    }

    function formatDateShort(ts) {
      return formatDateLong(new Date(ts));
    }

    /* Changing Start Day shifts every cadence date (Day 1/4/7…) since they're
       all computed as offsets from it — autoAdvanceCadence then re-checks
       which touches are "due" as of today under the new schedule (catches up
       instantly if the new date is in the past, or leaves everything unticked
       if it's in the future — exactly the "sequence starts on this date"
       behavior asked for). Pipeline is derived from cadence progress, so it
       needs recomputing too. Shared by both the single-company date button
       and the bulk "Set Start Date" action so they can never drift apart. */
    function setCompanyStartDay(company, newDateStr, isBulk) {
      company.startDay = newDateStr;
      company.cadenceChecks = [];
      autoAdvanceCadence(company);
      logActivity(company, `Sequence start date set to ${formatDateLong(new Date(newDateStr + "T00:00:00"))}${isBulk ? " (bulk)" : ""}`);
    }

    /* Cadence ticks are kept by position, and each tier has its own
       sequence: tick 7 in Tier 2 is a different touch from tick 7 in Tier 1.
       So a tier change starts the ticks over and lets the new sequence
       catch up by date (manual steps are kept: their ids are per tier).
       Shared by the company form, the tier pill and the bulk action. */
    function setCompanyTier(company, tier, isBulk) {
      if (company.tier === tier) return;
      logActivity(company, `Tier changed to ${optionByValue(TIER_OPTIONS, tier).label}${isBulk ? " (bulk)" : ""}`);
      company.tier = tier;
      company.cadenceChecks = [];
      autoAdvanceCadence(company);
    }

    /* Back to "Not started": no start date means no touch has a scheduled
       date (see computeCadenceSchedule), so the auto-ticked cadence goes too. */
    function clearCompanyStartDay(company) {
      company.startDay = "";
      company.cadenceChecks = [];
      logActivity(company, "Sequence start date cleared");
    }

    /* ---- Creative Outreach ----
       The company is the source of truth: everything is started, created and
       edited from here. The button creates the Operating System's prospect
       record (linked back by companyId) and stores its id on the company as
       creativeProspectId; the OS's "Active Creative Movies" tab only displays
       it. The movie editor and Physical Good page open inside this page (the
       OS page in a frame, embedded mode); the Strategy Doc is written here. */
    const CO_ARROW_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>`;
    const CO_CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;
    const CO_PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>`;
    const CO_FILM_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"></path></svg>`;
    const SD_STATUSES = ["Drafting", "Ready to send", "Sent", "Viewed", "Replied"];
    const SD_DONE_STATUSES = ["Sent", "Viewed", "Replied"];
    const PG_DONE_STATUSES = ["Sent", "Delivered"];
    let creativeRenderToken = 0;
    const inOperatingSystem = window.parent && window.parent !== window;

    function coShortDate(ts) {
      return ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
    }
    function coPageOpen(id) { return document.getElementById(id).classList.contains("open"); }

    function renderCreativeOutreach(company) {
      const wrap = document.getElementById("creative-outreach");
      const token = ++creativeRenderToken;
      if (!company.creativeProspectId) {
        wrap.dataset.companyId = "";
        wrap.innerHTML = `
        <button type="button" class="co-start-card" id="co-start-btn">
          <span class="co-start-icon">${CO_FILM_SVG}</span>
          <span class="co-start-label">Creative Outreach</span>
          <span class="co-start-action"><span class="co-start-plus">${CO_PLUS_SVG}</span><span class="co-start-action-text">Start</span></span>
        </button>`;
        document.getElementById("co-start-btn").addEventListener("click", e => startCreativeOutreach(company, e.currentTarget));
        return;
      }
      // Same company: keep its tiles up while they refresh. Different company: skeleton, so a stale tile can't be clicked.
      if (wrap.dataset.companyId !== company.id || !wrap.querySelector(".co-panel")) wrap.innerHTML = creativePanelHtml(null);
      wrap.dataset.companyId = company.id;
      if (!window.creativeStore) return;
      window.creativeStore.state(company.creativeProspectId).then(state => {
        if (token !== creativeRenderToken || !currentProspect || currentProspect.id !== company.id) return;
        if (!state) {
          // Deleted from Active Creative Movies: back to the start button.
          company.creativeProspectId = null;
          logActivity(company, "Creative Outreach was deleted in Active Creative Movies");
          saveCompanies();
          renderCreativeOutreach(company);
          return;
        }
        wrap.innerHTML = creativePanelHtml(state);
        wrap.querySelectorAll(".co-tile:not([disabled])").forEach(tileEl => {
          tileEl.addEventListener("click", () => openCreativeItem(company, tileEl.dataset.coItem, state));
        });
        const delBtn = wrap.querySelector(".co-panel-delete");
        if (delBtn) delBtn.addEventListener("click", () => deleteCreativeOutreach(company, state, delBtn));
      }).catch(err => {
        console.error("Couldn't load Creative Outreach:", err);
        if (token !== creativeRenderToken) return;
        const note = wrap.querySelector(".co-panel-note");
        if (note) { note.textContent = "Couldn't load the latest status. Check your connection."; note.hidden = false; }
      });
    }

    async function startCreativeOutreach(company, btn) {
      if (!window.creativeStore || btn.disabled) return;
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.querySelector(".co-start-action-text").textContent = "Starting…";
      try {
        company.creativeProspectId = await window.creativeStore.create(company);
        logActivity(company, "Creative Outreach started");
        saveCompanies();
        if (inOperatingSystem) window.parent.postMessage({ type: "lincko:co-changed" }, "*");
      } catch (err) {
        console.error("Couldn't start Creative Outreach:", err);
        showSyncError();
      }
      if (currentProspect && currentProspect.id === company.id) renderCreativeOutreach(company);
    }

    async function deleteCreativeOutreach(company, state, btn) {
      if (!window.creativeStore || !company.creativeProspectId || btn.disabled) return;
      const detail = [
        state.movie ? "The Creative Outreach Movie" : "",
        state.physicalGood ? "The Physical Good" : "",
        state.strategyDoc ? "The Strategy Doc" : ""
      ].filter(Boolean);
      const ok = await showConfirm({
        title: "Delete Creative Outreach?",
        message: `This deletes ${company.name || "this company"}'s Creative Outreach${detail.length ? " and everything in it" : ""}. This cannot be undone.`,
        detail,
        confirmLabel: "Delete Creative Outreach"
      });
      if (!ok) return;
      btn.disabled = true;
      try {
        await window.creativeStore.remove(company.creativeProspectId);
      } catch (err) {
        console.error("Couldn't delete Creative Outreach:", err);
        btn.disabled = false;
        showSyncError();
        return;
      }
      company.creativeProspectId = null;
      logActivity(company, "Creative Outreach deleted");
      saveCompanies();
      if (inOperatingSystem) window.parent.postMessage({ type: "lincko:co-changed" }, "*");
      if (currentProspect && currentProspect.id === company.id) renderCreativeOutreach(company);
    }

    /* state === null -> still loading (skeleton tiles). */
    function creativePanelHtml(state) {
      const loading = !state;
      const movie = state && state.movie;
      const pg = state && state.physicalGood;
      const sd = state && state.strategyDoc;

      const tile = ({ key, icon, title, status, statusCls, meta, cta, isNew }) => `
        <button type="button" class="co-tile${loading ? " is-loading" : ""}${statusCls === "is-done" ? " is-done" : ""}${isNew ? " is-new" : ""}" data-co-item="${key}"${loading ? " disabled" : ""}>
          <span class="co-tile-icon">${icon}</span>
          <span class="co-tile-title">${title}</span>
          <span class="co-tile-status ${statusCls || ""}">${loading ? "&nbsp;" : status}</span>
          <span class="co-tile-meta">${loading ? "&nbsp;" : (meta || "&nbsp;")}</span>
          <span class="co-tile-cta">${loading ? "&nbsp;" : cta}</span>
        </button>`;
      const createCta = label => `${CO_PLUS_SVG} ${label}`;

      let movieTile;
      if (!movie) {
        movieTile = { key: "movie", icon: CO_FILM_SVG, title: "Creative Outreach Movie", status: "Not started", statusCls: "is-empty", meta: "Outline, dialogue & shot list", cta: createCta("Create movie"), isNew: true };
      } else {
        const shots = (movie.shots || []).filter(s => !s.isSection).length;
        movieTile = {
          key: "movie", icon: CO_FILM_SVG, title: "Creative Outreach Movie",
          status: movie.completed ? `${CO_CHECK_SVG} Completed` : "In progress",
          statusCls: movie.completed ? "is-done" : "is-progress",
          meta: `${shots} shot${shots === 1 ? "" : "s"} · Updated ${coShortDate(movie.updatedAt)}`,
          cta: `Open movie ${CO_ARROW_SVG}`
        };
      }

      let pgTile;
      let pgDone = false;
      if (!pg) {
        pgTile = { key: "pg", icon: iconSvg("gift"), title: "Physical Good", status: "Not started", statusCls: "is-empty", meta: "A gift at 3 price points", cta: createCta("Create physical good"), isNew: true };
      } else {
        const tiers = pg.tiers || {};
        const lead = pg.leadTier && tiers[pg.leadTier];
        const picks = Object.values(tiers).filter(t => t && t.name).length;
        const leadStatus = lead && lead.status;
        pgDone = PG_DONE_STATUSES.includes(leadStatus);
        pgTile = {
          key: "pg", icon: iconSvg("gift"), title: "Physical Good",
          status: lead && lead.name ? (pgDone ? `${CO_CHECK_SVG} ${escapeHtml(leadStatus)}` : escapeHtml(leadStatus || "Idea")) : `${picks} of 3 picks`,
          statusCls: pgDone ? "is-done" : "is-progress",
          meta: lead && lead.name ? `Lead: ${escapeHtml(lead.good || lead.name)}` : (picks ? "No lead pick chosen yet" : "No picks added yet"),
          cta: `Open physical good ${CO_ARROW_SVG}`
        };
      }

      let docTile;
      const docLink = (currentProspect && currentProspect.quickLinks && currentProspect.quickLinks.d100) || (sd && sd.gammaUrl);
      const docDone = !!docLink;
      if (!sd && !docLink) {
        docTile = { key: "doc", icon: iconSvg("doc"), title: "Strategy Doc", status: "Not started", statusCls: "is-empty", meta: "The link to the doc", cta: createCta("Add strategy doc"), isNew: true };
      } else {
        docTile = {
          key: "doc", icon: iconSvg("doc"), title: "Strategy Doc",
          status: docDone ? `${CO_CHECK_SVG} Linked` : "No link yet",
          statusCls: docDone ? "is-done" : "is-progress",
          meta: sd && sd.updatedAt ? `Updated ${coShortDate(sd.updatedAt)}` : "&nbsp;",
          cta: `Open strategy doc ${CO_ARROW_SVG}`
        };
      }

      const done = [movie && movie.completed, pgDone, docDone].filter(Boolean).length;
      return `
      <div class="co-panel">
        <div class="co-panel-head">
          <span class="summary-label">Creative Outreach</span>
          <span class="co-panel-progress">
            ${loading ? "Loading…" : `<span class="co-progress-bar" aria-hidden="true"><span style="width:${Math.round(done / 3 * 100)}%"></span></span>${done} of 3 complete`}
            ${loading ? "" : `<button type="button" class="co-panel-delete" title="Delete Creative Outreach" aria-label="Delete Creative Outreach"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg></button>`}
          </span>
        </div>
        <div class="co-tiles">
          ${tile(movieTile)}
          ${tile(pgTile)}
          ${tile(docTile)}
        </div>
        <p class="co-panel-note" hidden></p>
      </div>`;
    }

    function openCreativeItem(company, item, state) {
      if (item === "doc") openStrategyDoc(company, state && state.strategyDoc);
      else openCreativeEmbed(company, item);
    }

    /* ---- Movie editor / Physical Good: the OS page, embedded inside the company ---- */
    const coEmbedPage = document.getElementById("co-embed-page");
    const coEmbedFrame = document.getElementById("co-embed-frame");
    let coEmbedCompany = null;

    function openCreativeEmbed(company, item) {
      coEmbedCompany = company;
      document.getElementById("co-embed-loading-text").textContent =
        item === "movie" ? "Opening the movie…" : "Opening the physical good…";
      coEmbedPage.classList.remove("is-ready");
      coEmbedFrame.src = `../index.html?embed=${encodeURIComponent(item)}&prospect=${encodeURIComponent(company.creativeProspectId)}`;
      coEmbedPage.classList.add("open");
      coEmbedPage.setAttribute("aria-hidden", "false");
      logActivity(company, item === "movie" ? "Opened the Creative Outreach Movie" : "Opened the Physical Good");
    }

    function closeCreativeEmbed() {
      coEmbedPage.classList.remove("open", "is-ready");
      coEmbedPage.setAttribute("aria-hidden", "true");
      coEmbedFrame.src = "about:blank";
      const company = coEmbedCompany;
      coEmbedCompany = null;
      if (company && window.creativeStore) window.creativeStore.touchProspect(company.creativeProspectId).catch(() => { });
      if (currentProspect) renderCreativeOutreach(currentProspect);
      if (inOperatingSystem) window.parent.postMessage({ type: "lincko:co-changed" }, "*");
    }

    /* ---- Strategy Doc: written here. Autosaves as you type. ---- */
    const coDocPage = document.getElementById("co-doc-page");
    const coDocBody = document.getElementById("co-doc-body");
    const coDocSaveEl = document.getElementById("co-doc-save");
    let coDoc = null;          // the open doc record
    let coDocCompany = null;
    let coDocPending = {};     // fields changed since the last save
    let coDocTimer = null;
    let coDocSaving = null;    // in-flight save promise

    async function openStrategyDoc(company, existing) {
      if (!window.creativeStore || !company.creativeProspectId) return;
      let rec = existing;
      try {
        if (!rec) {
          const state = await window.creativeStore.state(company.creativeProspectId);
          rec = state && state.strategyDoc;
          if (!state) { renderCreativeOutreach(company); return; }
        }
        if (!rec) {
          rec = await window.creativeStore.createStrategyDoc(company.creativeProspectId);
          window.creativeStore.touchProspect(company.creativeProspectId).catch(() => { });
          logActivity(company, "Strategy Doc created");
          saveCompanies();
        }
      } catch (err) {
        console.error("Couldn't open the Strategy Doc:", err);
        showSyncError();
        return;
      }
      coDoc = rec;
      coDocCompany = company;
      coDocPending = {};
      document.getElementById("co-doc-company").textContent = company.name;
      setDocSaveState("");
      renderStrategyDoc();
      coDocPage.classList.add("open");
      coDocPage.setAttribute("aria-hidden", "false");
      coDocBody.scrollTop = 0;
    }

    function setDocSaveState(state) {
      coDocSaveEl.className = "co-doc-save" + (state ? " is-" + state : "");
      coDocSaveEl.innerHTML = state === "saving" ? "Saving…"
        : state === "saved" ? `${CO_CHECK_SVG} Saved`
          : state === "error" ? "Not saved, retrying on your next change" : "";
    }

    function sdField(key, label, opts) {
      const value = coDoc[key] || "";
      const control = opts.multi
        ? `<textarea class="co-doc-input" data-sd-field="${key}" rows="${opts.rows || 3}" placeholder="${escapeHtml(opts.ph)}">${escapeHtml(value)}</textarea>`
        : `<input class="co-doc-input" type="${opts.type || "text"}" data-sd-field="${key}" value="${escapeHtml(value)}" placeholder="${escapeHtml(opts.ph)}">`;
      return `<label class="co-doc-field"><span class="co-doc-label">${label}</span>${opts.hint ? `<span class="co-doc-hint">${opts.hint}</span>` : ""}${control}</label>`;
    }

    function sdLinkField(key, label, ph) {
      const url = coDoc[key] || "";
      return `<div class="co-doc-field">
        <span class="co-doc-label">${label}</span>
        <div class="co-doc-link-row">
          <input class="co-doc-input" type="url" data-sd-field="${key}" value="${escapeHtml(url)}" placeholder="${escapeHtml(ph)}">
          <a class="co-doc-link-open${url ? "" : " is-hidden"}" data-sd-open="${key}" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open ${CO_ARROW_SVG}</a>
        </div>
      </div>`;
    }

    /* The page is just the doc's link. It's the same link as the company's
       Strategy Doc quick-access button (quickLinks.d100), mirrored into the
       doc record's gammaUrl so the Creative Outreach tile can show it. */
    function renderStrategyDoc() {
      const links = coDocCompany && coDocCompany.quickLinks;
      if (links && !links.d100 && coDoc.gammaUrl) {
        links.d100 = coDoc.gammaUrl;
        saveCompanies();
      } else if (links && links.d100 && links.d100 !== coDoc.gammaUrl) {
        queueDocSave({ gammaUrl: links.d100 });
      }
      coDocBody.innerHTML = `
      <div class="co-doc-inner co-doc-inner--link">
        <section class="co-doc-card co-doc-link-card">
          <h3 class="co-doc-card-title">Strategy Doc link</h3>
          <p class="co-doc-card-sub">Paste the link to the doc. It's the same link as the Strategy Doc button on the company.</p>
          ${sdLinkField("gammaUrl", "Link", "https://gamma.app/docs/…")}
        </section>
      </div>`;
      const input = coDocBody.querySelector('[data-sd-field="gammaUrl"]');
      if (input) setTimeout(() => input.focus(), 100);
    }

    function autoGrowDocField(el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + 2 + "px";
    }

    function queueDocSave(fields) {
      Object.assign(coDoc, fields);
      Object.assign(coDocPending, fields);
      setDocSaveState("saving");
      clearTimeout(coDocTimer);
      coDocTimer = setTimeout(flushDocSave, 600);
    }

    async function flushDocSave() {
      clearTimeout(coDocTimer);
      coDocTimer = null;
      if (coDocSaving) await coDocSaving;
      if (!coDoc || !Object.keys(coDocPending).length) return;
      const fields = { ...coDocPending, updatedAt: Date.now() };
      const docId = coDoc.id;
      coDocPending = {};
      coDoc.updatedAt = fields.updatedAt;
      coDocSaving = window.creativeStore.saveStrategyDoc(docId, fields)
        .then(() => { if (coDoc && coDoc.id === docId && !coDocTimer) setDocSaveState("saved"); })
        .catch(err => {
          console.error("Strategy Doc save failed:", err);
          // Put the fields back so the next change re-sends them.
          if (coDoc && coDoc.id === docId) coDocPending = { ...fields, ...coDocPending };
          setDocSaveState("error");
        })
        .finally(() => { coDocSaving = null; });
      await coDocSaving;
    }

    async function closeStrategyDoc() {
      if (!coDocPage.classList.contains("open")) return;
      await flushDocSave();
      coDocPage.classList.remove("open");
      coDocPage.setAttribute("aria-hidden", "true");
      if (coDocCompany && window.creativeStore) window.creativeStore.touchProspect(coDocCompany.creativeProspectId).catch(() => { });
      coDoc = null;
      coDocCompany = null;
      if (currentProspect) renderCreativeOutreach(currentProspect);
      if (inOperatingSystem) window.parent.postMessage({ type: "lincko:co-changed" }, "*");
    }

    coDocBody.addEventListener("input", e => {
      const el = e.target.closest("[data-sd-field]");
      if (!el || !coDoc) return;
      if (el.tagName === "TEXTAREA") autoGrowDocField(el);
      const key = el.dataset.sdField;
      queueDocSave({ [key]: el.value });
      if (key === "gammaUrl" && coDocCompany) {
        if (!coDocCompany.quickLinks) coDocCompany.quickLinks = { superLoom: "", physicalGood: "", vslLoom: "", d100: "" };
        coDocCompany.quickLinks.d100 = el.value.trim();
        saveCompanies();
        if (currentProspect && currentProspect.id === coDocCompany.id) renderQuickAccessGrid(coDocCompany);
      }
      const open = coDocBody.querySelector(`[data-sd-open="${key}"]`);
      if (open) {
        const url = el.value.trim();
        open.href = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url;
        open.classList.toggle("is-hidden", !url);
      }
    });
    coDocBody.addEventListener("click", async e => {
      if (!coDoc) return;
      const step = e.target.closest("[data-sd-status]");
      if (step) {
        const status = step.dataset.sdStatus;
        const fields = { status };
        if (SD_DONE_STATUSES.includes(status) && !coDoc.sentAt) fields.sentAt = Date.now();
        if (!SD_DONE_STATUSES.includes(status)) fields.sentAt = null;
        queueDocSave(fields);
        if (coDocCompany) { logActivity(coDocCompany, `Strategy Doc: ${status}`); saveCompanies(); }
        // Re-render keeps focus simple; the text fields hold no unsaved state (it's all in coDoc).
        const scroll = coDocBody.scrollTop;
        renderStrategyDoc();
        coDocBody.scrollTop = scroll;
        return;
      }
      const copy = e.target.closest("#co-doc-copy");
      if (copy) {
        const text = (coDoc.emailSubject ? `Subject: ${coDoc.emailSubject}\n\n` : "") + (coDoc.emailBody || "");
        try {
          await navigator.clipboard.writeText(text.trim());
          copy.textContent = "Copied";
        } catch (err) {
          copy.textContent = "Copy blocked";
        }
        setTimeout(() => { copy.textContent = "Copy email"; }, 1400);
      }
    });
    document.getElementById("co-doc-back").addEventListener("click", closeStrategyDoc);
    window.addEventListener("beforeunload", e => {
      if (coDoc && (coDocTimer || coDocSaving)) { flushDocSave(); e.preventDefault(); e.returnValue = ""; }
    });

    /* Messages: from the embedded OS page (ready / back to company), and from
       the Operating System around this frame (open a company, tracker shown). */
    window.addEventListener("message", e => {
      const data = e.data || {};
      if (e.source === coEmbedFrame.contentWindow) {
        if (data.type === "lincko:embed-ready") coEmbedPage.classList.add("is-ready");
        else if (data.type === "lincko:embed-close") closeCreativeEmbed();
        return;
      }
      if (!inOperatingSystem || e.source !== window.parent) return;
      if (data.type === "lincko:tracker-shown") {
        if (currentProspect && !coPageOpen("co-embed-page") && !coPageOpen("co-doc-page")) renderCreativeOutreach(currentProspect);
      } else if (data.type === "lincko:open-company" && data.companyId) {
        // The tracker may still be loading its data on first open: wait for the company to appear.
        let tries = 0;
        const attempt = () => {
          const co = companyById(String(data.companyId));
          if (!co) { if (++tries < 100) setTimeout(attempt, 100); return; }
          if (coPageOpen("co-embed-page")) return; // an item is open: don't pull it out from under them
          openSequenceModal(co);
          if (data.item === "doc") openStrategyDoc(co);
        };
        attempt();
      } else if (data.type === "lincko:inbox-done" && typeof data.key === "string") {
        // Ticked Done on the OS Power List. Waits for the server load; a touch
        // that's no longer pending (already done here) is left alone.
        let tries = 0;
        const attempt = () => {
          if (!inboxServerLoaded) { if (++tries < 300) setTimeout(attempt, 100); return; }
          const task = buildInboxTasks().find(t => t.kind !== "meeting" && `${t.companyId}|${t.touchId}` === data.key);
          if (task) completeInboxTask(task.companyId, task.touchId, task.kind, "Power List");
          else postInboxTasksToOS(); // lets the OS stop waiting on it
        };
        attempt();
      }
    });

    /* ---- Quick-access links: Super Loom / Physical Good / Strategy Doc ----
       (VSL Loom is hidden for now; its saved link is kept in quickLinks.vslLoom.) */
    const QUICK_ACCESS_DEFS = [
      { key: "superLoom", label: "Super Loom", icon: "loom" },
      { key: "physicalGood", label: "Physical Good", icon: "gift" },
      { key: "d100", label: "Strategy Doc", icon: "doc" }
    ];

    function renderQuickAccessGrid(company) {
      const grid = document.getElementById("quick-access-grid");
      if (!company.quickLinks) company.quickLinks = { superLoom: "", physicalGood: "", vslLoom: "", d100: "" };
      grid.innerHTML = QUICK_ACCESS_DEFS.map(def => {
        const url = company.quickLinks[def.key];
        return `<div class="quick-access-box${url ? " has-link" : ""}" data-key="${def.key}">
        <span class="quick-access-edit" data-key="${def.key}" title="Set link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
        </span>
        <span class="quick-access-icon">${iconSvg(def.icon)}</span>
        <span class="quick-access-label">${def.label}</span>
        <span class="quick-access-status">${url ? "Open ↗" : "+ Add link"}</span>
      </div>`;
      }).join("");

      grid.querySelectorAll(".quick-access-box").forEach(box => {
        box.addEventListener("click", e => {
          if (e.target.closest(".quick-access-edit")) return;
          const key = box.dataset.key;
          const url = company.quickLinks[key];
          if (url) window.open(url, "_blank", "noopener");
          else openQuickLinkModal(company, key);
        });
      });
      grid.querySelectorAll(".quick-access-edit").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          openQuickLinkModal(company, btn.dataset.key);
        });
      });
    }

    /* ---- Quick-access link modal: a proper modal with focus/select-on-open,
       Enter-to-save, and a dedicated Remove action — replaces the old
       native prompt() for a much smoother edit experience. ---- */
    const quickLinkOverlay = document.getElementById("quicklink-overlay");
    const quickLinkForm = document.getElementById("quicklink-form");
    let quickLinkContext = { company: null, key: null };

    function openQuickLinkModal(company, key) {
      const def = QUICK_ACCESS_DEFS.find(d => d.key === key);
      quickLinkContext = { company, key };
      document.getElementById("quicklink-title").textContent = def.label;
      document.getElementById("quicklink-icon").innerHTML = iconSvg(def.icon);
      const input = document.getElementById("quicklink-input");
      input.value = company.quickLinks[key] || "";
      document.getElementById("quicklink-remove-btn").style.display = input.value ? "" : "none";
      quickLinkOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
      setTimeout(() => { input.focus(); input.select(); }, 100);
    }

    function closeQuickLinkModal() {
      quickLinkOverlay.classList.remove("open");
      if (!nodeOverlay.classList.contains("open") && !sequenceOverlay.classList.contains("open")) {
        document.body.classList.remove("modal-lock");
      }
    }

    document.getElementById("quicklink-modal-close").addEventListener("click", closeQuickLinkModal);
    document.getElementById("quicklink-cancel-btn").addEventListener("click", closeQuickLinkModal);
    quickLinkOverlay.addEventListener("click", e => { if (e.target === quickLinkOverlay) closeQuickLinkModal(); });

    quickLinkForm.addEventListener("submit", e => {
      e.preventDefault();
      const { company, key } = quickLinkContext;
      if (!company || !key) return;
      company.quickLinks[key] = document.getElementById("quicklink-input").value.trim();
      saveCompanies();
      renderQuickAccessGrid(company);
      closeQuickLinkModal();
    });

    document.getElementById("quicklink-remove-btn").addEventListener("click", () => {
      const { company, key } = quickLinkContext;
      if (!company || !key) return;
      company.quickLinks[key] = "";
      saveCompanies();
      renderQuickAccessGrid(company);
      closeQuickLinkModal();
    });

    let notesSaveDebounce;
    let notesValueOnOpen = "";
    function renderProspectNotes(company) {
      const textarea = document.getElementById("prospect-notes-input");
      textarea.value = company.notes || "";
      notesValueOnOpen = company.notes || "";
    }

    /* Small inline textarea and the full-notes modal's textarea are two views
       onto the same value — typing in either mirrors into the other and saves
       on the same debounce. */
    function syncNotesFields(val, sourceEl) {
      if (!currentProspect) return;
      const small = document.getElementById("prospect-notes-input");
      const big = document.getElementById("notes-modal-textarea");
      if (small && small !== sourceEl) small.value = val;
      if (big && big !== sourceEl) big.value = val;
      clearTimeout(notesSaveDebounce);
      notesSaveDebounce = setTimeout(() => {
        currentProspect.notes = val;
        saveCompanies();
      }, 300);
    }
    document.getElementById("prospect-notes-input").addEventListener("input", e => syncNotesFields(e.target.value, e.target));
    document.getElementById("notes-modal-textarea").addEventListener("input", e => syncNotesFields(e.target.value, e.target));

    const notesOverlay = document.getElementById("notes-overlay");
    function openNotesModal() {
      if (!currentProspect) return;
      document.getElementById("notes-modal-textarea").value = document.getElementById("prospect-notes-input").value;
      document.getElementById("notes-modal-name").textContent = currentProspect.name;
      notesOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
      setTimeout(() => {
        const ta = document.getElementById("notes-modal-textarea");
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }, 60);
    }
    function closeNotesModal() {
      notesOverlay.classList.remove("open");
    }
    document.getElementById("prospect-notes-input").addEventListener("focus", openNotesModal);
    document.getElementById("notes-modal-close").addEventListener("click", closeNotesModal);
    notesOverlay.addEventListener("click", e => { if (e.target === notesOverlay) closeNotesModal(); });

    /* Per-entry notes for the Activity & Follow-Up Log — always bullet points,
       never paragraphs. Opened via the row's Notes button (never edited inline
       in the table, so there's room to actually read/write multiple lines).
       Shared with the Meeting Log (source: "meeting") — same modal, same
       bullet behavior, just pointed at a different array on the company. */
    let activityNotesEditingId = null;
    let activityNotesSource = "followup";
    let activityNotesSaveDebounce;
    const activityNotesOverlay = document.getElementById("activity-notes-overlay");
    const activityNotesTextarea = document.getElementById("activity-notes-textarea");
    function activityNotesLog() {
      if (!currentProspect) return null;
      return activityNotesSource === "meeting" ? currentProspect.meetingLog : currentProspect.followUpLog;
    }
    function openActivityNotesModal(id, source) {
      if (!currentProspect) return;
      activityNotesSource = source || "followup";
      const entry = activityNotesLog().find(x => x.id === id);
      if (!entry) return;
      activityNotesEditingId = id;
      const val = entry.notes && entry.notes.trim() ? normalizeBulletText(entry.notes) : "• ";
      activityNotesTextarea.value = val;
      const contextLabel = activityNotesSource === "meeting" ? "Meeting" : activityTypeOption(entry.type).label;
      document.getElementById("activity-notes-context").textContent = `${contextLabel} · ${formatDateLong(new Date(entry.date + "T00:00:00"))}`;
      activityNotesOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
      setTimeout(() => {
        activityNotesTextarea.focus();
        activityNotesTextarea.setSelectionRange(activityNotesTextarea.value.length, activityNotesTextarea.value.length);
      }, 60);
    }
    function saveActivityNotes() {
      if (!currentProspect || !activityNotesEditingId) return;
      const entry = activityNotesLog().find(x => x.id === activityNotesEditingId);
      if (entry) { entry.notes = activityNotesTextarea.value; saveCompanies(); }
    }
    function closeActivityNotesModal() {
      clearTimeout(activityNotesSaveDebounce);
      saveActivityNotes();
      activityNotesOverlay.classList.remove("open");
      const source = activityNotesSource;
      activityNotesEditingId = null;
      if (currentProspect) {
        if (source === "meeting") renderMeetingCard(currentProspect);
        else renderFollowUpLog(currentProspect);
      }
    }
    /* Enter always starts a new bullet — never a plain paragraph line break. */
    activityNotesTextarea.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        const ta = e.target;
        const start = ta.selectionStart, end = ta.selectionEnd;
        const insert = "\n• ";
        ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
        const newPos = start + insert.length;
        ta.setSelectionRange(newPos, newPos);
        clearTimeout(activityNotesSaveDebounce);
        activityNotesSaveDebounce = setTimeout(saveActivityNotes, 300);
      }
    });
    activityNotesTextarea.addEventListener("input", () => {
      clearTimeout(activityNotesSaveDebounce);
      activityNotesSaveDebounce = setTimeout(saveActivityNotes, 300);
    });
    activityNotesTextarea.addEventListener("blur", e => {
      const normalized = normalizeBulletText(e.target.value);
      if (normalized !== e.target.value) e.target.value = normalized;
      clearTimeout(activityNotesSaveDebounce);
      saveActivityNotes();
    });
    document.getElementById("activity-notes-close").addEventListener("click", closeActivityNotesModal);
    activityNotesOverlay.addEventListener("click", e => { if (e.target === activityNotesOverlay) closeActivityNotesModal(); });

    /* ---- Call Prep modal: Calendly embed + pre-call checklist ----
       Which call is "next" is derived from meetingLog.length (calls already
       held) — Call #1 happens outside the CRM, so 0 held meetings means
       we're booking Call #2, 1 held means Call #3, and so on. The first three
       follow-ups each get their own Calendly link; every call after that
       reuses the same "rolling" link. */
    const CALENDLY_FOLLOWUP_URLS = [
      "https://calendly.com/d/d2h5-tyt-43p/whale-clients-guaranteed-workshop-follow-up-1",
      "https://calendly.com/d/dvsq-5mk-687/whale-clients-guaranteed-workshop-follow-up-2",
      "https://calendly.com/d/d2dv-nqt-prh/whale-clients-guaranteed-workshop-follow-up-3",
      "https://calendly.com/d/d3mm-zb2-m6p/whale-clients-guaranteed-workshop-follow-up-rolling"
    ];
    function callPrepConfig(company) {
      const held = (company.meetingLog || []).length;
      const callNumber = held + 2;
      const url = CALENDLY_FOLLOWUP_URLS[Math.min(held, CALENDLY_FOLLOWUP_URLS.length - 1)];
      return { callNumber, url };
    }
    function callPrepData(company, callNumber) {
      const key = String(callNumber);
      if (!company.callPrep[key]) company.callPrep[key] = { docsNotes: "", stakeholders: false, docsListed: false };
      return company.callPrep[key];
    }

    let calendlyScriptPromise = null;
    function loadCalendlyScript() {
      if (window.Calendly) return Promise.resolve();
      if (!calendlyScriptPromise) {
        calendlyScriptPromise = new Promise(resolve => {
          const script = document.createElement("script");
          script.src = "https://assets.calendly.com/assets/external/widget.js";
          script.async = true;
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }
      return calendlyScriptPromise;
    }

    const callPrepOverlay = document.getElementById("callprep-overlay");
    const callPrepEmbed = document.getElementById("callprep-embed");
    const callPrepDocsTextarea = document.getElementById("callprep-docs-textarea");
    let callPrepSaveDebounce;
    let callPrepActiveNumber = null;

    function openCallPrepModal(company) {
      const { callNumber, url } = callPrepConfig(company);
      callPrepActiveNumber = callNumber;
      const data = callPrepData(company, callNumber);
      document.getElementById("callprep-context").textContent = company.name;
      document.getElementById("callprep-title").textContent = `Call #${callNumber}`;

      callPrepDocsTextarea.value = data.docsNotes.trim() ? normalizeBulletText(data.docsNotes) : "• ";
      callPrepOverlay.querySelectorAll(".callprep-check-row").forEach(row => {
        row.querySelector(".callprep-checkbox").checked = !!data[row.dataset.key];
      });

      callPrepEmbed.innerHTML = `<div class="callprep-embed-loading">Loading Calendly…</div>`;
      loadCalendlyScript().then(() => {
        if (!callPrepOverlay.classList.contains("open") || callPrepActiveNumber !== callNumber) return;
        callPrepEmbed.innerHTML = "";
        Calendly.initInlineWidget({ url, parentElement: callPrepEmbed });
      });

      callPrepOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
    }

    function saveCallPrep() {
      if (!currentProspect || callPrepActiveNumber === null) return;
      callPrepData(currentProspect, callPrepActiveNumber).docsNotes = callPrepDocsTextarea.value;
      saveCompanies();
    }

    function closeCallPrepModal() {
      clearTimeout(callPrepSaveDebounce);
      saveCallPrep();
      callPrepOverlay.classList.remove("open");
      callPrepEmbed.innerHTML = "";
      callPrepActiveNumber = null;
    }

    /* Enter always starts a new bullet — never a plain paragraph line break. */
    callPrepDocsTextarea.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        const ta = e.target;
        const start = ta.selectionStart, end = ta.selectionEnd;
        const insert = "\n• ";
        ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
        const newPos = start + insert.length;
        ta.setSelectionRange(newPos, newPos);
        clearTimeout(callPrepSaveDebounce);
        callPrepSaveDebounce = setTimeout(saveCallPrep, 300);
      }
    });
    callPrepDocsTextarea.addEventListener("input", () => {
      clearTimeout(callPrepSaveDebounce);
      callPrepSaveDebounce = setTimeout(saveCallPrep, 300);
    });
    callPrepDocsTextarea.addEventListener("blur", e => {
      const normalized = normalizeBulletText(e.target.value);
      if (normalized !== e.target.value) e.target.value = normalized;
      clearTimeout(callPrepSaveDebounce);
      saveCallPrep();
    });

    callPrepOverlay.querySelectorAll(".callprep-check-row").forEach(row => {
      row.querySelector(".callprep-checkbox").addEventListener("change", e => {
        if (!currentProspect || callPrepActiveNumber === null) return;
        callPrepData(currentProspect, callPrepActiveNumber)[row.dataset.key] = e.target.checked;
        saveCompanies();
      });
    });

    document.getElementById("callprep-close").addEventListener("click", closeCallPrepModal);
    callPrepOverlay.addEventListener("click", e => { if (e.target === callPrepOverlay) closeCallPrepModal(); });

    /* Calendly posts "calendly.event_scheduled" to the parent window the
       moment someone actually confirms a time slot inside the embed — the
       only reliable "the meeting got booked" signal available from a
       cross-origin iframe. When it fires, whatever's in the docs textbox
       gets copied into the main Notes field under its own heading, so the
       "what to send after the call" list survives past this one call's slot. */
    function appendDocsToNotes(company, docsNotesRaw) {
      const lines = docsNotesRaw.split("\n").map(l => l.replace(/^\s*•\s*/, "").trim()).filter(Boolean);
      if (!lines.length) return false;
      const block = "Key Documentation Sent:\n" + lines.map(l => "• " + l).join("\n");
      company.notes = company.notes && company.notes.trim() ? company.notes.replace(/\s+$/, "") + "\n\n" + block : block;
      return true;
    }
    window.addEventListener("message", e => {
      if (!e.data || e.data.event !== "calendly.event_scheduled") return;
      if (!callPrepOverlay.classList.contains("open") || !currentProspect || callPrepActiveNumber === null) return;
      if (appendDocsToNotes(currentProspect, callPrepDocsTextarea.value)) {
        saveCompanies();
        renderProspectNotes(currentProspect);
      }
    });

    /* Commits any in-flight (debounced) notes edit immediately and logs the
       activity entry if it changed — shared by closeSequenceModal and by
       openFieldPopover's tier/status refresh, both of which rebuild the notes
       textarea and would otherwise silently drop an unsaved keystroke. */
    function flushPendingNotes() {
      if (!currentProspect) return;
      clearTimeout(notesSaveDebounce);
      const textarea = document.getElementById("prospect-notes-input");
      if (!textarea) return;
      const finalNotes = textarea.value;
      if (finalNotes === currentProspect.notes) return;
      currentProspect.notes = finalNotes;
      if (finalNotes !== notesValueOnOpen) {
        logActivity(currentProspect, "Notes updated");
      }
      /* Self-contained on purpose: some callers (e.g. the tier/status popover)
         already call saveCompanies() for their own change BEFORE calling this,
         which used to mean an in-flight notes edit could get applied to the
         in-memory object but never make it into a server write. Saving here
         too guarantees the note persists no matter what order the caller does
         things in — one extra batch write is cheap; a silently lost note isn't. */
      saveCompanies();
    }

    /* Closing Room: a completely separate, non-tiered follow-up system for
       Pipeline / Meeting Booked / Won / Lost — no sequence, no cadence, just
       "when did we last talk" vs "when are we due to talk again". */
    function computeClosingOverdue(company) {
      /* Follow Up is due once the follow-up date has arrived or passed
         relative to the last time we actually followed up — same day counts
         as due, not "still fine". */
      const lastInteractionDate = localDateStr(company.lastInteraction);
      return lastInteractionDate >= company.followUpDate;
    }

    /* Lightweight month-grid date picker, built from scratch (no library) —
       reuses the app's generic openPopover/closePopover popover mechanism. */
    function buildCalendarPopover(pop, selectedStr, onSelect, onClear) {
      pop.classList.add("cal-popover");
      let viewDate = new Date((selectedStr || localDateStr(Date.now())) + "T00:00:00");
      viewDate.setDate(1);

      const render = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const monthLabel = viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        const startWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = localDateStr(Date.now());

        let cells = "";
        for (let i = 0; i < startWeekday; i++) cells += `<span class="cal-cell cal-empty"></span>`;
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isSelected = dateStr === selectedStr;
          const isToday = dateStr === todayStr;
          cells += `<button type="button" class="cal-cell cal-day${isSelected ? " cal-selected" : ""}${isToday ? " cal-today" : ""}" data-date="${dateStr}">${d}</button>`;
        }

        pop.innerHTML = `
        <div class="cal-header">
          <button type="button" class="cal-nav" data-nav="-1" aria-label="Previous month">‹</button>
          <span class="cal-month-label">${monthLabel}</span>
          <button type="button" class="cal-nav" data-nav="1" aria-label="Next month">›</button>
        </div>
        <div class="cal-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-foot">
          <button type="button" class="cal-today-btn">Today</button>
          ${onClear ? `<button type="button" class="cal-clear-btn">Clear</button>` : ""}
        </div>`;

        pop.querySelectorAll(".cal-nav").forEach(btn => {
          btn.addEventListener("click", e => {
            e.stopPropagation();
            viewDate.setMonth(viewDate.getMonth() + Number(btn.dataset.nav));
            render();
          });
        });
        pop.querySelectorAll(".cal-day").forEach(btn => {
          btn.addEventListener("click", e => {
            e.stopPropagation();
            onSelect(btn.dataset.date);
            closePopover();
          });
        });
        pop.querySelector(".cal-today-btn").addEventListener("click", e => {
          e.stopPropagation();
          onSelect(localDateStr(Date.now()));
          closePopover();
        });
        const clearBtn = pop.querySelector(".cal-clear-btn");
        if (clearBtn) {
          clearBtn.addEventListener("click", e => {
            e.stopPropagation();
            onClear();
            closePopover();
          });
        }
      };
      render();
    }

    function renderClosingRoom(company) {
      const overdue = computeClosingOverdue(company);
      const statusBar = document.getElementById("closing-status-bar");
      const badgeClass = overdue ? "follow-up" : "on-schedule";
      const badgeText = overdue ? "Follow Up" : "On Schedule";
      statusBar.innerHTML = `
      <span class="status-bar-label">Prospect Status</span>
      <span class="closing-status-badge ${badgeClass}">${badgeText}</span>`;

      const table = document.getElementById("closing-table");
      table.innerHTML = `
      <div class="closing-cell"><span class="summary-label">Last Follow-Up Date</span><button type="button" class="closing-date-btn" id="closing-lastfollowup-date-btn">${formatDateShort(company.lastInteraction)}</button></div>
      <div class="closing-cell"><span class="summary-label">Follow Up Date</span><button type="button" class="closing-date-btn" id="closing-followup-date-btn">${cadenceDateLabel(company.followUpDate, 0)}</button></div>`;

      const openDateCalendar = (anchor, currentDateStr, onPick) => {
        const pop = openPopover(anchor, popEl => {
          buildCalendarPopover(popEl, currentDateStr, newDate => {
            onPick(newDate);
            saveCompanies();
            renderClosingRoom(currentProspect);
            renderCurrentView();
          });
        });
        positionPopoverBeside(pop, anchor);
      };

      document.getElementById("closing-followup-date-btn").addEventListener("click", e => {
        e.stopPropagation();
        if (!currentProspect) return;
        openDateCalendar(e.currentTarget, currentProspect.followUpDate, newDate => {
          currentProspect.followUpDate = newDate;
        });
      });

      document.getElementById("closing-lastfollowup-date-btn").addEventListener("click", e => {
        e.stopPropagation();
        if (!currentProspect) return;
        openDateCalendar(e.currentTarget, localDateStr(currentProspect.lastInteraction), newDate => {
          currentProspect.lastInteraction = new Date(newDate + "T12:00:00").getTime();
        });
      });
    }

    /* Activity & Follow-Up Log: a running, natural history of everything that
       happened with a company, at every stage of the funnel — both outbound
       touches WE sent (Method + Date Sent) and inbound Responses FROM the
       prospect (Date Received), each with free-text Notes. Free-standing from
       the Closing Room's Last Follow-Up / Follow Up Date pair (that tracks
       cadence status; this tracks history), so entries are added/edited/
       removed independently and sorted newest-first regardless of type. */
    function renderFollowUpLog(company) {
      const card = document.getElementById("followup-log-card");
      if (!Array.isArray(company.followUpLog)) company.followUpLog = [];
      const rows = [...company.followUpLog].sort((a, b) => b.date.localeCompare(a.date));

      card.innerHTML = `
      <div class="followup-log-header">
        <span class="followup-log-title">Activity &amp; Follow-Up Log</span>
        <button type="button" class="btn btn-secondary followup-log-add-btn" id="followup-log-add-btn">+ Add Entry</button>
      </div>
      <div class="followup-log-table">
        ${rows.length ? `<div class="followup-log-colheads"><span class="followup-log-col-type">Type</span><span class="followup-log-col-detail">Details</span><span class="followup-log-col-notes">Notes</span><span style="width:26px;"></span></div>` : ""}
        ${rows.length ? rows.map(entry => {
        const typeOpt = activityTypeOption(entry.type);
        const isFollowUp = entry.type === "followup";
        const methodOpt = isFollowUp ? followUpMethodOption(entry.method) : responseMethodOption(entry.responseMethod);
        const dateLabel = formatDateLong(new Date(entry.date + "T00:00:00"));
        return `
          <div class="followup-log-row" data-id="${entry.id}">
            <button type="button" class="followup-type-btn" data-id="${entry.id}" style="background:${typeOpt.tint}; color:${typeOpt.textColor};">
              <span class="dot" style="background:${typeOpt.dot};"></span><span>${typeOpt.label}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
            </button>
            <div class="followup-detail-cell">
              <button type="button" class="${isFollowUp ? "followup-method-btn" : "followup-response-method-btn"}" data-id="${entry.id}" style="background:${methodOpt.tint}; color:${methodOpt.textColor};">
                <span class="dot" style="background:${methodOpt.dot};"></span><span>${methodOpt.label}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
              </button>
              <button type="button" class="followup-date-btn" data-id="${entry.id}" title="${isFollowUp ? "Date Sent" : "Date Received"}">${dateLabel}</button>
            </div>
            ${(() => {
            const preview = notesPreview(entry.notes); return `
            <button type="button" class="followup-notes-btn${preview.empty ? " empty" : ""}" data-id="${entry.id}">
              <span class="followup-notes-btn-text">${preview.empty ? "Add notes…" : "• " + escapeHtml(preview.text)}</span>
              ${preview.extra > 0 ? `<span class="followup-notes-more">+${preview.extra}</span>` : ""}
            </button>`;
          })()}
            <button type="button" class="followup-log-remove" data-id="${entry.id}" title="Remove entry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path></svg>
            </button>
          </div>`;
      }).join("") : `<div class="followup-log-empty">No activity logged yet — add a Follow-Up or Response above.</div>`}
      </div>`;

      document.getElementById("followup-log-add-btn").addEventListener("click", e => {
        e.stopPropagation();
        if (!currentProspect) return;
        currentProspect.followUpLog.unshift({
          id: "fu_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          type: "followup",
          method: "Email",
          date: localDateStr(Date.now()),
          notes: ""
        });
        saveCompanies();
        renderFollowUpLog(currentProspect);
      });

      card.querySelectorAll(".followup-type-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          const id = btn.dataset.id;
          const pop = openPopover(btn, pop => {
            pop.classList.add("popover-elevated");
            ACTIVITY_TYPE_OPTIONS.forEach(opt => {
              const entry = currentProspect.followUpLog.find(x => x.id === id);
              const row = document.createElement("div");
              row.className = `popover-option${entry && entry.type === opt.value ? " selected" : ""}`;
              row.innerHTML = `<span class="popover-dot" style="background:${opt.dot};"></span><span>${opt.label}</span>`;
              row.addEventListener("click", () => {
                const target = currentProspect.followUpLog.find(x => x.id === id);
                if (target) {
                  target.type = opt.value;
                  if (opt.value === "followup" && !target.method) target.method = "Email";
                  if (opt.value === "response" && !target.responseMethod) target.responseMethod = "Email";
                }
                saveCompanies();
                closePopover();
                renderFollowUpLog(currentProspect);
              });
              pop.appendChild(row);
            });
          });
          positionPopoverBeside(pop, btn);
        });
      });

      card.querySelectorAll(".followup-method-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          const id = btn.dataset.id;
          const pop = openPopover(btn, pop => {
            pop.classList.add("popover-elevated");
            FOLLOWUP_METHOD_OPTIONS.forEach(opt => {
              const entry = currentProspect.followUpLog.find(x => x.id === id);
              const row = document.createElement("div");
              row.className = `popover-option${entry && entry.method === opt.value ? " selected" : ""}`;
              row.innerHTML = `<span class="popover-dot" style="background:${opt.dot};"></span><span>${opt.label}</span>`;
              row.addEventListener("click", () => {
                const target = currentProspect.followUpLog.find(x => x.id === id);
                if (target) target.method = opt.value;
                saveCompanies();
                closePopover();
                renderFollowUpLog(currentProspect);
              });
              pop.appendChild(row);
            });
          });
          positionPopoverBeside(pop, btn);
        });
      });

      card.querySelectorAll(".followup-response-method-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          const id = btn.dataset.id;
          const pop = openPopover(btn, pop => {
            pop.classList.add("popover-elevated");
            RESPONSE_METHOD_OPTIONS.forEach(opt => {
              const entry = currentProspect.followUpLog.find(x => x.id === id);
              const row = document.createElement("div");
              row.className = `popover-option${entry && entry.responseMethod === opt.value ? " selected" : ""}`;
              row.innerHTML = `<span class="popover-dot" style="background:${opt.dot};"></span><span>${opt.label}</span>`;
              row.addEventListener("click", () => {
                const target = currentProspect.followUpLog.find(x => x.id === id);
                if (target) target.responseMethod = opt.value;
                saveCompanies();
                closePopover();
                renderFollowUpLog(currentProspect);
              });
              pop.appendChild(row);
            });
          });
          positionPopoverBeside(pop, btn);
        });
      });

      card.querySelectorAll(".followup-date-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          const id = btn.dataset.id;
          const entry = currentProspect.followUpLog.find(x => x.id === id);
          if (!entry) return;
          const pop = openPopover(e.currentTarget, popEl => {
            buildCalendarPopover(popEl, entry.date, newDate => {
              entry.date = newDate;
              saveCompanies();
              renderFollowUpLog(currentProspect);
            });
          });
          positionPopoverBeside(pop, e.currentTarget);
        });
      });

      card.querySelectorAll(".followup-notes-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          openActivityNotesModal(btn.dataset.id);
        });
      });

      card.querySelectorAll(".followup-log-remove").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          currentProspect.followUpLog = currentProspect.followUpLog.filter(x => x.id !== btn.dataset.id);
          saveCompanies();
          renderFollowUpLog(currentProspect);
        });
      });
    }

    /* How far the next booked meeting is from today, for the countdown chip
       next to its date — same "upcoming/soon/overdue" 3-way split a rep
       scans for at a glance. */
    function meetingCountdown(dateStr) {
      const days = daysBetweenDateStrs(localDateStr(Date.now()), dateStr);
      if (days <= 0) return { label: "Today", cls: "soon" };
      if (days === 1) return { label: "Tomorrow", cls: "soon" };
      return { label: `In ${days} days`, cls: "upcoming" };
    }

    /* Meeting Log: Closing Room only (Pipeline/Meeting Booked/
       Won/Churned/Lost — see CLOSING_ROOM_STATUSES). A
       dedicated "what's the next call, and how did the last ones go" widget,
       kept separate from the generic Activity & Follow-Up Log so a booked
       meeting never gets lost among day-to-day touches. Marking a meeting
       Held moves it straight into the history log (using the date it was
       booked for) and immediately opens its notes so the outcome gets
       captured while it's fresh, then clears the slot so booking the next
       one is the obvious next action. */
    function renderMeetingCard(company) {
      const card = document.getElementById("meeting-card");
      if (!Array.isArray(company.meetingLog)) company.meetingLog = [];
      if (autoLogPastMeeting(company)) {
        saveCompanies();
        renderCurrentView();
      }
      const hasNext = !!company.nextMeetingDate;
      const countdown = hasNext ? meetingCountdown(company.nextMeetingDate) : null;
      const rows = [...company.meetingLog].sort((a, b) => b.date.localeCompare(a.date));

      card.innerHTML = `
      <div class="followup-log-header">
        <span class="followup-log-title">Meetings</span>
      </div>
      <div class="meeting-next-row${hasNext ? "" : " empty"}">
        <span class="summary-label">Next Meeting</span>
        <div class="meeting-next-line">
          <div class="meeting-next-date-group">
            ${hasNext ? `<span class="meeting-countdown ${countdown.cls}">${countdown.label}</span>` : ""}
            <button type="button" class="meeting-next-btn${hasNext ? "" : " empty"}" id="meeting-next-date-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path></svg>
              <span>${hasNext ? formatDateLong(new Date(company.nextMeetingDate + "T00:00:00")) : "No meeting booked"}</span>
            </button>
          </div>
          <button type="button" class="btn btn-calendly meeting-calendly-btn" id="meeting-calendly-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="M9 16l2 2 4-4"></path></svg>
            Book Calendly
          </button>
          <div class="meeting-next-actions">
            ${hasNext ? `
            <button type="button" class="btn btn-primary meeting-hold-btn" id="meeting-hold-btn" title="Mark as held — logs it below and clears the slot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
              Mark as Held
            </button>
            <button type="button" class="followup-log-remove" id="meeting-clear-btn" title="Clear booked meeting">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
            </button>` : `
            <button type="button" class="btn btn-primary" id="meeting-book-btn">+ Book a Meeting</button>`}
          </div>
        </div>
      </div>
      <div class="meeting-history">
        <div class="followup-log-header">
          <span class="followup-log-title">Past Meetings${rows.length ? ` <span class="followup-notes-more">${rows.length}</span>` : ""}</span>
          <button type="button" class="btn btn-secondary followup-log-add-btn" id="meeting-add-btn">+ Log a Past Meeting</button>
        </div>
        <div class="followup-log-table">
          ${rows.length ? rows.map(entry => {
        const preview = notesPreview(entry.notes);
        return `
          <div class="followup-log-row meeting-history-row" data-id="${entry.id}">
            <span class="meeting-history-dot"></span>
            <button type="button" class="meeting-history-date-btn" data-id="${entry.id}">${formatDateLong(new Date(entry.date + "T00:00:00"))}</button>
            <button type="button" class="followup-notes-btn${preview.empty ? " empty" : ""}" data-id="${entry.id}">
              <span class="followup-notes-btn-text">${preview.empty ? "Add notes…" : "• " + escapeHtml(preview.text)}</span>
              ${preview.extra > 0 ? `<span class="followup-notes-more">+${preview.extra}</span>` : ""}
            </button>
            <button type="button" class="followup-log-remove" data-id="${entry.id}" title="Remove entry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path></svg>
            </button>
          </div>`;
      }).join("") : `<div class="followup-log-empty">No meetings logged yet.</div>`}
        </div>
      </div>`;

      const openNextMeetingPicker = anchor => {
        const pop = openPopover(anchor, popEl => {
          buildCalendarPopover(popEl, company.nextMeetingDate || localDateStr(Date.now()), newDate => {
            currentProspect.nextMeetingDate = newDate;
            saveCompanies();
            renderMeetingCard(currentProspect);
          });
        });
        positionPopoverBeside(pop, anchor);
      };

      const nextDateBtn = document.getElementById("meeting-next-date-btn");
      if (nextDateBtn) nextDateBtn.addEventListener("click", e => { e.stopPropagation(); if (currentProspect) openNextMeetingPicker(nextDateBtn); });

      const bookBtn = document.getElementById("meeting-book-btn");
      if (bookBtn) bookBtn.addEventListener("click", e => { e.stopPropagation(); if (currentProspect) openNextMeetingPicker(bookBtn); });

      const calendlyBtn = document.getElementById("meeting-calendly-btn");
      if (calendlyBtn) calendlyBtn.addEventListener("click", e => { e.stopPropagation(); if (currentProspect) openCallPrepModal(currentProspect); });

      const holdBtn = document.getElementById("meeting-hold-btn");
      if (holdBtn) {
        holdBtn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          const id = "mtg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
          currentProspect.meetingLog.unshift({ id, date: currentProspect.nextMeetingDate, notes: "" });
          currentProspect.nextMeetingDate = "";
          currentProspect.lastInteraction = Date.now();
          saveCompanies();
          renderMeetingCard(currentProspect);
          renderCurrentView();
          openActivityNotesModal(id, "meeting");
        });
      }

      const clearBtn = document.getElementById("meeting-clear-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          currentProspect.nextMeetingDate = "";
          saveCompanies();
          renderMeetingCard(currentProspect);
        });
      }

      document.getElementById("meeting-add-btn").addEventListener("click", e => {
        e.stopPropagation();
        if (!currentProspect) return;
        const id = "mtg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        currentProspect.meetingLog.unshift({ id, date: localDateStr(Date.now()), notes: "" });
        saveCompanies();
        renderMeetingCard(currentProspect);
        openActivityNotesModal(id, "meeting");
      });

      card.querySelectorAll(".meeting-history-date-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          if (!currentProspect) return;
          const id = btn.dataset.id;
          const entry = currentProspect.meetingLog.find(x => x.id === id);
          if (!entry) return;
          const pop = openPopover(e.currentTarget, popEl => {
            buildCalendarPopover(popEl, entry.date, newDate => {
              entry.date = newDate;
              saveCompanies();
              renderMeetingCard(currentProspect);
            });
          });
          positionPopoverBeside(pop, e.currentTarget);
        });
      });

      card.querySelectorAll(".meeting-history-row .followup-notes-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          openActivityNotesModal(btn.dataset.id, "meeting");
        });
      });

      card.querySelectorAll(".meeting-history-row .followup-log-remove").forEach(btn => {
        btn.addEventListener("click", async e => {
          e.stopPropagation();
          if (!currentProspect) return;
          const ok = await showConfirm({ title: "Delete this meeting?", confirmLabel: "Delete Meeting" });
          if (!ok) return;
          currentProspect.meetingLog = currentProspect.meetingLog.filter(x => x.id !== btn.dataset.id);
          saveCompanies();
          renderMeetingCard(currentProspect);
        });
      });
    }

    document.getElementById("closing-reset-btn").addEventListener("click", () => {
      if (!currentProspect) return;
      currentProspect.lastInteraction = Date.now();
      saveCompanies();
      renderClosingRoom(currentProspect);
      renderCurrentView();
    });

    function openSequenceModal(company) {
      currentProspect = company;
      if (autoAdvanceCadence(company)) {
        saveCompanies();
      }
      const tier = OUTBOUND_SYSTEM[company.tier];
      document.getElementById("sequence-modal-title").textContent = company.name;
      document.getElementById("sequence-modal-eyebrow").textContent = `${tier.label} · ${tier.eyebrow}`;
      renderCompanyContacts(company);
      renderCreativeOutreach(company);
      renderProspectNotes(company);
      renderCompanySummary(company);
      renderQuickAccessGrid(company);
      /* Activity & Follow-Up Log is shared across every status now — always
         sits above the Prospect Status bar, whichever version of it is
         currently showing (tiered sequence or Closing Room). */
      renderFollowUpLog(company);

      const isClosingRoom = CLOSING_ROOM_STATUSES.includes(company.status);
      document.getElementById("tiered-status-bar-wrap").style.display = isClosingRoom ? "none" : "";
      document.getElementById("diagram-root").style.display = isClosingRoom ? "none" : "";
      document.getElementById("closing-room-wrap").style.display = isClosingRoom ? "" : "none";
      document.getElementById("meeting-card-wrap").style.display = isClosingRoom ? "" : "none";
      if (isClosingRoom) {
        renderClosingRoom(company);
        renderMeetingCard(company);
      } else {
        renderStatusBar(tier);
        buildSequence(tier);
      }

      sequenceOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
    }

    function closeSequenceModal() {
      if (currentProspect) {
        flushPendingNotes();
      }
      sequenceOverlay.classList.remove("open");
      if (!nodeOverlay.classList.contains("open")) {
        document.body.classList.remove("modal-lock");
      }
      currentProspect = null;
      renderCurrentView();
    }

    document.getElementById("sequence-modal-close").addEventListener("click", closeSequenceModal);
    document.getElementById("sequence-delete-company-btn").addEventListener("click", () => {
      if (currentProspect) deleteCompany(currentProspect.id);
    });
