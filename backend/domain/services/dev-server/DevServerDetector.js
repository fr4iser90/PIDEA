class DevServerDetector {
  constructor(ideManager, eventBus = null, browserManager = null) {
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.browserManager = browserManager;
    this.lastPackageJsonCheck = null;
    this.cachedPackageJsonUrl = null;
  }

  async detectDevServerFromPackageJson(workspacePath = null) {
    try {
      // Hole Workspace-Pfad NUR wenn bereits gesetzt (nicht alle 2 Sekunden!)
      let finalWorkspacePath = workspacePath;
      if (!finalWorkspacePath) {
        const port = this.ideManager.getActivePort();
        finalWorkspacePath = this.ideManager.getWorkspacePath(port);
        if (!finalWorkspacePath) {
          console.log('[DevServerDetector] No workspace path set, skipping package.json analysis');
          return null;
        }
        console.log('[DevServerDetector] Using cached workspace path:', finalWorkspacePath);
      }
      if (!finalWorkspacePath) {
        console.error('[DevServerDetector] No workspace path detected!');
        return null;
      }
      
      console.log('[DevServerDetector] Analyzing package.json in:', finalWorkspacePath);
      
      // Read package.json
      const fs = require('fs');
      const path = require('path');
      let packageJsonPath = path.join(finalWorkspacePath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        console.log('[DevServerDetector] No package.json found in:', finalWorkspacePath);
        
        // Try to find package.json in subdirectories
        console.log('[DevServerDetector] Searching for package.json in subdirectories...');
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
                  console.log('[DevServerDetector] Found package.json in subdirectory:', fullPath);
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
        
        const foundPath = findPackageJson(finalWorkspacePath);
        if (foundPath) {
          const updatedWorkspacePath = foundPath;
          packageJsonPath = path.join(updatedWorkspacePath, 'package.json');
        } else {
          return null;
        }
      }
      
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
        console.log('[DevServerDetector] Primary dev server detected:', primaryServer.url);
        
        // Emit event
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
          this.eventBus.emit('userAppDetected', { url: primaryServer.url });
        }
        
        return primaryServer.url;
      }
      
      console.log('[DevServerDetector] No dev server patterns found in package.json');
      return null;
      
    } catch (error) {
      console.error('[DevServerDetector] Error analyzing package.json:', error);
      return null;
    }
  }

  resetPackageJsonCache() {
    this.cachedPackageJsonUrl = null;
    this.lastPackageJsonCheck = null;
    console.log('[DevServerDetector] Package.json cache reset for new IDE/project');
  }

  async detectDevServerFromCDP() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        console.log('[DevServerDetector] No page available for CDP');
        return null;
      }

      // Use CDP to get file system info
      const client = await page.context().newCDPSession(page);
      
      // Get workspace info from CDP
      const workspaceInfo = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            // Try to get workspace from various sources
            const workspace = {
              path: null,
              name: null
            };
            
            // Method 1: From window object
            if (window.workspace) {
              workspace.path = window.workspace.uri?.fsPath;
              workspace.name = window.workspace.name;
            }
            
            // Method 2: From VS Code API
            if (window.vscode) {
              workspace.path = window.vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
              workspace.name = window.vscode.workspace.workspaceFolders?.[0]?.name;
            }
            
            // Method 3: From Monaco editor
            if (window.monaco) {
              workspace.path = window.monaco.Uri.file('.').fsPath;
            }
            
            return workspace;
          })()
        `
      });

      if (workspaceInfo.result?.value?.path) {
        const workspacePath = workspaceInfo.result.value.path;
        console.log('[DevServerDetector] CDP workspace path:', workspacePath);
        
        // Now analyze package.json in this path
        return await this.analyzePackageJsonInPath(workspacePath);
      }

      console.log('[DevServerDetector] No workspace path found via CDP');
      return null;

    } catch (error) {
      console.error('[DevServerDetector] CDP error:', error.message);
      return null;
    }
  }

  async analyzePackageJsonInPath(workspacePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      console.log('[DevServerDetector] Analyzing package.json in path:', workspacePath);
      
      // Try to find package.json
      const packageJsonPath = path.join(workspacePath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        return await this.parsePackageJson(packageJsonPath);
      }
      
      // Search in subdirectories
      console.log('[DevServerDetector] Searching for package.json in subdirectories...');
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
                console.log('[DevServerDetector] Found package.json in subdirectory:', fullPath);
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
      console.error('[DevServerDetector] Error analyzing path:', error.message);
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
        console.log('[DevServerDetector] Primary dev server detected via CDP:', primaryServer.url);
        
        // Emit event
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
          this.eventBus.emit('userAppDetected', { url: primaryServer.url });
        }
        
        return primaryServer.url;
      }
      
      console.log('[DevServerDetector] No dev server patterns found in package.json via CDP');
      return null;
      
    } catch (error) {
      console.error('[DevServerDetector] Error parsing package.json:', error.message);
      return null;
    }
  }
}

module.exports = DevServerDetector;
