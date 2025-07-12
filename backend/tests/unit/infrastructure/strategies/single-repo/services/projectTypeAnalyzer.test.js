const ProjectTypeAnalyzer = require('@strategies/single-repo/services/projectTypeAnalyzer');
const { 
    FRONTEND_FRAMEWORKS, 
    BACKEND_FRAMEWORKS, 
    BUILD_TOOLS_DETECTION 
} = require('@strategies/single-repo/constants');
const path = require('path');

describe('ProjectTypeAnalyzer', () => {
    let projectTypeAnalyzer;
    let mockLogger;
    let mockFileUtils;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockFileUtils = {
            readJsonFile: jest.fn(),
            fileExists: jest.fn()
        };

        projectTypeAnalyzer = new ProjectTypeAnalyzer(mockLogger, mockFileUtils);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with logger and fileUtils', () => {
            expect(projectTypeAnalyzer.logger).toBe(mockLogger);
            expect(projectTypeAnalyzer.fileUtils).toBe(mockFileUtils);
        });

        it('should handle undefined logger gracefully', () => {
            const analyzerWithoutLogger = new ProjectTypeAnalyzer(undefined, mockFileUtils);
            expect(analyzerWithoutLogger.logger).toBeUndefined();
            expect(analyzerWithoutLogger.fileUtils).toBe(mockFileUtils);
        });

        it('should handle undefined fileUtils gracefully', () => {
            const analyzerWithoutFileUtils = new ProjectTypeAnalyzer(mockLogger, undefined);
            expect(analyzerWithoutFileUtils.logger).toBe(mockLogger);
            expect(analyzerWithoutFileUtils.fileUtils).toBeUndefined();
        });
    });

    describe('getProjectType', () => {
        const projectPath = '/test/project/path';

        it('should detect React frontend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'react': '^18.0.0',
                    'react-dom': '^18.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('react-app');
            expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
                path.join(projectPath, 'package.json')
            );
        });

        it('should detect Vue frontend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'vue': '^3.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('vue-app');
        });

        it('should detect Angular frontend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    '@angular/core': '^15.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('angular-app');
        });

        it('should detect Svelte frontend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'svelte': '^4.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('svelte-app');
        });

        it('should detect Next.js framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'next': '^13.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('next-app');
        });

        it('should detect Nuxt.js framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'nuxt': '^3.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('nuxt-app');
        });

        it('should detect Express backend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'express': '^4.18.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('express-app');
        });

        it('should detect Koa backend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'koa': '^2.14.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('koa-app');
        });

        it('should detect Fastify backend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    'fastify': '^4.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('fastify-app');
        });

        it('should detect NestJS backend framework', async () => {
            const mockPackageJson = {
                dependencies: {
                    '@nestjs/core': '^10.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('nest-app');
        });

        it('should detect Webpack build tool from dependencies', async () => {
            const mockPackageJson = {
                dependencies: {
                    'webpack': '^5.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('webpack-app');
        });

        it('should detect Vite build tool from dependencies', async () => {
            const mockPackageJson = {
                dependencies: {
                    'vite': '^4.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('vite-app');
        });

        it('should detect Rollup build tool from dependencies', async () => {
            const mockPackageJson = {
                dependencies: {
                    'rollup': '^3.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('rollup-app');
        });

        it('should detect Webpack build tool from config file', async () => {
            const mockPackageJson = {
                dependencies: {}
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(true);  // webpack.config.ts

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('webpack-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'webpack.config.ts')
            );
        });

        it('should detect Vite build tool from config file', async () => {
            const mockPackageJson = {
                dependencies: {}
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(false) // webpack.config.ts
                .mockResolvedValueOnce(false) // vite.config.js
                .mockResolvedValueOnce(true); // vite.config.ts

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('vite-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'vite.config.ts')
            );
        });

        it('should detect Rollup build tool from config file', async () => {
            const mockPackageJson = {
                dependencies: {}
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(false) // webpack.config.ts
                .mockResolvedValueOnce(false) // vite.config.js
                .mockResolvedValueOnce(false) // vite.config.ts
                .mockResolvedValueOnce(false) // rollup.config.js
                .mockResolvedValueOnce(true); // rollup.config.ts

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('rollup-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'rollup.config.ts')
            );
        });

        it('should detect TypeScript library when typescript dependency exists', async () => {
            const mockPackageJson = {
                dependencies: {
                    'typescript': '^5.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists.mockResolvedValue(false);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('typescript-library');
        });

        it('should detect TypeScript library when tsconfig.json exists', async () => {
            const mockPackageJson = {
                dependencies: {}
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(false) // webpack.config.ts
                .mockResolvedValueOnce(false) // vite.config.js
                .mockResolvedValueOnce(false) // vite.config.ts
                .mockResolvedValueOnce(false) // rollup.config.js
                .mockResolvedValueOnce(false) // rollup.config.ts
                .mockResolvedValueOnce(true); // tsconfig.json

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('typescript-library');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'tsconfig.json')
            );
        });

        it('should return node-app for basic Node.js project', async () => {
            const mockPackageJson = {
                dependencies: {
                    'lodash': '^4.17.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists.mockResolvedValue(false);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('node-app');
        });

        it('should return unknown when package.json is null', async () => {
            mockFileUtils.readJsonFile.mockResolvedValue(null);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('unknown');
        });

        it('should return unknown when package.json read fails', async () => {
            mockFileUtils.readJsonFile.mockRejectedValue(new Error('File not found'));

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('unknown');
            expect(mockLogger.error).toHaveBeenCalledWith(
                'ProjectTypeAnalyzer: Failed to get project type',
                {
                    projectPath,
                    error: 'File not found'
                }
            );
        });

        it('should handle package.json without dependencies', async () => {
            const mockPackageJson = {
                name: 'test-project',
                version: '1.0.0'
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists.mockResolvedValue(false);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('node-app');
        });

        it('should handle package.json with only devDependencies', async () => {
            const mockPackageJson = {
                devDependencies: {
                    'jest': '^29.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);
            mockFileUtils.fileExists.mockResolvedValue(false);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('node-app');
        });

        it('should prioritize frontend frameworks over backend frameworks', async () => {
            const mockPackageJson = {
                dependencies: {
                    'react': '^18.0.0',
                    'express': '^4.18.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('react-app');
        });

        it('should prioritize backend frameworks over build tools', async () => {
            const mockPackageJson = {
                dependencies: {
                    'express': '^4.18.0',
                    'webpack': '^5.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('express-app');
        });

        it('should prioritize build tools over TypeScript detection', async () => {
            const mockPackageJson = {
                dependencies: {
                    'webpack': '^5.0.0',
                    'typescript': '^5.0.0'
                }
            };

            mockFileUtils.readJsonFile.mockResolvedValue(mockPackageJson);

            const result = await projectTypeAnalyzer.getProjectType(projectPath);

            expect(result).toBe('webpack-app');
        });
    });

    describe('detectFrontendFramework', () => {
        it('should detect React framework', () => {
            const dependencies = {
                'react': '^18.0.0',
                'react-dom': '^18.0.0'
            };

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBe('react-app');
        });

        it('should detect Vue framework', () => {
            const dependencies = {
                'vue': '^3.0.0'
            };

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBe('vue-app');
        });

        it('should detect Angular framework', () => {
            const dependencies = {
                '@angular/core': '^15.0.0'
            };

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBe('angular-app');
        });

        it('should detect Svelte framework', () => {
            const dependencies = {
                'svelte': '^4.0.0'
            };

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBe('svelte-app');
        });

        it('should detect Next.js framework', () => {
            const dependencies = {
                'next': '^13.0.0'
            };

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBe('next-app');
        });

        it('should detect Nuxt.js framework', () => {
            const dependencies = {
                'nuxt': '^3.0.0'
            };

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBe('nuxt-app');
        });

        it('should return null when no frontend framework is detected', () => {
            const dependencies = {
                'lodash': '^4.17.0',
                'express': '^4.18.0'
            };

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBeNull();
        });

        it('should return null for empty dependencies', () => {
            const dependencies = {};

            const result = projectTypeAnalyzer.detectFrontendFramework(dependencies);

            expect(result).toBeNull();
        });

        it('should return null for null dependencies', () => {
            const result = projectTypeAnalyzer.detectFrontendFramework(null);

            expect(result).toBeNull();
        });
    });

    describe('detectBackendFramework', () => {
        it('should detect Express framework', () => {
            const dependencies = {
                'express': '^4.18.0'
            };

            const result = projectTypeAnalyzer.detectBackendFramework(dependencies);

            expect(result).toBe('express-app');
        });

        it('should detect Koa framework', () => {
            const dependencies = {
                'koa': '^2.14.0'
            };

            const result = projectTypeAnalyzer.detectBackendFramework(dependencies);

            expect(result).toBe('koa-app');
        });

        it('should detect Fastify framework', () => {
            const dependencies = {
                'fastify': '^4.0.0'
            };

            const result = projectTypeAnalyzer.detectBackendFramework(dependencies);

            expect(result).toBe('fastify-app');
        });

        it('should detect NestJS framework', () => {
            const dependencies = {
                '@nestjs/core': '^10.0.0'
            };

            const result = projectTypeAnalyzer.detectBackendFramework(dependencies);

            expect(result).toBe('nest-app');
        });

        it('should return null when no backend framework is detected', () => {
            const dependencies = {
                'lodash': '^4.17.0',
                'react': '^18.0.0'
            };

            const result = projectTypeAnalyzer.detectBackendFramework(dependencies);

            expect(result).toBeNull();
        });

        it('should return null for empty dependencies', () => {
            const dependencies = {};

            const result = projectTypeAnalyzer.detectBackendFramework(dependencies);

            expect(result).toBeNull();
        });

        it('should return null for null dependencies', () => {
            const result = projectTypeAnalyzer.detectBackendFramework(null);

            expect(result).toBeNull();
        });
    });

    describe('detectBuildTool', () => {
        const projectPath = '/test/project/path';

        it('should detect Webpack from dependencies', async () => {
            const dependencies = {
                'webpack': '^5.0.0'
            };

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('webpack-app');
        });

        it('should detect Vite from dependencies', async () => {
            const dependencies = {
                'vite': '^4.0.0'
            };

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('vite-app');
        });

        it('should detect Rollup from dependencies', async () => {
            const dependencies = {
                'rollup': '^3.0.0'
            };

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('rollup-app');
        });

        it('should detect Webpack from config file', async () => {
            const dependencies = {};
            mockFileUtils.fileExists
                .mockResolvedValueOnce(true); // webpack.config.js

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('webpack-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'webpack.config.js')
            );
        });

        it('should detect Webpack from TypeScript config file', async () => {
            const dependencies = {};
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(true); // webpack.config.ts

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('webpack-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'webpack.config.ts')
            );
        });

        it('should detect Vite from config file', async () => {
            const dependencies = {};
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(false) // webpack.config.ts
                .mockResolvedValueOnce(true); // vite.config.js

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('vite-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'vite.config.js')
            );
        });

        it('should detect Vite from TypeScript config file', async () => {
            const dependencies = {};
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(false) // webpack.config.ts
                .mockResolvedValueOnce(false) // vite.config.js
                .mockResolvedValueOnce(true); // vite.config.ts

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('vite-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'vite.config.ts')
            );
        });

        it('should detect Rollup from config file', async () => {
            const dependencies = {};
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(false) // webpack.config.ts
                .mockResolvedValueOnce(false) // vite.config.js
                .mockResolvedValueOnce(false) // vite.config.ts
                .mockResolvedValueOnce(true); // rollup.config.js

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('rollup-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'rollup.config.js')
            );
        });

        it('should detect Rollup from TypeScript config file', async () => {
            const dependencies = {};
            mockFileUtils.fileExists
                .mockResolvedValueOnce(false) // webpack.config.js
                .mockResolvedValueOnce(false) // webpack.config.ts
                .mockResolvedValueOnce(false) // vite.config.js
                .mockResolvedValueOnce(false) // vite.config.ts
                .mockResolvedValueOnce(false) // rollup.config.js
                .mockResolvedValueOnce(true); // rollup.config.ts

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('rollup-app');
            expect(mockFileUtils.fileExists).toHaveBeenCalledWith(
                path.join(projectPath, 'rollup.config.ts')
            );
        });

        it('should return null when no build tool is detected', async () => {
            const dependencies = {
                'lodash': '^4.17.0'
            };
            mockFileUtils.fileExists.mockResolvedValue(false);

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBeNull();
        });

        it('should prioritize dependencies over config files', async () => {
            const dependencies = {
                'webpack': '^5.0.0'
            };
            mockFileUtils.fileExists.mockResolvedValue(true);

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBe('webpack-app');
            expect(mockFileUtils.fileExists).not.toHaveBeenCalled();
        });

        it('should handle fileExists errors gracefully', async () => {
            const dependencies = {};
            mockFileUtils.fileExists.mockRejectedValue(new Error('Permission denied'));

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBeNull();
        });

        it('should handle empty dependencies', async () => {
            const dependencies = {};
            mockFileUtils.fileExists.mockResolvedValue(false);

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, dependencies);

            expect(result).toBeNull();
        });

        it('should handle null dependencies', async () => {
            mockFileUtils.fileExists.mockResolvedValue(false);

            const result = await projectTypeAnalyzer.detectBuildTool(projectPath, null);

            expect(result).toBeNull();
        });
    });

    describe('error handling', () => {
        it('should handle logger errors gracefully when logger is undefined', async () => {
            const analyzerWithoutLogger = new ProjectTypeAnalyzer(undefined, mockFileUtils);
            mockFileUtils.readJsonFile.mockRejectedValue(new Error('File not found'));

            const result = await analyzerWithoutLogger.getProjectType('/test/path');

            expect(result).toBe('unknown');
        });

        it('should handle fileUtils errors gracefully when fileUtils is undefined', async () => {
            const analyzerWithoutFileUtils = new ProjectTypeAnalyzer(mockLogger, undefined);

            const result = await analyzerWithoutFileUtils.getProjectType('/test/path');

            expect(result).toBe('unknown');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
}); 