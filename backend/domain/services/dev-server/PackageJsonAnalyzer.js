class PackageJsonAnalyzer {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
  }

  async analyzePackageJsonInPath(workspacePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      console.log('[PackageJsonAnalyzer] Analyzing package.json in path:', workspacePath);
      
      // Try to find package.json
      const packageJsonPath = path.join(workspacePath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        return await this.parsePackageJson(packageJsonPath);
      }
      
      // Search in subdirectories
      console.log('[PackageJsonAnalyzer] Searching for package.json in subdirectories...');
      const findPackageJson = (dir, maxDepth = 3, currentDepth = 0) => {
        if (currentDepth > maxDepth) return null;
        
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              const packagePath = path.join(fullPath, 'package.json');
              if (fs.existsSync(packagePath)) {
                console.log('[PackageJsonAnalyzer] Found package.json in subdirectory:', fullPath);
                return fullPath;
              }
              
              // Recursively search deeper
              const found = findPackageJson(fullPath, maxDepth, currentDepth + 1);
              if (found) return found;
            }
          }
        } catch (error) {
          // Ignore permission errors
        }
        return null;
      };
      
      const foundPath = findPackageJson(workspacePath);
      if (foundPath) {
        return await this.parsePackageJson(path.join(foundPath, 'package.json'));
      }
      
      return null;
      
    } catch (error) {
      console.error('[PackageJsonAnalyzer] Error analyzing path:', error.message);
      return null;
    }
  }

  async parsePackageJson(packageJsonPath) {
    try {
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Analyze scripts for dev server patterns
      const scripts = packageJson.scripts || {};
      const devServerPorts = [];
      
      // Common dev server patterns
      const devPatterns = [
        { pattern: /dev/, defaultPort: 3000 },
        { pattern: /start/, defaultPort: 3000 },
        { pattern: /serve/, defaultPort: 3000 },
        { pattern: /vite/, defaultPort: 5173 },
        { pattern: /next/, defaultPort: 3000 },
        { pattern: /react/, defaultPort: 3000 },
        { pattern: /vue/, defaultPort: 3000 },
        { pattern: /svelte/, defaultPort: 5173 },
        { pattern: /nuxt/, defaultPort: 3000 },
        { pattern: /gatsby/, defaultPort: 8000 },
        { pattern: /astro/, defaultPort: 4321 },
        { pattern: /solid/, defaultPort: 3000 },
        { pattern: /preact/, defaultPort: 3000 }
      ];
      
      // Check each script
      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        for (const { pattern, defaultPort } of devPatterns) {
          if (pattern.test(scriptName.toLowerCase()) || pattern.test(scriptCommand.toLowerCase())) {
            // Try to extract port from command
            const portMatch = scriptCommand.match(/--port\s+(\d+)|-p\s+(\d+)|port\s*=\s*(\d+)/i);
            const port = portMatch ? parseInt(portMatch[1] || portMatch[2] || portMatch[3]) : defaultPort;
            
            devServerPorts.push({
              script: scriptName,
              command: scriptCommand,
              port: port,
              url: `http://localhost:${port}`
            });
          }
        }
      }
      
      // Check for common dev server configurations
      if (packageJson.devDependencies || packageJson.dependencies) {
        const deps = { ...packageJson.devDependencies, ...packageJson.dependencies };
        
        // React/Vite
        if (deps.vite) {
          devServerPorts.push({
            script: 'vite',
            command: 'vite',
            port: 5173,
            url: 'http://localhost:5173'
          });
        }
        
        // Next.js
        if (deps.next) {
          devServerPorts.push({
            script: 'next',
            command: 'next dev',
            port: 3000,
            url: 'http://localhost:3000'
          });
        }
        
        // Create React App
        if (deps['react-scripts']) {
          devServerPorts.push({
            script: 'react-scripts',
            command: 'react-scripts start',
            port: 3000,
            url: 'http://localhost:3000'
          });
        }
        
        // Vue CLI
        if (deps['@vue/cli-service']) {
          devServerPorts.push({
            script: 'vue-cli-service',
            command: 'vue-cli-service serve',
            port: 8080,
            url: 'http://localhost:8080'
          });
        }
      }
      
      // Return the first (most likely) dev server
      if (devServerPorts.length > 0) {
        const primaryServer = devServerPorts[0];
        console.log('[PackageJsonAnalyzer] Primary dev server detected via CDP:', primaryServer.url);
        
        // Emit event
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
          this.eventBus.emit('userAppDetected', { url: primaryServer.url });
        }
        
        return primaryServer.url;
      }
      
      console.log('[PackageJsonAnalyzer] No dev server patterns found in package.json via CDP');
      return null;
      
    } catch (error) {
      console.error('[PackageJsonAnalyzer] Error parsing package.json:', error.message);
      return null;
    }
  }
}

module.exports = PackageJsonAnalyzer;
