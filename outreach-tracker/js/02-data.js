    /* ============================================================
       PART B — CRM data model, options, mock seed
       ============================================================ */
    const TIER_OPTIONS = [
      { value: "tier1", label: "Tier 1 · Whale", color: "var(--green)", tint: "var(--green)", textColor: "#fff" },
      { value: "tier2", label: "Tier 2 · Mid", color: "var(--green-dark)", tint: "var(--green-tint)", textColor: "var(--green-dark)" }
    ];
    const STATUS_OPTIONS = [
      { value: "new", label: "New", tint: "#f2f4f2", textColor: "var(--muted)", dot: "var(--muted-soft)" },
      { value: "in_sequence", label: "In Sequence", tint: "var(--blue-tint)", textColor: "var(--blue)", dot: "var(--blue)" },
      { value: "opened", label: "Opened", tint: "var(--accent-tint)", textColor: "#8a5a12", dot: "var(--accent)" },
      { value: "replied", label: "Replied", tint: "var(--purple-tint)", textColor: "var(--purple)", dot: "var(--purple)" },
      { value: "pipeline", label: "Pipeline", tint: "var(--teal-tint)", textColor: "var(--teal-dark)", dot: "var(--teal)" }
    ];
    /* Mirrors the company Status/Pipeline fields' Won/Churned/Lost exactly —
       same values, labels, and colors, so a deal's outcome always reads the
       same way a prospect's does. */
    const DEAL_STAGE_OPTIONS = [
      { value: "won", label: "Won", tint: "var(--green)", textColor: "#fff", dot: "var(--green-dark)", pillDot: "var(--green-light)" },
      { value: "churned", label: "Churned", tint: "var(--red-light-tint)", textColor: "var(--red-light)", dot: "var(--red-light)" },
      { value: "lost", label: "Lost", tint: "var(--red-tint)", textColor: "var(--red)", dot: "var(--red)" }
    ];
    /* Legacy deal-stage values (Qualifying/Proposal/Negotiation/Closed Won/
       Closed Lost) from before Deal Stage was simplified to Won/Churned/Lost —
       maps any deal already saved in localStorage onto the new 3-value set. */
    const LEGACY_DEAL_STAGE_MAP = {
      qualifying: "won", proposal: "won", negotiation: "won",
      closed_won: "won", closed_lost: "lost"
    };
    function migrateDealStage(stage) {
      if (DEAL_STAGE_OPTIONS.some(o => o.value === stage)) return stage;
      return LEGACY_DEAL_STAGE_MAP[stage] || "won";
    }
    /* All the ways a follow-up can go out, tracked per-company as a dated log
       (Closing Room only — see renderFollowUpLog). */
    const FOLLOWUP_METHOD_OPTIONS = [
      { value: "Cold Call", label: "Cold Call", tint: "var(--red-tint)", textColor: "var(--red)", dot: "var(--red)" },
      { value: "Cold Email", label: "Cold Email", tint: "var(--accent-tint)", textColor: "#8a5a12", dot: "var(--accent)" },
      { value: "Physical Good", label: "Physical Good", tint: "var(--purple-tint)", textColor: "var(--purple)", dot: "var(--purple)" },
      { value: "Social Media", label: "Social Media", tint: "var(--teal-tint)", textColor: "var(--teal-dark)", dot: "var(--teal)" },
      { value: "Strategy Doc", label: "Strategy Doc", tint: "var(--green-tint)", textColor: "var(--green-dark)", dot: "var(--green-light)" },
      { value: "Super Loom", label: "Super Loom", tint: "var(--green-tint)", textColor: "var(--green-dark)", dot: "var(--green)" },
      { value: "VSL Loom", label: "VSL Loom", tint: "var(--blue-tint)", textColor: "var(--blue)", dot: "var(--blue)" }
    ];
    function followUpMethodOption(value) { return optionByValue(FOLLOWUP_METHOD_OPTIONS, value); }
    /* The ways an inbound Response can arrive — its own short list, separate
       from FOLLOWUP_METHOD_OPTIONS since a prospect can only reply by these
       channels, not by every outbound mechanism. */
    const RESPONSE_METHOD_OPTIONS = [
      { value: "Email", label: "Email", tint: "#f2f4f2", textColor: "var(--muted)", dot: "var(--muted-soft)" },
      { value: "LinkedIn", label: "LinkedIn", tint: "var(--blue-tint)", textColor: "var(--blue)", dot: "var(--blue)" },
      { value: "Phone Call", label: "Phone Call", tint: "#e8ecfb", textColor: "#3a4fa0", dot: "#6b7fd1" }
    ];
    function responseMethodOption(value) { return optionByValue(RESPONSE_METHOD_OPTIONS, value); }
    /* Every entry in the Activity & Follow-Up Log is either an outbound touch
       WE sent (Method + Date Sent) or an inbound Response FROM the prospect
       (Response Method + Date Received) — both carry free-text Notes. */
    const ACTIVITY_TYPE_OPTIONS = [
      { value: "followup", label: "Follow-Up", tint: "var(--green-tint)", textColor: "var(--green-dark)", dot: "var(--green)" },
      { value: "response", label: "Response", tint: "var(--purple-tint)", textColor: "var(--purple)", dot: "var(--purple)" }
    ];
    function activityTypeOption(value) { return optionByValue(ACTIVITY_TYPE_OPTIONS, value); }
    function optionByValue(list, value) { return list.find(o => o.value === value) || list[0]; }
    function escapeHtml(str) {
      return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    /* Activity & Follow-Up Log notes are always bullet points, never free-form
       paragraphs — every non-blank line gets a "• " prefix (idempotent: strips
       any existing prefix first so re-normalizing never double-bullets). */
    function normalizeBulletText(str) {
      return String(str || "").split("\n").map(line => {
        const trimmed = line.replace(/^\s*•\s*/, "").trim();
        return trimmed.length ? "• " + trimmed : line;
      }).join("\n");
    }
    /* First non-empty bullet line (for the compact row preview) plus how many
       more lines exist beyond it. */
    function notesPreview(notes) {
      const lines = String(notes || "").split("\n").map(l => l.replace(/^\s*•\s*/, "").trim()).filter(Boolean);
      if (!lines.length) return { text: "Add notes…", empty: true, extra: 0 };
      return { text: lines[0], empty: false, extra: lines.length - 1 };
    }
    function formatCurrency(n) {
      const num = Number(n) || 0;
      return "$" + num.toLocaleString("en-US");
    }
    const TIER_RANK = { tier1: 0, tier2: 1 };
    const AVATAR_COLORS = ["#145c34", "#0e3f24", "#8a5a12", "#6b3fa0", "#2c4f9e", "#b3452e"];
    function colorForString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }
    /* Skips bracketed tags like "[TEST]" and leading punctuation, so
       "[TEST] Lumen Dental" reads "LD", not "[L". */
    function initials(name) {
      const words = n => n.split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}]+/u, "")).filter(Boolean);
      const untagged = words(String(name || "").replace(/\[[^\]]*\]/g, ""));
      return (untagged.length ? untagged : words(String(name || ""))).slice(0, 2).map(p => p[0].toUpperCase()).join("");
    }

    const COMPANIES_STORAGE_KEY = "lincko-crm-companies-v1";
    const PEOPLE_STORAGE_KEY = "lincko-crm-people-v1";
    const DEALS_STORAGE_KEY = "lincko-crm-deals-v1";
    const LEGACY_PROSPECTS_KEY = "lincko-crm-prospects-v1";

    function daysAgo(n) { return Date.now() - n * 24 * 60 * 60 * 1000; }
    function hoursAgo(n) { return Date.now() - n * 60 * 60 * 1000; }
    function isoDaysFromNow(n) { return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); }
    /* Calendar-day string in the viewer's LOCAL timezone (not UTC) — used
       anywhere a timestamp needs comparing against a plain YYYY-MM-DD date,
       so "today" in the calendar always matches "today" in the comparison. */
    function localDateStr(ts) {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    /* Same as localDateStr but pinned to America/Los_Angeles regardless of
       the viewer's own timezone — a booked meeting only rolls over to "past"
       once it's midnight in California, not midnight wherever the rep is. */
    function pacificDateStr(ts) {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
    }

    /* Companies = the account being pursued through the outbound sequence.
       People = individual contacts at that company (one or more), one of
       which may be flagged isPrimary. Splitting these out means a single
       account can carry multiple contacts while the sequence/seenState
       stays scoped to the company as a whole. */
    function makeMockData() {
      const companies = [
        { id: "co1", name: "Northwind Robotics", domain: "northwindrobotics.com", tier: "tier1", status: "pipeline", cadenceChecks: Array(15).fill(true), lastInteraction: hoursAgo(3), createdAt: daysAgo(20), notes: "Warm intro via board member. Very responsive on email, prefers async over calls.", seenState: { "t1-super-loom": true } },
        { id: "co2", name: "Basalt Systems", domain: "basaltsystems.io", tier: "tier1", status: "in_sequence", cadenceChecks: Array(1).fill(true), lastInteraction: hoursAgo(20), createdAt: daysAgo(14), notes: "", seenState: {} },
        { id: "co3", name: "Fathom Analytics", domain: "fathomanalytics.co", tier: "tier1", status: "opened", cadenceChecks: Array(8).fill(true), lastInteraction: hoursAgo(6), createdAt: daysAgo(9), notes: "Opened the Strategy Doc twice. Worth a follow-up call once the sequence surfaces a reply.", seenState: { "t1-strategy-doc": true } },
        { id: "co4", name: "Ridgeline Capital", domain: "ridgelinecap.com", tier: "tier1", status: "pipeline", cadenceChecks: Array(22).fill(true), lastInteraction: daysAgo(2), createdAt: daysAgo(45), notes: "Closed — onboarding kicked off. Great champion, may refer others in her portfolio.", seenState: { "t1-super-loom": true, "t1-strategy-doc": true } },
        { id: "co5", name: "Loomis Studio", domain: "loomisstudio.com", tier: "tier2", status: "in_sequence", cadenceChecks: Array(1).fill(true), lastInteraction: hoursAgo(14), createdAt: daysAgo(6), notes: "", seenState: {} },
        { id: "co6", name: "Circuitry Labs", domain: "circuitrylabs.dev", tier: "tier2", status: "replied", cadenceChecks: Array(9).fill(true), lastInteraction: hoursAgo(2), createdAt: daysAgo(11), notes: "Replied asking for case studies — sent over the two closest-fit ones.", seenState: { "t2-strategy-doc": true } },
        { id: "co7", name: "Vantage Freight", domain: "vantagefreight.com", tier: "tier2", status: "new", cadenceChecks: [], lastInteraction: daysAgo(1), createdAt: daysAgo(3), notes: "", seenState: {} },
        { id: "co8", name: "Cobalt Wealth", domain: "cobaltwealth.com", tier: "tier2", status: "opened", cadenceChecks: Array(7).fill(true), lastInteraction: hoursAgo(9), createdAt: daysAgo(17), notes: "", seenState: { "t2-vsl-loom": true } },
        { id: "co9", name: "Harborlight Media", domain: "harborlightmedia.com", tier: "tier2", status: "pipeline", cadenceChecks: Array(4).fill(true), lastInteraction: daysAgo(30), createdAt: daysAgo(60), notes: "Went with an in-house solution. Re-approach in Q3.", seenState: {} },
        { id: "co10", name: "Pinecrest Foods", domain: "pinecrestfoods.com", tier: "tier2", status: "new", cadenceChecks: [], lastInteraction: daysAgo(4), createdAt: daysAgo(4), notes: "", seenState: {} },
        { id: "co11", name: "Ferro Metalworks", domain: "ferrometalworks.com", tier: "tier2", status: "in_sequence", cadenceChecks: Array(1).fill(true), lastInteraction: hoursAgo(30), createdAt: daysAgo(7), notes: "", seenState: {} },
        { id: "co12", name: "Brightpath Learning", domain: "brightpathlearning.com", tier: "tier2", status: "opened", cadenceChecks: Array(5).fill(true), lastInteraction: hoursAgo(11), createdAt: daysAgo(5), notes: "", seenState: {} },
        { id: "co13", name: "Redshift Logistics", domain: "redshiftlogistics.com", tier: "tier2", status: "new", cadenceChecks: [], lastInteraction: daysAgo(1), createdAt: daysAgo(2), notes: "", seenState: {} }
      ];
      const people = [
        { id: "pe1", companyId: "co1", name: "Jordan Ellis", jobTitle: "VP of Growth", email: "jordan@northwindrobotics.com", phone: "+1 415 555 0148", linkedin: "linkedin.com/in/jordanellis", isPrimary: true },
        { id: "pe2", companyId: "co2", name: "Priya Kapoor", jobTitle: "Head of Revenue", email: "priya@basaltsystems.io", phone: "+1 212 555 0199", linkedin: "linkedin.com/in/priyakapoor", isPrimary: true },
        { id: "pe3", companyId: "co3", name: "Marcus Webb", jobTitle: "Founder & CEO", email: "marcus@fathomanalytics.co", phone: "+1 646 555 0121", linkedin: "linkedin.com/in/marcuswebb", isPrimary: true },
        { id: "pe4", companyId: "co4", name: "Sofia Delgado", jobTitle: "Managing Partner", email: "sofia@ridgelinecap.com", phone: "+1 303 555 0177", linkedin: "linkedin.com/in/sofiadelgado", isPrimary: true },
        { id: "pe5", companyId: "co5", name: "Ethan Cho", jobTitle: "Creative Director", email: "ethan@loomisstudio.com", phone: "+1 512 555 0142", linkedin: "", isPrimary: true },
        { id: "pe6", companyId: "co6", name: "Hannah Reyes", jobTitle: "Co-Founder", email: "hannah@circuitrylabs.dev", phone: "+1 720 555 0113", linkedin: "linkedin.com/in/hannahreyes", isPrimary: true },
        { id: "pe7", companyId: "co7", name: "Owen Fischer", jobTitle: "Director of Operations", email: "owen@vantagefreight.com", phone: "+1 214 555 0166", linkedin: "", isPrimary: true },
        { id: "pe8", companyId: "co8", name: "Layla Haddad", jobTitle: "Principal", email: "layla@cobaltwealth.com", phone: "+1 617 555 0188", linkedin: "linkedin.com/in/laylahaddad", isPrimary: true },
        { id: "pe9", companyId: "co9", name: "Diego Ramos", jobTitle: "VP Marketing", email: "diego@harborlightmedia.com", phone: "+1 305 555 0134", linkedin: "", isPrimary: true },
        { id: "pe10", companyId: "co10", name: "Grace Lindqvist", jobTitle: "Marketing Manager", email: "grace@pinecrestfoods.com", phone: "+1 612 555 0155", linkedin: "", isPrimary: true },
        { id: "pe11", companyId: "co11", name: "Noah Petrov", jobTitle: "Owner", email: "noah@ferrometalworks.com", phone: "+1 216 555 0109", linkedin: "", isPrimary: true },
        { id: "pe12", companyId: "co12", name: "Amara Okafor", jobTitle: "Head of Partnerships", email: "amara@brightpathlearning.com", phone: "+1 469 555 0121", linkedin: "linkedin.com/in/amaraokafor", isPrimary: true },
        { id: "pe13", companyId: "co13", name: "Liam Sanders", jobTitle: "Logistics Manager", email: "liam@redshiftlogistics.com", phone: "+1 971 555 0163", linkedin: "", isPrimary: true }
      ];
      const deals = [
        { id: "de1", companyId: "co1", name: "Annual Contract — Northwind", value: 48000, stage: "won", closeDate: isoDaysFromNow(12), createdAt: daysAgo(9) },
        { id: "de2", companyId: "co3", name: "Fathom Analytics — Initial Engagement", value: 22000, stage: "won", closeDate: isoDaysFromNow(20), createdAt: daysAgo(5) },
        { id: "de3", companyId: "co4", name: "Ridgeline Capital — Year 1", value: 96000, stage: "won", closeDate: isoDaysFromNow(-2), createdAt: daysAgo(40) },
        { id: "de4", companyId: "co6", name: "Circuitry Labs — Pilot", value: 15000, stage: "churned", closeDate: isoDaysFromNow(8), createdAt: daysAgo(10) },
        { id: "de5", companyId: "co8", name: "Cobalt Wealth — Retainer", value: 31000, stage: "won", closeDate: isoDaysFromNow(25), createdAt: daysAgo(15) },
        { id: "de6", companyId: "co9", name: "Harborlight Media — Renewal", value: 18000, stage: "lost", closeDate: isoDaysFromNow(-30), createdAt: daysAgo(55) },
        { id: "de7", companyId: "co12", name: "Brightpath Learning — Volume Deal", value: 9500, stage: "won", closeDate: isoDaysFromNow(35), createdAt: daysAgo(4) }
      ];
      return { companies, people, deals };
    }

    let companies = [];
    let people = [];
    let deals = [];

    function migrateLegacyProspects() {
      const raw = localStorage.getItem(LEGACY_PROSPECTS_KEY);
      if (!raw) return false;
      let legacy = [];
      try { legacy = JSON.parse(raw) || []; } catch (e) { return false; }
      if (!legacy.length) return false;
      companies = legacy.map(p => normalizeCompany({
        id: "co_" + p.id, name: p.company, domain: p.domain || "", tier: p.tier, status: p.status,
        lastInteraction: p.lastInteraction, createdAt: p.createdAt, notes: p.notes || "", seenState: p.seenState || {}
      }));
      people = legacy.map(p => ({
        id: "pe_" + p.id, companyId: "co_" + p.id, name: p.name, jobTitle: p.jobTitle || "", email: p.email || "",
        phone: p.phone || "", linkedin: p.linkedin || "", isPrimary: true
      }));
      deals = [];
      saveCompanies();
      savePeople();
      saveDeals();
      return true;
    }

    /* One-way migration: fills in defaults for fields added after a company was
       first created (Start Day, cadence, markers, quick links, seenState shape)
       so both freshly-seeded and previously-saved companies always have every
       field the rest of the app expects. Safe to run on every load. */
    /* Empty — no status gets special "Closing Room" treatment anymore.
       Pipeline behaves exactly like New/In Sequence/Opened/Replied: plain
       tiered-sequence view, normal cadence auto-advance, no separate panel. */
    const CLOSING_ROOM_STATUSES = [];

    /* The one write path for a company's status — the sequence engine
       (Seen / Reply toggles), the status pill popover, the bulk bar and the
       Board all go through here so the follow-ups (booked-via capture, deal
       sync, activity line, the status-change hook) can't drift apart.
       `source` names where the change came from for the activity log
       ("board", "bulk", "seen", "reply"); omit it for a plain manual edit.
       Returns false when nothing changed. Caller saves + re-renders. */
    function setCompanyStatus(company, value, source) {
      const prev = company.status;
      if (prev === value) return false;
      company.status = value;
      if (value === "meeting_booked") captureBookedViaMechanism(company);
      syncDealForCompany(company);
      logActivity(company, `Status changed to ${optionByValue(STATUS_OPTIONS, value).label}${source ? ` (${source})` : ""}`);
      onStatusChanged(company, prev);
      return true;
    }
    /* Hook for side effects of a status change (the Close push lands here). */
    function onStatusChanged(company, prev) { }

    function normalizeCompany(c) {
      /* Tier 3 was removed — any company still carrying it (e.g. from the
         database, written before this change) falls back to Tier 2, the
         closest remaining tier, so OUTBOUND_SYSTEM[c.tier] always resolves
         instead of throwing. */
      if (c.tier === "tier3") c.tier = "tier2";
      /* Blank startDay = sequence not started (no cadence dates, nothing
         due, pipeline "Not Started"). It stays blank until a start date is
         set explicitly — never defaulted from createdAt. */
      if (!c.startDay) c.startDay = "";
      if (!c.followUpDate) c.followUpDate = localDateStr(Date.now());
      if (!Array.isArray(c.cadenceChecks)) c.cadenceChecks = [];
      if (!Array.isArray(c.followUpLog)) c.followUpLog = [];
      c.followUpLog.forEach(entry => {
        if (entry.type !== "followup" && entry.type !== "response") entry.type = "followup";
        if (typeof entry.notes !== "string") entry.notes = "";
      });
      /* Closing Room only (see CLOSING_ROOM_STATUSES above)
         — nextMeetingDate is the upcoming booked call; meetingLog is the
         history of ones that already happened, kept separate from the
         generic Activity & Follow-Up Log since meetings are their own thing. */
      if (typeof c.nextMeetingDate !== "string") c.nextMeetingDate = "";
      if (!Array.isArray(c.meetingLog)) c.meetingLog = [];
      /* Call Prep: Calendly embed + pre-call checklist for the NEXT call to be
         booked, keyed by call number ("2", "3", …) so each call keeps its own
         docs/checklist state. Which call number is "next" is derived from
         meetingLog.length (see callPrepConfig) — not stored here. */
      if (!c.callPrep || typeof c.callPrep !== "object" || Array.isArray(c.callPrep)) c.callPrep = {};
      if (c.callPrep1 && typeof c.callPrep1 === "object") {
        if (!c.callPrep["2"]) c.callPrep["2"] = c.callPrep1;
        delete c.callPrep1;
      }
      c.meetingLog.forEach(entry => {
        if (typeof entry.notes !== "string") entry.notes = "";
      });
      if (!c.manualStepsDone || typeof c.manualStepsDone !== "object") c.manualStepsDone = {};
      if (!c.manualStepsCompletedAt || typeof c.manualStepsCompletedAt !== "object") c.manualStepsCompletedAt = {};
      if (!c.repliedTouches || typeof c.repliedTouches !== "object") c.repliedTouches = {};
      if (!c.touchNotes || typeof c.touchNotes !== "object") c.touchNotes = {};
      if (c.preRepliedStatus === undefined) c.preRepliedStatus = null;
      if (typeof c.superLoomPosted !== "boolean") c.superLoomPosted = false;
      if (!["public", "email", "mail"].includes(c.superLoomChannel)) {
        c.superLoomChannel = c.superLoomPosted ? "public" : "email";
      }
      if (!c.quickLinks || typeof c.quickLinks !== "object") {
        c.quickLinks = { superLoom: "", physicalGood: "", vslLoom: "", d100: "" };
      } else {
        ["superLoom", "physicalGood", "vslLoom", "d100"].forEach(k => { if (!c.quickLinks[k]) c.quickLinks[k] = ""; });
      }
      if (!Array.isArray(c.activity)) c.activity = [];
      if (c.bookedViaMechanism === undefined) c.bookedViaMechanism = null;
      if (c.manualStepHandledFor === undefined) c.manualStepHandledFor = null;
      if (c.autoDealId === undefined) c.autoDealId = null;
      /* c.creativeProspectId (set only once Creative Outreach is started, see
         renderCreativeOutreach) is deliberately not defaulted here: adding it to
         every company would mark them all dirty and re-upload the whole list. */
      if (!c.mediumChoice || typeof c.mediumChoice !== "object") c.mediumChoice = {};
      if (!c.seenState || typeof c.seenState !== "object") c.seenState = {};
      Object.keys(c.seenState).forEach(k => {
        const v = c.seenState[k];
        if (typeof v === "boolean") {
          c.seenState[k] = { seen: v, ts: c.lastInteraction || c.createdAt || Date.now() };
        } else if (v && typeof v === "object" && typeof v.seen !== "boolean") {
          c.seenState[k] = { seen: !!v.seen, ts: v.ts || Date.now() };
        }
      });
      autoAdvanceCadence(c);
      autoLogPastMeeting(c);
      return c;
    }

    /* ============================================================
       Server persistence layer — the Operating System's Firestore, through
       window.crmStore (set up by the module script in index.html). Source
       of truth is one doc per record (doc id built from record.id). The in-memory
       `companies`/`people`/`deals` arrays above are unchanged and still
       what every render/mutation function in this file reads and
       writes — only how they're loaded and persisted changed.
  
       Deletions: because saveCompanies()/savePeople()/saveDeals() upsert
       records still present in the CURRENT array, a record that was removed
       from the array wouldn't otherwise be removed from the database. Every
       call site that filters
       a record out of an array also calls queueDelete(collection, id) — see
       deleteCompany/deletePerson/deleteDeal/bulkDelete/mergeCompanies/
       mergePeople — and the next save*() call for that collection flushes
       the queued deletes in the same transaction as the upserts.
       ============================================================ */
    const pendingDeletes = { companies: new Set(), people: new Set(), deals: new Set() };
    function queueDelete(coll, id) { pendingDeletes[coll].add(id); }

    /* JSON.stringify silently drops `undefined` object values — strip them
       to `null` recursively so an occasional undefined optional field never
       goes missing from a saved record. */
    function stripUndefined(value) {
      if (Array.isArray(value)) return value.map(stripUndefined);
      if (value && typeof value === "object") {
        const out = {};
        Object.keys(value).forEach(k => {
          const v = value[k];
          out[k] = v === undefined ? null : stripUndefined(v);
        });
        return out;
      }
      return value;
    }

    /* Tracks in-flight writes so a tab close mid-save can warn instead of
       silently dropping the last change. A failed write also surfaces a
       toast — the in-memory/localStorage copy still has the change, so the
       operator's cue is to edit again (a failed record stays dirty and is
       re-sent by the next save) rather than closing the tab believing it
       saved. */
    let syncErrorEl = null;
    function showSyncError() {
      if (!syncErrorEl) {
        syncErrorEl = document.createElement("div");
        syncErrorEl.style.cssText = "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#9A2E1A;color:#fff;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,.25);";
        document.body.appendChild(syncErrorEl);
      }
      syncErrorEl.textContent = "Save failed — the server didn't get your last change. Check your connection; the next successful save will re-send it.";
      syncErrorEl.style.display = "";
      clearTimeout(showSyncError._t);
      showSyncError._t = setTimeout(() => { if (syncErrorEl) syncErrorEl.style.display = "none"; }, 7000);
    }
    let pendingWriteCount = 0;
    function trackWrite(promise) {
      pendingWriteCount++;
      return promise
        .catch(e => { console.error("Outreach Tracker write failed:", e); showSyncError(); })
        .finally(() => { pendingWriteCount--; });
    }
    window.addEventListener("beforeunload", e => {
      if (pendingWriteCount > 0) { e.preventDefault(); e.returnValue = ""; }
    });

    async function fetchRecords(name) {
      if (!window.crmStore) throw new Error("couldn't reach Firebase");
      return window.crmStore.list(name);
    }

    async function loadData() {
      const [coRecs, peRecs, deRecs] = await Promise.all([
        fetchRecords("companies"),
        fetchRecords("people"),
        fetchRecords("deals")
      ]);

      if (coRecs.length || peRecs.length || deRecs.length) {
        /* Fingerprint what the server sent BEFORE normalizing (both
           normalizeCompany and migrateDealStage mutate in place), so the
           saves below can tell a real change from a no-op. */
        seedSyncShadow("companies", coRecs);
        seedSyncShadow("people", peRecs);
        seedSyncShadow("deals", deRecs);

        companies = coRecs.map(normalizeCompany);
        people = peRecs;
        deals = deRecs.map(x => { x.stage = migrateDealStage(x.stage); return x; });
        /* normalizeCompany (above) already caught every cadence touch up to
           today and recomputed pipeline — just backfill any Won/Churned/Lost
           company's linked Deal, on every load. Cheap and idempotent. */
        companies.forEach(c => syncDealForCompany(c));
        /* Persist whatever normalization actually changed — usually nothing,
           in which case syncCollection sends no request. Deliberately not
           awaited: boot must never block on a write. */
        saveCompanies();
        return;
      }

      /* The database is empty — this is either a brand-new deployment, or
         an existing browser that hasn't migrated its localStorage data up
         yet. Try the migration paths (newest format first) before falling
         back to seeding mock data for a genuinely fresh install. */
      if (migrateLocalStorageToServer()) return;
      if (migrateLegacyProspects()) return;
      /* A genuinely fresh install starts empty (no mock seed): records come
         in through New Company / New Person or Import. */
      companies = [];
      people = [];
      deals = [];
    }

    /* One-time upload of this browser's existing localStorage data to the
       server, the first time it loads after the backend migration. Safe to
       leave in permanently — it only ever runs when the database comes
       back completely empty, so it can't overwrite anything real. */
    function migrateLocalStorageToServer() {
      try {
        const rawC = localStorage.getItem(COMPANIES_STORAGE_KEY);
        const rawP = localStorage.getItem(PEOPLE_STORAGE_KEY);
        if (!rawC || !rawP) return false;
        companies = JSON.parse(rawC).map(normalizeCompany);
        people = JSON.parse(rawP);
        try { deals = JSON.parse(localStorage.getItem(DEALS_STORAGE_KEY)) || []; } catch (e) { deals = []; }
        deals.forEach(d => { d.stage = migrateDealStage(d.stage); });
        companies.forEach(c => syncDealForCompany(c));
        saveCompanies(); savePeople(); saveDeals();
        console.info(`Migrated ${companies.length} companies, ${people.length} people, ${deals.length} deals from this browser's local storage to the Outreach Tracker database.`);
        return true;
      } catch (e) { return false; }
    }

    /* One bulk sync per collection: crmStore.sync applies the deletes and
       upserts in Firestore write batches. */
    async function commitUpsertsAndDeletes(collectionName, records, deleteIds) {
      if (!window.crmStore) throw new Error("couldn't reach Firebase");
      await window.crmStore.sync(collectionName, records.map(stripUndefined), deleteIds);
    }
    /* Local-storage cache layer — the server stays the source of truth for
       every write, but re-fetching it on every page load means a visible
       delay before anything renders. Instead: the last-known-good snapshot
       is cached here on every save, and bootApp() paints from it instantly
       on load, then quietly re-fetches from the API in the background and
       re-renders with the authoritative data once it arrives. Worst case if
       the cache is stale (e.g. edited from another device since) is a brief
       flash of outdated data before the real load corrects it a moment later. */
    function writeCache() {
      try {
        localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
        localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people));
        localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(deals));
      } catch (e) { /* quota exceeded or storage blocked — cache is best-effort only */ }
    }
    function loadFromCache() {
      try {
        const rawC = localStorage.getItem(COMPANIES_STORAGE_KEY);
        const rawP = localStorage.getItem(PEOPLE_STORAGE_KEY);
        if (!rawC || !rawP) return false;
        companies = JSON.parse(rawC).map(normalizeCompany);
        people = JSON.parse(rawP);
        try { deals = JSON.parse(localStorage.getItem(DEALS_STORAGE_KEY)) || []; } catch (e) { deals = []; }
        deals.forEach(d => { d.stage = migrateDealStage(d.stage); });
        companies.forEach(c => syncDealForCompany(c));
        return true;
      } catch (e) { return false; }
    }

    /* ---- Dirty-record sync ----------------------------------------------
       save*() used to PUT the ENTIRE collection on every edit: ticking one
       cadence checkbox uploaded ~1.5 MB and rewrote all 2,201 company rows.
       Instead, keep a shadow of what the server last confirmed — id ->
       canonical JSON of the record as it was sent — and send only the
       records whose JSON actually differs. A one-field edit becomes a
       one-record PUT; a page load that changes nothing sends no request at
       all.

       The shadow is only advanced on success, which keeps the old
       self-healing property exactly: a failed PUT leaves those records
       looking dirty, so the next save for that collection re-sends them.
       Deletes stay one-shot, so a failed PUT still re-queues the drained
       deleteIds (without that, a failed request resurrects deleted records
       on the next load).

       Key order has to be stable or every record would look changed after a
       server round trip — the API returns real columns first and spreads
       `meta` on top, which is a different order than the client built. */
    const lastSynced = { companies: new Map(), people: new Map(), deals: new Map() };

    function stableStringify(v) {
      if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
      if (v && typeof v === "object") {
        return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(",")}}`;
      }
      const s = JSON.stringify(v);
      return s === undefined ? "null" : s;
    }
    function fingerprint(record) { return stableStringify(stripUndefined(record)); }

    /* Seeds the shadow from records the server just gave us, so the loads
       that follow don't re-upload data the server already has. Call with the
       RAW server records, before any client-side normalization — anything
       normalization genuinely changes then shows up as dirty and gets
       persisted, and anything it leaves alone costs nothing. */
    function seedSyncShadow(coll, records) {
      const m = new Map();
      records.forEach(r => m.set(r.id, fingerprint(r)));
      lastSynced[coll] = m;
    }

    function syncCollection(coll, records) {
      writeCache();
      const deleteIds = Array.from(pendingDeletes[coll]);
      pendingDeletes[coll].clear();

      const shadow = lastSynced[coll];
      const fps = new Map();
      const changed = [];
      for (const r of records) {
        const fp = fingerprint(r);
        fps.set(r.id, fp);
        if (shadow.get(r.id) !== fp) changed.push(r);
      }

      // Nothing to say to the server.
      if (!changed.length && !deleteIds.length) return Promise.resolve();

      return trackWrite(
        commitUpsertsAndDeletes(coll, changed, deleteIds).then(() => {
          // Ids dropped from the collection fall out of the shadow here, so a
          // record that is deleted and later re-created is sent again.
          lastSynced[coll] = fps;
        }).catch(err => {
          deleteIds.forEach(id => pendingDeletes[coll].add(id));
          throw err;
        })
      );
    }
    function saveCompanies() { return syncCollection("companies", companies); }
    function savePeople() { return syncCollection("people", people); }
    function saveDeals() { return syncCollection("deals", deals); }
    /* Lookup indexes for companyById/peopleAt — at a few thousand companies,
       the .find()/.filter() linear scans these replaced were the dominant
       cost in every table render (called once per row, per row, per
       render). Cached against the array reference: every mutation path
       (filter/map reassignment, or invalidateLookupIndexes() after a
       .push()) produces a new array/marks the cache stale, so this never
       serves data from a stale snapshot. */
    let _companyIndex = null, _companyIndexSrc = null;
    let _peopleByCompanyIndex = null, _peopleByCompanyIndexSrc = null;
    function invalidateLookupIndexes() { _companyIndexSrc = null; _peopleByCompanyIndexSrc = null; }
    function companyById(id) {
      if (_companyIndexSrc !== companies) {
        _companyIndex = new Map(companies.map(c => [c.id, c]));
        _companyIndexSrc = companies;
      }
      return _companyIndex.get(id) || null;
    }
    function peopleAt(companyId) {
      if (_peopleByCompanyIndexSrc !== people) {
        _peopleByCompanyIndex = new Map();
        for (const p of people) {
          const arr = _peopleByCompanyIndex.get(p.companyId);
          if (arr) arr.push(p); else _peopleByCompanyIndex.set(p.companyId, [p]);
        }
        _peopleByCompanyIndexSrc = people;
      }
      return _peopleByCompanyIndex.get(companyId) || [];
    }
    function dealsAt(companyId) { return deals.filter(d => d.companyId === companyId); }
    function primaryContactFor(companyId) {
      const list = peopleAt(companyId);
      return list.find(p => p.isPrimary) || list[0] || null;
    }

    /* ---- Shared confirm/delete modal — replaces window.confirm() everywhere
       a record gets permanently deleted. Promise-based so call sites just
       `if(!await showConfirm({...})) return;` the same way they used to check
       the return value of confirm(). ---- */
    const confirmOverlay = document.getElementById("confirm-overlay");
    let confirmResolve = null;
    const CONFIRM_ICON_TRASH = `<path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>`;

    /* danger=false swaps the red trash styling for a neutral green one, for
       confirmations that aren't destructive (e.g. signing out) — same modal,
       same Promise<boolean> contract, just a calmer look. */
    function showConfirm({ title, message, detail, confirmLabel, danger = true, iconSvg }) {
      return new Promise(resolve => {
        confirmResolve = resolve;
        document.getElementById("confirm-title").textContent = title || "Delete this record?";
        document.getElementById("confirm-message").textContent = message || "This cannot be undone.";
        const detailList = document.getElementById("confirm-detail-list");
        if (detail && detail.length) {
          detailList.innerHTML = detail.map(d => `<li>${d}</li>`).join("");
          detailList.style.display = "";
        } else {
          detailList.innerHTML = "";
          detailList.style.display = "none";
        }
        const okBtn = document.getElementById("confirm-ok-btn");
        okBtn.textContent = confirmLabel || "Delete";
        okBtn.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;
        document.getElementById("confirm-icon").classList.toggle("neutral", !danger);
        document.getElementById("confirm-icon-svg").innerHTML = iconSvg || CONFIRM_ICON_TRASH;
        confirmOverlay.classList.add("open");
        setTimeout(() => document.getElementById("confirm-cancel-btn").focus(), 60);
      });
    }
    function closeConfirm(result) {
      confirmOverlay.classList.remove("open");
      if (confirmResolve) { const resolve = confirmResolve; confirmResolve = null; resolve(result); }
    }
    document.getElementById("confirm-cancel-btn").addEventListener("click", () => closeConfirm(false));
    document.getElementById("confirm-ok-btn").addEventListener("click", () => closeConfirm(true));
    confirmOverlay.addEventListener("click", e => { if (e.target === confirmOverlay) closeConfirm(false); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && confirmOverlay.classList.contains("open")) closeConfirm(false);
    });

    /* ---- Delete (cascading for companies) ---- */
    async function deleteCompany(id) {
      const co = companyById(id);
      if (!co) return;
      const contactCount = peopleAt(id).length;
      const dealCount = dealsAt(id).length;
      const detail = [];
      if (contactCount) detail.push(`${contactCount} contact${contactCount === 1 ? "" : "s"}`);
      if (dealCount) detail.push(`${dealCount} deal${dealCount === 1 ? "" : "s"}`);
      const ok = await showConfirm({
        title: `Delete "${co.name}"?`,
        message: detail.length ? "This also permanently deletes everything linked to it:" : "This cannot be undone.",
        detail: detail.length ? detail : null,
        confirmLabel: "Delete Company"
      });
      if (!ok) return;
      const removedPeopleIds = people.filter(p => p.companyId === id).map(p => p.id);
      const removedDealIds = deals.filter(d => d.companyId === id).map(d => d.id);
      companies = companies.filter(c => c.id !== id);
      people = people.filter(p => p.companyId !== id);
      deals = deals.filter(d => d.companyId !== id);
      queueDelete("companies", id);
      removedPeopleIds.forEach(pid => queueDelete("people", pid));
      removedDealIds.forEach(did => queueDelete("deals", did));
      saveCompanies(); savePeople(); saveDeals();
      if (currentProspect && currentProspect.id === id) {
        closeSequenceModal();
      }
      renderCurrentView();
    }

    async function deletePerson(id) {
      const p = people.find(x => x.id === id);
      if (!p) return;
      const ok = await showConfirm({ title: `Delete "${p.name}"?`, confirmLabel: "Delete Contact" });
      if (!ok) return;
      people = people.filter(x => x.id !== id);
      queueDelete("people", id);
      savePeople();
      const co = companyById(p.companyId);
      if (co) { logActivity(co, `Removed contact: ${p.name}`); saveCompanies(); }
      renderCurrentView();
      if (currentProspect && currentProspect.id === p.companyId) {
        renderCompanyContacts(currentProspect);
        renderCompanySummary(currentProspect);
      }
    }

    async function deleteDeal(id) {
      const d = deals.find(x => x.id === id);
      if (!d) return;
      const ok = await showConfirm({ title: `Delete deal "${d.name}"?`, confirmLabel: "Delete Deal" });
      if (!ok) return;
      deals = deals.filter(x => x.id !== id);
      queueDelete("deals", id);
      saveDeals();
      const co = companyById(d.companyId);
      if (co) { logActivity(co, `Removed deal: ${d.name}`); saveCompanies(); }
      renderCurrentView();
    }
