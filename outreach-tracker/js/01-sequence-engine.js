    /* ============================================================
       PART A — Ported sequence engine (from index.html, verbatim)
       ============================================================ */
    const ICONS = {
      loom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="4"></rect><path d="M10 9.3v5.4l5-2.7-5-2.7z" fill="currentColor" stroke="none"></path></svg>`,
      doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"></path><path d="M14 3.5v4h4"></path><path d="M9 13h6M9 16.5h6"></path></svg>`,
      gift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="11" rx="1.5"></rect><path d="M3.5 9h17v3.5h-17z"></path><path d="M12 9v11"></path><path d="M12 9c-1.8 0-3.6-1-3.6-3S9.5 3.5 12 6c2.5-2.5 3.6-1 3.6 0S13.8 9 12 9z"></path></svg>`,
      send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 3 10.5l7.2 2.3L13.5 21 21 3z"></path><path d="M10.2 12.8 21 3"></path></svg>`,
      clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path></svg>`,
      eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
      check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.3"></circle><path d="M8 12.3l2.6 2.6L16.2 9"></path></svg>`,
      bolt: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12.5 2.5 4 14h6l-1 7.5L20 10h-6.5z"></path></svg>`,
      phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.4 3.5h3.2l1.7 4.2-2.1 1.6a12.8 12.8 0 0 0 5.5 5.5l1.6-2.1 4.2 1.7v3.2a1.9 1.9 0 0 1-2.1 1.9A16.8 16.8 0 0 1 3.5 5.6a1.9 1.9 0 0 1 1.9-2.1z"></path></svg>`,
      mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.2"></rect><path d="M3.5 6.5 12 13l8.5-6.5"></path></svg>`
    };

    /* Decorative "medium" badges — a small 3D orbit-ring visual that sits in
       place of the plain medium pill, to make the sending channel instantly
       readable at a glance. Keyed by mechanism name; only mechanisms present
       here get the visual treatment, everything else keeps the plain pill.
       layout "centered" -> buildMediumHeroCard (title, orbit, controls all
       stacked/centered). layout "columns" -> buildMediumColumnsCard (title +
       orbit up top, then an Admin column and a Medium column side by side). */
    const MEDIUM_ORBIT_BADGES = {
      "Cold Email": { icon: "mail", label: "Email", layout: "columns" },
      "Cold Call": { icon: "phone", label: "Phone", layout: "columns" },
      "Physical Good": { icon: "gift", label: "Direct Mail", layout: "columns" },
      /* Strategy Doc and Super Loom can go out over several different
         mediums (Super Loom is even a live channel choice), so there's no
         single channel word to badge — the orbit caption just repeats the
         mechanism name instead. */
      "Strategy Doc": { icon: "doc", label: "Strategy Doc", layout: "columns" },
      "Super Loom": { icon: "loom", label: "Super Loom", layout: "columns" },
      "VSL Loom": { icon: "loom", label: "VSL Loom", layout: "columns" }
    };
    function iconSvg(key) { return ICONS[key] || ICONS.doc; }

    function buildFollowUpChips(prefix, count, refs, overrides, isManual) {
      const chips = [];
      const totalTouches = count + 1;
      for (let i = 1; i <= count; i++) {
        const touchNumber = i + 1;
        const override = overrides && overrides[i];
        let notes = `References every mechanism sent so far: ${refs.join(" + ")}. If the prospect opens or watches on this exact touch, follow-up shifts into the Opened · Seen flow from here.`;
        if (override) {
          const hasNewThread = !!override.newThreadDivider || !!(override.badges && override.badges.some(b => b.text === "New Thread"));
          if (hasNewThread) {
            notes += ` This touch starts a fresh email thread — response rates decline within a single thread, so a new thread helps reset momentum.`;
          }
        }
        chips.push({
          id: `${prefix}-no-${i}`,
          label: override && override.label ? override.label : `Email Follow-Up ${touchNumber}`,
          sub: `Touch ${touchNumber} of ${totalTouches}`,
          badges: override && override.badges ? override.badges : null,
          notes: override && override.notes ? override.notes : notes,
          manual: !!isManual,
          newThreadDivider: !!(override && override.newThreadDivider)
        });
      }
      return chips;
    }

    function buildOpenedChips(prefix, mechanism) {
      /* Cold Call's Seen side keys off the DELIVERABLE being seen — the call
         itself has no open tracking. Seen vs unseen changes the call script. */
      const isColdCall = mechanism === "Cold Call";
      const instantLabel = isColdCall ? "Instant Call" : (mechanism === "Super Loom" || mechanism === "Physical Good") ? "Instant Call or Reply" : "Instant Reply";
      const chips = [
        {
          id: `${prefix}-op-1`, label: instantLabel, sub: isColdCall ? "The moment the deliverable shows Seen" : "Same channel, immediately", isInstantReply: true,
          manual: true,
          notes: isColdCall
            ? "Dial the moment tracking shows the deliverable was seen — the call lands while it's still front of mind. This is the seen-script call: they've already watched, so skip the re-pitch and go straight for the conversation and the booking."
            : `Sent the moment tracking shows the ${mechanism} was opened or watched — on the same channel it was sent on. The only job is to put a face to it before anything else happens.`
        }
      ];
      for (let i = 2; i <= 6; i++) {
        chips.push({
          id: `${prefix}-op-${i}`, label: isColdCall ? `Call Attempt ${i}` : `Email Follow-Up ${i}`, sub: "Seen Output",
          notes: isColdCall
            ? "The same call attempt, run on the seen script — they've watched the deliverable, so reference it directly and go for the booking instead of re-pitching."
            : "Still a normal follow-up touch — just reframed now that they're known to be engaged. They stay in this Seen state for every later mechanism too, even after this one ends.",
          manual: isColdCall
        });
      }
      chips.push({
        id: `${prefix}-op-7`, label: "Book Call", sub: "Conversion", isTerminal: true,
        notes: "The moment any positive reply lands, stop selling and start booking. This is the true exit point of the whole sequence, regardless of which mechanism or touch triggered it. If it never converts, the sequence simply continues to the next mechanism below."
      });
      return chips;
    }

    function buildTierSequence(entries) {
      const seq = [];
      const sentSoFar = [];
      entries.forEach(e => {
        sentSoFar.push(e.mechanism);
        seq.push({ id: e.id, type: "send", mechanism: e.mechanism, medium: e.medium, notes: e.notes, icon: e.icon, flag: e.flag || null, manual: !!e.manual });
        const branchId = `${e.id}-branch`;
        const openedChips = buildOpenedChips(branchId, e.mechanism);
        if (e.chipOverrides) {
          Object.keys(e.chipOverrides).forEach(key => {
            const ov = e.chipOverrides[key];
            if (!ov || !ov.newThreadDivider) return;
            const match = openedChips.find(c => c.id === `${branchId}-op-${Number(key) + 1}`);
            if (match) match.newThreadDivider = true;
          });
        }
        seq.push({
          id: branchId, type: "branch", parentId: e.id, refs: [...sentSoFar], followUpMedium: e.followUpMedium || null,
          notOpened: { count: e.followUps, chips: buildFollowUpChips(branchId, e.followUps, [...sentSoFar], e.chipOverrides, e.followUpsManual) },
          opened: { chips: openedChips }
        });
      });
      return seq;
    }

    /* Cold Call follow-ups are additional live dials. The left column is the
       unseen track; the Opened · Seen column is the seen track — the script
       and follow-up cadence change once the deliverable has been watched. */
    const COLD_CALL_ATTEMPT_NOTES = "A repeat dial on the unseen script — they haven't watched the deliverable yet, so the call earns interest from scratch and drives them back to it. The moment tracking shows the deliverable seen, switch to the Deliverable Seen flow on the right: the script and follow-up cadence change.";
    const COLD_CALL_CHIP_OVERRIDES = {
      1: { label: "Call Attempt 2", notes: COLD_CALL_ATTEMPT_NOTES },
      2: { label: "Call Attempt 3", notes: COLD_CALL_ATTEMPT_NOTES },
      3: { label: "Call Attempt 4", notes: COLD_CALL_ATTEMPT_NOTES },
      4: { label: "Call Attempt 5", notes: COLD_CALL_ATTEMPT_NOTES },
      5: { label: "Call Attempt 6", notes: COLD_CALL_ATTEMPT_NOTES }
    };

    const tier1Sequence = buildTierSequence([
      {
        id: "t1-super-loom", mechanism: "Super Loom", medium: "Email or Public Post",
        followUps: 5, icon: "loom", manual: true,
        chipOverrides: { 2: { newThreadDivider: true }, 4: { newThreadDivider: true } },
        notes: "Everything custom — every frame scripted, shot and edited for one whale-tier prospect. Reserved for $10K+ deals with real decision power, hard to reach through normal channels, and enough public footprint to research deeply."
      },
      {
        id: "t1-strategy-doc", mechanism: "Strategy Doc", medium: "Direct Mail, Email, Public Posted",
        followUps: 5, icon: "doc", flag: "New Thread", manual: true,
        chipOverrides: { 2: { newThreadDivider: true }, 4: { newThreadDivider: true } },
        notes: "Real, tangible work done for one specific prospect, delivered unsolicited — before you ever ask if they want it. A tracked, interactive Gamma doc with an embedded Loom. The doc does the selling; the email's only job is to earn the open."
      },
      {
        id: "t1-physical-good", mechanism: "Physical Good", medium: "Direct Mail", followUpMedium: "Email",
        followUps: 4, icon: "gift", flag: "New Thread", manual: true,
        chipOverrides: { 2: { newThreadDivider: true }, 4: { newThreadDivider: true } },
        notes: "A tangible object, researched and chosen specifically for one person. A $50–$500 gift is negligible against a six-figure-plus account. Every send includes a handwritten note with a phone number, a QR code to your Calendly, and a social @ handle. The executive assistant loop — call ahead, explain what's arriving — is the single highest-leverage move in the process. The gift itself goes out by Direct Mail, but every follow-up after it runs over Email."
      },
      {
        id: "t1-cold-call", mechanism: "Cold Call", medium: "Phone", manual: true, followUpsManual: true, icon: "phone",
        followUps: 5, chipOverrides: COLD_CALL_CHIP_OVERRIDES,
        notes: "A live dial to the prospect. By this point three assets are in their world — the Super Loom, the Strategy Doc, and the Physical Good — so the call references what was sent and asks for the meeting directly. Check tracking before dialing: the unseen script (left column) earns interest and drives them back to the assets; the seen script (right column) goes straight for the booking. Nothing sends automatically here: every dial is manual, and the prospect's row stays flagged until the first call is logged as done."
      },
      {
        id: "t1-cold-traffic-offer", mechanism: "Cold Email", medium: "Email",
        followUps: 5, icon: "send", flag: "New Thread", manual: true,
        chipOverrides: { 2: { newThreadDivider: true }, 4: { newThreadDivider: true } },
        notes: "Leads with what you can do for the prospect instead of pitching a meeting. At Tier 1 this runs as the final layered mechanism, after a stronger asset has already landed — never the opener."
      }
    ]);

    const tier2Sequence = buildTierSequence([
      {
        id: "t2-strategy-doc", mechanism: "Strategy Doc", medium: "Email",
        followUps: 5, icon: "doc", manual: true,
        chipOverrides: { 2: { newThreadDivider: true }, 4: { newThreadDivider: true } },
        notes: "Real, tangible work done for one specific prospect, delivered unsolicited — before you ever ask if they want it. A tracked, interactive Gamma doc with an embedded Loom. The doc does the selling; the email's only job is to earn the open."
      },
      {
        id: "t2-vsl-loom", mechanism: "VSL Loom", medium: "Email",
        followUps: 5, icon: "loom", flag: "New Thread", manual: true,
        chipOverrides: { 2: { newThreadDivider: true }, 4: { newThreadDivider: true } },
        notes: "A hybrid: reusable value-shot, offer, and CTA segments are batch-shot once, then a bespoke hook and reason-for-reaching-out are spliced in per prospect. Sits between the Desk Loom and the Super Loom — the volume play for good-but-not-whale prospects."
      },
      {
        id: "t2-cold-call", mechanism: "Cold Call", medium: "Phone", manual: true, followUpsManual: true, icon: "phone",
        followUps: 5, chipOverrides: COLD_CALL_CHIP_OVERRIDES,
        notes: "A live dial to the prospect after the VSL Loom has landed, before the Cold Email opens a new thread. Check tracking before dialing: the unseen script (left column) earns interest from scratch and drives them back to the deliverable; the seen script (right column) goes straight for the booking. Nothing sends automatically here: every dial is manual, and the prospect's row stays flagged until the first call is logged as done."
      },
      {
        id: "t2-cold-traffic-offer", mechanism: "Cold Email", medium: "Email", flag: "New Thread", manual: true,
        followUps: 5, icon: "send",
        chipOverrides: { 2: { newThreadDivider: true }, 4: { newThreadDivider: true } },
        notes: "Leads with what you can do for the prospect instead of pitching a meeting. At Tier 2 this runs as the final layered mechanism, after a stronger asset has already landed — never the opener."
      }
    ]);

    const OUTBOUND_SYSTEM = {
      tier1: {
        key: "tier1", label: "Tier 1", eyebrow: "Whale / High-Touch",
        sequence: tier1Sequence
      },
      tier2: {
        key: "tier2", label: "Tier 2", eyebrow: "Mid-Tier",
        sequence: tier2Sequence
      }
    };

    const NODE_INDEX = {};
    const BRANCH_BY_MECH = {};
    (function indexAll() {
      Object.values(OUTBOUND_SYSTEM).forEach(tier => {
        tier.sequence.forEach(node => {
          if (node.type === "send") {
            NODE_INDEX[node.id] = { kind: "send", tierLabel: tier.label, ...node };
          } else if (node.type === "branch") {
            BRANCH_BY_MECH[node.parentId] = node;
            node.notOpened.chips.forEach(c => {
              NODE_INDEX[c.id] = { kind: "chip", tierLabel: tier.label, lane: "Follow-Up Sequence", ...c };
            });
            node.opened.chips.forEach(c => {
              NODE_INDEX[c.id] = { kind: "chip", tierLabel: tier.label, lane: "Opened · Seen", ...c };
            });
          }
        });
      });
    })();

    /* ---- Seen-state: refactored from a global singleton to per-prospect ----
       Original index.html used one global localStorage key. Here, `currentProspect`
       is set whenever the sequence modal opens, and isSeen/toggleSeen/persistSeen
       all read/write currentProspect.seenState instead — but keep identical
       function names/signatures so buildSendCard/buildMechBlock/renderStatusBar
       (copied verbatim below) need zero changes. */
    let currentProspect = null;
    /* Maps a sequence node/chip id to its flat cadence index (Day 1, Day 4, Day 7…)
       for the currently open prospect's tier — rebuilt each time buildSequence runs. */
    let cadenceIdIndex = {};
    let currentCadenceSchedule = { dates: [], total: 0, frozenFromIndex: null };

    /* seenState values are { seen:bool, ts:number } — the timestamp powers the
       Analytics view (which touch generated an open, in what order). */
    function isSeen(id) {
      if (!currentProspect) return false;
      const v = currentProspect.seenState[id];
      return !!(v && (typeof v === "object" ? v.seen : v));
    }
    function persistSeen() {
      if (!currentProspect) return;
      saveCompanies();
    }

    /* Marking a deliverable Seen only advances status forward, never pulls it
       back — it only fires from New/In Sequence, and never overrides Replied
       or anything further down the ladder (which is set by toggleReplied,
       which supersedes this). */
    const SEEN_TRIGGER_STATUSES = ["new", "in_sequence"];
    function toggleSeen(id) {
      if (!currentProspect) return;
      const nowSeen = !isSeen(id);
      currentProspect.seenState[id] = { seen: nowSeen, ts: Date.now() };
      const mechName = (NODE_INDEX[id] && NODE_INDEX[id].mechanism) || "mechanism";
      logActivity(currentProspect, `${mechName} marked as ${nowSeen ? "Seen" : "Not Seen"}`);
      if (nowSeen && SEEN_TRIGGER_STATUSES.includes(currentProspect.status)) {
        setCompanyStatus(currentProspect, "opened", "seen");
      } else if (!nowSeen && currentProspect.status === "opened") {
        const anyStillSeen = Object.keys(currentProspect.seenState).some(k => isSeen(k));
        if (!anyStillSeen) setCompanyStatus(currentProspect, "in_sequence", "seen");
      }
      persistSeen();
      /* Seen starts the Instant Reply's hold on the schedule (and unseeing
         lifts it), which moves dates on every later touch — rebuild the
         whole diagram, not just this step. */
      buildSequence(OUTBOUND_SYSTEM[currentProspect.tier]);
      /* A short pulse on the step so the change of state is impossible to miss. */
      const section = document.querySelector(`.node-box.send[data-mech-id="${id}"]`);
      const wrap = section && section.closest(".send-card-wrap");
      if (wrap && nowSeen) {
        wrap.classList.remove("just-seen");
        void wrap.offsetWidth;
        wrap.classList.add("just-seen");
      }
      renderStatusBar(OUTBOUND_SYSTEM[currentProspect.tier]);
      renderCompanySummary(currentProspect);
      /* Live-sync across the whole CRM: the table/board underneath (and its
         Last Interaction / Status columns or card) reflects every Seen toggle
         immediately, not just when the sequence modal is closed. */
      renderCurrentView();
    }

    function applySeenVisuals(id) {
      const seen = isSeen(id);
      const card = document.querySelector(`.node-box.send[data-mech-id="${id}"]`);
      if (card) {
        card.classList.toggle("is-seen", seen);
        const toggle = card.querySelector(".seen-toggle");
        if (toggle) {
          toggle.classList.toggle("is-seen", seen);
          toggle.setAttribute("aria-checked", seen ? "true" : "false");
          toggle.querySelector(".seen-toggle-text").textContent = seenLabelFor(NODE_INDEX[id], seen);
        }
        refreshStepState(card, id);
      }
      const dateRow = document.querySelector(`.seen-date-row[data-mech-id="${id}"]`);
      if (dateRow) {
        dateRow.style.display = seen ? "flex" : "none";
        dateRow.classList.toggle("is-on", seen);
        if (dateRow.classList.contains("seen-banner")) dateRow.innerHTML = seenBannerHtml(id);
        else dateRow.querySelector(".seen-date-text").textContent = `Seen · Date: ${seenTsLabel(id)}`;
      }
      const mechBlock = document.querySelector(`.mech-block[data-mech-id="${id}"]`);
      const branchNode = BRANCH_BY_MECH[id];
      if (mechBlock && branchNode) {
        morphMechBlock(mechBlock, branchNode);
      }
    }

    /* Swap a mech block for its freshly built counterpart in place. */
    function morphMechBlock(oldEl, branchNode) {
      oldEl.parentNode.replaceChild(buildMechBlock(branchNode), oldEl);
      refreshNextTouch();
    }

    /* Highlights the earliest unticked touch (the one to do next) across the
       whole diagram. A mechanism block renders both its Not Seen and Seen
       columns but CSS shows only one, so rows in the hidden column are
       skipped — otherwise the highlight could land on an invisible row. */
    /* The manual step the sequence is stuck on, if any: the overdue one
       holding the dates (frozenId), or the unfinished one every touch still
       to go sits behind (pausedId) — e.g. its own send has gone out and the
       next touch is paused until it's done. */
    function pausedStepId(company, sched) {
      if (sched.frozenId) return sched.frozenId;
      if (sched.pausedFromIndex == null) return null;
      const checks = company.cadenceChecks || [];
      for (let i = 0; i < sched.total; i++) if (!checks[i]) return i >= sched.pausedFromIndex ? sched.pausedId : null;
      return null;
    }

    function refreshNextTouch() {
      const root = document.getElementById("diagram-root");
      root.querySelectorAll(".is-next, .is-next-manual").forEach(el => el.classList.remove("is-next", "is-next-manual"));
      root.querySelectorAll(".hold-notice").forEach(el => el.remove());
      const visible = row => {
        const block = row.closest(".mech-block");
        return !block || block.classList.contains("is-seen") === !!row.closest(".opened-col");
      };
      /* Same rule as the Next Up panel (activeStepInfo): an overdue manual
         touch that's holding the schedule (computeCadenceSchedule's frozenId)
         is the real next step, even though the automated touches after it
         have dates too. Follow-Up N on the Seen side shares its touch with
         the not-seen side (pairedManualId), so try both ids. */
      const sched = currentProspect && currentProspect.startDay ? computeCadenceSchedule(currentProspect) : null;
      const stuckId = sched && pausedStepId(currentProspect, sched);
      if (stuckId) {
        const ids = [stuckId, pairedManualId(stuckId)].filter(Boolean);
        const manualRow = [...root.querySelectorAll(".manual-check-row:not(.manual-done)")]
          .find(r => ids.includes(r.dataset.manualId) && visible(r));
        const holder = manualRow && (manualRow.closest(".touch-row") || manualRow.closest(".send-card-wrap"));
        if (holder) {
          holder.classList.add("is-next");
          if (holder.classList.contains("send-card-wrap")) holder.classList.add("is-next-manual");
          /* Say it in words right under the stuck step. */
          const notice = document.createElement("div");
          notice.className = "hold-notice";
          notice.innerHTML = `<span class="hold-notice-icon">${HOLD_SVG}</span>
            <span><strong>Sequence on hold.</strong> Nothing after this goes out${sched.frozenId ? ", and every later date moves forward a day for each day it waits," : ""} until you tick “${touchLabel(stuckId)}”.</span>`;
          if (holder.classList.contains("send-card-wrap")) holder.appendChild(notice);
          else holder.after(notice);
          return;
        }
      }
      let next = null;
      root.querySelectorAll(".touch-cadence-row:not(.cadence-done)").forEach(row => {
        if (!visible(row)) return;
        if (!next || Number(row.dataset.cadenceIndex) < Number(next.dataset.cadenceIndex)) next = row;
      });
      if (!next) return;
      const holder = next.closest(".touch-row") || next.closest(".send-card-wrap");
      if (!holder) return;
      holder.classList.add("is-next");
      /* A manual send that's next (e.g. a Cold Call whose turn has come):
         the to-do is the manual tick, not the date. */
      if (holder.classList.contains("send-card-wrap") && holder.querySelector(".manual-check-row:not(.manual-done)")) {
        holder.classList.add("is-next-manual");
      }
    }

    /* One touch = one row: the chip plus its manual tick-off and its Day/date
       cadence checkbox, which used to stack as three separate boxes. */
    function buildTouchRow(...parts) {
      const row = document.createElement("div");
      row.className = "touch-row";
      parts.filter(Boolean).forEach(p => row.appendChild(p));
      return row;
    }

    /* Seen-label copy: manual steps (Cold Call) key their branch off whether
       the DELIVERABLE has been seen — the toggle says so explicitly. */
    function seenLabelFor(node, seen) {
      if (node && node.manual) return seen ? "Deliverable Seen" : "Deliverable Not Seen";
      return seen ? "Seen" : "Not Seen";
    }

    function seenTsLabel(id) {
      const ts = currentProspect && currentProspect.seenState[id] && currentProspect.seenState[id].ts;
      return ts ? formatDateShort(ts) : "";
    }

    /* The banner a step card shows once its deliverable is marked Seen —
       the one state change that redirects the whole branch below it, so it
       gets a full-width, plain-English callout rather than a tiny pill. */
    function seenBannerHtml(id) {
      const when = seenTsLabel(id);
      return `<span class="seen-banner-icon">${iconSvg("eye")}</span>
      <span class="seen-banner-copy">
        <strong>${seenLabelFor(NODE_INDEX[id], true)}${when ? ` on ${when}` : ""}</strong>
        <span>The follow-ups below have switched to the seen script.</span>
      </span>
      <span class="seen-banner-arrow" aria-hidden="true">↓</span>`;
    }

    /* Header status chip on a step card: Replied beats Seen beats Not seen. */
    function stepStateHtml(id) {
      if (currentProspect && currentProspect.repliedTouches[id]) {
        return `<span class="step-state is-replied">${iconSvg("check")}<span>Replied</span></span>`;
      }
      if (isSeen(id)) {
        const when = seenTsLabel(id);
        return `<span class="step-state is-seen">${iconSvg("eye")}<span>Seen${when ? ` · ${when}` : ""}</span></span>`;
      }
      return `<span class="step-state">${iconSvg("clock")}<span>Not seen yet</span></span>`;
    }
    function refreshStepState(card, id) {
      const slot = card && card.querySelector(".step-state-slot");
      if (slot) slot.innerHTML = stepStateHtml(id);
    }

    function renderStatusBar(tier) {
      const bar = document.getElementById("status-bar");
      const sends = tier.sequence.filter(n => n.type === "send");
      bar.innerHTML = `<span class="status-bar-label">Prospect Status</span><div class="status-bar-pills${sends.length === 1 ? " status-bar-pills-single" : ""}"></div>`;
      const pillsRow = bar.querySelector(".status-bar-pills");
      sends.forEach(node => {
        const seen = isSeen(node.id);
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = `status-pill${seen ? " is-seen" : ""}`;
        pill.innerHTML = `<span class="status-dot"></span><span>${seenLabelFor(node, seen)}: ${node.mechanism}</span>`;
        pill.addEventListener("click", () => toggleSeen(node.id));
        pillsRow.appendChild(pill);
      });
    }

    /* Cadence checkbox row shared by send cards and follow-up chips — ties a
       sequence node to its flat Day-1/Day-4/Day-7… cadence index. Both the
       "Day N" ordinal and the date reflect currentCadenceSchedule, so a
       delay pushed by an earlier overdue-then-late manual step shows up
       here as both a later date AND a later Day N, not just a stale label
       next to a shifted date. Manual check rows are never rendered here —
       only the step that's actually manual (Instant Reply or Cold Call)
       gets one, appended directly alongside its own chip/card. */
    const HOLD_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"></rect><rect x="13.5" y="5" width="4" height="14" rx="1.2"></rect></svg>`;
    function buildCadenceRow(idx) {
      const wrap = document.createElement("div");
      wrap.className = "touch-cadence-wrap";
      const row = document.createElement("label");
      const done = !!(currentProspect && currentProspect.cadenceChecks[idx]);
      const dueStr = currentCadenceSchedule.dates[idx];
      row.className = `touch-cadence-row${done ? " cadence-done" : ""}`;
      row.dataset.cadenceIndex = idx;
      const date = currentProspect && dueStr ? formatDateLong(new Date(dueStr + "T00:00:00")) : "—";
      const dayNum = currentProspect && dueStr ? daysBetweenDateStrs(currentProspect.startDay, dueStr) + 1 : 1 + idx * 3;
      /* Only a dated sequence (one with a Start Day) can be late — flag the
         due state so an overdue or due-today touch stands out in the list. */
      if (currentProspect && currentProspect.startDay && dueStr) {
        const todayStr = localDateStr(Date.now());
        if (dueStr < todayStr) row.classList.add("due-overdue");
        else if (dueStr === todayStr) row.classList.add("due-today");
      }
      /* Behind an unfinished manual step the touch is paused: it can't be
         ticked until that step is done (autoAdvanceCadence clears any tick
         here). Once the step is overdue, the date is also a projection that
         keeps sliding forward until it's ticked. */
      const sched = currentCadenceSchedule;
      const held = sched.pausedFromIndex != null && idx >= sched.pausedFromIndex;
      if (held) {
        const sliding = sched.frozenFromIndex != null && idx >= sched.frozenFromIndex;
        row.classList.add("on-hold");
        row.title = `Paused until “${touchLabel(sched.pausedId)}” is done.${sliding ? " This date moves forward each day until then." : ""}`;
      }
      row.innerHTML = `<input type="checkbox" class="touch-cadence-checkbox" ${done && !held ? "checked" : ""} ${held ? "disabled" : ""} />
      <span class="touch-cadence-text"><span class="touch-day">${held ? `<span class="hold-icon" aria-label="On hold">${HOLD_SVG}</span>` : ""}Day ${dayNum}</span><span class="touch-date">${date}</span></span>`;
      wrap.appendChild(row);
      const cb = row.querySelector("input");
      cb.addEventListener("click", e => e.stopPropagation());
      cb.addEventListener("change", e => {
        e.stopPropagation();
        if (!currentProspect) return;
        currentProspect.cadenceChecks[idx] = cb.checked;
        /* Last Interaction only moves for two reasons: the Follow Up Date
           buttons in the Closing Room, or ticking the very last touch in the
           whole sequence (the sequence is officially "done" at that point). */
        const superLoomPosted = currentProspect.tier === "tier1" && !!currentProspect.superLoomPosted;
        const cad = buildCadenceIndexMap(currentProspect.tier, superLoomPosted);
        if (cb.checked && idx === cad.total - 1) {
          currentProspect.lastInteraction = Date.now();
        }
        saveCompanies();
        /* Follow-Up N appears twice (not-seen + opened columns) sharing one
           real-world date — keep both checkboxes in sync when either is ticked. */
        document.querySelectorAll(`.touch-cadence-row[data-cadence-index="${idx}"]`).forEach(r => {
          r.classList.toggle("cadence-done", cb.checked);
          const otherCb = r.querySelector("input");
          if (otherCb) otherCb.checked = cb.checked;
        });
        refreshNextTouch();
        renderCompanySummary(currentProspect);
        renderCurrentView();
      });
      return wrap;
    }

    /* Follow-Up N's manual check row exists on BOTH sides of a mechanism's
       branch — the not-yet-seen "Follow-Up Sequence" column (id "...-no-i",
       touch i+1) and the "Deliverable Seen" column (id "...-op-(i+1)") —
       because which script the rep actually calls off of depends on whether
       the deliverable had been seen by the time that touch happened. They're
       still the exact same real-world touch (buildCadenceRow already reuses
       one shared cadence date for both), so checking off either side must
       count as that touch being done — otherwise logging a call on the
       Seen column leaves the Follow-Up Sequence column's copy permanently
       unchecked, which keeps the schedule frozen and the row red forever
       even though the call really happened. Returns null for ids with no
       counterpart (Instant Reply, plain mechanism send ids, social chips). */
    function pairedManualId(id) {
      let m = /^(.*)-op-(\d+)$/.exec(id);
      if (m) {
        const opNum = Number(m[2]);
        return opNum >= 2 && opNum <= 6 ? `${m[1]}-no-${opNum - 1}` : null;
      }
      m = /^(.*)-no-(\d+)$/.exec(id);
      if (m) return `${m[1]}-op-${Number(m[2]) + 1}`;
      return null;
    }

    /* The single write path for ticking a manual touch on or off — shared by
       the modal's checkbox row below and the Inbox's Done button
       (08-active.js) so both record the same thing. isCurrentMechanismStep
       means the touch is the current mechanism's Instant Reply, which lives
       in manualStepHandledFor rather than manualStepsDone (see
       setManualStepHandled). Callers re-run autoAdvanceCadence afterwards:
       checking/unchecking can shift later cadence dates and unfreeze
       auto-ticking that was waiting on this touch. */
    function setManualTouchDone(company, id, checked, isCurrentMechanismStep) {
      const pairedId = isCurrentMechanismStep ? null : pairedManualId(id);
      const targetIds = pairedId ? [id, pairedId] : [id];
      targetIds.forEach(targetId => {
        if (checked) company.manualStepsCompletedAt[targetId] = localDateStr(Date.now());
        else delete company.manualStepsCompletedAt[targetId];
      });
      if (isCurrentMechanismStep) {
        setManualStepHandled(company, checked);
      } else {
        targetIds.forEach(targetId => { company.manualStepsDone[targetId] = checked; });
        saveCompanies();
      }
    }

    /* Tick-off for any step tagged "Manual" (Cold Call and its follow-ups,
       plus every mechanism's Instant Reply/Call) — tracks "did I personally
       do this", independent of scheduling/cadence.
       When isCurrentMechanismStep is true, this IS the same manual step the
       table row's quick-checkmark controls (manualStepHandledFor) — sharing
       that single source of truth keeps both UIs perfectly in sync. */
    function buildManualCheckRow(id, isCurrentMechanismStep) {
      const row = document.createElement("label");
      const done = isCurrentMechanismStep
        ? !!(currentProspect && currentProspect.manualStepHandledFor === currentMechanismRaw(currentProspect))
        : !!(currentProspect && currentProspect.manualStepsDone[id]);
      row.className = `manual-check-row${done ? " manual-done" : ""}`;
      row.dataset.manualId = id;
      row.innerHTML = `<input type="checkbox" class="manual-check-checkbox" ${done ? "checked" : ""} />
      <span class="manual-check-text">${done ? "Manual step completed" : "Mark manual step as done"}</span>`;
      const cb = row.querySelector("input");
      cb.addEventListener("click", e => e.stopPropagation());
      cb.addEventListener("change", e => {
        e.stopPropagation();
        if (!currentProspect) return;
        /* Records exactly when this manual step was actually checked off —
           separate from whether it was done on time. computeCadenceSchedule
           compares this against the step's due date to know how many days
           late it was, and pushes every later cadence date back by that much.
           If this touch has a same-touch counterpart on the other column
           (see pairedManualId), write both together so checking off either
           one — whichever script the call actually happened on — resolves
           the touch for good, not just its own column's copy. */
        setManualTouchDone(currentProspect, id, cb.checked, isCurrentMechanismStep);
        /* Checking/unchecking a manual step can shift every later cadence
           date and unfreeze auto-ticking that was waiting on it — rebuild the
           whole diagram so every other row reflects the new schedule too,
           not just this one. */
        autoAdvanceCadence(currentProspect);
        buildSequence(OUTBOUND_SYSTEM[currentProspect.tier]);
        renderStatusBar(OUTBOUND_SYSTEM[currentProspect.tier]);
        renderCompanySummary(currentProspect);
        renderCurrentView();
      });
      return row;
    }

    /* A reply can land on any touch, in any mechanism — first message or any
       follow-up, seen or not. Lives as a toggle pill right inside the chip
       (like the New Thread badge), rather than a separate row. Toggling it
       on advances an early-stage prospect (New / In Sequence / Opened)
       straight to Replied — remembering the prior status in preRepliedStatus
       — while a prospect already further along (Pipeline, Meeting Booked,
       Won, Churned, Lost) keeps its status untouched, since a reply on an
       old touch shouldn't roll them backward. Toggling back off restores
       that remembered status, but only once every other Replied touch on
       this prospect is also off and the status hasn't since moved on its
       own — a reply someone independently confirmed, or a status set by
       hand, should never be silently undone by unchecking one box. */
    const REPLY_TRIGGER_STATUSES = ["new", "in_sequence", "opened"];
    function repliedBadgeMarkup(id, pillClass, withDot) {
      const done = !!(currentProspect && currentProspect.repliedTouches[id]);
      const label = done ? "Replied" : "Mark Replied";
      const inner = withDot ? `<span class="seen-toggle-dot"></span><span class="seen-toggle-text">${label}</span>` : label;
      return `<span class="${pillClass}${done ? " is-replied" : ""}" data-replied-id="${id}" role="button" tabindex="0">${inner}</span>`;
    }
    function toggleReplied(id, el) {
      if (!currentProspect) return;
      const next = !currentProspect.repliedTouches[id];
      currentProspect.repliedTouches[id] = next;
      if (next) {
        if (REPLY_TRIGGER_STATUSES.includes(currentProspect.status)) {
          currentProspect.preRepliedStatus = currentProspect.status;
          setCompanyStatus(currentProspect, "replied", "reply");
        }
      } else {
        const anyOtherReplied = Object.keys(currentProspect.repliedTouches)
          .some(k => k !== id && currentProspect.repliedTouches[k]);
        if (!anyOtherReplied && currentProspect.status === "replied" && currentProspect.preRepliedStatus) {
          setCompanyStatus(currentProspect, currentProspect.preRepliedStatus, "reply removed");
          currentProspect.preRepliedStatus = null;
        }
      }
      saveCompanies();
      el.classList.toggle("is-replied", next);
      const label = next ? "Replied" : "Mark Replied";
      el.innerHTML = el.querySelector(".seen-toggle-dot")
        ? `<span class="seen-toggle-dot"></span><span class="seen-toggle-text">${label}</span>`
        : label;
      const card = el.closest(".node-box.send");
      if (card) {
        card.classList.toggle("is-replied-card", next);
        refreshStepState(card, card.dataset.mechId);
      }
      renderCompanySummary(currentProspect);
      renderCurrentView();
    }
    function wireRepliedBadge(container) {
      const el = container.querySelector("[data-replied-id]");
      if (!el) return;
      const id = el.dataset.repliedId;
      const fire = e => { e.preventDefault(); e.stopPropagation(); toggleReplied(id, el); };
      el.addEventListener("click", fire);
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fire(e); });
    }

    function buildSendCard(node, stepNumber) {
      const wrap = document.createElement("div");
      wrap.className = "send-card-wrap";

      const card = document.createElement("div");
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      const seen = isSeen(node.id);
      const isSuperLoom = node.mechanism === "Super Loom";
      const publicPostedOn = !!(currentProspect && currentProspect.mediumChoice[node.id] === "Public Posted");
      const posted = isSuperLoom ? !!(currentProspect && currentProspect.superLoomPosted) : publicPostedOn;
      const channel = isSuperLoom ? ((currentProspect && currentProspect.superLoomChannel) || "email") : null;
      card.className = `node-box send${seen ? " is-seen" : ""}${posted ? " is-posted" : ""}`;
      card.dataset.mechId = node.id;
      card.innerHTML = `
      <div class="send-card-columns">
        <div class="send-card-col send-card-col-left">
          <div class="send-icons">
            <span class="step-badge">${stepNumber}</span>
            <span class="node-icon">${iconSvg(node.icon)}</span>
          </div>
          <h3 class="send-title">${node.mechanism}</h3>
          <div class="send-status-pills">
            ${node.manual ? `<span class="pill pill-manual">Manual</span>` : ""}
            <span class="seen-toggle${seen ? " is-seen" : ""}" data-toggle-id="${node.id}" role="button" tabindex="0">
              <span class="seen-toggle-dot"></span><span class="seen-toggle-text">${seenLabelFor(node, seen)}</span>
            </span>
            ${repliedBadgeMarkup(node.id, "seen-toggle pill-replied", true)}
          </div>
        </div>
        <div class="send-card-divider"></div>
        <div class="send-card-col send-card-col-right">
          <span class="send-medium-label">Medium</span>
          <div class="send-pills">
            ${isSuperLoom ? `
              <span class="pill channel-toggle${channel === "email" ? " is-on" : ""}" data-channel="email" role="button" tabindex="0">Email</span>
              <span class="pill channel-toggle${channel === "public" ? " is-on" : ""}" data-channel="public" role="button" tabindex="0">Public Posted</span>
            ` : node.medium.includes(",") ? node.medium.split(",").map(m => m.trim()).sort((a, b) => a.localeCompare(b)).map(m =>
                `<span class="pill medium-toggle${(currentProspect && currentProspect.mediumChoice[node.id]) === m ? " is-on" : ""}" data-medium="${m}" role="button" tabindex="0">${m}</span>`
              ).join("") : `<span class="pill medium-fixed is-on">${node.medium}</span>`}
          </div>
        </div>
      </div>`;
      card.addEventListener("click", () => openDetail(node.id));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(node.id); }
      });
      wireRepliedBadge(card);
      const toggle = card.querySelector(".seen-toggle");
      if (toggle) {
        toggle.addEventListener("click", e => { e.stopPropagation(); toggleSeen(node.id); });
        toggle.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleSeen(node.id); }
        });
      }
      if (isSuperLoom) {
        /* Selecting Public Posted inserts the social-media follow-up block and
           elongates the cadence — that changes the whole diagram's layout, so
           a full rebuild is simplest and keeps every index in sync. */
        const setChannel = (newChannel) => {
          if (!currentProspect || currentProspect.superLoomChannel === newChannel) return;
          currentProspect.superLoomChannel = newChannel;
          currentProspect.superLoomPosted = newChannel === "public";
          autoAdvanceCadence(currentProspect);
          saveCompanies();
          buildSequence(OUTBOUND_SYSTEM[currentProspect.tier]);
          renderStatusBar(OUTBOUND_SYSTEM[currentProspect.tier]);
          renderCompanySummary(currentProspect);
          renderCurrentView();
        };
        card.querySelectorAll(".channel-toggle").forEach(btn => {
          btn.addEventListener("click", e => { e.stopPropagation(); setChannel(btn.dataset.channel); });
          btn.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setChannel(btn.dataset.channel); }
          });
        });
      }
      card.querySelectorAll(".medium-toggle").forEach(btn => {
        const setMedium = () => {
          if (!currentProspect) return;
          const current = currentProspect.mediumChoice[node.id];
          const chosen = current === btn.dataset.medium ? null : btn.dataset.medium;
          currentProspect.mediumChoice[node.id] = chosen;
          card.querySelectorAll(".medium-toggle").forEach(b => {
            b.classList.toggle("is-on", b.dataset.medium === chosen);
          });
          card.classList.toggle("is-posted", chosen === "Public Posted");
          saveCompanies();
        };
        btn.addEventListener("click", e => { e.stopPropagation(); setMedium(); });
        btn.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setMedium(); }
        });
      });
      wrap.appendChild(card);

      const seenTs = currentProspect && currentProspect.seenState[node.id] && currentProspect.seenState[node.id].ts;
      const seenDateRow = document.createElement("div");
      seenDateRow.className = "seen-date-row";
      seenDateRow.dataset.mechId = node.id;
      seenDateRow.style.display = seen ? "flex" : "none";
      seenDateRow.innerHTML = `<span class="seen-date-text">Seen · Date: ${seenTs ? formatDateShort(seenTs) : ""}</span>`;
      wrap.appendChild(seenDateRow);

      /* Manual steps get the human tick-off right on the card — the cadence
         row below is the schedule; this tracks "did I actually make the call"
         (manualStepsDone), and is what clears the row's red flag. Suppress
         the cadence row's own frozen-manual reminder here: when node.manual
         is true this card already has its one dedicated manual check row
         above, so echoing an (possibly different, upstream) frozen step's
         reminder on this same row would just look like a second copy of it. */
      if (node.manual) wrap.appendChild(buildManualCheckRow(node.id));
      const cadIdx = cadenceIdIndex[node.id];
      if (cadIdx !== undefined) wrap.appendChild(buildCadenceRow(cadIdx));

      return wrap;
    }

    /* Standalone "medium hero" card — replaces the normal send-card layout
       entirely for mechanisms in MEDIUM_ORBIT_BADGES. The channel becomes
       the whole visual identity of the step (big orbit-ring badge) instead
       of a small pill, while keeping every functional control (Seen toggle,
       Replied badge, notes, manual/cadence rows) the regular card has. */
    function buildMediumHeroCard(node, stepNumber) {
      const wrap = document.createElement("div");
      wrap.className = "send-card-wrap";

      const orbitDef = MEDIUM_ORBIT_BADGES[node.mechanism];
      const card = document.createElement("div");
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      const seen = isSeen(node.id);
      card.className = `node-box send send-hero${seen ? " is-seen" : ""}`;
      card.dataset.mechId = node.id;
      card.innerHTML = `
      <span class="step-badge hero-step-badge">${stepNumber}</span>
      <h3 class="send-title hero-title">${node.mechanism}</h3>
      <div class="medium-orbit medium-orbit-lg" title="Sent via ${orbitDef.label}">
        <div class="medium-orbit-stage">
          <span class="orbit-ring ring-1"></span>
          <span class="orbit-ring ring-2"></span>
          <span class="orbit-ring ring-3"></span>
          <span class="orbit-core"><span class="orbit-core-icon">${iconSvg(orbitDef.icon)}</span></span>
        </div>
        <span class="medium-orbit-label">${orbitDef.label}</span>
      </div>
      <div class="send-status-pills hero-status-pills">
        ${node.manual ? `<span class="pill pill-manual">Manual</span>` : ""}
        <span class="seen-toggle${seen ? " is-seen" : ""}" data-toggle-id="${node.id}" role="button" tabindex="0">
          <span class="seen-toggle-dot"></span><span class="seen-toggle-text">${seenLabelFor(node, seen)}</span>
        </span>
        ${repliedBadgeMarkup(node.id, "seen-toggle pill-replied", true)}
      </div>`;
      card.addEventListener("click", () => openDetail(node.id));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(node.id); }
      });
      wireRepliedBadge(card);
      const toggle = card.querySelector(".seen-toggle");
      if (toggle) {
        toggle.addEventListener("click", e => { e.stopPropagation(); toggleSeen(node.id); });
        toggle.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleSeen(node.id); }
        });
      }
      wrap.appendChild(card);

      const seenTs = currentProspect && currentProspect.seenState[node.id] && currentProspect.seenState[node.id].ts;
      const seenDateRow = document.createElement("div");
      seenDateRow.className = "seen-date-row";
      seenDateRow.dataset.mechId = node.id;
      seenDateRow.style.display = seen ? "flex" : "none";
      seenDateRow.innerHTML = `<span class="seen-date-text">Seen · Date: ${seenTs ? formatDateShort(seenTs) : ""}</span>`;
      wrap.appendChild(seenDateRow);

      if (node.manual) wrap.appendChild(buildManualCheckRow(node.id));
      const cadIdx = cadenceIdIndex[node.id];
      if (cadIdx !== undefined) wrap.appendChild(buildCadenceRow(cadIdx));

      return wrap;
    }

    /* Same idea as buildMediumHeroCard, but for mechanisms whose controls
       split naturally into "things I do" vs "how it was sent" — title and
       orbit badge stay centered up top, then an Admin column (Seen toggle,
       Replied, Notes) sits beside a Medium column (channel + Manual/flag). */
    function buildMediumColumnsCard(node, stepNumber) {
      const wrap = document.createElement("div");
      wrap.className = "send-card-wrap";

      const orbitDef = MEDIUM_ORBIT_BADGES[node.mechanism];
      const card = document.createElement("div");
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      const seen = isSeen(node.id);
      const isSuperLoom = node.mechanism === "Super Loom";
      const isPhysicalGood = node.mechanism === "Physical Good";
      /* Public Posted turns the card's background blue whenever it's the
         active medium choice for this touch — same treatment as Super Loom's
         channel toggle, generalized to any mechanism with a Public Posted
         medium button. */
      const publicPostedOn = !!(currentProspect && currentProspect.mediumChoice[node.id] === "Public Posted");
      const posted = isSuperLoom ? !!(currentProspect && currentProspect.superLoomPosted) : publicPostedOn;
      const channel = isSuperLoom ? ((currentProspect && currentProspect.superLoomChannel) || "email") : null;
      const replied = !!(currentProspect && currentProspect.repliedTouches[node.id]);
      card.className = `node-box send send-hero send-hero-columns${seen ? " is-seen" : ""}${posted ? " is-posted" : ""}${replied ? " is-replied-card" : ""}`;
      card.dataset.mechId = node.id;
      /* Strategy Doc and Super Loom can go out over several possible
         mediums (or, for Super Loom, an actual channel choice) — there's no
         single channel to badge, so the medium column keeps the original
         selectable pills instead of one fixed "Medium" pill. Physical Good
         always goes out as Direct Mail (fixed, permanently-on) but can
         optionally also be Public Posted, so it gets its own fixed+toggle mix. */
      const mediumButtonsHtml = isSuperLoom ? `
        <span class="pill channel-toggle${channel === "email" ? " is-on" : ""}" data-channel="email" role="button" tabindex="0">Email</span>
        <span class="pill channel-toggle${channel === "public" ? " is-on" : ""}" data-channel="public" role="button" tabindex="0">Public Posted</span>
      ` : isPhysicalGood ? `
        <span class="pill medium-fixed is-on">Direct Mail</span>
        <span class="pill medium-toggle${publicPostedOn ? " is-on" : ""}" data-medium="Public Posted" role="button" tabindex="0">Public Posted</span>
      ` : node.medium.includes(",") ? node.medium.split(",").map(m => m.trim()).sort((a, b) => a.localeCompare(b)).map(m =>
          `<span class="pill medium-toggle${(currentProspect && currentProspect.mediumChoice[node.id]) === m ? " is-on" : ""}" data-medium="${m}" role="button" tabindex="0">${m}</span>`
        ).join("") : `<span class="pill medium-fixed is-on">${node.medium}</span>`;
      /* Two tiers: who/what (step, icon, name, live status) on top, then the
         three things you set on a step, each with its own label — whether
         the deliverable has been seen, whether they replied, and how it went
         out. The Seen control is a real switch, since flipping it reroutes
         the follow-ups below. */
      card.innerHTML = `
      <div class="step-head">
        <span class="step-badge hero-step-badge">${stepNumber}</span>
        <span class="step-icon" title="${orbitDef.label}">${iconSvg(orbitDef.icon)}</span>
        <div class="step-head-text">
          <h3 class="send-title hero-title">${node.mechanism}</h3>
          ${node.manual ? `<span class="step-sub">You send this one yourself</span>` : ""}
        </div>
        <span class="step-state-slot">${stepStateHtml(node.id)}</span>
      </div>
      <div class="step-controls">
        <div class="step-field">
          <span class="step-field-label">Has the prospect seen it?</span>
          <span class="seen-toggle seen-switch${seen ? " is-seen" : ""}" data-toggle-id="${node.id}" role="switch" aria-checked="${seen}" tabindex="0">
            <span class="seen-switch-track"><span class="seen-toggle-dot"></span></span>
            <span class="seen-toggle-text">${seenLabelFor(node, seen)}</span>
          </span>
        </div>
        <div class="step-field">
          <span class="step-field-label">Reply</span>
          ${repliedBadgeMarkup(node.id, "seen-toggle pill-replied step-reply", true)}
        </div>
        <div class="step-field step-field-medium">
          <span class="step-field-label">Sent via</span>
          <div class="step-medium-options">${mediumButtonsHtml}</div>
        </div>
      </div>`;
      card.addEventListener("click", () => openDetail(node.id));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(node.id); }
      });
      wireRepliedBadge(card);
      const toggle = card.querySelector(".seen-toggle");
      if (toggle) {
        toggle.addEventListener("click", e => { e.stopPropagation(); toggleSeen(node.id); });
        toggle.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleSeen(node.id); }
        });
      }
      if (isSuperLoom) {
        /* Selecting Public Posted inserts the social-media follow-up block and
           elongates the cadence — that changes the whole diagram's layout, so
           a full rebuild is simplest and keeps every index in sync. */
        const setChannel = (newChannel) => {
          if (!currentProspect || currentProspect.superLoomChannel === newChannel) return;
          currentProspect.superLoomChannel = newChannel;
          currentProspect.superLoomPosted = newChannel === "public";
          autoAdvanceCadence(currentProspect);
          saveCompanies();
          buildSequence(OUTBOUND_SYSTEM[currentProspect.tier]);
          renderStatusBar(OUTBOUND_SYSTEM[currentProspect.tier]);
          renderCompanySummary(currentProspect);
          renderCurrentView();
        };
        card.querySelectorAll(".channel-toggle").forEach(btn => {
          btn.addEventListener("click", e => { e.stopPropagation(); setChannel(btn.dataset.channel); });
          btn.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setChannel(btn.dataset.channel); }
          });
        });
      }
      card.querySelectorAll(".medium-toggle").forEach(btn => {
        const setMedium = () => {
          if (!currentProspect) return;
          const current = currentProspect.mediumChoice[node.id];
          const chosen = current === btn.dataset.medium ? null : btn.dataset.medium;
          currentProspect.mediumChoice[node.id] = chosen;
          card.querySelectorAll(".medium-toggle").forEach(b => {
            b.classList.toggle("is-on", b.dataset.medium === chosen);
          });
          card.classList.toggle("is-posted", chosen === "Public Posted");
          saveCompanies();
        };
        btn.addEventListener("click", e => { e.stopPropagation(); setMedium(); });
        btn.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setMedium(); }
        });
      });
      wrap.appendChild(card);

      const seenBanner = document.createElement("div");
      seenBanner.className = `seen-date-row seen-banner${seen ? " is-on" : ""}`;
      seenBanner.dataset.mechId = node.id;
      seenBanner.innerHTML = seenBannerHtml(node.id);
      wrap.appendChild(seenBanner);

      /* The send's own to-dos, side by side as labelled tiles: the scheduled
         send date, and (for manual steps) "I actually did it". */
      const tasks = document.createElement("div");
      tasks.className = "step-tasks";
      const addTask = (label, el) => {
        const tile = document.createElement("div");
        tile.className = "step-task";
        tile.innerHTML = `<span class="step-task-label">${label}</span>`;
        tile.appendChild(el);
        tasks.appendChild(tile);
      };
      const cadIdx = cadenceIdIndex[node.id];
      if (cadIdx !== undefined) addTask("Scheduled send", buildCadenceRow(cadIdx));
      if (node.manual) addTask("Your manual step", buildManualCheckRow(node.id));
      if (tasks.children.length) wrap.appendChild(tasks);

      return wrap;
    }

    function buildChip(chip, showEyeBadge) {
      const el = document.createElement("div");
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      el.className = `chip${showEyeBadge ? " has-eye" : ""}${chip.isInstantReply ? " chip-instant" : ""}${chip.isTerminal ? " chip-terminal" : ""}`;
      const icon = chip.isInstantReply ? iconSvg("bolt") : chip.isTerminal ? iconSvg("check") : "";
      const badgesHtml = (chip.badges ? chip.badges.map(b => `<span class="chip-badge chip-badge-${b.variant}">${b.text}</span>`) : [])
        .join("");
      el.innerHTML = `
      ${showEyeBadge ? `<span class="chip-eye-badge">${iconSvg("eye")}</span>` : ""}
      <div class="chip-top-row">
        <span class="chip-label">${icon ? `<span class="chip-icon">${icon}</span>` : ""}${chip.label}</span>
      </div>
      <div class="chip-sub-row">
        <span class="chip-sub">${chip.sub || ""}</span>
        <div class="chip-sub-actions">
          ${badgesHtml}
          ${chip.manual ? `<span class="chip-badge chip-badge-red">Manual</span>` : ""}
          ${!chip.isTerminal ? repliedBadgeMarkup(chip.id, "chip-badge chip-badge-replied", true) : ""}
        </div>
      </div>`;
      el.addEventListener("click", () => openDetail(chip.id));
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(chip.id); }
      });
      wireRepliedBadge(el);
      return el;
    }

    function buildSocialChip(touchNumber, id) {
      const el = document.createElement("div");
      el.className = "chip social-chip";
      el.innerHTML = `
      <div class="chip-top-row">
        <span class="chip-label">Social Media Follow-Up ${touchNumber}</span>
        <span class="chip-badge chip-badge-red">Manual</span>
      </div>`;
      return el;
    }

    /* Renders one column's worth of steps (chips + their manual/cadence rows,
       with social touches spliced in after position 0 when socialActive).
       Shared by both the not-opened and opened columns so a public-posted
       Super Loom can render the exact same step list on both sides — the
       only difference being skipInstant, which drops the Instant Reply chip
       (and its manual row) from the not-opened side. */
    function appendMechSteps(container, node, chips, socialActive, skipInstant) {
      chips.forEach((c, i) => {
        // The closing "Book Call" chip isn't a touch to work, so it isn't listed.
        if (c.isTerminal) return;
        if (skipInstant && c.isInstantReply) {
          if (i === 0 && socialActive) appendSocialSteps(container, node);
          return;
        }
        if (c.newThreadDivider) container.appendChild(buildNewThreadDivider());
        let manualRow = null;
        if (c.isInstantReply && c.manual) {
          const mechName = NODE_INDEX[node.parentId] && NODE_INDEX[node.parentId].mechanism;
          const isCurrentStep = !!(currentProspect && mechName && mechName === currentMechanismRaw(currentProspect) && isSeen(node.parentId));
          manualRow = buildManualCheckRow(c.id, isCurrentStep);
        } else if (c.manual) {
          manualRow = buildManualCheckRow(c.id);
        }
        /* Follow-Up N on the Opened·Seen side is the same physical touch as
           Follow-Up N on the left — reuse its exact cadence index so the date
           (and the tick state) is always identical, never a separate date. */
        let cadenceRow = null;
        const opMatch = /-op-(\d+)$/.exec(c.id);
        if (opMatch) {
          const opNum = Number(opMatch[1]);
          if (opNum >= 2 && opNum <= 6) {
            const cadIdx = cadenceIdIndex[`${node.id}-no-${opNum - 1}`];
            if (cadIdx !== undefined) cadenceRow = buildCadenceRow(cadIdx);
          }
        }
        container.appendChild(buildTouchRow(cadenceRow, buildChip(c, false), manualRow));
        /* Social-media touches only ever appear right after Instant Reply —
           a public post is visible immediately, so it slots in before the
           ordinary email follow-ups. */
        if (i === 0 && socialActive) appendSocialSteps(container, node);
      });
    }

    function appendSocialSteps(container, node) {
      for (let s = 1; s <= SOCIAL_FOLLOWUP_COUNT; s++) {
        const socialId = socialChipId(node.id, s);
        const cadIdx = cadenceIdIndex[socialId];
        container.appendChild(buildTouchRow(
          cadIdx !== undefined ? buildCadenceRow(cadIdx) : null,
          buildSocialChip(s + 1, socialId),
          buildManualCheckRow(socialId)));
      }
    }

    function buildMechBlock(node) {
      const wrap = document.createElement("div");
      wrap.className = `mech-block${isSeen(node.parentId) ? " is-seen" : ""}`;
      wrap.dataset.mechId = node.parentId;

      const isSuperLoomBranch = node.parentId === SUPER_LOOM_SEND_ID;
      const socialActive = isSuperLoomBranch && !!(currentProspect && currentProspect.superLoomPosted);

      const followCol = document.createElement("div");
      followCol.className = "followup-col";
      /* The mechanism-chain breadcrumb (Super Loom → ... → Cold Email) is
         dropped for any branch whose mechanism has a medium hero card above
         it (Cold Email, Cold Call) — the card already makes the channel
         obvious, so the chain adds nothing there on either the not-seen or
         seen side. */
      const isHeroBranch = !!MEDIUM_ORBIT_BADGES[node.refs[node.refs.length - 1]];
      const refsHtml = isHeroBranch ? "" : node.refs.map((r, i) => {
        const arrow = i > 0 ? '<span class="ref-arrow">→</span>' : '';
        const isCurrent = i === node.refs.length - 1;
        return `${arrow}<span class="ref-pill${isCurrent ? " current" : ""}">${r}</span>`;
      }).join("");
      followCol.innerHTML = `
      <div class="col-head">
        <span class="col-head-icon">${iconSvg("clock")}</span><span>Follow-Up Sequence</span>
      </div>
      ${isHeroBranch ? "" : `<div class="refs-row">${refsHtml}</div>`}
      <div class="chip-stack"></div>`;
      const stack = followCol.querySelector(".chip-stack");

      /* A public-posted Super Loom is visible immediately — there's no real
         unseen/seen split to show, so both columns render the exact same
         step list, minus the left column's Instant Reply chip. */
      if (socialActive) {
        appendMechSteps(stack, node, node.opened.chips, socialActive, true);
      } else {
        node.notOpened.chips.forEach(c => {
          if (c.newThreadDivider) stack.appendChild(buildNewThreadDivider());
          const cadIdx = cadenceIdIndex[c.id];
          stack.appendChild(buildTouchRow(
            cadIdx !== undefined ? buildCadenceRow(cadIdx) : null,
            buildChip(c, true),
            c.manual ? buildManualCheckRow(c.id) : null));
        });
      }

      const bracketCol = document.createElement("div");
      bracketCol.className = "bracket-col";
      bracketCol.innerHTML = `<div class="bracket-bar"></div><div class="bracket-arm"></div>`;

      const mobileDivider = document.createElement("div");
      mobileDivider.className = "mobile-divider";
      mobileDivider.innerHTML = `<span>${iconSvg("eye")}</span><span>Opens at any point above</span>`;

      const seen = isSeen(node.parentId);
      const currentMechanism = node.refs[node.refs.length - 1];
      const openedHeadLabel = currentMechanism === "Cold Email" ? "RESPONDED" : currentMechanism === "Cold Call" ? "DELIVERABLE SEEN" : "Follow-Up Sequence Seen";
      const openedCol = document.createElement("div");
      openedCol.className = "opened-col";
      /* Public-posted Super Loom is visible immediately, so there's no real
         unseen/seen distinction to communicate here — always show the
         mechanism-flow pills so the seen and not-seen renders match. */
      const openedCaptionHtml = (seen && !socialActive) || isHeroBranch ? "" : `<div class="refs-row">${refsHtml}</div>`;
      openedCol.innerHTML = `
      <div class="col-head opened-head"><span class="col-head-icon">${iconSvg("eye")}</span><span>${openedHeadLabel}</span></div>
      ${openedCaptionHtml}
      <div class="opened-steps"></div>`;
      const steps = openedCol.querySelector(".opened-steps");
      appendMechSteps(steps, node, node.opened.chips, socialActive, false);
      /* The column heading sits on the first touch's line (Instant Reply has
         no Day/date, so the heading takes that slot) rather than its own row. */
      const firstRow = steps.querySelector(".touch-row");
      if (firstRow && !firstRow.querySelector(".touch-cadence-wrap")) {
        firstRow.prepend(openedCol.querySelector(".opened-head"));
      }

      wrap.appendChild(followCol);
      wrap.appendChild(bracketCol);
      wrap.appendChild(mobileDivider);
      wrap.appendChild(openedCol);

      return wrap;
    }

    function buildPlaceholder(tier) {
      const div = document.createElement("div");
      div.className = "placeholder";
      div.innerHTML = `
      <div class="placeholder-icon">${iconSvg("doc")}</div>
      <h3>${tier.label} sequence not yet configured</h3>
      <p>Add mechanisms, mediums, and follow-up counts to <code>OUTBOUND_SYSTEM.${tier.key}.sequence</code> using the same shape as Tier 1 — the renderer picks it up automatically, no layout changes needed.</p>`;
      return div;
    }

    function buildMediumDivider(medium) {
      const div = document.createElement("div");
      div.className = "medium-divider";
      div.innerHTML = `
      <span class="medium-divider-icon">${iconSvg("mail")}</span>
      <span class="medium-divider-label">Follow-Up Via Cold ${medium}</span>`;
      return div;
    }

    /* Same pill-shaped divider treatment as buildMediumDivider, but dropped
       mid-branch (inside a single mechanism's chip-stack, between two
       specific follow-up touches) to flag that the touch right after it
       opens a brand-new email thread instead of replying in the existing
       one. Driven by chipOverrides[i].newThreadDivider — see t1-super-loom. */
    function buildNewThreadDivider() {
      const div = document.createElement("div");
      div.className = "medium-divider new-thread-divider";
      div.innerHTML = `
      <span class="medium-divider-icon">${iconSvg("send")}</span>
      <span class="medium-divider-label">New Thread</span>`;
      return div;
    }

    function buildSequence(tier) {
      const root = document.getElementById("diagram-root");
      root.innerHTML = "";

      const cad = buildCadenceIndexMap(tier.key, !!(currentProspect && currentProspect.superLoomPosted));
      cadenceIdIndex = cad.map;
      if (currentProspect) {
        if (!Array.isArray(currentProspect.cadenceChecks)) currentProspect.cadenceChecks = [];
        while (currentProspect.cadenceChecks.length < cad.total) currentProspect.cadenceChecks.push(false);
        currentCadenceSchedule = computeCadenceSchedule(currentProspect);
      } else {
        currentCadenceSchedule = { dates: [], total: 0, frozenFromIndex: null };
      }

      if (!tier.sequence.length) {
        root.appendChild(buildPlaceholder(tier));
        return;
      }

      const col = document.createElement("div");
      col.className = "sequence";
      /* Each mechanism (its send card + its follow-up branch) is one section,
         so a step reads as a single card: header, then its touches. */
      let step = 0;
      let section = null;
      tier.sequence.forEach(node => {
        if (node.type === "send") {
          step += 1;
          section = document.createElement("section");
          section.className = "mech-section";
          section.dataset.step = step;
          col.appendChild(section);
          const orbitDef = MEDIUM_ORBIT_BADGES[node.mechanism];
          const stepCard = !orbitDef ? buildSendCard(node, step)
            : orbitDef.layout === "columns" ? buildMediumColumnsCard(node, step)
            : buildMediumHeroCard(node, step);
          section.appendChild(stepCard);
        } else if (node.type === "branch") {
          const parent = section || col;
          if (node.followUpMedium) parent.appendChild(buildMediumDivider(node.followUpMedium));
          parent.appendChild(buildMechBlock(node));
        }
      });

      const cap = document.createElement("div");
      cap.className = "sequence-end";
      cap.innerHTML = `<span class="end-icon">${iconSvg("check")}</span><span>Sequence Complete</span>`;
      col.appendChild(cap);

      root.appendChild(col);
      refreshNextTouch();
    }

    function metaRow(n) {
      if (n.kind === "send") {
        return `<span class="pill">${n.medium}</span>${n.manual ? `<span class="pill pill-manual">Manual</span>` : ""}${n.flag ? `<span class="pill pill-flag">${n.flag}</span>` : ""}`;
      }
      return `<span class="pill">${n.lane}</span>${n.sub ? `<span class="pill pill-qty">${n.sub}</span>` : ""}`;
    }

    const nodeOverlay = document.getElementById("modal-overlay");
    const modalEyebrow = document.getElementById("modal-eyebrow");
    const modalTitle = document.getElementById("modal-title");
    const modalMeta = document.getElementById("modal-meta");
    const modalNotes = document.getElementById("modal-notes");

    function openDetail(id) {
      const n = NODE_INDEX[id];
      if (!n) return;
      modalEyebrow.textContent = n.kind === "send" ? `${n.tierLabel} · ${n.medium}` : `${n.tierLabel} · ${n.lane}`;
      modalTitle.textContent = n.mechanism || n.label;
      modalMeta.innerHTML = metaRow(n);
      modalNotes.textContent = n.notes || "";
      nodeOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
    }
    function closeDetail() {
      nodeOverlay.classList.remove("open");
      if (!document.getElementById("sequence-overlay").classList.contains("open")) {
        document.body.classList.remove("modal-lock");
      }
    }
    nodeOverlay.addEventListener("click", e => { if (e.target === nodeOverlay) closeDetail(); });
    document.getElementById("modal-close").addEventListener("click", closeDetail);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        // Creative Outreach pages sit over the company: Esc closes the Strategy Doc (it saves first); the embedded
        // movie / Physical Good closes through its own Back to company button, so its saves finish first.
        if (document.getElementById("co-doc-page").classList.contains("open")) closeStrategyDoc();
        else if (document.getElementById("co-embed-page").classList.contains("open")) return;
        else if (document.getElementById("activity-notes-overlay").classList.contains("open")) closeActivityNotesModal();
        else if (document.getElementById("notes-overlay").classList.contains("open")) closeNotesModal();
        else if (document.getElementById("quicklink-overlay").classList.contains("open")) closeQuickLinkModal();
        else if (nodeOverlay.classList.contains("open")) closeDetail();
        else if (document.getElementById("sequence-overlay").classList.contains("open")) closeSequenceModal();
        else if (document.getElementById("prospect-form-overlay").classList.contains("open")) closeCompanyForm();
        else if (document.getElementById("person-form-overlay").classList.contains("open")) closePersonForm();
        else if (document.getElementById("deal-form-overlay").classList.contains("open")) closeDealForm();
      }
    });
