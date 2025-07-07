const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Task = require('../entities/Task');

class DocumentationTaskSyncService {
  constructor(taskRepository, docsDirs) {
    this.taskRepository = taskRepository;
    this.docsDirs = docsDirs; // Array of absolute paths to docs dirs
  }

  async syncAllDocsTasks() {
    const allDocFiles = this._findAllMarkdownFiles();
    const existingTasks = await this.taskRepository.findAllByType('documentation');
    const existingTaskMap = new Map(existingTasks.map(t => [t.metadata && t.metadata.filePath, t]));
    const foundPaths = new Set();

    for (const filePath of allDocFiles) {
      foundPaths.add(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const id = this._generateId(filePath, content);
      const title = this._extractTitle(content, filePath);
      const metadata = { filePath, hash: this._hashContent(content) };
      let task = existingTaskMap.get(filePath);
      if (!task) {
        task = new Task({
          id,
          title,
          description: title,
          type: 'documentation',
          status: 'open',
          metadata,
        });
        await this.taskRepository.save(task);
      } else {
        // Update if hash/content changed
        if (task.metadata.hash !== metadata.hash) {
          task._title = title;
          task._description = title;
          task._metadata = metadata;
          await this.taskRepository.save(task);
        }
      }
    }
    // Remove tasks for deleted files
    for (const [filePath, task] of existingTaskMap.entries()) {
      if (!foundPaths.has(filePath)) {
        await this.taskRepository.delete(task.id);
      }
    }
  }

  _findAllMarkdownFiles() {
    const files = [];
    for (const dir of this.docsDirs) {
      this._walk(dir, files);
    }
    return files;
  }

  _walk(dir, files) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        this._walk(fullPath, files);
      } else if (fullPath.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  _generateId(filePath, content) {
    return crypto.createHash('sha1').update(filePath + this._hashContent(content)).digest('hex');
  }

  _hashContent(content) {
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  _extractTitle(content, filePath) {
    const match = content.match(/^#\s+(.+)/m);
    if (match) return match[1].trim();
    return path.basename(filePath, '.md');
  }
}

module.exports = DocumentationTaskSyncService;
