/**
 * End-to-End tests for VibeCoder Auto Mode
 */
const Application = require('../../Application');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

describe('VibeCoder Auto Mode E2E', () => {
    let application;
    let testProjectPath;

    beforeAll(async () => {
        // Initialize application
        application = new Application();
        await application.initialize();

        // Create test project
        testProjectPath = await createTestProject();
    });

    afterAll(async () => {
        // Cleanup test project
        await cleanupTestProject(testProjectPath);
        
        // Cleanup application
        await application.cleanup();
    });

    beforeEach(async () => {
        // Reset application state before each test
        await application.reset();
    });

    describe('Full Auto Mode Workflow', () => {
        test('should execute complete auto mode workflow', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Verify session was created
            expect(result.session).toBeDefined();
            expect(result.session.id).toBeDefined();
            expect(result.session.duration).toBeGreaterThan(0);
            expect(result.session.status).toBe('completed');

            // Verify project analysis was performed
            expect(result.analysis).toBeDefined();
            expect(result.analysis.projectStructure).toBeDefined();
            expect(result.analysis.projectStructure.type).toBe('nodejs');
            expect(result.analysis.insights).toBeDefined();
            expect(Array.isArray(result.analysis.insights)).toBe(true);
            expect(result.analysis.recommendations).toBeDefined();
            expect(Array.isArray(result.analysis.recommendations)).toBe(true);

            // Verify tasks were created and executed
            expect(result.tasks).toBeDefined();
            expect(Array.isArray(result.tasks)).toBe(true);
            expect(result.tasks.length).toBeGreaterThan(0);

            // Verify each task has required properties
            result.tasks.forEach(taskItem => {
                expect(taskItem.task).toBeDefined();
                expect(taskItem.task.id).toBeDefined();
                expect(taskItem.task.title).toBeDefined();
                expect(taskItem.task.type).toBeDefined();
                expect(taskItem.execution).toBeDefined();
                expect(taskItem.execution.id).toBeDefined();
                expect(taskItem.execution.status).toBeDefined();
            });

            // Verify scripts were generated
            expect(result.scripts).toBeDefined();
            expect(Array.isArray(result.scripts)).toBe(true);
        }, 30000); // 30 second timeout for full workflow

        test('should handle auto mode with analysis only', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'analysis',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Verify analysis was performed
            expect(result.analysis).toBeDefined();
            expect(result.analysis.projectStructure).toBeDefined();
            expect(result.analysis.insights).toBeDefined();
            expect(result.analysis.recommendations).toBeDefined();

            // Verify no tasks were executed in analysis mode
            expect(result.tasks).toBeDefined();
            expect(result.tasks.length).toBe(0);

            // Verify no scripts were generated
            expect(result.scripts).toBeDefined();
            expect(result.scripts.length).toBe(0);
        }, 15000);

        test('should handle auto mode with optimization focus', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'optimization',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Verify optimization tasks were created
            expect(result.tasks).toBeDefined();
            expect(result.tasks.length).toBeGreaterThan(0);

            // Verify optimization scripts were generated
            expect(result.scripts).toBeDefined();
            expect(result.scripts.length).toBeGreaterThan(0);

            // Verify scripts are optimization-related
            result.scripts.forEach(script => {
                expect(['optimization', 'performance', 'refactoring']).toContain(script.type);
            });
        }, 20000);

        test('should handle auto mode with security focus', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'security',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Verify security analysis was performed
            expect(result.analysis).toBeDefined();
            expect(result.analysis.security).toBeDefined();

            // Verify security tasks were created
            expect(result.tasks).toBeDefined();
            expect(result.tasks.length).toBeGreaterThan(0);

            // Verify security scripts were generated
            expect(result.scripts).toBeDefined();
            expect(result.scripts.length).toBeGreaterThan(0);

            // Verify scripts are security-related
            result.scripts.forEach(script => {
                expect(['security', 'vulnerability', 'audit']).toContain(script.type);
            });
        }, 20000);
    });

    describe('Auto Mode with Different AI Models', () => {
        test('should work with GPT-4 model', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            expect(result.analysis).toBeDefined();
            expect(result.analysis.insights).toBeDefined();
            expect(result.analysis.recommendations).toBeDefined();
        }, 10000);

        test('should work with GPT-3.5 model', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-3.5-turbo',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            expect(result.analysis).toBeDefined();
            expect(result.analysis.insights).toBeDefined();
            expect(result.analysis.recommendations).toBeDefined();
        }, 10000);

        test('should work with Claude model', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'claude-3',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            expect(result.analysis).toBeDefined();
            expect(result.analysis.insights).toBeDefined();
            expect(result.analysis.recommendations).toBeDefined();
        }, 10000);
    });

    describe('Auto Mode Error Handling', () => {
        test('should handle invalid project path gracefully', async () => {
            const command = {
                projectPath: '/nonexistent/project',
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            await expect(application.commandBus.execute('AutoModeCommand', command))
                .rejects.toThrow();
        });

        test('should handle AI service errors gracefully', async () => {
            // Mock AI service to throw error
            const originalAnalyzeProject = application.aiService.analyzeProject;
            application.aiService.analyzeProject = jest.fn().mockRejectedValue(
                new Error('AI service unavailable')
            );

            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Should still complete with error information
            expect(result.session).toBeDefined();
            expect(result.session.status).toBe('completed');
            expect(result.error).toContain('AI service unavailable');

            // Restore original method
            application.aiService.analyzeProject = originalAnalyzeProject;
        });

        test('should handle task execution errors gracefully', async () => {
            // Mock task execution to throw error
            const originalExecuteTask = application.taskExecutionEngine.executeTask;
            application.taskExecutionEngine.executeTask = jest.fn().mockRejectedValue(
                new Error('Task execution failed')
            );

            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Should still complete with error information
            expect(result.session).toBeDefined();
            expect(result.session.status).toBe('completed');
            expect(result.error).toContain('Task execution failed');

            // Restore original method
            application.taskExecutionEngine.executeTask = originalExecuteTask;
        });
    });

    describe('Auto Mode with Real Project Types', () => {
        test('should handle Node.js project', async () => {
            const nodeProjectPath = await createNodeJSProject();
            
            const command = {
                projectPath: nodeProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            expect(result.analysis.projectStructure.type).toBe('nodejs');
            expect(result.analysis.insights).toBeDefined();
            expect(result.analysis.recommendations).toBeDefined();

            await cleanupTestProject(nodeProjectPath);
        });

        test('should handle Python project', async () => {
            const pythonProjectPath = await createPythonProject();
            
            const command = {
                projectPath: pythonProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            expect(result.analysis.projectStructure.type).toBe('python');
            expect(result.analysis.insights).toBeDefined();
            expect(result.analysis.recommendations).toBeDefined();

            await cleanupTestProject(pythonProjectPath);
        });

        test('should handle React project', async () => {
            const reactProjectPath = await createReactProject();
            
            const command = {
                projectPath: reactProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            expect(result.analysis.projectStructure.type).toBe('react');
            expect(result.analysis.insights).toBeDefined();
            expect(result.analysis.recommendations).toBeDefined();

            await cleanupTestProject(reactProjectPath);
        });
    });

    describe('Auto Mode Performance', () => {
        test('should complete within reasonable time', async () => {
            const startTime = Date.now();

            const command = {
                projectPath: testProjectPath,
                mode: 'analysis',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within 10 seconds for analysis mode
            expect(duration).toBeLessThan(10000);
            expect(result.session.duration).toBeLessThan(10000);
        });

        test('should handle large projects efficiently', async () => {
            const largeProjectPath = await createLargeProject();
            
            const startTime = Date.now();

            const command = {
                projectPath: largeProjectPath,
                mode: 'analysis',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within 30 seconds even for large projects
            expect(duration).toBeLessThan(30000);
            expect(result.analysis.projectStructure.files.length).toBeGreaterThan(10);

            await cleanupTestProject(largeProjectPath);
        });
    });

    describe('Auto Mode Integration with Other Services', () => {
        test('should integrate with task repository', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Verify tasks were saved to repository
            for (const taskItem of result.tasks) {
                const savedTask = await application.taskRepository.findById(taskItem.task.id);
                expect(savedTask).toBeDefined();
                expect(savedTask.title).toBe(taskItem.task.title);
            }
        });

        test('should integrate with script repository', async () => {
            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: false
                }
            };

            const result = await application.commandBus.execute('AutoModeCommand', command);

            // Verify scripts were saved to repository
            for (const script of result.scripts) {
                const savedScript = await application.scriptRepository.findById(script.id);
                expect(savedScript).toBeDefined();
                expect(savedScript.name).toBe(script.name);
            }
        });

        test('should emit appropriate events', async () => {
            const events = [];
            
            application.eventBus.on('auto:start', (event) => events.push({ type: 'start', ...event }));
            application.eventBus.on('auto:progress', (event) => events.push({ type: 'progress', ...event }));
            application.eventBus.on('auto:complete', (event) => events.push({ type: 'complete', ...event }));

            const command = {
                projectPath: testProjectPath,
                mode: 'full',
                options: {
                    aiModel: 'gpt-4',
                    dryRun: true
                }
            };

            await application.commandBus.execute('AutoModeCommand', command);

            // Verify events were emitted
            expect(events.length).toBeGreaterThan(0);
            expect(events.some(e => e.type === 'start')).toBe(true);
            expect(events.some(e => e.type === 'complete')).toBe(true);
        });
    });
});

// Helper functions for creating test projects
async function createTestProject() {
    const projectPath = path.join(os.tmpdir(), `test-project-${Date.now()}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    // Create package.json
    const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project for E2E testing',
        main: 'index.js',
        scripts: {
            test: 'jest',
            start: 'node index.js'
        },
        dependencies: {
            express: '^4.17.1',
            lodash: '^4.17.21'
        },
        devDependencies: {
            jest: '^27.0.0',
            eslint: '^8.0.0'
        }
    };
    
    await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );
    
    // Create index.js
    const indexJs = `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ message: 'Hello World!' });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
`;
    
    await fs.writeFile(path.join(projectPath, 'index.js'), indexJs);
    
    // Create README.md
    const readme = `
# Test Project

This is a test project for E2E testing of VibeCoder Auto Mode.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`
`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
    
    return projectPath;
}

