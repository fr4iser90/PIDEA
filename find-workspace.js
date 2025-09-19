#!/usr/bin/env node

/**
 * Find Cursor IDE Workspace Path via CDP
 * 
 * This script connects to Cursor IDE via Chrome DevTools Protocol (CDP)
 * and extracts the current workspace path from the IDE's title.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

class WorkspaceFinder {
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
            
            // Use the first page (usually the main IDE window)
            this.page = pages[0];
            
            console.log('✅ Connected to Cursor IDE successfully');
            return true;
        } catch (error) {
            console.error(`❌ Failed to connect to Cursor IDE: ${error.message}`);
            return false;
        }
    }

    async findWorkspaceFromTitle() {
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
            console.error(`❌ Error finding workspace from title: ${error.message}`);
            return null;
        }
    }

    async getCurrentFile() {
        if (!this.page) {
            throw new Error('Not connected to Cursor IDE');
        }

        try {
            const currentFile = await this.page.evaluate(() => {
                // Try to get current file from VS Code API
                if (window.vscode && window.vscode.window && window.vscode.window.activeTextEditor) {
                    return window.vscode.window.activeTextEditor.document.uri.fsPath;
                }
                
                // Try to get from DOM elements
                const activeTab = document.querySelector('.tab.active, .editor-tab.active, [data-testid="tab-active"]');
                if (activeTab) {
                    const title = activeTab.getAttribute('title') || activeTab.textContent;
                    if (title && title.includes('/')) {
                        return title;
                    }
                }
                
                return null;
            });

            if (currentFile) {
                console.log(`📄 Current file: ${currentFile}`);
                return currentFile;
            }

            return null;
        } catch (error) {
            console.error(`❌ Error getting current file: ${error.message}`);
            return null;
        }
    }

    async getWorkspaceInfo() {
        // Find workspace from title (most reliable method)
        const workspacePath = await this.findWorkspaceFromTitle();
        const currentFile = await this.getCurrentFile();
        
        const info = {
            workspacePath,
            currentFile,
            workspaceName: workspacePath ? path.basename(workspacePath) : null,
            isGitRepo: false,
            gitRoot: null
        };

        // Check if it's a git repository
        if (workspacePath && fs.existsSync(workspacePath)) {
            const gitPath = path.join(workspacePath, '.git');
            if (fs.existsSync(gitPath)) {
                info.isGitRepo = true;
                info.gitRoot = workspacePath;
            }
        }

        return info;
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
    const finder = new WorkspaceFinder(port);
    
    try {
        const connected = await finder.connect();
        if (!connected) {
            console.log('\n💡 To start Cursor IDE with CDP enabled, run:');
            console.log('cursor --remote-debugging-port=9222');
            process.exit(1);
        }

        const workspaceInfo = await finder.getWorkspaceInfo();
        
        console.log('\n📊 Workspace Information:');
        console.log('========================');
        console.log(`Workspace Path: ${workspaceInfo.workspacePath || 'Not found'}`);
        console.log(`Workspace Name: ${workspaceInfo.workspaceName || 'Not found'}`);
        console.log(`Current File: ${workspaceInfo.currentFile || 'Not found'}`);
        console.log(`Git Repository: ${workspaceInfo.isGitRepo ? 'Yes' : 'No'}`);
        console.log(`Git Root: ${workspaceInfo.gitRoot || 'N/A'}`);

        if (workspaceInfo.workspacePath) {
            console.log('\n✅ Successfully found workspace path!');
        } else {
            console.log('\n❌ Could not determine workspace path');
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

export default WorkspaceFinder;
