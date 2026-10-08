// Close <-> Daily Tasks sync (replaces the Notion Power List automations). Every run:
//   1. pulls your open Close tasks that are due (today or late) onto the Power List in the Operating System (the kind
//      'dailyTasks' doc in Firestore). Each Close task is pulled in once: closeSynced remembers it, so a task due later
//      shows up on its due day, and ticking it Done or deleting it in the app keeps it gone.
//   2. marks Close tasks complete once you tick them Done (or delete them from the Backlog) in the app: the app lists
//      them in closeDone, and closeCompleted records the ones already completed here.
//   3. adds the RECURRING tasks below on their days (recurringAdded records each one added). This part runs even
//      without a Close key.
// Run by hand with `node sync.mjs` (add --dry-run to only print what it would do), or every 5 minutes by Windows Task
// Scheduler (see install-schedule.ps1).
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');

// .env: KEY=value lines, # comments. Reads close-sync/.env and every .env above it (the Lincko root one holds CLOSE_KEY);
// the nearest one wins.
const env = {};
for(let dir = HERE; ; dir = dirname(dir)){
  try{
    for(const line of readFileSync(join(dir, '.env'), 'utf8').split(/\r?\n/)){
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if(m && !(m[1] in env)) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }catch(e){}
  if(dirname(dir) === dir) break;
}

const CLOSE_KEY = env.CLOSE_API_KEY || env.CLOSE_KEY;
const LOOKAHEAD = parseInt(env.LOOKAHEAD_DAYS || '0', 10) || 0;    // 0 = due today or late; 1 = also tomorrow, ...
const ALL_USERS = /^(1|true|yes)$/i.test(env.CLOSE_ALL_USERS || ''); // default: only tasks assigned to you
const FB_KEY = env.FIREBASE_API_KEY || 'AIzaSyAhtqAa9uC7hTiAv4-G56VxvUfKTX9OiAo';
const FB_PROJECT = env.FIREBASE_PROJECT_ID || 'script-database-655e8';
const COLLECTION = 'cineVlogs', KIND = 'dailyTasks';
const FS = 'https://firestore.googleapis.com/v1/projects/' + FB_PROJECT + '/databases/(default)/documents';

// Added to the Power List on these days of the month (days) or of the week (weekdays, 0 = Sunday), due `dueIn` days
// later. If the PC was off on the day, it is added on the next run (marked late once the due date has passed).
const RECURRING = [
  { name: 'Review Sales Calls', days: [5, 15], dueIn: 3 },
  { name: 'Fill in the weekly call log tracker', weekdays: [0], dueIn: 0 },
];

function log(msg){
  const line = new Date().toISOString() + '  ' + (DRY ? '[dry run] ' : '') + msg;
  console.log(line);
  if(!DRY) try{ appendFileSync(join(HERE, 'sync.log'), line + '\n'); }catch(e){}
}
const ymd = (d)=> d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/* ---------- Close ---------- */
async function close(path, method = 'GET', body){
  const res = await fetch('https://api.close.com/api/v1/' + path, {
    method,
    headers: { Authorization: 'Basic ' + Buffer.from(CLOSE_KEY + ':').toString('base64'), Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30000),   // a hung request must not stall the run (the scheduler skips runs while one is going)
  });
  if(!res.ok){ const err = new Error('Close ' + res.status + ' on ' + path.split('?')[0] + ': ' + (await res.text()).slice(0, 300)); err.status = res.status; throw err; }
  return res.json();
}
// A Close task's date is either a day ('2026-10-08') or a moment ('2026-10-08T14:00:00+00:00'): use your local day.
const closeDay = (date)=> !date ? '' : date.length <= 10 ? date : ymd(new Date(date));

async function closeDueTasks(){
  const until = new Date();
  until.setDate(until.getDate() + LOOKAHEAD);
  const last = ymd(until);
  let filter = 'is_complete=false&_type=lead';
  if(!ALL_USERS) filter += '&assigned_to=' + encodeURIComponent((await close('me/')).id);
  const out = [];
  for(let skip = 0; ; skip += 100){
    const page = await close('task/?' + filter + '&_limit=100&_skip=' + skip);
    out.push(...page.data);
    if(!page.has_more || !page.data.length) break;
  }
  return out.filter(t=> !t.date || closeDay(t.date) <= last);   // a task with no date shows straight away
}
// Already complete or deleted in Close counts as done too.
async function completeInClose(id){
  try{ await close('task/' + id + '/', 'PUT', { is_complete: true }); return 'completed'; }
  catch(e){ if(e.status === 404) return 'already gone'; throw e; }
}

/* ---------- Firestore (REST, same open access the app uses) ---------- */
function toFs(v){
  if(v === null || v === undefined) return { nullValue: null };
  if(Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if(typeof v === 'boolean') return { booleanValue: v };
  if(typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if(typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x])=> [k, toFs(x)])) } };
  return { stringValue: String(v) };
}
function fromFs(v){
  if('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs);
  if('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x])=> [k, fromFs(x)]));
  if('integerValue' in v) return Number(v.integerValue);
  if('doubleValue' in v) return v.doubleValue;
  if('booleanValue' in v) return v.booleanValue;
  if('nullValue' in v) return null;
  return v.stringValue ?? v.timestampValue ?? null;
}
async function fs(path, body){
  const res = await fetch(FS + path + '?key=' + FB_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if(!res.ok){ const err = new Error('Firestore ' + res.status + ': ' + (await res.text()).slice(0, 300)); err.status = res.status; throw err; }
  return res.json();
}
async function loadTasksDoc(){
  const rows = await fs(':runQuery', { structuredQuery: {
    from: [{ collectionId: COLLECTION }],
    where: { fieldFilter: { field: { fieldPath: 'kind' }, op: 'EQUAL', value: { stringValue: KIND } } },
    limit: 1,
  } });
  const d = rows.find(r=> r.document);
  if(!d) throw new Error('No Daily Tasks doc yet: open the Daily Tasks page in the app once, then run this again.');
  const f = Object.fromEntries(Object.entries(d.document.fields || {}).map(([k, v])=> [k, fromFs(v)]));
  return { name: d.document.name, updateTime: d.document.updateTime, power: f.power || [], backlog: f.backlog || [],
    closeSynced: f.closeSynced || [], closeDone: f.closeDone || [], closeCompleted: f.closeCompleted || [], recurringAdded: f.recurringAdded };
}

/* ---------- recurring ---------- */
// The most recent scheduled day on or before today.
function latestOccurrence(t, today){
  for(let back = 0; back < 62; back++){
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    if((t.days || []).includes(d.getDate()) || (t.weekdays || []).includes(d.getDay())) return d;
  }
  return null;
}
// Each task's latest occurrence: { key:'Review Sales Calls|2026-10-05', name, due }.
function recurringDue(){
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return RECURRING.map(t=>{
    const start = latestOccurrence(t, today);
    if(!start) return null;
    const due = new Date(start.getFullYear(), start.getMonth(), start.getDate() + t.dueIn);
    return { key: t.name + '|' + ymd(start), name: t.name, due: ymd(due) };
  }).filter(Boolean);
}

/* ---------- sync ---------- */
const newId = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function main(){
  const hasClose = CLOSE_KEY && !CLOSE_KEY.startsWith('paste');
  if(!hasClose) log('No CLOSE_KEY in the .env yet: skipping Close, adding recurring tasks only.');
  const due = hasClose ? await closeDueTasks() : [];
  // The app can save the doc at any moment, so write only if it has not changed since we read it; retry if it has.
  for(let attempt = 1; ; attempt++){
    const docu = await loadTasksDoc();
    const msgs = [];

    // 1. Close tasks now due
    const seen = new Set(docu.closeSynced);
    const fresh = due.filter(t=> !seen.has(t.id));
    const add = fresh.map(t=> ({
      id: newId(),
      name: (t.text || 'Close task').trim() + (t.lead_name ? ' (' + t.lead_name + ')' : ''),
      due: closeDay(t.date),
      closeId: t.id,
      closeUrl: t.lead_id ? 'https://app.close.com/lead/' + t.lead_id + '/' : 'https://app.close.com/',
    }));
    add.forEach(a=> msgs.push('Added from Close: ' + a.name + ' (due ' + (a.due || 'no date') + ')'));

    // 2. ticked Done in the app: complete in Close
    const completed = new Set(docu.closeCompleted);
    const finished = [];
    for(const id of hasClose ? docu.closeDone.filter(id=> !completed.has(id)) : []){
      if(DRY){ msgs.push('Would complete ' + id + ' in Close (done in the app)'); continue; }
      try{ msgs.push((await completeInClose(id)) === 'completed' ? 'Completed ' + id + ' in Close (done in the app)' : 'Skipped ' + id + ': already gone in Close'); finished.push(id); }
      catch(e){ log('Could not complete ' + id + ' in Close, will retry next run: ' + e.message); }
    }

    // 3. recurring tasks. The first run (no recurringAdded yet) counts an occurrence already on the list by name as
    // added, so the one the Notion script made does not appear twice.
    const listed = new Set([...docu.power, ...docu.backlog].map(x=> x.name.toLowerCase()));
    let recAdded = docu.recurringAdded;
    const recNew = [];
    for(const r of recurringDue()){
      if(recAdded ? recAdded.includes(r.key) : listed.has(r.name.toLowerCase())){ if(!recAdded) recNew.push(r.key); continue; }
      recNew.push(r.key);
      add.push({ id: newId(), name: r.name, due: r.due });
      msgs.push('Added recurring: ' + r.name + ' (due ' + r.due + ')');
    }
    recAdded = [...(recAdded || []), ...recNew];

    const dirty = add.length || finished.length || !docu.recurringAdded || recNew.length;
    if(!dirty || DRY){
      msgs.forEach(log);
      if(!msgs.length) log('Up to date: ' + due.length + ' due Close task(s), none new; nothing to complete.');
      return;
    }
    try{
      await fs(':commit', { writes: [{
        update: { name: docu.name, fields: {
          power: toFs([...docu.power, ...add]),
          closeSynced: toFs([...docu.closeSynced, ...fresh.map(t=> t.id)]),
          closeCompleted: toFs([...docu.closeCompleted, ...finished]),
          recurringAdded: toFs(recAdded),
          updatedAt: toFs(Date.now()),
        } },
        updateMask: { fieldPaths: ['power', 'closeSynced', 'closeCompleted', 'recurringAdded', 'updatedAt'] },
        currentDocument: { updateTime: docu.updateTime },
      }] });
      msgs.forEach(log);
      if(!msgs.length) log('Up to date.');
      return;
    }catch(e){
      if(attempt >= 3 || ![400, 409, 412].includes(e.status)) throw e;   // the doc changed under us: read again
    }
  }
}

main().catch(e=>{ log('Sync failed: ' + e.message); process.exitCode = 1; });
