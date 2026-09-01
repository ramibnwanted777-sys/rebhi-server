const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'rebhi-data.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const initial = {
  seq: { users: 1, transactions: 1, withdrawals: 1, audit_log: 1, contentfilter_rules: 6 },
  users: [],
  transactions: [],
  withdrawals: [],
  audit_log: [],
  contentfilter_rules: [
    { id: 1, pattern: 'قمار', category: 'gambling', date: Date.now() },
    { id: 2, pattern: 'كازينو', category: 'gambling', date: Date.now() },
    { id: 3, pattern: 'رهان', category: 'gambling', date: Date.now() },
    { id: 4, pattern: 'بورنو', category: 'adult', date: Date.now() },
    { id: 5, pattern: 'جنس', category: 'adult', date: Date.now() },
    { id: 6, pattern: 'محتوى للكبار', category: 'adult', date: Date.now() }
  ]
};

function load() {
  try {
    if (fs.existsSync(dataFile)) {
      const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      for (const key of Object.keys(initial)) {
        raw[key] = raw[key] ?? initial[key];
      }
      return raw;
    }
  } catch (e) { /* ignore */ }
  return JSON.parse(JSON.stringify(initial));
}

let data = load();

let saveTimer = null;
function persist(immediate) {
  if (immediate) { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); return; }
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('persist error', e); }
  }, 50);
}

function nextId(collection) {
  const id = data.seq[collection]++;
  persist();
  return id;
}

module.exports = {
  data,
  persist,
  nextId,
  dataFile
};
