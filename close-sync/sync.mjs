// Close -> Daily Tasks sync. Pulls your open Close tasks that are due (today or late) onto the Power List in the
// Operating System (the kind 'dailyTasks' doc in Firestore). Each Close task is pulled in once: closeSynced remembers it,
// so ticking it Done or deleting it in the app keeps it gone. Run by hand with `node sync.mjs` (add --dry-run to only
// print what it would add), or every 15 minutes by Windows Task Scheduler (see install-schedule.ps1).
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');

// .env: KEY=value lines, # comments
const env = {};
try{
  for(const line of readFileSync(join(HERE, '.env'), 'utf8').split(/\r?\n/)){
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if(m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}catch(e){}

const CLOSE_KEY = env.CLOSE_API_KEY;
const LOOKAHEAD = parseInt(env.LOOKAHEAD_DAYS || '0', 10) || 0;    // 0 = due today or late; 1 = also tomorrow, ...
const ALL_USERS = /^(1|true|yes)$/i.test(env.CLOSE_ALL_USERS || ''); // default: only tasks assigned to you
const FB_KEY = env.FIREBASE_API_KEY || 'AIzaSyAhtqAa9uC7hTiAv4-G56VxvUfKTX9OiAo';
const FB_PROJECT = env.FIREBASE_PROJECT_ID || 'script-database-655e8';
const COLLECTION = 'cineVlogs', KIND = 'dailyTasks';
const FS = 'https://firestore.googleapis.com/v1/projects/' + FB_PROJECT + '/databases/(default)/documents';

function log(msg){
  const line = new Date().toISOString() + '  ' + msg;
  console.log(line);
  try{ appendFileSync(join(HERE, 'sync.log'), line + '\n'); }catch(e){}
}
const ymd = (d)=> d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/* ---------- Close ---------- */
async function close(path){
  const res = await fetch('https://api.close.com/api/v1/' + path, {
    headers: { Authorization: 'Basic ' + Buffer.from(CLOSE_KEY + ':').toString('base64'), Accept: 'application/json' },
  });
  if(!res.ok) throw new Error('Close ' + res.status + ' on ' + path.split('?')[0] + ': ' + (await res.text()).slice(0, 300));
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
  return out.filter(t=> t.date && closeDay(t.date) <= last);
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
  const res = await fetch(FS + path + '?key=' + FB_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
  return { name: d.document.name, updateTime: d.document.updateTime, power: f.power || [], closeSynced: f.closeSynced || [] };
}

/* ---------- sync ---------- */
const newId = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function main(){
  if(!CLOSE_KEY || CLOSE_KEY.startsWith('paste')){ log('No CLOSE_API_KEY in close-sync/.env yet, nothing to do.'); return; }
  const due = await closeDueTasks();
  // The app can save the doc at any moment, so write only if it has not changed since we read it; retry if it has.
  for(let attempt = 1; ; attempt++){
    const docu = await loadTasksDoc();
    const seen = new Set(docu.closeSynced);
    const fresh = due.filter(t=> !seen.has(t.id));
    if(!fresh.length){ log('Up to date: ' + due.length + ' due Close task(s), none new.'); return; }
    const add = fresh.map(t=> ({
      id: newId(),
      name: (t.text || 'Close task').trim() + (t.lead_name ? ' (' + t.lead_name + ')' : ''),
      due: closeDay(t.date),
      closeId: t.id,
      closeUrl: t.lead_id ? 'https://app.close.com/lead/' + t.lead_id + '/' : 'https://app.close.com/',
    }));
    if(DRY){ add.forEach(a=> log('[dry run] would add: ' + a.name + ' (due ' + a.due + ')')); return; }
    try{
      await fs(':commit', { writes: [{
        update: { name: docu.name, fields: {
          power: toFs([...docu.power, ...add]),
          closeSynced: toFs([...docu.closeSynced, ...fresh.map(t=> t.id)]),
          updatedAt: toFs(Date.now()),
        } },
        updateMask: { fieldPaths: ['power', 'closeSynced', 'updatedAt'] },
        currentDocument: { updateTime: docu.updateTime },
      }] });
      add.forEach(a=> log('Added: ' + a.name + ' (due ' + a.due + ')'));
      return;
    }catch(e){
      if(attempt >= 3 || ![400, 409, 412].includes(e.status)) throw e;   // the doc changed under us: read again
    }
  }
}

main().catch(e=>{ log('Sync failed: ' + e.message); process.exitCode = 1; });
