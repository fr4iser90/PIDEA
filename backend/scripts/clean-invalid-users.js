require('module-alias/register');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the same database path as the application
const dbPath = path.join(__dirname, '../database/PIDEA-dev.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Fehler beim Öffnen der Datenbank:', err.message);
    process.exit(1);
  }
});

db.run("DELETE FROM users", function (err) {
  if (err) {
    console.error('❌ Fehler beim Löschen:', err.message);
  } else {
    console.log(`🗑️  Alle User gelöscht (${this.changes} Einträge entfernt).`);
  }
  db.close();
}); 