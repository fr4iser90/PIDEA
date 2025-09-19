#!/usr/bin/env node

/**
 * Find Git Repository Information via CDP
 * 
 * This script connects to Cursor IDE via Chrome DevTools Protocol (CDP)
 * and extracts Git repository information from the IDE's state.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class GitFinder {
    constructor(port = 9222) {
        this.cdpPort = port;
        this.browser = null;
        this.page = null;
    }

    async connect() {
        try {
            console.log(`🔌 Connecting to Cursor IDE on port ${this.cdpPort}...`);
            
            this.browser = await chromium.connectOverCDP(`http://localhost:${this.cdpPort}`);
            
            // Fix: Use the correct method like browser-manager.js
            const contexts = this.browser.contexts();
            console.log(`📋 Found ${contexts.length} browser contexts`);
            
            if (contexts.length === 0) {
                throw new Error('No browser contexts found');
            }
            
            // Get the first context and page
            const context = contexts[0];
            const pages = await context.pages();
            
            if (pages.length === 0) {
                throw new Error('No pages found in Cursor IDE');
            }
            
            this.page = pages[0];
            console.log('✅ Connected to Cursor IDE successfully');
            return true;
        } catch (error) {
            console.error(`❌ Failed to connect to Cursor IDE: ${error.message}`);
            return false;
        }
    }

    async findGitInfo() {
        if (!this.page) {
            throw new Error('Not connected to Cursor IDE');
        }

        try {
            console.log('🔍 Searching for Git repository information...');

            // Method 1: Try to get Git info from VS Code API
            const gitInfo = await this.page.evaluate(() => {
                // Try to access VS Code's Git extension API
                if (window.vscode && window.vscode.extensions) {
                    const gitExtension = window.vscode.extensions.getExtension('vscode.git');
                    if (gitExtension && gitExtension.exports) {
                        const git = gitExtension.exports.getAPI(1);
                        if (git && git.repositories && git.repositories.length > 0) {
                            const repo = git.repositories[0];
                            return {
                                root: repo.rootUri?.fsPath,
                                state: repo.state,
                                head: repo.state.head?.name,
                                remotes: repo.state.remotes?.map(r => ({ name: r.name, fetchUrl: r.fetchUrl }))
                            };
                        }
                    }
                }

                // Method 2: Look for Git information in DOM
                const gitElements = document.querySelectorAll('[data-git], .git-status, .scm-viewlet');
                for (const element of gitElements) {
                    const gitData = element.getAttribute('data-git') || element.textContent;
                    if (gitData && gitData.includes('git')) {
                        return { domData: gitData };
                    }
                }

                // Method 3: Check for Git-related UI elements
                const gitStatusBar = document.querySelector('.statusbar-item[title*="git"], .git-status');
                if (gitStatusBar) {
                    const title = gitStatusBar.getAttribute('title') || gitStatusBar.textContent;
                    return { statusBar: title };
                }

                return null;
            });

            if (gitInfo) {
                console.log(`✅ Found Git info: ${JSON.stringify(gitInfo, null, 2)}`);
                return gitInfo;
            }

            return null;
        } catch (error) {
            console.error(`❌ Error finding Git info: ${error.message}`);
            return null;
        }
    }

    async findWorkspacePath() {
        if (!this.page) {
            throw new Error('Not connected to Cursor IDE');
        }

        try {
            console.log('🔍 Extracting workspace from page title...');
            
            const pageTitle = await this.page.evaluate(() => {
                return document.title;
            });
            
            console.log(`📄 Page title: ${pageTitle}`);
            
            // Extract workspace name from title (format: "filename - workspace - Cursor")
            const titleMatch = pageTitle.match(/([^-]+)\s*-\s*Cursor/);
            if (titleMatch) {
                const workspaceName = titleMatch[1].trim();
                console.log(`🎯 Extracted workspace name: ${workspaceName}`);
                
                // Search for this workspace starting from current directory and going up
                let currentDir = process.cwd();
                const maxDepth = 10;
                let depth = 0;
                
                while (currentDir !== '/' && depth < maxDepth) {
                    const workspacePath = path.join(currentDir, workspaceName);
                    if (fs.existsSync(workspacePath)) {
                        console.log(`✅ Found workspace: ${workspacePath}`);
                        return workspacePath;
                    }
                    
                    // Move up one directory
                    currentDir = path.dirname(currentDir);
                    depth++;
                }
                
                console.log(`❌ Could not find workspace: ${workspaceName}`);
                return null;
            }
            
            console.log('❌ Could not extract workspace name from title');
            return null;
        } catch (error) {
            console.error(`❌ Error finding workspace path: ${error.message}`);
            return null;
        }
    }

    async getGitRepositoryInfo(workspacePath) {
        if (!workspacePath || !fs.existsSync(workspacePath)) {
            return null;
        }

        try {
            // Check if it's a Git repository
            const gitPath = path.join(workspacePath, '.git');
            if (!fs.existsSync(gitPath)) {
                return { isGitRepo: false };
            }

            const gitInfo = {
                isGitRepo: true,
                gitRoot: workspacePath,
                gitPath: gitPath
            };

            // Get Git configuration
            try {
                const config = execSync('git config --list', { cwd: workspacePath, encoding: 'utf8' });
                const configLines = config.split('\n').filter(line => line.trim());
                
                gitInfo.config = {};
                for (const line of configLines) {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        gitInfo.config[key] = value;
                    }
                }
            } catch (error) {
                gitInfo.configError = error.message;
            }

            // Get current branch
            try {
                const branch = execSync('git branch --show-current', { cwd: workspacePath, encoding: 'utf8' }).trim();
                gitInfo.currentBranch = branch;
            } catch (error) {
                gitInfo.branchError = error.message;
            }

            // Get remote information
            try {
                const remotes = execSync('git remote -v', { cwd: workspacePath, encoding: 'utf8' });
                const remoteLines = remotes.split('\n').filter(line => line.trim());
                
                gitInfo.remotes = {};
                for (const line of remoteLines) {
                    const parts = line.split('\t');
                    if (parts.length >= 2) {
                        const name = parts[0];
                        const url = parts[1].split(' ')[0];
                        gitInfo.remotes[name] = url;
                    }
                }
            } catch (error) {
                gitInfo.remoteError = error.message;
            }

            // Get status
            try {
                const status = execSync('git status --porcelain', { cwd: workspacePath, encoding: 'utf8' });
                const statusLines = status.split('\n').filter(line => line.trim());
                gitInfo.status = {
                    modified: statusLines.filter(line => line.startsWith('M')).length,
                    added: statusLines.filter(line => line.startsWith('A')).length,
                    deleted: statusLines.filter(line => line.startsWith('D')).length,
                    untracked: statusLines.filter(line => line.startsWith('??')).length
                };
            } catch (error) {
                gitInfo.statusError = error.message;
            }

            // Get last commit
            try {
                const lastCommit = execSync('git log -1 --oneline', { cwd: workspacePath, encoding: 'utf8' }).trim();
                gitInfo.lastCommit = lastCommit;
            } catch (error) {
                gitInfo.commitError = error.message;
            }

            return gitInfo;
        } catch (error) {
            console.error(`❌ Error getting Git repository info: ${error.message}`);
            return { isGitRepo: false, error: error.message };
        }
    }

    async getFullGitInfo() {
        const workspacePath = await this.findWorkspacePath();
        
        if (!workspacePath) {
            console.log('❌ No workspace found, cannot get Git information');
            return {
                workspacePath: null,
                localGitInfo: { isGitRepo: false, error: 'No workspace found' }
            };
        }
        
        const cdpGitInfo = await this.findGitInfo();
        const localGitInfo = await this.getGitRepositoryInfo(workspacePath);

        return {
            workspacePath,
            cdpGitInfo,
            localGitInfo,
            combined: {
                ...localGitInfo,
                cdpData: cdpGitInfo
            }
        };
    }

    async disconnect() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔌 Disconnected from Cursor IDE');
        }
    }
}

// Main execution
async function main() {
    const port = process.argv[2] || 9222;
    const finder = new GitFinder(port);
    
    try {
        const connected = await finder.connect();
        if (!connected) {
            console.log('\n💡 To start Cursor IDE with CDP enabled, run:');
            console.log('cursor --remote-debugging-port=9222');
            process.exit(1);
        }

        const gitInfo = await finder.getFullGitInfo();
        
        if (gitInfo.workspacePath) {
            console.log('\n📊 Git Repository Information:');
            console.log('============================');
            console.log(`Workspace Path: ${gitInfo.workspacePath}`);
            
            if (gitInfo.localGitInfo && gitInfo.localGitInfo.isGitRepo) {
                console.log('\n✅ Git Repository Found!');
                console.log(`Git Root: ${gitInfo.localGitInfo.gitRoot}`);
                console.log(`Current Branch: ${gitInfo.localGitInfo.currentBranch || 'Unknown'}`);
                
                if (gitInfo.localGitInfo.remotes) {
                    console.log('\n🌐 Remotes:');
                    Object.entries(gitInfo.localGitInfo.remotes).forEach(([name, url]) => {
                        console.log(`  ${name}: ${url}`);
                    });
                }
                
                if (gitInfo.localGitInfo.status) {
                    console.log('\n📈 Status:');
                    console.log(`  Modified: ${gitInfo.localGitInfo.status.modified}`);
                    console.log(`  Added: ${gitInfo.localGitInfo.status.added}`);
                    console.log(`  Deleted: ${gitInfo.localGitInfo.status.deleted}`);
                    console.log(`  Untracked: ${gitInfo.localGitInfo.status.untracked}`);
                }
                
                if (gitInfo.localGitInfo.lastCommit) {
                    console.log(`\n📝 Last Commit: ${gitInfo.localGitInfo.lastCommit}`);
                }
                
                if (gitInfo.cdpGitInfo) {
                    console.log('\n🔍 CDP Git Info:');
                    console.log(JSON.stringify(gitInfo.cdpGitInfo, null, 2));
                }
            } else {
                console.log('\n❌ No Git repository found in workspace');
                if (gitInfo.localGitInfo && gitInfo.localGitInfo.error) {
                    console.log(`Error: ${gitInfo.localGitInfo.error}`);
                }
            }
        } else {
            console.log('\n❌ No workspace found');
        }

    } catch (error) {
        console.error(`💥 Error: ${error.message}`);
        process.exit(1);
    } finally {
        await finder.disconnect();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default GitFinder;