async function createNodeJSProject() {
    const projectPath = path.join(os.tmpdir(), `nodejs-project-${Date.now()}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    const packageJson = {
        name: 'nodejs-project',
        version: '1.0.0',
        dependencies: {
            express: '^4.17.1'
        }
    };
    
    await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );
    
    return projectPath;
}

async function createPythonProject() {
    const projectPath = path.join(os.tmpdir(), `python-project-${Date.now()}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    const requirementsTxt = `
flask==2.0.1
requests==2.26.0
`;
    
    await fs.writeFile(path.join(projectPath, 'requirements.txt'), requirementsTxt);
    
    const mainPy = `
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run()
`;
    
    await fs.writeFile(path.join(projectPath, 'main.py'), mainPy);
    
    return projectPath;
}

async function createReactProject() {
    const projectPath = path.join(os.tmpdir(), `react-project-${Date.now()}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    const packageJson = {
        name: 'react-project',
        version: '1.0.0',
        dependencies: {
            react: '^17.0.2',
            'react-dom': '^17.0.2'
        },
        devDependencies: {
            webpack: '^5.0.0'
        }
    };
    
    await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );
    
    return projectPath;
}

async function createLargeProject() {
    const projectPath = path.join(os.tmpdir(), `large-project-${Date.now()}`);
    
    await fs.mkdir(projectPath, { recursive: true });
    
    // Create multiple directories and files
    const directories = ['src', 'src/components', 'src/utils', 'src/services', 'tests', 'docs'];
    
    for (const dir of directories) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }
    
    // Create multiple files
    const files = [
        'package.json',
        'src/index.js',
        'src/components/Button.js',
        'src/components/Header.js',
        'src/utils/helpers.js',
        'src/services/api.js',
        'tests/unit.test.js',
        'tests/integration.test.js',
        'docs/README.md',
        'docs/API.md'
    ];
    
    for (const file of files) {
        await fs.writeFile(path.join(projectPath, file), `// ${file} content`);
    }
    
    return projectPath;
}

async function cleanupTestProject(projectPath) {
    try {
        await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error) {
        // Ignore cleanup errors
    }
} 