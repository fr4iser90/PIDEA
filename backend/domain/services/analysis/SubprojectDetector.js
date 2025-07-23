const fs = require('fs').promises;
const path = require('path');

class SubprojectDetector {
    constructor() {}

    async detectSubprojects(rootPath) {
        const subprojects = [];
        await this._search(rootPath, subprojects);
        return subprojects;
    }

    async _search(dir, subprojects) {
        let items;
        try {
            items = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        let isProject = false;
        let type = null;
        let meta = {};
        for (const item of items) {
            if (!item.isFile()) continue;
            if (item.name === 'package.json') {
                isProject = true;
                type = 'nodejs';
                try {
                    const pkg = JSON.parse(await fs.readFile(path.join(dir, item.name), 'utf8'));
                    meta = { name: pkg.name || path.basename(dir), ...pkg };
                } catch {}
            }
            if (item.name === 'requirements.txt') {
                isProject = true;
                type = 'python';
            }
            if (item.name === 'pom.xml') {
                isProject = true;
                type = 'java';
            }
            if (item.name.endsWith('.csproj')) {
                isProject = true;
                type = 'csharp';
            }
        }
        if (isProject) {
            subprojects.push({ path: dir, type, meta });
            return; // Nicht tiefer gehen, wenn ein Projekt erkannt wurde
        }
        for (const item of items) {
            if (item.isDirectory() && !['node_modules', '.git', '.venv', '__pycache__'].includes(item.name)) {
                await this._search(path.join(dir, item.name), subprojects);
            }
        }
    }
}

module.exports = SubprojectDetector; 