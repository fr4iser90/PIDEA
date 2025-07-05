const fs = require('fs').promises;
const path = require('path');

class TechStackAnalyzer {
    constructor() {}

    async analyzeTechStack(projectPath, options = {}) {
        const techStack = {
            frameworks: [],
            libraries: [],
            tools: [],
            languages: [],
            databases: [],
            cloudServices: [],
            recommendations: []
        };

        try {
            // Analyze backend package.json
            const backendPackagePath = path.join(projectPath, 'backend', 'package.json');
            try {
                const backendPackage = JSON.parse(await fs.readFile(backendPackagePath, 'utf8'));
                this.analyzePackageJson(backendPackage, techStack, 'backend');
            } catch (error) {
                // Backend package.json not found
            }

            // Analyze frontend package.json
            const frontendPackagePath = path.join(projectPath, 'frontend', 'package.json');
            try {
                const frontendPackage = JSON.parse(await fs.readFile(frontendPackagePath, 'utf8'));
                this.analyzePackageJson(frontendPackage, techStack, 'frontend');
            } catch (error) {
                // Frontend package.json not found
            }

            // Analyze root package.json
            const rootPackagePath = path.join(projectPath, 'package.json');
            try {
                const rootPackage = JSON.parse(await fs.readFile(rootPackagePath, 'utf8'));
                this.analyzePackageJson(rootPackage, techStack, 'root');
            } catch (error) {
                // Root package.json not found
            }

            // Detect languages from file extensions
            await this.detectLanguages(projectPath, techStack);

            // Detect databases
            await this.detectDatabases(projectPath, techStack);

            // Detect cloud services
            await this.detectCloudServices(projectPath, techStack);

            // Generate recommendations
            this.generateRecommendations(techStack);

        } catch (error) {
            console.error('Error analyzing tech stack:', error);
        }

        return techStack;
    }

    analyzePackageJson(packageJson, techStack, context) {
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        // Framework detection
        if (allDeps.react) {
            techStack.frameworks.push({
                name: 'React',
                version: allDeps.react,
                context: context
            });
        }
        if (allDeps.vue) {
            techStack.frameworks.push({
                name: 'Vue.js',
                version: allDeps.vue,
                context: context
            });
        }
        if (allDeps.express) {
            techStack.frameworks.push({
                name: 'Express.js',
                version: allDeps.express,
                context: context
            });
        }
        if (allDeps['@angular/core']) {
            techStack.frameworks.push({
                name: 'Angular',
                version: allDeps['@angular/core'],
                context: context
            });
        }

        // Library detection
        const libraries = [
            'socket.io', 'playwright', 'jest', 'vite', 'webpack', 'babel',
            'tailwindcss', 'postcss', 'autoprefixer', 'eslint', 'prettier',
            'nodemon', 'concurrently', 'cors', 'helmet', 'bcryptjs',
            'jsonwebtoken', 'winston', 'pg', 'sqlite3', 'uuid'
        ];

        libraries.forEach(lib => {
            if (allDeps[lib]) {
                techStack.libraries.push({
                    name: lib,
                    version: allDeps[lib],
                    context: context
                });
            }
        });

        // Tool detection
        const tools = [
            'vite', 'webpack', 'babel', 'eslint', 'prettier', 'jest',
            'nodemon', 'concurrently', 'husky', 'lint-staged'
        ];

        tools.forEach(tool => {
            if (allDeps[tool]) {
                techStack.tools.push({
                    name: tool,
                    version: allDeps[tool],
                    context: context
                });
            }
        });
    }

    async detectLanguages(projectPath, techStack) {
        const fileExtensions = new Set();
        
        const scanDirectory = async (dir) => {
            try {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    try {
                        const stats = await fs.stat(itemPath);
                        if (stats.isDirectory()) {
                            await scanDirectory(itemPath);
                        } else {
                            const ext = path.extname(item);
                            if (ext) fileExtensions.add(ext);
                        }
                    } catch (error) {
                        // Skip files we can't access
                    }
                }
            } catch (error) {
                // Skip directories we can't access
            }
        };

        await scanDirectory(projectPath);

        // Map extensions to languages
        const languageMap = {
            '.js': 'JavaScript',
            '.jsx': 'JSX',
            '.ts': 'TypeScript',
            '.tsx': 'TSX',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.sass': 'Sass',
            '.json': 'JSON',
            '.sql': 'SQL',
            '.md': 'Markdown',
            '.yml': 'YAML',
            '.yaml': 'YAML',
            '.sh': 'Shell',
            '.py': 'Python',
            '.java': 'Java',
            '.cs': 'C#',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.go': 'Go',
            '.rs': 'Rust'
        };

        fileExtensions.forEach(ext => {
            if (languageMap[ext]) {
                techStack.languages.push(languageMap[ext]);
            }
        });

