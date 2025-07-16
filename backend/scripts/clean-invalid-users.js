
require('module-alias/register');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

// Use the same database path as the application
const dbPath = path.join(__dirname, '../database/pidea-dev.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('❌ Fehler beim Öffnen der Datenbank:', err.message);
    process.exit(1);
  }
});

db.run("DELETE FROM users", function (err) {
  if (err) {
    logger.error('❌ Fehler beim Löschen:', err.message);
  } else {
    logger.info(`🗑️  Alle User gelöscht (${this.changes} Einträge entfernt).`);
  }
  db.close();
}); 