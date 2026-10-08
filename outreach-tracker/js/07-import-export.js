    /* ============================================================
       PART G — Export CSV
       ============================================================ */
    document.getElementById("export-btn").addEventListener("click", () => {
      const rows = getFilteredSorted();
      const bv2 = baseView();
      let headers, csvRows;
      if (bv2 === "companies") {
        headers = ["Company", "Primary Contact", "Tier", "Status", "Last Interaction"];
        csvRows = [headers.join(",")];
        rows.forEach(c => {
          const contact = primaryContactFor(c.id);
          const line = [
            c.name, contact ? contact.name : "",
            optionByValue(TIER_OPTIONS, c.tier).label, optionByValue(STATUS_OPTIONS, c.status).label,
            new Date(c.lastInteraction).toISOString()
          ].map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",");
          csvRows.push(line);
        });
      } else if (bv2 === "people") {
        headers = ["Name", "Company", "Job Title", "Email", "Phone", "LinkedIn"];
        csvRows = [headers.join(",")];
        rows.forEach(p => {
          const co = companyById(p.companyId);
          const line = [p.name, co ? co.name : "", p.jobTitle, p.email, p.phone, p.linkedin]
            .map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",");
          csvRows.push(line);
        });
      } else {
        headers = ["Deal", "Company", "Value", "Stage", "Close Date"];
        csvRows = [headers.join(",")];
        rows.forEach(d => {
          const co = companyById(d.companyId);
          const line = [d.name, co ? co.name : "", d.value, optionByValue(DEAL_STAGE_OPTIONS, d.stage).label, d.closeDate]
            .map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",");
          csvRows.push(line);
        });
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = bv2 === "companies" ? "lincko-companies.csv" : bv2 === "people" ? "lincko-people.csv" : "lincko-deals.csv";
      a.click();
      URL.revokeObjectURL(url);
    });

    /* ============================================================
       PART G.1 — Import CSV (Companies / People) with duplicate detection
       ============================================================ */
    const IMPORT_HINTS = {
      companies: "Expected columns: Company (required), Tier, Status. Existing companies are matched by Company name, so re-importing the same file won't create duplicates.",
      people: "Expected columns: Name (required), Company (required), Job Title, Email, Phone, LinkedIn. Existing contacts are matched by Email — or by Name + Company when no email is given. If a Company doesn't exist yet, it's created automatically."
    };

    /* Small state-machine CSV parser — handles quoted fields, escaped quotes
       ("" inside a quoted field), and commas/newlines inside quotes, so it
       round-trips whatever export-btn above produces (and most real-world
       spreadsheet exports too). */
    function parseCSV(text) {
      const rows = [];
      let row = [], field = "", inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; }
            else inQuotes = false;
          } else field += ch;
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(field); field = "";
        } else if (ch === '\n') {
          row.push(field); rows.push(row); row = []; field = "";
        } else if (ch === '\r') {
          /* skip — \r\n line endings are handled by the \n branch */
        } else {
          field += ch;
        }
      }
      if (field.length || row.length) { row.push(field); rows.push(row); }
      return rows.filter(r => r.some(cell => cell.trim() !== ""));
    }

    function normalizeHeaderKey(h) { return h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""); }

    const IMPORT_HEADER_ALIASES = {
      companies: {
        name: "name", company: "name", companyname: "name",
        tier: "tier",
        status: "status"
      },
      people: {
        name: "name", fullname: "name",
        company: "companyName", companyname: "companyName",
        jobtitle: "jobTitle", title: "jobTitle", role: "jobTitle",
        email: "email", emailaddress: "email",
        phone: "phone", phonenumber: "phone",
        linkedin: "linkedin", linkedinurl: "linkedin"
      }
    };

    /* Rows -> array of plain objects keyed by canonical field name, using the
       header row to figure out which column is which (order-independent, and
       tolerant of extra/unknown columns). */
    function csvRowsToObjects(rows, type) {
      if (!rows.length) return [];
      const aliases = IMPORT_HEADER_ALIASES[type];
      const fieldForCol = rows[0].map(h => aliases[normalizeHeaderKey(h)] || null);
      return rows.slice(1).map(cells => {
        const obj = {};
        fieldForCol.forEach((field, i) => { if (field) obj[field] = (cells[i] || "").trim(); });
        return obj;
      });
    }

    /* Accepts either the raw stored value ("tier1") or the human label
       ("Tier 1 · Whale") — CSVs exported from this app use labels, hand-built
       ones are more likely to use raw values, so both need to resolve. */
    function resolveOptionValue(list, raw, fallback) {
      if (!raw) return fallback;
      const q = raw.trim().toLowerCase();
      const byValue = list.find(o => o.value.toLowerCase() === q);
      if (byValue) return byValue.value;
      const byLabel = list.find(o => o.label.toLowerCase() === q);
      return byLabel ? byLabel.value : fallback;
    }

    function buildCompanyImportPlan(objects) {
      const toInsert = [], dupes = [], errors = [];
      const seenKeys = new Set();
      companies.forEach(c => {
        seenKeys.add("n:" + c.name.trim().toLowerCase());
      });
      objects.forEach(row => {
        if (!row.name) { errors.push({ row, reason: "Missing company name" }); return; }
        const key = "n:" + row.name.trim().toLowerCase();
        if (seenKeys.has(key)) { dupes.push({ row, reason: `Matches existing company "${row.name}"` }); return; }
        seenKeys.add(key);
        toInsert.push(normalizeCompany({
          id: "co_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name: row.name,
          tier: resolveOptionValue(TIER_OPTIONS, row.tier, "tier1"),
          status: resolveOptionValue(STATUS_OPTIONS, row.status, "new"),
          lastInteraction: Date.now(),
          createdAt: Date.now(),
          notes: "",
          seenState: {},
          activity: []
        }));
      });
      return { toInsert, dupes, errors, companiesCreated: [] };
    }

    function buildPeopleImportPlan(objects) {
      const toInsert = [], dupes = [], errors = [], companiesCreated = [];
      const companyByName = new Map();
      companies.forEach(c => companyByName.set(c.name.trim().toLowerCase(), c.id));
      const seenKeys = new Set();
      people.forEach(p => {
        seenKeys.add(p.email ? "e:" + p.email.trim().toLowerCase() : "n:" + p.name.trim().toLowerCase() + "|" + p.companyId);
      });
      objects.forEach(row => {
        if (!row.name) { errors.push({ row, reason: "Missing person name" }); return; }
        if (!row.companyName) { errors.push({ row, reason: "Missing company name" }); return; }
        const nameKey = row.companyName.trim().toLowerCase();
        let companyId = companyByName.get(nameKey);
        if (!companyId) {
          const newCo = normalizeCompany({
            id: "co_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            name: row.companyName, tier: "tier1", status: "new",
            lastInteraction: Date.now(), createdAt: Date.now(), notes: "", seenState: {}, activity: []
          });
          companiesCreated.push(newCo);
          companyByName.set(nameKey, newCo.id);
          companyId = newCo.id;
        }
        const key = row.email ? "e:" + row.email.trim().toLowerCase() : "n:" + row.name.trim().toLowerCase() + "|" + companyId;
        if (seenKeys.has(key)) { dupes.push({ row, reason: row.email ? `Matches existing email "${row.email}"` : `Matches existing contact "${row.name}" at this company` }); return; }
        seenKeys.add(key);
        toInsert.push({
          id: "pe_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name: row.name, companyId,
          jobTitle: row.jobTitle || "", linkedin: row.linkedin || "",
          email: row.email || "", phone: row.phone || "",
          isPrimary: false
        });
      });
      return { toInsert, dupes, errors, companiesCreated };
    }

    const importOverlay = document.getElementById("import-overlay");
    const importFileInput = document.getElementById("import-file-input");
    let pendingImport = null;

    function updateImportHint() {
      document.getElementById("import-hint").textContent = IMPORT_HINTS[document.getElementById("import-type-select").value];
    }

    function openImportModal() {
      pendingImport = null;
      importFileInput.value = "";
      document.getElementById("import-type-select").value = (baseView() === "people") ? "people" : "companies";
      updateImportHint();
      document.getElementById("import-step-select").style.display = "";
      document.getElementById("import-step-summary").style.display = "none";
      importOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
    }
    function closeImportModal() {
      importOverlay.classList.remove("open");
      document.body.classList.remove("modal-lock");
      pendingImport = null;
    }

    document.getElementById("import-btn").addEventListener("click", openImportModal);
    document.getElementById("import-modal-close").addEventListener("click", closeImportModal);
    document.getElementById("import-cancel-btn").addEventListener("click", closeImportModal);
    importOverlay.addEventListener("click", e => { if (e.target === importOverlay) closeImportModal(); });
    document.getElementById("import-type-select").addEventListener("change", updateImportHint);

    document.getElementById("import-choose-file-btn").addEventListener("click", () => importFileInput.click());

    importFileInput.addEventListener("change", () => {
      const file = importFileInput.files[0];
      if (!file) return;
      const type = document.getElementById("import-type-select").value;
      const reader = new FileReader();
      reader.onload = () => {
        const rows = parseCSV(String(reader.result || ""));
        const objects = csvRowsToObjects(rows, type);
        const plan = type === "companies" ? buildCompanyImportPlan(objects) : buildPeopleImportPlan(objects);
        pendingImport = Object.assign({ type }, plan);
        renderImportSummary();
      };
      reader.readAsText(file);
    });

    function renderImportSummary() {
      const stats = document.getElementById("import-summary-stats");
      const { toInsert, dupes, errors, companiesCreated, type } = pendingImport;
      const label = type === "companies" ? "companies" : "people";
      let html = `<div class="import-summary-row"><span>New ${label} to import</span><span class="import-count">${toInsert.length}</span></div>`;
      if (companiesCreated.length) {
        html += `<div class="import-summary-row"><span>New companies auto-created for unmatched contacts</span><span class="import-count">${companiesCreated.length}</span></div>`;
      }
      html += `<div class="import-summary-row import-count-dupe"><span>Duplicates skipped (already tracked)</span><span class="import-count">${dupes.length}</span></div>`;
      if (errors.length) {
        html += `<div class="import-summary-row import-count-error"><span>Rows skipped (missing required data)</span><span class="import-count">${errors.length}</span></div>`;
      }
      stats.innerHTML = html;

      const dupesWrap = document.getElementById("import-summary-dupes");
      const flagged = dupes.concat(errors);
      if (flagged.length) {
        dupesWrap.innerHTML = `<div class="import-dupe-list">${flagged.map(d => {
          const name = d.row.name || d.row.companyName || "(unnamed row)";
          return `${name} — ${d.reason}`;
        }).join("<br>")}</div>`;
      } else {
        dupesWrap.innerHTML = "";
      }

      document.getElementById("import-confirm-btn").disabled = toInsert.length === 0 && companiesCreated.length === 0;
      document.getElementById("import-step-select").style.display = "none";
      document.getElementById("import-step-summary").style.display = "";
    }

    document.getElementById("import-back-btn").addEventListener("click", () => {
      pendingImport = null;
      importFileInput.value = "";
      document.getElementById("import-step-select").style.display = "";
      document.getElementById("import-step-summary").style.display = "none";
    });

    document.getElementById("import-confirm-btn").addEventListener("click", () => {
      if (!pendingImport) return;
      const { type, toInsert, companiesCreated } = pendingImport;
      if (type === "companies") {
        toInsert.forEach(c => { logActivity(c, "Company imported via CSV"); companies.push(c); });
        invalidateLookupIndexes();
        saveCompanies();
      } else {
        companiesCreated.forEach(c => { logActivity(c, "Company auto-created during people import"); companies.push(c); });
        invalidateLookupIndexes();
        toInsert.forEach(p => {
          people.push(p);
          const co = companyById(p.companyId);
          if (co) logActivity(co, `Added contact via CSV import: ${p.name}`);
        });
        if (companiesCreated.length) saveCompanies();
        savePeople();
      }
      renderCurrentView();
      closeImportModal();
    });

    /* "Example CSV" download in the Import modal — builds the same reference
       content as buildPdfBlob's dashboard export (see PART "Download PDF"
       below), just with its own table/bullets sections, and triggers the
       download immediately with no confirmation step. */
    function importReferencePdfSections() {
      return [
        { type: "text", title: "", text: "Every column below is required — same order, same header spelling, every cell filled in. No columns skipped, no reordering." },
        { type: "text", title: "Companies CSV — header row (type exactly)", text: "Company,Tier,Status" },
        {
          type: "table", columns: ["Company", "Tier", "Status"], rows: [
            ["Northwind Robotics", "tier1", "opened"],
            ["Fathom Analytics", "tier1", "opened"],
            ["Redshift Logistics", "tier2", "new"]
          ]
        },
        { type: "text", title: "People CSV — header row (type exactly)", text: "Name,Company,Job Title,Email,Phone,LinkedIn" },
        {
          type: "table", columns: ["Name", "Company", "Job Title", "Email", "Phone", "LinkedIn"],
          widths: [0.15, 0.17, 0.17, 0.20, 0.16, 0.15], fontSize: 8, rows: [
            ["Jordan Ellis", "Northwind Robotics", "VP Growth", "jordan@northwind.io", "415-555-0148", "/in/jordanellis"],
            ["Priya Anand", "Northwind Robotics", "Head of Ops", "priya@northwind.io", "415-555-0199", ""],
            ["Sam Okafor", "Northwind Robotics", "Sales Director", "sam@northwind.io", "415-555-0170", "/in/samokafor"],
            ["Marcus Webb", "Fathom Analytics", "Founder/CEO", "marcus@fathom.co", "646-555-0121", "/in/marcuswebb"],
            ["Elena Cho", "Fathom Analytics", "Head of Growth", "elena@fathom.co", "646-555-0188", ""]
          ]
        },
        { type: "text", title: "", text: "Result of the People file above: Northwind Robotics ends up with 3 contacts, Fathom Analytics with 2 — grouped automatically because the Company column is spelled identically across their rows." },
        {
          type: "table", title: "Tier — pick one of 2 (type the left column, not the label)", columns: ["Value to type", "On-screen label"], widths: [0.3, 0.7], rows: [
            ["tier1", "Tier 1 · Whale"], ["tier2", "Tier 2 · Mid"]
          ]
        },
        {
          type: "table", title: "Status — pick one of 5 (type the left column, not the label)", columns: ["Value to type", "On-screen label"], widths: [0.3, 0.7], rows: [
            ["new", "New"], ["in_sequence", "In Sequence"], ["opened", "Opened"], ["replied", "Replied"],
            ["pipeline", "Pipeline"]
          ]
        },
        {
          type: "bullets", title: "What trips people up", items: [
            "Company name spelled differently across rows — \"Northwind Robotics\" vs \"Northwind Robotics Inc.\" creates two separate companies instead of grouping contacts.",
            "Typing the on-screen label instead of the exact value — \"Tier 2\" or \"Tier 2 · Mid\" doesn't match; only \"tier2\" does. A mismatch falls back to the default silently, it doesn't error.",
            "Deleting a column instead of leaving it blank — every row needs all the columns. Leave the cell empty but keep the comma.",
            "Wrong type selected in the dropdown — a People file uploaded with \"Companies\" selected reads every contact's name as a company.",
            "Semicolon-delimited export — some regional Excel exports use \";\" instead of \",\". Re-save as a standard comma-delimited CSV before uploading."
          ]
        }
      ];
    }

    document.getElementById("import-example-btn").addEventListener("click", () => {
      const blob = buildPdfBlob("Lincko Outreach Tracker — CSV Import Reference", `Exact column structure — Companies & People · ${formatDateLong(new Date())}`, importReferencePdfSections());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lincko-csv-import-example.pdf";
      a.click();
      URL.revokeObjectURL(url);
    });

    /* ============================================================
       "Download PDF" on Reports/Analytics — a hand-rolled, dependency-free
       PDF writer (no CDN, no vendored library — stays a single self-contained
       file) that reads the already-rendered dashboard DOM and emits real
       application/pdf bytes straight to a download, with no print dialog.
       ============================================================ */
    const PDF_WINANSI_MAP = { 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2026: 0x85, 0x2122: 0x99 };
    function pdfTextBytes(str) {
      str = String(str || "").replace(/→/g, "->").replace(/×/g, "x");
      let out = "";
      for (const ch of str) {
        const cp = ch.codePointAt(0);
        let b;
        if (cp < 0x80) b = cp;
        else if (PDF_WINANSI_MAP[cp] !== undefined) b = PDF_WINANSI_MAP[cp];
        else if (cp >= 0xA0 && cp <= 0xFF) b = cp;
        else b = 0x3F;
        out += String.fromCharCode(b);
      }
      return out;
    }
    function pdfEscape(str) {
      return pdfTextBytes(str).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    }
    function pdfNum(v) { return (Math.round(v * 100) / 100).toString(); }

    /* Reads the currently-rendered #reports-wrap / #analytics-wrap DOM into a
       plain structured array — one entry per visual block — so the PDF layout
       code below never has to duplicate the stats/queries that built the page. */
    function extractDashboardSnapshot(wrap) {
      const sections = [];
      Array.from(wrap.children).forEach(child => {
        if (child.classList.contains("reports-grid")) {
          sections.push({
            type: "stats", cards: Array.from(child.querySelectorAll(".stat-card")).map(card => ({
              label: (card.querySelector(".stat-label") || {}).textContent || "",
              value: (card.querySelector(".stat-value") || {}).textContent || "",
              sub: (card.querySelector(".stat-sub") || {}).textContent || ""
            }))
          });
        } else if (child.classList.contains("report-section")) {
          const title = (child.querySelector("h3") || {}).textContent || "";
          const barRows = Array.from(child.querySelectorAll(".bar-row, .funnel-row"));
          if (barRows.length) {
            sections.push({
              type: "bars", title, rows: barRows.map(row => {
                if (row.classList.contains("funnel-row")) {
                  const fillEl = row.querySelector(".funnel-bar");
                  return {
                    label: (row.querySelector(".bar-label") || {}).textContent || "",
                    value: fillEl ? fillEl.textContent.trim() : "",
                    pct: fillEl ? (parseFloat(fillEl.style.width) || 0) : 0,
                    conv: ""
                  };
                }
                const fillEl = row.querySelector(".bar-fill");
                return {
                  label: ((row.querySelector(".bar-label") || {}).textContent || "").trim(),
                  value: ((row.querySelector(".bar-value") || {}).textContent || "").trim(),
                  pct: fillEl ? (parseFloat(fillEl.style.width) || 0) : 0,
                  conv: ((row.querySelector(".bar-conv") || {}).textContent || "").trim()
                };
              })
            });
          } else {
            const p = child.querySelector("p");
            sections.push({ type: "text", title, text: p ? p.textContent.trim() : "" });
          }
        }
      });
      return sections;
    }

    function wrapPlainText(str, maxChars) {
      const words = String(str || "").split(" ");
      const lines = [];
      let cur = "";
      words.forEach(w => {
        const next = cur ? cur + " " + w : w;
        if (next.length > maxChars) { if (cur) lines.push(cur); cur = w; }
        else cur = next;
      });
      if (cur) lines.push(cur);
      return lines.length ? lines : [""];
    }

    /* Assembles a minimal but valid multi-page PDF (Catalog/Pages/Page/Font/
       Content objects + xref table + trailer) from plain draw calls — Helvetica
       base-14 fonts need no embedding, so the whole file stays tiny and
       dependency-free. */
    function buildPdfBlob(title, subtitle, sections) {
      const PAGE_W = 595, PAGE_H = 842, MARGIN = 50, BOTTOM = 54, CONTENT_W = PAGE_W - MARGIN * 2;
      let y = PAGE_H - MARGIN;
      const pagesOps = [];
      let ops = [];

      function text(x, yy, size, str, bold) {
        if (!str) return;
        /* Always force black fill before drawing — fillRect/fillRectRGB set the
           shared nonstroking color for whatever comes next, and without this
           reset any text drawn after a background fill (e.g. a table header
           band or a striped row) silently inherits that near-white color. */
        ops.push(`0 g BT /${bold ? "F2" : "F1"} ${pdfNum(size)} Tf ${pdfNum(x)} ${pdfNum(yy)} Td (${pdfEscape(str)}) Tj ET`);
      }
      function fillRect(x, yy, w, h, gray) {
        ops.push(`${pdfNum(gray)} g ${pdfNum(x)} ${pdfNum(yy)} ${pdfNum(w)} ${pdfNum(h)} re f`);
      }
      function fillRectRGB(x, yy, w, h, r, g, b) {
        ops.push(`${pdfNum(r)} ${pdfNum(g)} ${pdfNum(b)} rg ${pdfNum(x)} ${pdfNum(yy)} ${pdfNum(w)} ${pdfNum(h)} re f`);
      }
      function strokeRect(x, yy, w, h, gray) {
        ops.push(`${pdfNum(gray)} G 0.75 w ${pdfNum(x)} ${pdfNum(yy)} ${pdfNum(w)} ${pdfNum(h)} re S`);
      }
      function hLine(yy, gray) {
        ops.push(`${pdfNum(gray)} G 0.75 w ${pdfNum(MARGIN)} ${pdfNum(yy)} m ${pdfNum(PAGE_W - MARGIN)} ${pdfNum(yy)} l S`);
      }
      function flushPage() { pagesOps.push(ops.join("\n")); ops = []; }
      function newPage() { flushPage(); y = PAGE_H - MARGIN; }
      function ensureSpace(h) { if (y - h < BOTTOM) newPage(); }

      text(MARGIN, y, 20, title, true); y -= 24;
      text(MARGIN, y, 10.5, subtitle, false); y -= 8;
      hLine(y, 0.7); y -= 26;

      sections.forEach(section => {
        if (section.type === "stats") {
          const cols = 2, gap = 16, colW = (CONTENT_W - gap * (cols - 1)) / cols, rowH = 56;
          section.cards.forEach((card, i) => {
            const col = i % cols;
            if (col === 0) ensureSpace(rowH + 14);
            const x = MARGIN + col * (colW + gap);
            strokeRect(x, y - rowH, colW, rowH, 0.82);
            text(x + 12, y - 19, 8.5, card.label.toUpperCase(), true);
            text(x + 12, y - 38, 17, card.value, true);
            text(x + 12, y - 50, 7.5, wrapPlainText(card.sub, 50)[0], false);
            if (col === cols - 1 || i === section.cards.length - 1) y -= (rowH + 14);
          });
        } else if (section.type === "bars") {
          ensureSpace(28);
          text(MARGIN, y, 13, section.title, true); y -= 20;
          const trackX = MARGIN + 200, trackW = 190;
          section.rows.forEach(row => {
            ensureSpace(17);
            const label = row.label.length > 34 ? row.label.slice(0, 33) + "." : row.label;
            text(MARGIN, y, 9.5, label, false);
            strokeRect(trackX, y - 7, trackW, 9, 0.82);
            const fillW = Math.max(0, Math.min(100, row.pct)) / 100 * trackW;
            if (fillW > 0.5) fillRect(trackX, y - 7, fillW, 9, 0.4);
            text(trackX + trackW + 8, y, 9, row.conv ? `${row.value}  (${row.conv})` : String(row.value), true);
            y -= 16;
          });
          y -= 12;
        } else if (section.type === "text") {
          ensureSpace(30);
          text(MARGIN, y, 13, section.title, true); y -= 17;
          wrapPlainText(section.text, 95).forEach(line => {
            ensureSpace(14);
            text(MARGIN, y, 9.5, line, false);
            y -= 13;
          });
          y -= 10;
        } else if (section.type === "table") {
          ensureSpace(30);
          if (section.title) { text(MARGIN, y, 13, section.title, true); y -= 18; }
          const n = section.columns.length;
          const fontSize = section.fontSize || 8.5;
          const fracs = section.widths || section.columns.map(() => 1 / n);
          const colX = [MARGIN];
          fracs.forEach(f => colX.push(colX[colX.length - 1] + f * CONTENT_W));
          const rowH = 16;
          ensureSpace(rowH + 4);
          fillRectRGB(MARGIN, y - rowH + 4, CONTENT_W, rowH, 0.906, 0.953, 0.925);
          section.columns.forEach((c, i) => text(colX[i] + 6, y - 11, fontSize, c, true));
          y -= rowH;
          hLine(y + 2, 0.8);
          section.rows.forEach((row, ri) => {
            ensureSpace(rowH);
            if (ri % 2 === 1) fillRect(MARGIN, y - rowH + 4, CONTENT_W, rowH, 0.965);
            row.forEach((cell, i) => text(colX[i] + 6, y - 11, fontSize, String(cell == null ? "" : cell), false));
            y -= rowH;
          });
          hLine(y + 4, 0.8);
          y -= 16;
        } else if (section.type === "bullets") {
          ensureSpace(28);
          if (section.title) { text(MARGIN, y, 13, section.title, true); y -= 18; }
          section.items.forEach(item => {
            wrapPlainText(item, 92).forEach((line, li) => {
              ensureSpace(13);
              text(MARGIN + (li === 0 ? 0 : 11), y, 9, (li === 0 ? "•  " : "") + line, false);
              y -= 13;
            });
            y -= 3;
          });
          y -= 8;
        }
      });
      newPage();

      // ---- Serialize objects: fonts, per-page content streams, page dicts, Pages, Catalog ----
      const objects = [];
      function reserve() { objects.push(""); return objects.length; }
      function addObj(content) { objects.push(content); return objects.length; }
      function setObj(num, content) { objects[num - 1] = content; }

      const pagesNum = reserve();
      const fontRegularNum = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      const fontBoldNum = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      const pageNums = pagesOps.map(pageContent => {
        const streamBytes = pageContent;
        const contentNum = addObj(`<< /Length ${streamBytes.length} >>\nstream\n${streamBytes}\nendstream`);
        return addObj(`<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegularNum} 0 R /F2 ${fontBoldNum} 0 R >> >> /Contents ${contentNum} 0 R >>`);
      });
      setObj(pagesNum, `<< /Type /Pages /Kids [${pageNums.map(n => n + " 0 R").join(" ")}] /Count ${pageNums.length} >>`);
      const catalogNum = addObj(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

      let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
      const offsets = [0];
      objects.forEach((content, i) => {
        offsets[i + 1] = out.length;
        out += `${i + 1} 0 obj\n${content}\nendobj\n`;
      });
      const xrefStart = out.length;
      out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (let i = 1; i <= objects.length; i++) { out += String(offsets[i]).padStart(10, "0") + " 00000 n \n"; }
      out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

      const bytes = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
      return new Blob([bytes], { type: "application/pdf" });
    }

    document.getElementById("download-pdf-btn").addEventListener("click", () => {
      const isAnalytics = activeView === "analytics";
      const label = isAnalytics ? "Analytics" : "Reports";
      const wrap = document.getElementById(isAnalytics ? "analytics-wrap" : "reports-wrap");
      const subtitle = `Snapshot — ${formatDateLong(new Date())}`;
      const sections = extractDashboardSnapshot(wrap);
      const blob = buildPdfBlob(`Lincko — ${label}`, subtitle, sections);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lincko-${label.toLowerCase()}-${localDateStr(Date.now())}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });

    /* ============================================================
       PART G.2 — Merge Duplicates (retroactive cleanup)
       Groups existing records by the same name/email keys used by the CSV
       importer and the manual-form duplicate warning (see findDuplicateCompany
       / findDuplicatePerson and buildCompanyImportPlan / buildPeopleImportPlan
       above) — one shared definition of "duplicate" across the whole app.
       Nothing is ever merged automatically: every group requires picking a
       record to keep and an explicit confirm via showConfirm() before anything
       changes.
       ============================================================ */
    function findCompanyDuplicateGroups() {
      const groups = new Map();
      companies.forEach(c => {
        const key = "n:" + c.name.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
      });
      return Array.from(groups.values()).filter(g => g.length > 1);
    }

    function findPeopleDuplicateGroups() {
      const groups = new Map();
      people.forEach(p => {
        const key = p.email ? "e:" + p.email.trim().toLowerCase() : "n:" + p.name.trim().toLowerCase() + "|" + p.companyId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
      });
      return Array.from(groups.values()).filter(g => g.length > 1);
    }

    /* Reassigns everything pointing at the merged-away companies onto the kept
       one, folds in whatever data the kept record was missing, then deletes
       the duplicates. Cadence/sequence progress on the merged-away records is
       intentionally NOT carried over — the confirm dialog says so — since
       there's no sound way to combine two different cadence states. */
    function mergeCompanies(keepId, mergeIds) {
      const keep = companyById(keepId);
      if (!keep) return;
      mergeIds.forEach(id => {
        if (id === keepId) return;
        const dupe = companyById(id);
        if (!dupe) return;

        if (dupe.notes && dupe.notes.trim() && dupe.notes.trim() !== (keep.notes || "").trim()) {
          keep.notes = (keep.notes ? keep.notes.trim() + "\n\n" : "") + `[Merged from "${dupe.name}"]\n` + dupe.notes.trim();
        }

        people.forEach(p => { if (p.companyId === dupe.id) p.companyId = keep.id; });
        deals.forEach(d => { if (d.companyId === dupe.id) d.companyId = keep.id; });

        if (Array.isArray(dupe.activity) && dupe.activity.length) {
          keep.activity = (keep.activity || []).concat(dupe.activity);
        }
        logActivity(keep, `Merged duplicate company "${dupe.name}" into this record`);
        companies = companies.filter(c => c.id !== dupe.id);
        queueDelete("companies", dupe.id);
      });

      keep.activity = (keep.activity || []).sort((a, b) => b.ts - a.ts).slice(0, 50);
      const primaries = peopleAt(keep.id).filter(p => p.isPrimary);
      if (primaries.length > 1) primaries.slice(1).forEach(p => p.isPrimary = false);

      syncDealForCompany(keep);
      saveCompanies();
      savePeople();
      saveDeals();
    }

    function mergePeople(keepId, mergeIds) {
      const keep = people.find(p => p.id === keepId);
      if (!keep) return;
      const keepCo = companyById(keep.companyId);
      mergeIds.forEach(id => {
        if (id === keepId) return;
        const dupe = people.find(p => p.id === id);
        if (!dupe) return;

        ["jobTitle", "linkedin", "email", "phone"].forEach(field => {
          if (!keep[field] && dupe[field]) keep[field] = dupe[field];
        });
        if (dupe.isPrimary && !keep.isPrimary && dupe.companyId === keep.companyId) keep.isPrimary = true;

        const dupeCo = companyById(dupe.companyId);
        if (dupeCo) logActivity(dupeCo, `Merged duplicate contact "${dupe.name}" into "${keep.name}"`);
        else if (keepCo) logActivity(keepCo, `Merged duplicate contact "${dupe.name}" into "${keep.name}"`);

        people = people.filter(p => p.id !== dupe.id);
        queueDelete("people", dupe.id);
      });
      savePeople();
      if (keepCo) saveCompanies();
    }

    const mergeOverlay = document.getElementById("merge-overlay");
    const MERGE_HINTS = {
      companies: "Finds companies that share the same Company name. Nothing merges until you pick which record to keep and confirm.",
      people: "Finds contacts that share the same Email (or Name + Company when there's no email). Nothing merges until you pick which record to keep and confirm."
    };

    function companyMergeMeta(c) {
      const tier = optionByValue(TIER_OPTIONS, c.tier).label;
      const status = optionByValue(STATUS_OPTIONS, c.status).label;
      const contactCount = peopleAt(c.id).length;
      return `${tier} · ${status} · ${contactCount} contact${contactCount === 1 ? "" : "s"} · created ${relativeTime(c.createdAt)}`;
    }
    function personMergeMeta(p) {
      const co = companyById(p.companyId);
      return `${co ? co.name : "no company"} · ${p.jobTitle || "no title"} · ${p.email || "no email"}`;
    }

    function renderMergeResults() {
      const type = document.getElementById("merge-type-select").value;
      document.getElementById("merge-hint").textContent = MERGE_HINTS[type];
      const wrap = document.getElementById("merge-results");
      const groups = type === "companies" ? findCompanyDuplicateGroups() : findPeopleDuplicateGroups();

      if (!groups.length) {
        wrap.innerHTML = `<div class="merge-empty">No duplicate ${type} found. You're clean.</div>`;
        return;
      }

      const list = document.createElement("div");
      list.className = "merge-results-list";
      groups.forEach((group, gi) => {
        const card = document.createElement("div");
        card.className = "merge-group";
        card.dataset.groupIndex = gi;
        card.dataset.type = type;

        const headLabel = type === "companies"
          ? group[0].name
          : (group[0].email || group[0].name);
        card.innerHTML = `
        <div class="merge-group-head">Group of ${group.length} · matched on "${headLabel}"</div>
        <div class="merge-group-records">
          ${group.map((rec, ri) => `
            <label class="merge-record${ri === 0 ? " selected" : ""}">
              <input type="radio" name="merge-group-${gi}" value="${rec.id}" ${ri === 0 ? "checked" : ""}>
              <div>
                <span class="merge-record-name">${type === "companies" ? rec.name : rec.name}</span>
                <span class="merge-record-meta">${type === "companies" ? companyMergeMeta(rec) : personMergeMeta(rec)}</span>
              </div>
            </label>`).join("")}
        </div>
        <div class="merge-group-actions">
          <button type="button" class="btn btn-primary merge-btn" data-group="${gi}">Merge Selected</button>
        </div>`;
        list.appendChild(card);
      });
      wrap.innerHTML = "";
      wrap.appendChild(list);

      let currentGroups = groups;

      wrap.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener("change", () => {
          radio.closest(".merge-group").querySelectorAll(".merge-record").forEach(r => r.classList.remove("selected"));
          radio.closest(".merge-record").classList.add("selected");
        });
      });

      wrap.querySelectorAll(".merge-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const gi = Number(btn.dataset.group);
          const group = currentGroups[gi];
          const checked = wrap.querySelector(`input[name="merge-group-${gi}"]:checked`);
          if (!group || !checked) return;
          const keepId = checked.value;
          const keepRec = group.find(r => r.id === keepId);
          const others = group.filter(r => r.id !== keepId);
          const detail = [
            `Keeps: "${keepRec.name}"`,
            `Deletes: ${others.map(r => `"${r.name}"`).join(", ")}`,
            "Their contacts, deals, and activity history move onto the kept record first."
          ];
          if (type === "companies") detail.push("Sequence/cadence progress on the deleted record(s) is not carried over.");
          const ok = await showConfirm({
            title: `Merge ${others.length === 1 ? "this duplicate" : "these duplicates"} into "${keepRec.name}"?`,
            message: "This cannot be undone.",
            detail,
            confirmLabel: "Merge & Delete Duplicates"
          });
          if (!ok) return;

          if (type === "companies") mergeCompanies(keepId, others.map(r => r.id));
          else mergePeople(keepId, others.map(r => r.id));

          renderCurrentView();
          renderMergeResults();
        });
      });
    }

    function openMergeModal() {
      renderMergeResults();
      mergeOverlay.classList.add("open");
      document.body.classList.add("modal-lock");
    }
    function closeMergeModal() {
      mergeOverlay.classList.remove("open");
      document.body.classList.remove("modal-lock");
    }

    document.getElementById("find-duplicates-btn").addEventListener("click", openMergeModal);
    document.getElementById("merge-modal-close").addEventListener("click", closeMergeModal);
    document.getElementById("merge-close-btn").addEventListener("click", closeMergeModal);
    mergeOverlay.addEventListener("click", e => { if (e.target === mergeOverlay) closeMergeModal(); });
    document.getElementById("merge-type-select").addEventListener("change", renderMergeResults);