        // Remove duplicates
        techStack.languages = [...new Set(techStack.languages)];
    }

    async detectDatabases(projectPath, techStack) {
        try {
            // Check for database dependencies
            const backendPackagePath = path.join(projectPath, 'backend', 'package.json');
            const backendPackage = JSON.parse(await fs.readFile(backendPackagePath, 'utf8'));
            const allDeps = { ...backendPackage.dependencies, ...backendPackage.devDependencies };

            const dbDependencies = {
                'pg': 'PostgreSQL',
                'mysql2': 'MySQL',
                'sqlite3': 'SQLite',
                'mongodb': 'MongoDB',
                'mongoose': 'MongoDB',
                'sequelize': 'SQL Database',
                'prisma': 'Database ORM',
                'typeorm': 'TypeORM'
            };

            Object.entries(dbDependencies).forEach(([dep, dbName]) => {
                if (allDeps[dep]) {
                    techStack.databases.push({
                        name: dbName,
                        driver: dep,
                        version: allDeps[dep]
                    });
                }
            });

            // Check for database files
            const dbFiles = ['init.sql', 'seed.sql', 'schema.sql'];
            for (const file of dbFiles) {
                try {
                    await fs.access(path.join(projectPath, file));
                    techStack.databases.push({
                        name: 'SQL Database',
                        files: [file]
                    });
                    break;
                } catch (error) {
                    // File not found
                }
            }

        } catch (error) {
            // Ignore errors
        }
    }

    async detectCloudServices(projectPath, techStack) {
        try {
            // Check for cloud service dependencies
            const backendPackagePath = path.join(projectPath, 'backend', 'package.json');
            const backendPackage = JSON.parse(await fs.readFile(backendPackagePath, 'utf8'));
            const allDeps = { ...backendPackage.dependencies, ...backendPackage.devDependencies };

            const cloudDependencies = {
                'aws-sdk': 'AWS',
                '@aws-sdk/client-s3': 'AWS S3',
                '@aws-sdk/client-dynamodb': 'AWS DynamoDB',
                'firebase': 'Firebase',
                'google-cloud': 'Google Cloud',
                'azure': 'Azure',
                'heroku': 'Heroku'
            };

            Object.entries(cloudDependencies).forEach(([dep, service]) => {
                if (allDeps[dep]) {
                    techStack.cloudServices.push({
                        name: service,
                        sdk: dep,
                        version: allDeps[dep]
                    });
                }
            });

            // Check for Docker
            try {
                await fs.access(path.join(projectPath, 'Dockerfile'));
                techStack.cloudServices.push({
                    name: 'Docker',
                    type: 'Containerization'
                });
            } catch (error) {
                // Dockerfile not found
            }

            // Check for docker-compose
            try {
                await fs.access(path.join(projectPath, 'docker-compose.yml'));
                techStack.cloudServices.push({
                    name: 'Docker Compose',
                    type: 'Container Orchestration'
                });
            } catch (error) {
                // docker-compose.yml not found
            }

        } catch (error) {
            // Ignore errors
        }
    }

    generateRecommendations(techStack) {
        // TypeScript recommendation
        if (techStack.languages.includes('JavaScript') && !techStack.languages.includes('TypeScript')) {
            techStack.recommendations.push({
                title: 'Consider TypeScript',
                description: 'Add TypeScript for better type safety and developer experience',
                priority: 'medium',
                category: 'development'
            });
        }

        // Testing recommendation
        const hasTestingFramework = techStack.tools.some(tool => 
            ['jest', 'mocha', 'vitest'].includes(tool.name.toLowerCase())
        );
        if (!hasTestingFramework) {
            techStack.recommendations.push({
                title: 'Add Testing Framework',
                description: 'Implement Jest or Vitest for unit and integration testing',
                priority: 'high',
                category: 'testing'
            });
        }

        // Code quality tools
        const hasLinting = techStack.tools.some(tool => 
            ['eslint', 'prettier'].includes(tool.name.toLowerCase())
        );
        if (!hasLinting) {
            techStack.recommendations.push({
                title: 'Add Code Quality Tools',
                description: 'Implement ESLint and Prettier for consistent code style',
                priority: 'medium',
                category: 'quality'
            });
        }

        // Database recommendation
        if (techStack.databases.length === 0) {
            techStack.recommendations.push({
                title: 'Add Database',
                description: 'Consider adding a database for data persistence',
                priority: 'medium',
                category: 'database'
            });
        }

        // Security recommendation
        const hasSecurityMiddleware = techStack.libraries.some(lib => 
            ['helmet', 'cors', 'bcryptjs'].includes(lib.name.toLowerCase())
        );
        if (!hasSecurityMiddleware) {
            techStack.recommendations.push({
                title: 'Add Security Middleware',
                description: 'Implement security middleware like helmet and CORS',
                priority: 'high',
                category: 'security'
            });
        }
    }
}

module.exports = TechStackAnalyzer; 