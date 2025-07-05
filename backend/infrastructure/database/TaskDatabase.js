/**
 * TaskDatabase - SQLite database wrapper for task management
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class TaskDatabase {
    constructor(dbPath = ':memory:') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                this.createTables()
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    async createTables() {
        const createTasksTable = `
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                projectId TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                createdBy TEXT NOT NULL,
                assignedTo TEXT,
                metadata TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                completedAt TEXT,
                estimatedHours REAL,
                actualHours REAL,
                tags TEXT
            )
        `;

        const createTaskDependenciesTable = `
            CREATE TABLE IF NOT EXISTS task_dependencies (
                id TEXT PRIMARY KEY,
                taskId TEXT NOT NULL,
                dependencyId TEXT NOT NULL,
                type TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (taskId) REFERENCES tasks (id),
                FOREIGN KEY (dependencyId) REFERENCES tasks (id)
            )
        `;

        const createTaskHistoryTable = `
            CREATE TABLE IF NOT EXISTS task_history (
                id TEXT PRIMARY KEY,
                taskId TEXT NOT NULL,
                action TEXT NOT NULL,
                oldValue TEXT,
                newValue TEXT,
                changedBy TEXT NOT NULL,
                changedAt TEXT NOT NULL,
                FOREIGN KEY (taskId) REFERENCES tasks (id)
            )
        `;

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(createTasksTable, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    this.db.run(createTaskDependenciesTable, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        this.db.run(createTaskHistoryTable, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            resolve();
                        });
                    });
                });
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    async clear() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('DELETE FROM task_history', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    this.db.run('DELETE FROM task_dependencies', (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        this.db.run('DELETE FROM tasks', (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                });
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

module.exports = TaskDatabase; 