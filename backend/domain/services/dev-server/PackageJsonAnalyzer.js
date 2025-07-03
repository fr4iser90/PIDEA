class PackageJsonAnalyzer {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.frontendFolders = ['frontend', 'client', 'web', 'app', 'ui'];
    this.frontendTechs = [
      'react', 'vite', 'next', 'vue', 'svelte', 'astro', 'preact', 'angular', '@angular', 'solid', 'nuxt', 'gatsby'
    ];
  }

  async analyzePackageJsonInPath(workspacePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      console.log('[PackageJsonAnalyzer] Analyzing package.json in path:', workspacePath);
      let candidates = [];
      // Helper: robust recursive search for ALL package.json files
      const allPackageJsons = [];
      const findAllPackageJsons = (dir, maxDepth = 5, currentDepth = 0) => {
        if (currentDepth > maxDepth) return;
        try {
          const files = fs.readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
              // Skip node_modules/.git but NOT frontend etc.
              if (file.name === 'node_modules' || file.name === '.git') continue;
              findAllPackageJsons(fullPath, maxDepth, currentDepth + 1);
            } else if (file.isFile() && file.name === 'package.json') {
              allPackageJsons.push(fullPath);
              console.log('[PackageJsonAnalyzer] Found package.json:', fullPath);
            }
          }
        } catch (e) {}
      };
      findAllPackageJsons(workspacePath);
      for (const pkgPath of allPackageJsons) {
        const dir = path.dirname(pkgPath);
        candidates.push({ dir, score: this.scoreFolder(dir) });
      }
      if (candidates.length > 0) {
        let best = null;
        let bestScore = -1;
        for (const cand of candidates) {
          const pkgPath = path.join(cand.dir, 'package.json');
          // LOG: Show which package.json is being parsed
          console.log('[PackageJsonAnalyzer] Checking package.json:', pkgPath);
          const techScore = await this.techstackScore(pkgPath);
          const totalScore = cand.score + techScore;
          if (!best || totalScore > bestScore) {
            best = { dir: cand.dir, score: totalScore };
            bestScore = totalScore;
          }
          // LOG: Show all scripts in this package.json
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            console.log('[PackageJsonAnalyzer] Scripts in', pkgPath, ':', Object.entries(pkg.scripts || {}));
          } catch (e) {}
        }
        if (best) {
          return await this.parsePackageJson(path.join(best.dir, 'package.json'), best.dir);
        }
      }
      return null;
    } catch (error) {
      console.error('[PackageJsonAnalyzer] Error analyzing path:', error.message);
      return null;
    }
  }

  scoreFolder(folderPath) {
    const path = require('path');
    const parts = folderPath.split(path.sep);
    let score = 0;
    for (const part of parts) {
      if (this.frontendFolders.includes(part.toLowerCase())) score += 10;
    }
    return score;
  }

  async techstackScore(packageJsonPath) {
    try {
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      let techScore = 0;
      const allDeps = { ...packageJson.devDependencies, ...packageJson.dependencies };
      for (const dep of Object.keys(allDeps)) {
        if (this.frontendTechs.some(t => dep.toLowerCase().includes(t))) techScore += 10;
      }
      return techScore;
    } catch (e) {
      return 0;
    }
  }

  async parsePackageJson(packageJsonPath, folderPath) {
    try {
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      const devServerPorts = [];
      // Techstack scoring
      let techScore = 0;
      const allDeps = { ...packageJson.devDependencies, ...packageJson.dependencies };
      for (const dep of Object.keys(allDeps)) {
        if (this.frontendTechs.some(t => dep.toLowerCase().includes(t))) techScore += 10;
      }
      // Nur dev server, wenn Port explizit im Script steht
      const devPatterns = [
        /dev/, /start/, /serve/, /vite/, /next/, /react/, /vue/, /svelte/, /nuxt/, /gatsby/, /astro/, /solid/, /preact/
      ];
      console.log('[PackageJsonAnalyzer] Analyzing scripts:', Object.keys(scripts));
      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        for (const pattern of devPatterns) {
          if (pattern.test(scriptName.toLowerCase()) || pattern.test(scriptCommand.toLowerCase())) {
            // Port-Extraktion
            const portMatch = scriptCommand.match(/--port\s+(\d+)|-p\s+(\d+)|port\s*=\s*(\d+)|--port=(\d+)/i);
            const port = portMatch ? parseInt(portMatch[1] || portMatch[2] || portMatch[3] || portMatch[4]) : null;
            console.log(`[PackageJsonAnalyzer] Script: ${scriptName}, Command: ${scriptCommand}, Port match:`, portMatch, 'Extracted port:', port);
            if (port) {
              devServerPorts.push({
                script: scriptName,
                command: scriptCommand,
                port: port,
                url: `http://localhost:${port}`,
                techScore
              });
            }
          }
        }
      }
      // Sort by techScore (Frontend-Stack bevorzugen)
      devServerPorts.sort((a, b) => b.techScore - a.techScore);
      if (devServerPorts.length > 0 && devServerPorts[0].techScore > 0) {
        const primaryServer = devServerPorts[0];
        console.log('[PackageJsonAnalyzer] Primary dev server detected:', primaryServer.url);
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
          this.eventBus.emit('userAppDetected', { url: primaryServer.url });
        }
        return primaryServer.url;
      }
      console.log('[PackageJsonAnalyzer] No suitable frontend dev server found in package.json');
      return null;
    } catch (error) {
      console.error('[PackageJsonAnalyzer] Error parsing package.json:', error.message);
      return null;
    }
  }
}

module.exports = PackageJsonAnalyzer;

