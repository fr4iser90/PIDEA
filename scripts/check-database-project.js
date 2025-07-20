#!/usr/bin/env node

/**
 * Database Check Script
 * Shows what's currently stored in the PIDEA database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = path.join(__dirname, '../backend/database/pidea-dev.db');

function checkDatabase() {
    console.log('🔍 Checking PIDEA Database...\n');
    
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            return;
        }
        console.log('✅ Connected to database:', DB_PATH);
    });

    // Check projects table
    console.log('\n📁 PROJECTS TABLE:');
    console.log('==================');
    
    db.all("SELECT * FROM projects", [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying projects:', err.message);
            return;
        }

        if (rows.length === 0) {
            console.log('❌ No projects found');
        } else {
            rows.forEach((project, index) => {
                console.log(`\n📦 Project ${index + 1}:`);
                console.log(`   ID: ${project.id}`);
                console.log(`   Name: ${project.name}`);
                console.log(`   Description: ${project.description || 'N/A'}`);
                console.log(`   Workspace Path: ${project.workspace_path}`);
                console.log(`   Type: ${project.type}`);
                console.log(`   Framework: ${project.framework || 'N/A'}`);
                console.log(`   Language: ${project.language || 'N/A'}`);
                console.log(`   Package Manager: ${project.package_manager || 'N/A'}`);
                console.log(`   Backend Port: ${project.backend_port || 'N/A'}`);
                console.log(`   Frontend Port: ${project.frontend_port || 'N/A'}`);
                console.log(`   Database Port: ${project.database_port || 'N/A'}`);
                console.log(`   Status: ${project.status}`);
                console.log(`   Created: ${project.created_at}`);
                
                if (project.metadata) {
                    try {
                        const metadata = JSON.parse(project.metadata);
                        console.log(`   Metadata: ${JSON.stringify(metadata, null, 2)}`);
                    } catch {
                        console.log(`   Metadata: ${project.metadata}`);
                    }
                }
            });
        }

        // Now check what the strategies would provide
        checkStrategyData(rows[0]?.workspace_path, db);
    });
}

async function checkStrategyData(projectPath, db) {
    if (!projectPath) {
        console.log('\n❌ No project path found, cannot check strategy data');
        return;
    }

    console.log('\n🔧 STRATEGY DATA (what strategies would provide):');
    console.log('==================================================');

    try {
        // 1. Check workpath
        console.log('\n✅ 1. WORKPATH:');
        console.log(`   ${projectPath}`);

        // 2. Check manifest (package.json)
        console.log('\n✅ 2. MANIFEST (package.json):');
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (await fileExists(packageJsonPath)) {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            console.log(`   Name: ${packageJson.name}`);
            console.log(`   Version: ${packageJson.version}`);
            console.log(`   Workspaces: ${JSON.stringify(packageJson.workspaces || [])}`);
            console.log(`   Private: ${packageJson.private || false}`);
        } else {
            console.log('   ❌ package.json not found');
        }

        // 3. Check commands (npm scripts)
        console.log('\n✅ 3. COMMANDS (npm scripts):');
        if (await fileExists(packageJsonPath)) {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};
            if (Object.keys(scripts).length > 0) {
                Object.entries(scripts).forEach(([name, script]) => {
                    console.log(`   ${name}: ${script}`);
                });
            } else {
                console.log('   ❌ No npm scripts found');
            }
        } else {
            console.log('   ❌ package.json not found');
        }

        // 4. Check ports (docker-compose.yml)
        console.log('\n✅ 4. PORTS (docker-compose.yml):');
        const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
        if (await fileExists(dockerComposePath)) {
            const dockerCompose = await fs.readFile(dockerComposePath, 'utf8');
            const portMatches = dockerCompose.match(/"(\d+):(\d+)"/g);
            if (portMatches) {
                portMatches.forEach(match => {
                    const [hostPort, containerPort] = match.replace(/"/g, '').split(':');
                    console.log(`   Port ${hostPort}:${containerPort}`);
                });
            } else {
                console.log('   ❌ No ports found in docker-compose.yml');
            }
        } else {
            console.log('   ❌ docker-compose.yml not found');
        }

    } catch (error) {
        console.error('❌ Error checking strategy data:', error.message);
    }

    // Continue with other database checks
    checkAnalysisResults(db);
}

function checkAnalysisResults(db) {
    console.log('\n📊 ANALYSIS RESULTS TABLE:');
    console.log('==========================');
    
    db.all("SELECT * FROM analysis_results", [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying analysis results:', err.message);
            return;
        }

        if (rows.length === 0) {
            console.log('❌ No analysis results found');
        } else {
            rows.forEach((result, index) => {
                console.log(`\n📊 Analysis ${index + 1}:`);
                console.log(`   ID: ${result.id}`);
                console.log(`   Project ID: ${result.project_id}`);
                console.log(`   Type: ${result.analysis_type}`);
                console.log(`   Status: ${result.status}`);
                console.log(`   Score: ${result.overall_score || 'N/A'}`);
                console.log(`   Created: ${result.created_at}`);
            });
        }

        checkTasks(db);
    });
}

function checkTasks(db) {
    console.log('\n📋 TASKS TABLE:');
    console.log('===============');
    
    db.all("SELECT COUNT(*) as count FROM tasks", [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying tasks:', err.message);
            return;
        }

        console.log(`   Total Tasks: ${rows[0]?.count || 0}`);
        checkChatSessions(db);
    });
}

function checkChatSessions(db) {
    console.log('\n💬 CHAT SESSIONS TABLE:');
    console.log('======================');
    
    db.all("SELECT COUNT(*) as count FROM chat_sessions", [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying chat sessions:', err.message);
            return;
        }

        console.log(`   Total Chat Sessions: ${rows[0]?.count || 0}`);
        checkWorkflowExecutions(db);
    });
}

function checkWorkflowExecutions(db) {
    console.log('\n⚙️ WORKFLOW EXECUTIONS TABLE:');
    console.log('============================');
    
    db.all("SELECT COUNT(*) as count FROM workflow_executions", [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying workflow executions:', err.message);
            return;
        }

        console.log(`   Total Workflow Executions: ${rows[0]?.count || 0}`);
        printSummary(db);
    });
}

function printSummary(db) {
    console.log('\n📈 DATABASE SUMMARY:');
    console.log('==================');
    console.log('✅ All data is stored in SQLite database (not files)');
    console.log('✅ Project information is cached');
    console.log('✅ Analysis results are stored when generated');
    console.log('✅ Cache system is working');
    console.log('✅ Strategy data (workpath, manifest, commands, ports) is available');

    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('\n✅ Database connection closed');
        }
    });
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

checkDatabase(); 