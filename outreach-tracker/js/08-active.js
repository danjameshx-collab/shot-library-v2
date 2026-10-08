    /* ============================================================
       PART I — Active work surface (Active tab; Inbox and Board land here)
       ============================================================ */
    /* A company is "active outbound" once its sequence has a start day and it
       hasn't left the tiered sequence for the Closing Room yet. This is the
       row set every working surface in this file operates on. */
    const ACTIVE_STATUSES = ["in_sequence", "opened", "replied"];
    function isActiveOutbound(c) {
      return !!c.startDay && ACTIVE_STATUSES.includes(c.status);
    }

    /* Social touches live outside NODE_INDEX (they're generated per company
       from socialChipId), so their label is derived from the id. */
    function touchLabel(id) {
      const node = NODE_INDEX[id];
      if (node && node.label) return node.label;
      const social = /-social-(\d+)$/.exec(id);
      if (social) return `Social Media Follow-Up ${social[1]}`;
      return "Send";
    }

    /* What the sequence is doing (or waiting on) next for a company, with the
       delay-adjusted due date from computeCadenceSchedule.
       - If the schedule is frozen on an overdue manual touch (Instant Reply,
         Cold Call attempt, social follow-up), THAT touch is the current step:
         autoAdvanceCadence still ticks its cadence checkbox when the date
         arrives, so "earliest unchecked entry" would otherwise point at the
         frozen touch after it while the real blocker sits unhandled. Same
         once its send has gone out and every touch left is paused behind it
         (pausedStepId).
       - Otherwise it's the earliest cadence touch not yet ticked.
       Memoised per render pass — the sort comparator and two cell builders
       would each recompute the schedule for every row otherwise. */
    let activeStepCache = new Map();
    function resetActiveStepCache() { activeStepCache = new Map(); }
    function activeStepInfo(c) {
      let info = activeStepCache.get(c.id);
      if (info) return info;
      const superLoomPosted = c.tier === "tier1" && !!c.superLoomPosted;
      const entries = buildCadenceScheduleEntries(c.tier, superLoomPosted);
      const sched = computeCadenceSchedule(c);
      const todayStr = localDateStr(Date.now());
      let label = "", mechanism = "", due = "";
      const stuckId = pausedStepId(c, sched);
      if (stuckId) {
        const at = (sched.frozenId ? sched.frozenFromIndex : sched.pausedFromIndex) - 1;
        const e = entries[at];
        mechanism = e.mechanism;
        label = touchLabel(stuckId);
        // Instant Reply's id isn't a cadence entry — it's due the day the mechanism was seen.
        due = stuckId === e.id ? sched.dates[at] : localDateStr(c.seenState[e.sendNodeId].ts);
      } else {
        const checks = c.cadenceChecks || [];
        const i = entries.findIndex((_, idx) => !checks[idx]);
        if (i !== -1) {
          mechanism = entries[i].mechanism;
          label = touchLabel(entries[i].id);
          due = sched.dates[i];
        }
      }
      info = { label, mechanism, due, overdue: !!due && due < todayStr, today: due === todayStr, complete: !label };
      activeStepCache.set(c.id, info);
      return info;
    }

    function activeStepCellHtml(c) {
      const info = activeStepInfo(c);
      if (info.complete) return `<td class="muted-cell step-cell" data-col="currentStep">Sequence complete</td>`;
      return `<td class="step-cell" data-col="currentStep"><span class="step-mech">${info.mechanism}</span> · ${info.label}</td>`;
    }
    function nextDueCellHtml(c) {
      const info = activeStepInfo(c);
      if (!info.due) return `<td class="muted-cell due-cell" data-col="nextDue">—</td>`;
      const cls = info.overdue ? " overdue" : info.today ? " today" : "";
      const text = info.today ? "Today" : formatDateLong(new Date(info.due + "T00:00:00"));
      return `<td class="due-cell${cls}" data-col="nextDue" title="${info.due}">${text}</td>`;
    }

    /* ---------------- Inbox: every manual touch that needs a human ----------------
       Derived fresh from the sequence engine each render, never stored. A task
       is one of:
       - a cadence-dated manual touch (Cold Call attempts, social follow-ups,
         a manual opener) that isn't ticked in manualStepsDone. Due-now items
         come from pendingManualTouches (which also knows a Cold Call comes
         due on sequence progress, not the calendar); not-yet-due ones show
         under Upcoming when their date is within the horizon.
       - the current mechanism's Instant Reply/Call once that mechanism has
         been seen and manualStepHandledFor doesn't cover it yet.
       - a booked meeting (any company, not just active — a meeting today is
         a task today). Read-only: it logs itself once the date passes. */
    const INBOX_HORIZON_DAYS = 7;
    function buildInboxTasks() {
      const todayStr = localDateStr(Date.now());
      const horizon = addDaysToDateStr(todayStr, INBOX_HORIZON_DAYS);
      const tasks = [];
      const push = (c, t) => tasks.push({ companyId: c.id, company: c, ...t, bucket: t.due < todayStr ? "overdue" : t.due === todayStr ? "today" : "upcoming" });
      companies.forEach(c => {
        if (c.nextMeetingDate && c.nextMeetingDate <= horizon) {
          push(c, { kind: "meeting", touchId: null, label: "Meeting", mechanism: "", due: c.nextMeetingDate });
        }
        if (!isActiveOutbound(c)) return;
        const superLoomPosted = c.tier === "tier1" && !!c.superLoomPosted;
        const entries = buildCadenceScheduleEntries(c.tier, superLoomPosted);
        const sched = computeCadenceSchedule(c);
        const pending = new Set(pendingManualTouches(c));
        entries.forEach((e, i) => {
          if (!e.manual || c.manualStepsDone[e.id]) return;
          const date = sched.dates[i];
          if (pending.has(e.id)) {
            // Progress-gated touches can be due before their calendar date — that's a task for today.
            push(c, { kind: "touch", touchId: e.id, label: touchLabel(e.id), mechanism: e.mechanism, due: date > todayStr ? todayStr : date });
          } else if (date && date > todayStr && date <= horizon) {
            push(c, { kind: "touch", touchId: e.id, label: touchLabel(e.id), mechanism: e.mechanism, due: date });
          }
        });
        const mechanism = currentMechanismRaw(c);
        if (isCurrentMechanismSeen(c) && c.manualStepHandledFor !== mechanism) {
          const sendNode = OUTBOUND_SYSTEM[c.tier].sequence.find(n => n.type === "send" && n.mechanism === mechanism);
          const instantId = `${sendNode.id}-branch-op-1`;
          push(c, { kind: "instant", touchId: instantId, label: touchLabel(instantId), mechanism, due: localDateStr(c.seenState[sendNode.id].ts) });
        }
      });
      tasks.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.company.name.localeCompare(b.company.name)));
      return tasks;
    }

    /* Sidebar badge = Overdue + Today. Called from renderCurrentView so any
       change that re-renders the app (a tick in the modal, a status change,
       a save) keeps it current. */
    function updateInboxBadge() {
      const el = document.getElementById("nav-inbox-badge");
      if (!el) return;
      const due = buildInboxTasks().filter(t => t.bucket !== "upcoming");
      const n = due.length;
      el.textContent = n ? String(n) : "";
      el.style.display = n ? "" : "none";
      /* The Operating System's home page shows the same count on the
         Creative Outreach card. */
      if (inOperatingSystem) {
        const overdue = due.filter(t => t.bucket === "overdue").length;
        window.parent.postMessage({ type: "lincko:inbox-count", overdue, today: n - overdue }, "*");
        postInboxTasksToOS();
      }
    }

    /* The OS keeps one Power List task per Inbox follow-up that's due today
       or overdue ("Do follow-up for X!", due the day it's due): it adds the
       ones it doesn't have and drops the ones no longer listed (done here,
       or no longer due). Upcoming ones aren't sent; each turns up on its
       day. Only sent once the server load is in: a stale cache could list a
       touch that's already done, or miss one. Meetings aren't sent — they
       log themselves. */
    let inboxServerLoaded = false;
    function postInboxTasksToOS() {
      if (!inOperatingSystem || !inboxServerLoaded) return;
      const tasks = buildInboxTasks().filter(t => t.kind !== "meeting" && t.bucket !== "upcoming").map(t => ({
        key: `${t.companyId}|${t.touchId}`, kind: t.kind, company: t.company.name, due: t.due
      }));
      window.parent.postMessage({ type: "lincko:inbox-tasks", tasks }, "*");
    }

    function inboxDueLabel(t) {
      const todayStr = localDateStr(Date.now());
      const days = daysBetweenDateStrs(todayStr, t.due);
      if (days === 0) return "Today";
      if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
      if (days === 1) return "Tomorrow";
      return `In ${days} days`;
    }

    const INBOX_BUCKETS = [
      { key: "overdue", title: "Overdue" },
      { key: "today", title: "Today" },
      { key: "upcoming", title: `Next ${INBOX_HORIZON_DAYS} days` }
    ];
    function renderInbox() {
      const wrap = document.getElementById("inbox-wrap");
      if (!wrap) return;
      const tasks = buildInboxTasks();
      const due = tasks.filter(t => t.bucket !== "upcoming").length;
      document.getElementById("prospect-count-label").textContent = due
        ? `${due} task${due === 1 ? "" : "s"} due · ${tasks.length - due} upcoming`
        : `Nothing due · ${tasks.length} upcoming`;
      if (!tasks.length) {
        wrap.innerHTML = `<div class="inbox-empty">Nothing needs a human right now.</div>`;
        return;
      }
      wrap.innerHTML = INBOX_BUCKETS.map(b => {
        const rows = tasks.filter(t => t.bucket === b.key);
        if (!rows.length) return "";
        return `<section class="inbox-section inbox-${b.key}">
          <h2 class="inbox-section-title">${b.title} <span class="inbox-section-count">${rows.length}</span></h2>
          ${rows.map(inboxRowHtml).join("")}
        </section>`;
      }).join("");
    }
    function inboxRowHtml(t) {
      const c = t.company;
      const tierOpt = optionByValue(TIER_OPTIONS, c.tier);
      const doneBtn = t.kind === "meeting" ? "" : `<button type="button" class="btn btn-primary inbox-done" data-company-id="${c.id}" data-touch-id="${t.touchId}" data-kind="${t.kind}">Done</button>`;
      return `<div class="inbox-row inbox-${t.bucket}">
        <div class="inbox-row-main">
          <button type="button" class="inbox-company" data-company-id="${c.id}">${c.name}</button>
          <span class="crm-pill" style="background:${tierOpt.tint};color:${tierOpt.textColor};border-color:${tierOpt.tint}">${tierOpt.label}</span>
          <span class="inbox-touch">${t.mechanism ? `<span class="inbox-mech">${t.mechanism}</span> · ` : ""}${t.label}</span>
        </div>
        <span class="inbox-due" title="${t.due}">${inboxDueLabel(t)}</span>
        <div class="inbox-actions">
          ${doneBtn}
          <button type="button" class="btn btn-secondary inbox-open" data-company-id="${c.id}">Open</button>
        </div>
      </div>`;
    }

    /* Done = the same write the modal's checkbox makes for that touch (see
       setManualTouchDone), plus the cadence catch-up and an activity entry
       saying where it came from (the Inbox, or the OS Power List). */
    function completeInboxTask(companyId, touchId, kind, source = "Inbox") {
      const c = companyById(companyId);
      if (!c) return;
      const task = buildInboxTasks().find(t => t.companyId === companyId && t.touchId === touchId);
      setManualTouchDone(c, touchId, true, kind === "instant");
      c.lastInteraction = Date.now();
      logActivity(c, `${task ? `${task.mechanism} · ${task.label}` : touchLabel(touchId)} marked done from ${source}`);
      autoAdvanceCadence(c);
      saveCompanies();
      if (source === "Inbox") { renderInbox(); updateInboxBadge(); }
      else renderCurrentView(); // also redraws the Inbox and posts the new task list
    }
    document.getElementById("inbox-wrap").addEventListener("click", e => {
      const done = e.target.closest(".inbox-done");
      if (done) { completeInboxTask(done.dataset.companyId, done.dataset.touchId, done.dataset.kind); return; }
      const open = e.target.closest(".inbox-open, .inbox-company");
      if (open) { const c = companyById(open.dataset.companyId); if (c) openSequenceModal(c); }
    });

    /* ---------------- Board: one column per status, drag to change ----------------
       Columns are the outbound statuses after New; cards are companies with
       a started sequence in one of them. Pipeline is the last column so a
       card dropped there is still visible instead of vanishing off Active.
       A drop calls setCompanyStatus (02-data.js) — the same write the status
       pill makes — so it logs once and dirty-syncs once. The card's status
       pill stays click-editable for keyboard use. */
    const BOARD_STATUSES = ["in_sequence", "opened", "replied", "pipeline"];
    function renderBoard() {
      const board = document.getElementById("board-columns");
      if (!board) return;
      resetActiveStepCache();
      const visible = companies.filter(c => !!c.startDay && BOARD_STATUSES.includes(c.status) && matchesCompanyFilters(c));
      document.getElementById("prospect-count-label").textContent = `${visible.length} compan${visible.length === 1 ? "y" : "ies"} on the board`;
      board.innerHTML = BOARD_STATUSES.map(status => {
        const opt = optionByValue(STATUS_OPTIONS, status);
        const cards = visible.filter(c => c.status === status).sort((a, b) => {
          const ad = activeStepInfo(a).due || "9999", bd = activeStepInfo(b).due || "9999";
          return ad < bd ? -1 : ad > bd ? 1 : a.name.localeCompare(b.name);
        });
        return `<div class="board-column" data-stage="${status}">
          <div class="board-column-head">
            <span class="board-column-title" style="color:${opt.textColor}">${opt.label}</span>
            <span class="board-count">${cards.length}</span>
          </div>
          <div class="board-cards">${cards.length ? cards.map(boardCardHtml).join("") : `<div class="board-empty-col">No companies</div>`}</div>
        </div>`;
      }).join("");
    }
    function boardCardHtml(c) {
      const tierOpt = optionByValue(TIER_OPTIONS, c.tier);
      const statusOpt = optionByValue(STATUS_OPTIONS, c.status);
      const contact = primaryContactFor(c.id);
      const info = activeStepInfo(c);
      const dueCls = info.overdue ? " overdue" : info.today ? " today" : "";
      const dueText = !info.due ? "" : info.today ? "Today" : formatDateLong(new Date(info.due + "T00:00:00"));
      return `<div class="board-card${companyNeedsAttention(c) ? " row-alert" : ""}" draggable="true" data-company-id="${c.id}">
        <span class="board-card-name">${c.name}</span>
        <span class="board-card-contact">${contact ? `${contact.name}${contact.jobTitle ? " · " + contact.jobTitle : ""}` : "No contact yet"}</span>
        <span class="board-card-step">${info.complete ? "Sequence complete" : `<span class="step-mech">${info.mechanism}</span> · ${info.label}`}</span>
        ${dueText ? `<span class="board-card-due${dueCls}" title="${info.due}">${info.overdue ? "Overdue · " : "Due · "}${dueText}</span>` : ""}
        <div class="board-card-meta">
          <span class="crm-pill" style="background:${tierOpt.tint};color:${tierOpt.textColor};cursor:default">${tierOpt.label}</span>
          <button type="button" class="crm-pill editable-pill" data-field="status" style="background:${statusOpt.tint};color:${statusOpt.textColor}"><span class="dot" style="background:${statusOpt.pillDot || statusOpt.dot}"></span>${statusOpt.label}</button>
        </div>
      </div>`;
    }
    (function wireBoard() {
      const board = document.getElementById("board-columns");
      if (!board) return;
      let draggedId = null;
      board.addEventListener("dragstart", e => {
        const card = e.target.closest(".board-card");
        if (!card) return;
        draggedId = card.dataset.companyId;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedId);
      });
      board.addEventListener("dragend", () => {
        draggedId = null;
        board.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
        board.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
      });
      board.addEventListener("dragover", e => {
        const col = e.target.closest(".board-column");
        if (!col || !draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!col.classList.contains("drag-over")) {
          board.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
          col.classList.add("drag-over");
        }
      });
      board.addEventListener("dragleave", e => {
        const col = e.target.closest(".board-column");
        if (col && !col.contains(e.relatedTarget)) col.classList.remove("drag-over");
      });
      board.addEventListener("drop", e => {
        const col = e.target.closest(".board-column");
        if (!col) return;
        e.preventDefault();
        const c = companyById(draggedId || e.dataTransfer.getData("text/plain"));
        draggedId = null;
        if (!c) return;
        if (setCompanyStatus(c, col.dataset.stage, "board")) saveCompanies();
        renderBoard();
      });
      board.addEventListener("click", e => {
        const card = e.target.closest(".board-card");
        if (!card) return;
        const c = companyById(card.dataset.companyId);
        if (!c) return;
        const pill = e.target.closest(".editable-pill");
        if (pill) { e.stopPropagation(); openFieldPopover(pill, c, "status"); return; }
        openSequenceModal(c);
      });
    })();
