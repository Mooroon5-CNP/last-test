const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DATA_DIR = process.env.DATA_DIR || '/tmp';
const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(DATA_DIR, 'slaps.db');
const MEMBERS = ['Maia', 'Nazim', 'Basil', 'Tieoulé', 'Gabriel', 'Thomas'];

let db;

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function buildApp() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run('CREATE TABLE IF NOT EXISTS slaps (name TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
  for (const name of MEMBERS) {
    db.run('INSERT OR IGNORE INTO slaps VALUES (?, 0)', [name]);
  }
  saveDB();

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready',   (_req, res) => res.json({ status: 'ready' }));

  app.get('/api/slaps', (_req, res) => {
    const result = db.exec('SELECT name, count FROM slaps');
    if (!result.length) return res.json([]);
    const [{ columns, values }] = result;
    res.json(values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
  });

  app.post('/api/slap/:name', (req, res) => {
    const { name } = req.params;
    if (!MEMBERS.includes(name)) return res.status(400).json({ error: 'Unknown member' });

    db.run('UPDATE slaps SET count = count + 1 WHERE name = ?', [name]);
    saveDB();

    const stmt = db.prepare('SELECT count FROM slaps WHERE name = ?');
    stmt.bind([name]);
    stmt.step();
    const { count } = stmt.getAsObject();
    stmt.free();

    res.json({ name, count });
  });

  return app;
}

module.exports = buildApp;

if (require.main === module) {
  buildApp().then(app => app.listen(PORT, () => console.log(`Listening on :${PORT}`)));
}
