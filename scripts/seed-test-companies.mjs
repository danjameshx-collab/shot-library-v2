// Seeds 10 [TEST] companies (+ contacts) into the Outreach Tracker's Firestore.
// Usage: node seed-test-companies.mjs          -> write
//        node seed-test-companies.mjs --delete -> remove them again
const PROJECT = "script-database-655e8";
const KEY = "AIzaSyAhtqAa9uC7hTiAv4-G56VxvUfKTX9OiAo";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/cineVlogs`;
const KINDS = { companies: "crmCompany", people: "crmPerson" };
const docId = (coll, id) => `crm-${coll}-${id}`;

const ts = (dateStr, hour = 12) => new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00`).getTime();
const addDays = (dateStr, n) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const daysAgo = n => addDays(TODAY, -n);

function company(n, name, domain, tier, status, startDay, notes) {
  return {
    id: `test-co-${String(n).padStart(2, "0")}`, name: `[TEST] ${name}`, domain, tier, status, startDay,
    cadenceChecks: [], lastInteraction: ts(startDay || daysAgo(2)), createdAt: ts(startDay ? addDays(startDay, -2) : daysAgo(3)),
    notes, seenState: {}, manualStepsDone: {}, manualStepsCompletedAt: {}, repliedTouches: {}, preRepliedStatus: null,
    followUpLog: [], meetingLog: [], nextMeetingDate: "", manualStepHandledFor: null, bookedViaMechanism: null,
    superLoomPosted: false, superLoomChannel: "email",
    activity: [{ ts: Date.now(), text: "Test company seeded" }]
  };
}
const done = (c, id, dateStr) => { c.manualStepsDone[id] = true; c.manualStepsCompletedAt[id] = dateStr; };
const seen = (c, sendId, dateStr) => { c.seenState[sendId] = { seen: true, ts: ts(dateStr, 10) }; c.lastInteraction = Math.max(c.lastInteraction, ts(dateStr, 10)); };

const companies = [];
const people = [];
let pn = 0;
const person = (co, name, jobTitle, isPrimary, linkedin = "") => people.push({
  id: `test-pe-${String(++pn).padStart(2, "0")}`, companyId: co.id, name, jobTitle,
  email: `${name.split(" ")[0].toLowerCase()}@${co.domain}`, phone: `+1 555 01${String(pn).padStart(2, "0")}`,
  linkedin, isPrimary
});

// ---- Not started (no start date) ----
let c = company(1, "Halcyon Aerospace", "halcyonaero.test", "tier1", "new", "", "Not started — Tier 1 whale, researching for the Super Loom.");
person(c, "Imogen Hart", "Chief Marketing Officer", true, "linkedin.com/in/imogenhart-test");
person(c, "Felix Moreau", "Head of Brand", false);
companies.push(c);

c = company(2, "Bramble & Oak Interiors", "brambleoak.test", "tier2", "new", "", "Not started — Tier 2.");
person(c, "Ruth Akintola", "Founder", true);
companies.push(c);

c = company(3, "Quayside Coffee Co", "quaysidecoffee.test", "tier2", "new", "", "Not started — Tier 2, two contacts.");
person(c, "Tom Brennan", "Co-Founder", true, "linkedin.com/in/tombrennan-test");
person(c, "Aisha Malik", "Marketing Lead", false);
companies.push(c);

// ---- Started ----
// 4. Tier 2, starts today: Strategy Doc send is due today (row flags red).
c = company(4, "Lumen Dental Group", "lumendental.test", "tier2", "in_sequence", TODAY, "Starts today — Strategy Doc send is due.");
person(c, "Dr. Sam Okoye", "Practice Owner", true);
person(c, "Clara Benson", "Operations Manager", false);
companies.push(c);

// 5. Tier 1, 9 days in: Super Loom sent, working through its email follow-ups.
c = company(5, "Northfield Capital", "northfieldcap.test", "tier1", "in_sequence", daysAgo(9), "Super Loom sent, no open yet. Following up.");
done(c, "t1-super-loom", c.startDay);
person(c, "Victoria Lane", "Managing Partner", true, "linkedin.com/in/victorialane-test");
person(c, "Marcus Feld", "Partner", false);
person(c, "Jess Ito", "Executive Assistant", false);
companies.push(c);

// 6. Tier 2, 21 days in: VSL Loom was seen 2 days ago, Instant Reply still not sent (overdue, sequence frozen).
c = company(6, "Saltmarsh Studios", "saltmarsh.test", "tier2", "opened", daysAgo(21), "Watched the VSL Loom — Instant Reply overdue.");
done(c, "t2-strategy-doc", c.startDay);
done(c, "t2-vsl-loom", addDays(c.startDay, 18));
seen(c, "t2-vsl-loom", daysAgo(2));
person(c, "Noel Vance", "Creative Director", true);
companies.push(c);

// 7. Tier 1, 15 days in: Super Loom seen and Instant Reply handled; Strategy Doc coming up.
c = company(7, "Arden Hotels", "ardenhotels.test", "tier1", "opened", daysAgo(15), "Watched the Super Loom twice. Instant Reply sent same day.");
done(c, "t1-super-loom", c.startDay);
seen(c, "t1-super-loom", addDays(c.startDay, 2));
done(c, "t1-super-loom-branch-op-1", addDays(c.startDay, 2));
c.manualStepHandledFor = "Super Loom";
person(c, "Priya Desai", "VP Marketing", true, "linkedin.com/in/priyadesai-test");
person(c, "Owen Clarke", "Brand Manager", false);
companies.push(c);

// 8. Tier 2, 40 days in: on the Cold Call — first dial logged, Call Attempt 2 overdue.
c = company(8, "Ironbridge Fitness", "ironbridgefit.test", "tier2", "in_sequence", daysAgo(40), "Cold Call stage. First dial: voicemail. Attempt 2 overdue.");
done(c, "t2-strategy-doc", c.startDay);
done(c, "t2-vsl-loom", addDays(c.startDay, 18));
done(c, "t2-cold-call", addDays(c.startDay, 36));
c.followUpLog.push({ id: "fu_test08a", type: "followup", method: "Cold Call", date: addDays(c.startDay, 36), notes: "• Voicemail left\n• Mentioned the VSL Loom" });
person(c, "Danny Rourke", "Owner", true);
person(c, "Leah Grant", "Studio Manager", false);
companies.push(c);

// 9. Tier 1, 30 days in: Strategy Doc seen, prospect replied asking for pricing.
c = company(9, "Meridian Wealth", "meridianwealth.test", "tier1", "replied", daysAgo(30), "Replied to the Strategy Doc asking about pricing and timeline.");
done(c, "t1-super-loom", c.startDay);
done(c, "t1-strategy-doc", addDays(c.startDay, 18));
seen(c, "t1-strategy-doc", addDays(c.startDay, 20));
done(c, "t1-strategy-doc-branch-op-1", addDays(c.startDay, 20));
c.manualStepHandledFor = "Strategy Doc";
c.repliedTouches["t1-strategy-doc"] = true;
c.preRepliedStatus = "opened";
c.followUpLog.push({ id: "fu_test09a", type: "response", method: "Email", date: daysAgo(2), notes: "• Loved the doc\n• Asked for pricing and a rough timeline" });
c.lastInteraction = ts(daysAgo(2), 15);
person(c, "Helena Shaw", "CEO", true, "linkedin.com/in/helenashaw-test");
person(c, "George Patel", "Head of Growth", false);
companies.push(c);

// 10. Tier 2, 25 days in: Pipeline — discovery call held, second call booked next week.
c = company(10, "Copperline Logistics", "copperline.test", "tier2", "pipeline", daysAgo(25), "Pipeline. Discovery call went well, follow-up call booked.");
done(c, "t2-strategy-doc", c.startDay);
seen(c, "t2-strategy-doc", addDays(c.startDay, 2));
done(c, "t2-strategy-doc-branch-op-1", addDays(c.startDay, 2));
done(c, "t2-vsl-loom", addDays(c.startDay, 18));
c.manualStepHandledFor = "Strategy Doc";
c.repliedTouches["t2-strategy-doc"] = true;
c.bookedViaMechanism = "t2-strategy-doc";
c.meetingLog.push({ id: "mtg_test10a", date: daysAgo(7), notes: "• Discovery call\n• Budget confirmed, wants a proposal" });
c.nextMeetingDate = addDays(TODAY, 6);
c.followUpLog.push({ id: "fu_test10a", type: "response", method: "Email", date: addDays(c.startDay, 4), notes: "• Replied asking to chat" });
c.lastInteraction = ts(daysAgo(7), 16);
person(c, "Martin Kowalski", "COO", true);
person(c, "Sophie Reed", "Head of Ops", false);
companies.push(c);

const field = r => ({ fields: { kind: { stringValue: r.kind }, json: { stringValue: JSON.stringify(r.rec) }, updatedAt: { integerValue: String(Date.now()) } } });
const all = [
  ...companies.map(rec => ({ coll: "companies", kind: KINDS.companies, rec })),
  ...people.map(rec => ({ coll: "people", kind: KINDS.people, rec }))
];

const del = process.argv.includes("--delete");
for (const r of all) {
  const url = `${BASE}/${encodeURIComponent(docId(r.coll, r.rec.id))}?key=${KEY}`;
  const res = await fetch(url, del ? { method: "DELETE" } : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(field(r)) });
  if (!res.ok) { console.error(r.rec.id, res.status, await res.text()); process.exit(1); }
}
console.log(`${del ? "Deleted" : "Wrote"} ${companies.length} companies and ${people.length} people.`);
