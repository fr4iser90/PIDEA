const fs = require('fs').promises;
const path = require('path');

class AnalysisOutputService {
    constructor() {
        this.outputBasePath = path.join(process.cwd(), '..', 'output');
        this.analysisPath = path.join(this.outputBasePath, 'analysis');
        this.projectsPath = path.join(this.analysisPath, 'projects');
        this.ensureDirectories();
    }

    async ensureDirectories() {
        const dirs = [this.outputBasePath, this.analysisPath, this.projectsPath];
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
            }
        }
    }

    async saveAnalysisResult(projectId, analysisType, data) {
        const projectDir = path.join(this.projectsPath, projectId);
        await fs.mkdir(projectDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${analysisType}-${timestamp}.json`;
        const filepath = path.join(projectDir, filename);

        const result = {
            projectId,
            analysisType,
            timestamp: new Date().toISOString(),
            data
        };

        await fs.writeFile(filepath, JSON.stringify(result, null, 2));
        return { filepath, filename, result };
    }

    async generateMarkdownReport(projectId, analysisResults) {
        const projectDir = path.join(this.projectsPath, projectId);
        await fs.mkdir(projectDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFilename = `analysis-report-${timestamp}`;
        
        // Check if this is a monorepo with multiple packages
        const packages = this.extractPackagesFromAnalysis(analysisResults);
        
        if (packages.length > 1) {
            // Generate separate reports for each package
            return await this.generateMonorepoReports(projectId, analysisResults, packages, baseFilename);
        } else {
            // Generate single report for single package
            return await this.generateSinglePackageReport(projectId, analysisResults, baseFilename);
        }
    }

    extractPackagesFromAnalysis(analysisResults) {
        const packages = [];
        
        console.log('DEBUG: extractPackagesFromAnalysis called with:', Object.keys(analysisResults));
        
        // Extract packages from dependencies analysis (multiple possible locations)
        if (analysisResults.Dependencies && analysisResults.Dependencies.data && analysisResults.Dependencies.data.packages) {
            console.log('DEBUG: Found packages in Dependencies.data.packages');
            packages.push(...analysisResults.Dependencies.data.packages);
        }
        
        // Extract packages from structure analysis (where they actually are!)
        if (analysisResults.structure && analysisResults.structure.data && analysisResults.structure.data.dependenciesAnalysis && analysisResults.structure.data.dependenciesAnalysis.packages) {
            console.log('DEBUG: Found packages in structure.data.dependenciesAnalysis.packages');
            packages.push(...analysisResults.structure.data.dependenciesAnalysis.packages);
        }
        
        // Extract packages from architecture analysis (new structure)
        if (analysisResults.Architecture && analysisResults.Architecture.data) {
            // Check for new monorepo structure
            if (analysisResults.Architecture.data.isMonorepo && analysisResults.Architecture.data.packages) {
                console.log('DEBUG: Found packages in Architecture.data.packages (monorepo)');
                packages.push(...analysisResults.Architecture.data.packages);
            }
            // Check for old structure
            else if (analysisResults.Architecture.data.packages) {
                console.log('DEBUG: Found packages in Architecture.data.packages (legacy)');
                packages.push(...analysisResults.Architecture.data.packages);
            }
        }
        
        // Check all possible locations recursively
        const checkForPackages = (obj, path = '') => {
            if (obj && typeof obj === 'object') {
                if (obj.packages && Array.isArray(obj.packages)) {
                    console.log(`DEBUG: Found packages in ${path}.packages`);
                    packages.push(...obj.packages);
                }
                Object.entries(obj).forEach(([key, value]) => {
                    checkForPackages(value, path ? `${path}.${key}` : key);
                });
            }
        };
        
        checkForPackages(analysisResults);
        
        console.log('DEBUG: Total packages found:', packages.length);
        
        // If no packages found, assume single package
        if (packages.length === 0) {
            console.log('DEBUG: No packages found, using single package');
            packages.push({ name: 'root', path: '.', relativePath: '.' });
        }
        
        return packages;
    }

    calculateAverageCoupling(coupling) {
        if (!coupling || Object.keys(coupling).length === 0) return 0;
        
        const values = Object.values(coupling).filter(v => typeof v === 'number');
        if (values.length === 0) return 0;
        
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateAverageCohesion(cohesion) {
        if (!cohesion || Object.keys(cohesion).length === 0) return 0;
        
        const values = Object.values(cohesion).filter(v => typeof v === 'number');
        if (values.length === 0) return 0;
        
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateComplexityScore(architecture) {
        let score = 0;
        
        if (architecture.patterns) score += architecture.patterns.length * 10;
        if (architecture.layers) score += architecture.layers.length * 5;
        if (architecture.modules) score += architecture.modules.length * 3;
        if (architecture.antiPatterns) score += architecture.antiPatterns.length * 15;
        
        return score;
    }

    filterAnalysisResultsForPackage(analysisResults, pkg) {
        const packageResults = {};
        
        // Filter each analysis type for this specific package
        Object.entries(analysisResults).forEach(([type, result]) => {
            if (result && result.data) {
                // For dependencies, filter by package
                if (type === 'Dependencies' && result.data.packages) {
                    const packageData = result.data.packages.find(p => p.path === pkg.path);
                    if (packageData) {
                        packageResults[type] = {
                            ...result,
                            data: packageData
                        };
                    }
                }
                // For repository structure, filter files by package path
                else if (type === 'Repository Structure' && result.data.structure && result.data.structure.files) {
                    const packageFiles = result.data.structure.files.filter(file => {
                        const filePath = file.path || file;
                        return filePath.includes(pkg.path) || filePath.startsWith(pkg.relativePath);
                    });
                    if (packageFiles.length > 0) {
                        packageResults[type] = {
                            ...result,
                            data: {
                                ...result.data,
                                structure: {
                                    ...result.data.structure,
                                    files: packageFiles
                                }
                            }
                        };
                    }
                }
                // For architecture, use package-specific data if available
                else if (type === 'Architecture' && result.data) {
                    // Check if this is a monorepo with package-specific architecture data
                    if (result.data.isMonorepo && result.data.packageArchitectures && result.data.packageArchitectures[pkg.name]) {
                        const packageArchitecture = result.data.packageArchitectures[pkg.name];
                        const architecture = packageArchitecture.architecture;
                        
                        const packageArchitectureData = {
                            package: pkg.name,
                            packagePath: pkg.path,
                            architectureScore: architecture.architectureScore,
                            detectedPatterns: architecture.detectedPatterns || [],
                            structure: architecture.structure || {},
                            coupling: architecture.coupling || {},
                            cohesion: architecture.cohesion || {},
                            dependencies: architecture.dependencies || {},
                            violations: architecture.violations || [],
                            recommendations: architecture.recommendations || [],
                            patterns: packageArchitecture.patterns || [],
                            layers: packageArchitecture.layers || [],
                            modules: packageArchitecture.modules || [],
                            antiPatterns: packageArchitecture.antiPatterns || [],
                            designPrinciples: packageArchitecture.designPrinciples || []
                        };
                        
                        // Calculate metrics for this package
                        packageArchitectureData.metrics = {
                            patternCount: packageArchitectureData.patterns.length,
                            layerCount: packageArchitectureData.layers.length,
                            moduleCount: packageArchitectureData.modules.length,
                            antiPatternCount: packageArchitectureData.antiPatterns.length,
                            designPrincipleCount: packageArchitectureData.designPrinciples.length,
                            averageCoupling: this.calculateAverageCoupling(packageArchitectureData.coupling),
                            averageCohesion: this.calculateAverageCohesion(packageArchitectureData.cohesion),
                            complexityScore: this.calculateComplexityScore(packageArchitectureData)
                        };
                        
                        packageResults[type] = {
                            ...result,
                            data: packageArchitectureData
                        };
                    } else {
                        // Fallback to old filtering logic for single package or legacy data
                        const packageArchitecture = {
                            ...result.data,
                            package: pkg.name,
                            packagePath: pkg.path
                        };
                        
                        // Filter patterns by package
                        if (result.data.patterns) {
                            packageArchitecture.patterns = result.data.patterns.filter(pattern => {
                                return pattern.files && pattern.files.some(file => 
                                    file.includes(pkg.path) || file.startsWith(pkg.relativePath)
                                );
                            });
                        }
                        
                        // Filter layers by package
                        if (result.data.layers) {
                            packageArchitecture.layers = result.data.layers.filter(layer => {
                                return layer.path && (layer.path.includes(pkg.path) || layer.path.startsWith(pkg.relativePath));
                            });
                        }
                        
                        // Filter modules by package
                        if (result.data.modules) {
                            packageArchitecture.modules = result.data.modules.filter(module => {
                                return module.includes(pkg.path) || module.startsWith(pkg.relativePath);
                            });
                        }
                        
                        // Filter coupling analysis by package
                        if (result.data.coupling) {
                            packageArchitecture.coupling = {};
                            Object.entries(result.data.coupling).forEach(([module, coupling]) => {
                                if (module.includes(pkg.name) || module.includes(path.basename(pkg.path))) {
                                    packageArchitecture.coupling[module] = coupling;
                                }
                            });
                        }
                        
                        // Filter cohesion analysis by package
                        if (result.data.cohesion) {
                            packageArchitecture.cohesion = {};
                            Object.entries(result.data.cohesion).forEach(([module, cohesion]) => {
                                if (module.includes(pkg.name) || module.includes(path.basename(pkg.path))) {
                                    packageArchitecture.cohesion[module] = cohesion;
                                }
                            });
                        }
                        
                        // Recalculate metrics for this package
                        if (packageArchitecture.patterns || packageArchitecture.layers || packageArchitecture.modules) {
                            packageArchitecture.metrics = {
                                patternCount: packageArchitecture.patterns ? packageArchitecture.patterns.length : 0,
                                layerCount: packageArchitecture.layers ? packageArchitecture.layers.length : 0,
                                moduleCount: packageArchitecture.modules ? packageArchitecture.modules.length : 0,
                                antiPatternCount: packageArchitecture.antiPatterns ? packageArchitecture.antiPatterns.length : 0,
                                designPrincipleCount: packageArchitecture.designPrinciples ? packageArchitecture.designPrinciples.length : 0,
                                averageCoupling: this.calculateAverageCoupling(packageArchitecture.coupling),
                                averageCohesion: this.calculateAverageCohesion(packageArchitecture.cohesion),
                                complexityScore: this.calculateComplexityScore(packageArchitecture)
                            };
                        }
                        
                        packageResults[type] = {
                            ...result,
                            data: packageArchitecture
                        };
                    }
                }
                // For other analyses with files, filter by package path
                else if (result.data.files) {
                    const packageFiles = result.data.files.filter(file => {
                        const filePath = file.path || file;
                        return filePath.includes(pkg.path) || filePath.startsWith(pkg.relativePath);
                    });
                    if (packageFiles.length > 0) {
                        packageResults[type] = {
                            ...result,
                            data: {
                                ...result.data,
                                files: packageFiles
                            }
                        };
                    }
                }
                // For metrics-based analyses, keep the data but adjust context
                else {
                    packageResults[type] = {
                        ...result,
                        data: {
                            ...result.data,
                            package: pkg.name,
                            packagePath: pkg.path
                        }
                    };
                }
            }
        });
        
        return packageResults;
    }

    async generateMonorepoReports(projectId, analysisResults, packages, baseFilename) {
        const projectDir = path.join(this.projectsPath, projectId);
        const generatedFiles = [];
        
        // Create main index file
        const indexFilepath = path.join(projectDir, `${baseFilename}-index.md`);
        let indexMarkdown = `# Monorepo Analysis Report\n\n`;
        indexMarkdown += `**Project ID:** ${projectId}\n`;
        indexMarkdown += `**Generated:** ${new Date().toLocaleString()}\n`;
        indexMarkdown += `**Type:** Monorepo (${packages.length} packages)\n\n`;
        indexMarkdown += `## Packages\n\n`;
        
        // Generate report for each package
        for (const pkg of packages) {
            const packageName = pkg.name || path.basename(pkg.path);
            const packageFilename = `${baseFilename}-${packageName}.md`;
            const packageFilepath = path.join(projectDir, packageFilename);
            
            let packageMarkdown = `# Package: ${packageName}\n\n`;
            packageMarkdown += `**Project ID:** ${projectId}\n`;
            packageMarkdown += `**Package:** ${packageName}\n`;
            packageMarkdown += `**Path:** ${pkg.path}\n`;
            packageMarkdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
            
            // Filter analysis results for this package
            const packageResults = this.filterAnalysisResultsForPackage(analysisResults, pkg);
            
                    // Generate package-specific sections (NO Performance/Security here!)
        const sections = [
            { key: 'Architecture', filename: 'architecture' },
            { key: 'Code Quality', filename: 'code-quality' },
            { key: 'Dependencies', filename: 'dependencies' },
            { key: 'Tech Stack', filename: 'tech-stack' }
        ];
            
            for (const section of sections) {
                const data = packageResults[section.key] || packageResults[section.key.toLowerCase()];
                if (data) {
                    packageMarkdown += `## ${section.key}\n\n`;
                    
                    switch (section.key) {
                        case 'Repository Structure':
                            packageMarkdown += this.formatProjectStructureData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Architecture':
                            packageMarkdown += this.formatArchitectureData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Code Quality':
                            packageMarkdown += this.formatCodeQualityData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Dependencies':
                            packageMarkdown += this.formatDependenciesData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Tech Stack':
                            packageMarkdown += this.formatTechStackData(data.data || data);
                            break;
                    }
                }
            }
            
            await fs.writeFile(packageFilepath, packageMarkdown);
            generatedFiles.push(packageFilename);
            
            indexMarkdown += `- [${packageName}](${packageFilename})\n`;
        }
        
        // Add shared structure report (common files)
        const sharedStructureData = analysisResults['Repository Structure'] || analysisResults['repository structure'];
        if (sharedStructureData) {
            const sharedFilename = `${baseFilename}-shared-structure.md`;
            const sharedFilepath = path.join(projectDir, sharedFilename);
            
            let sharedMarkdown = `# Shared Project Structure\n\n`;
            sharedMarkdown += `**Project ID:** ${projectId}\n`;
            sharedMarkdown += `**Generated:** ${new Date().toLocaleString()}\n`;
            sharedMarkdown += `**Scope:** System-wide (common files)\n\n`;
            sharedMarkdown += this.formatProjectStructureData(sharedStructureData.data || sharedStructureData, sharedStructureData.metrics, sharedStructureData.recommendations);
            
            await fs.writeFile(sharedFilepath, sharedMarkdown);
            generatedFiles.push(sharedFilename);
            
            indexMarkdown += `\n## Shared Structure\n\n`;
            indexMarkdown += `- [Shared Structure](${sharedFilename})\n`;
        }
        
        // Add system-wide reports (Performance, Security)
        const systemSections = [
            { key: 'Performance', filename: 'performance' },
            { key: 'Security', filename: 'security' }
        ];
        
        for (const section of systemSections) {
            const data = analysisResults[section.key] || analysisResults[section.key.toLowerCase()];
            if (data) {
                const sectionFilename = `${baseFilename}-${section.filename}.md`;
                const sectionFilepath = path.join(projectDir, sectionFilename);
                
                let sectionMarkdown = `# ${section.key}\n\n`;
                sectionMarkdown += `**Project ID:** ${projectId}\n`;
                sectionMarkdown += `**Generated:** ${new Date().toLocaleString()}\n`;
                sectionMarkdown += `**Scope:** System-wide\n\n`;
                
                switch (section.key) {
                    case 'Performance':
                        sectionMarkdown += this.formatPerformanceData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Security':
                        sectionMarkdown += this.formatSecurityData(data.data || data, data.metrics, data.recommendations);
                        break;
                }
                
                await fs.writeFile(sectionFilepath, sectionMarkdown);
                generatedFiles.push(sectionFilename);
                
                indexMarkdown += `\n## System-wide Reports\n\n`;
                indexMarkdown += `- [${section.key}](${sectionFilename})\n`;
            }
        }
        
        // Add overall suggestions
        const suggestions = this.generateComprehensiveSuggestions(analysisResults);
        if (suggestions.trim()) {
            const suggestionsFilename = `${baseFilename}-suggestions.md`;
            const suggestionsFilepath = path.join(projectDir, suggestionsFilename);
            
            let suggestionsMarkdown = `# Overall Suggestions\n\n`;
            suggestionsMarkdown += `**Project ID:** ${projectId}\n`;
            suggestionsMarkdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
            suggestionsMarkdown += suggestions;
            
            await fs.writeFile(suggestionsFilepath, suggestionsMarkdown);
            generatedFiles.push(suggestionsFilename);
            
            indexMarkdown += `\n## Overall Suggestions\n\n`;
            indexMarkdown += `- [Suggestions](${suggestionsFilename})\n`;
        }
        
        await fs.writeFile(indexFilepath, indexMarkdown);
        
        return { 
            filepath: indexFilepath, 
            filename: `${baseFilename}-index.md`,
            sections: generatedFiles
        };
    }

    async generateSinglePackageReport(projectId, analysisResults, baseFilename) {
        const projectDir = path.join(this.projectsPath, projectId);
        
        // Create main index file
        const indexFilepath = path.join(projectDir, `${baseFilename}-index.md`);
        let indexMarkdown = `# Project Analysis Report\n\n`;
        indexMarkdown += `**Project ID:** ${projectId}\n`;
        indexMarkdown += `**Generated:** ${new Date().toLocaleString()}\n`;
        indexMarkdown += `**Type:** Single Package\n\n`;
        indexMarkdown += `## Report Sections\n\n`;

        const sections = [
            { key: 'Repository Structure', filename: 'repository-structure' },
            { key: 'Architecture', filename: 'architecture' },
            { key: 'Code Quality', filename: 'code-quality' },
            { key: 'Dependencies', filename: 'dependencies' },
            { key: 'Tech Stack', filename: 'tech-stack' },
            { key: 'Performance', filename: 'performance' },
            { key: 'Security', filename: 'security' },
            { key: 'Refactoring', filename: 'refactoring' },
            { key: 'Generation', filename: 'generation' }
        ];

        const generatedFiles = [];

        for (const section of sections) {
            const data = analysisResults[section.key] || analysisResults[section.key.toLowerCase()];
            if (data) {
                const sectionFilename = `${baseFilename}-${section.filename}.md`;
                const sectionFilepath = path.join(projectDir, sectionFilename);
                
                let sectionMarkdown = `# ${section.key}\n\n`;
                sectionMarkdown += `**Project ID:** ${projectId}\n`;
                sectionMarkdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
                
                switch (section.key) {
                    case 'Repository Structure':
                        sectionMarkdown += this.formatProjectStructureData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Architecture':
                        sectionMarkdown += this.formatArchitectureData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Code Quality':
                        sectionMarkdown += this.formatCodeQualityData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Dependencies':
                        sectionMarkdown += this.formatDependenciesData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Tech Stack':
                        sectionMarkdown += this.formatTechStackData(data.data || data);
                        break;
                    case 'Performance':
                        sectionMarkdown += this.formatPerformanceData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Security':
                        sectionMarkdown += this.formatSecurityData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Refactoring':
                        sectionMarkdown += this.formatRefactoringData(data.data || data);
                        break;
                    case 'Generation':
                        sectionMarkdown += this.formatGenerationData(data.data || data);
                        break;
                }
                
                await fs.writeFile(sectionFilepath, sectionMarkdown);
                generatedFiles.push(sectionFilename);
                
                indexMarkdown += `- [${section.key}](${sectionFilename})\n`;
            } else {
                indexMarkdown += `- ${section.key} - No data available\n`;
            }
        }

        // Add suggestions section
        const suggestions = this.generateComprehensiveSuggestions(analysisResults);
        if (suggestions.trim()) {
            const suggestionsFilename = `${baseFilename}-suggestions.md`;
            const suggestionsFilepath = path.join(projectDir, suggestionsFilename);
            
            let suggestionsMarkdown = `# Suggestions\n\n`;
            suggestionsMarkdown += `**Project ID:** ${projectId}\n`;
            suggestionsMarkdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
            suggestionsMarkdown += suggestions;
            
            await fs.writeFile(suggestionsFilepath, suggestionsMarkdown);
            generatedFiles.push(suggestionsFilename);
            
            indexMarkdown += `- [Suggestions](${suggestionsFilename})\n`;
        }

        await fs.writeFile(indexFilepath, indexMarkdown);
        
        return { 
            filepath: indexFilepath, 
            filename: `${baseFilename}-index.md`,
            sections: generatedFiles
        };
    }

    generateComprehensiveSuggestions(analysisResults) {
        let suggestions = `### Overall Recommendations\n\n`;
        
        const allRecommendations = [];
        
        // Collect all recommendations from different sections
        Object.entries(analysisResults).forEach(([type, result]) => {
            if (result && result.recommendations) {
                result.recommendations.forEach(rec => {
                    allRecommendations.push({
                        type: type,
                        recommendation: rec
                    });
                });
            }
        });

        if (allRecommendations.length === 0) {
            suggestions += `No specific recommendations available at this time.\n\n`;
            suggestions += `Consider running additional analysis phases to generate targeted suggestions.\n\n`;
        } else {
            // Group by priority
            const highPriority = allRecommendations.filter(r => 
                r.recommendation.priority === 'high' || 
                (typeof r.recommendation === 'string' && r.recommendation.toLowerCase().includes('critical'))
            );
            
            const mediumPriority = allRecommendations.filter(r => 
                r.recommendation.priority === 'medium' || 
                (typeof r.recommendation === 'string' && !r.recommendation.toLowerCase().includes('critical'))
            );
            
            const lowPriority = allRecommendations.filter(r => 
                r.recommendation.priority === 'low'
            );

            if (highPriority.length > 0) {
                suggestions += `#### High Priority\n\n`;
                highPriority.forEach(rec => {
                    if (typeof rec.recommendation === 'string') {
                        suggestions += `- **${rec.type}:** ${rec.recommendation}\n`;
                    } else {
                        suggestions += `- **${rec.type}:** ${rec.recommendation.title || rec.recommendation.description}\n`;
                    }
                });
                suggestions += `\n`;
            }

            if (mediumPriority.length > 0) {
                suggestions += `#### Medium Priority\n\n`;
                mediumPriority.forEach(rec => {
                    if (typeof rec.recommendation === 'string') {
                        suggestions += `- **${rec.type}:** ${rec.recommendation}\n`;
                    } else {
                        suggestions += `- **${rec.type}:** ${rec.recommendation.title || rec.recommendation.description}\n`;
                    }
                });
                suggestions += `\n`;
            }

            if (lowPriority.length > 0) {
                suggestions += `#### Low Priority\n\n`;
                lowPriority.forEach(rec => {
                    if (typeof rec.recommendation === 'string') {
                        suggestions += `- **${rec.type}:** ${rec.recommendation}\n`;
                    } else {
                        suggestions += `- **${rec.type}:** ${rec.recommendation.title || rec.recommendation.description}\n`;
                    }
                });
                suggestions += `\n`;
            }
        }

        return suggestions;
    }

    formatAnalysisType(type) {
        return type.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
    }

    formatAnalysisData(type, data) {
        // Handle new VibeCoder mode data structure
        if (data && typeof data === 'object' && data.data && data.metrics && data.recommendations) {
            // New structure: { data: {...}, metrics: {...}, recommendations: [...] }
            const analysisData = data.data;
            const metrics = data.metrics;
            const recommendations = data.recommendations;
            
            switch (type) {
                case 'codeQuality':
                case 'Code Quality':
                    return this.formatCodeQualityData(analysisData, metrics, recommendations);
                case 'security':
                case 'Security':
                    return this.formatSecurityData(analysisData, metrics, recommendations);
                case 'performance':
                case 'Performance':
                    return this.formatPerformanceData(analysisData, metrics, recommendations);
                case 'architecture':
                case 'Architecture':
                    return this.formatArchitectureData(analysisData, metrics, recommendations);
                case 'projectStructure':
                case 'Repository Structure':
                    return this.formatProjectStructureData(analysisData, metrics, recommendations);
                case 'Dependencies':
                    return this.formatDependenciesData(analysisData, metrics, recommendations);
                case 'Tech Stack':
                    return this.formatTechStackData(analysisData, metrics, recommendations);
                case 'Refactoring':
                    return this.formatRefactoringData(analysisData, metrics, recommendations);
                case 'Generation':
                    return this.formatGenerationData(analysisData, metrics, recommendations);
                default:
                    return this.formatGenericAnalysisData(type, analysisData, metrics, recommendations);
            }
        }
        
        // Handle legacy data structure
        switch (type) {
            case 'codeQuality':
            case 'Code Quality':
                return this.formatCodeQualityData(data);
            case 'security':
            case 'Security':
                return this.formatSecurityData(data);
            case 'performance':
            case 'Performance':
                return this.formatPerformanceData(data);
            case 'architecture':
            case 'Architecture':
                return this.formatArchitectureData(data);
            case 'projectStructure':
            case 'Repository Structure':
                return this.formatProjectStructureData(data);
            case 'Dependencies':
                return this.formatDependenciesData(data);
            case 'Tech Stack':
                return this.formatTechStackData(data);
            case 'Refactoring':
                return this.formatRefactoringData(data);
            case 'Generation':
                return this.formatGenerationData(data);
            default:
                return this.formatGenericAnalysisData(type, data);
        }
    }

    formatCodeQualityData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const qualityMetrics = metrics || data.metrics || {};
        const qualityRecommendations = recommendations || data.recommendations || [];
        
        md += '### Code Quality Analysis\n\n';
        
        // Overall Score
        if (data.overallScore !== undefined) {
            md += `**Overall Quality Score:** ${data.overallScore}/100\n\n`;
        }
        
        // Metrics Table
        if (qualityMetrics && Object.keys(qualityMetrics).length > 0) {
            md += '### Quality Metrics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            
            Object.entries(qualityMetrics).forEach(([metric, value]) => {
                if (value !== null && value !== undefined) {
                    if (typeof value === 'object') {
                        // Handle nested metrics
                        Object.entries(value).forEach(([subMetric, subValue]) => {
                            if (subValue !== null && subValue !== undefined) {
                                md += `| ${metric}.${subMetric} | ${subValue} |\n`;
                            }
                        });
                    } else {
                        md += `| ${metric} | ${value} |\n`;
                    }
                }
            });
            md += '\n';
        }
        
        // Issues
        if (data.issues && data.issues.length > 0) {
            md += '### Issues Found\n\n';
            data.issues.forEach(issue => {
                md += `- **${issue.type || issue.rule || 'Issue'}**: ${issue.message || issue.description}\n`;
                if (issue.file) md += `  - File: \`${issue.file}\`\n`;
                if (issue.line) md += `  - Line: ${issue.line}\n`;
                if (issue.severity) md += `  - Severity: ${issue.severity}\n`;
                md += '\n';
            });
        }
        
        // Detailed Issues from Real Metrics
        if (data.largeFiles && data.largeFiles.length > 0) {
            md += '### Large Files (>500 LOC)\n\n';
            data.largeFiles.forEach(file => {
                md += `- **${file.file}**: ${file.lines} lines\n`;
            });
            md += '\n';
        }
        
        if (data.magicNumberFiles && data.magicNumberFiles.length > 0) {
            md += '### Files with Many Magic Numbers (>20)\n\n';
            data.magicNumberFiles.forEach(file => {
                md += `- **${file.file}**: ${file.magicNumbers} magic numbers\n`;
            });
            md += '\n';
        }
        
        if (data.complexityIssuesList && data.complexityIssuesList.length > 0) {
            md += '### Complexity Issues\n\n';
            data.complexityIssuesList.forEach(issue => {
                md += `- **${issue.file}**: ${issue.issue}\n`;
            });
            md += '\n';
        }
        
        if (data.lintingIssuesList && data.lintingIssuesList.length > 0) {
            md += '### Linting Issues\n\n';
            data.lintingIssuesList.forEach(issue => {
                md += `- **${issue.file}:${issue.line}**: ${issue.issue}\n`;
                if (issue.code) {
                    md += `  \`${issue.code}\`\n`;
                }
            });
            md += '\n';
        }
        
        // Configuration
        if (data.configuration) {
            md += '### Configuration\n\n';
            
            if (data.configuration.linting) {
                md += '#### Linting\n';
                md += `- ESLint: ${data.configuration.linting.hasESLint ? 'Yes' : 'No'}\n`;
                md += `- Prettier: ${data.configuration.linting.hasPrettier ? 'Yes' : 'No'}\n`;
                md += `- Husky: ${data.configuration.linting.hasHusky ? 'Yes' : 'No'}\n`;
                md += `- Lint-staged: ${data.configuration.linting.hasLintStaged ? 'Yes' : 'No'}\n`;
                md += '\n';
            }
            
            if (data.configuration.formatting) {
                md += '#### Formatting\n';
                md += `- Prettier: ${data.configuration.formatting.hasPrettier ? 'Yes' : 'No'}\n`;
                md += `- EditorConfig: ${data.configuration.formatting.hasEditorConfig ? 'Yes' : 'No'}\n`;
                md += `- VSCode Settings: ${data.configuration.formatting.hasVSCodeSettings ? 'Yes' : 'No'}\n`;
                md += '\n';
            }
        }
        
        // Coverage
        if (data.coverage && Object.keys(data.coverage).length > 0) {
            md += '### Test Coverage\n\n';
            Object.entries(data.coverage).forEach(([type, coverage]) => {
                md += `- **${type}:** ${coverage}%\n`;
            });
            md += '\n';
        }
        
        // Recommendations
        if (qualityRecommendations && qualityRecommendations.length > 0) {
            md += '### Recommendations\n\n';
            qualityRecommendations.forEach(rec => {
                if (typeof rec === 'string') {
                    md += `- ${rec}\n`;
                } else {
                    md += `- **${rec.title || rec.type}** (${rec.severity || rec.priority} priority)\n`;
                    md += `  ${rec.message || rec.description || 'No description available'}\n`;
                    if (rec.category) md += `  - Category: ${rec.category}\n`;
                }
                md += '\n';
            });
        }
        
        return md;
    }

    formatSecurityData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const securityMetrics = metrics || data.metrics || {};
        const securityRecommendations = recommendations || data.recommendations || [];
        
        if (data.vulnerabilities && data.vulnerabilities.length > 0) {
            md += '### Security Vulnerabilities\n\n';
            md += '| Severity | Type | Description | File |\n';
            md += '|----------|------|-------------|------|\n';
            
            data.vulnerabilities.forEach(vuln => {
                md += `| ${vuln.severity} | ${vuln.type} | ${vuln.description} | \`${vuln.file || 'N/A'}\` |\n`;
            });
            md += '\n';
        }

        if (data.securityScore !== undefined) {
            md += `**Security Score:** ${data.securityScore}/100\n\n`;
        }
        
        // Metrics Table
        if (securityMetrics && Object.keys(securityMetrics).length > 0) {
            md += '### Security Metrics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            
            Object.entries(securityMetrics).forEach(([metric, value]) => {
                if (value !== null && value !== undefined) {
                    md += `| ${metric} | ${value} |\n`;
                }
            });
            md += '\n';
        }

        // Recommendations
        if (securityRecommendations && securityRecommendations.length > 0) {
            md += '### Security Recommendations\n\n';
            securityRecommendations.forEach(rec => {
                if (typeof rec === 'string') {
                    md += `- ${rec}\n`;
                } else {
                    md += `- **${rec.title}** (${rec.priority} priority)\n`;
                    md += `  ${rec.description}\n`;
                    if (rec.category) md += `  - Category: ${rec.category}\n`;
                }
                md += '\n';
            });
        }

        return md;
    }

    formatPerformanceData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const perfMetrics = metrics || data.metrics || {};
        const perfRecommendations = recommendations || data.recommendations || [];
        
        if (perfMetrics && Object.keys(perfMetrics).length > 0) {
            md += '### Performance Metrics\n\n';
            md += '| Metric | Value | Status |\n';
            md += '|--------|-------|--------|\n';
            
            Object.entries(perfMetrics).forEach(([metric, value]) => {
                let status = 'Good';
                if (metric.includes('time') && value > 1000) status = 'Slow';
                else if (metric.includes('size') && value > 1000000) status = 'Large';
                
                md += `| ${metric} | ${value} | ${status} |\n`;
            });
            md += '\n';
        }

        if (data.bottlenecks && data.bottlenecks.length > 0) {
            md += '### Performance Bottlenecks\n\n';
            data.bottlenecks.forEach(bottleneck => {
                md += `- **${bottleneck.type}:** ${bottleneck.description}\n`;
                if (bottleneck.impact) md += `  - Impact: ${bottleneck.impact}\n`;
                md += '\n';
            });
        }
        
        // Recommendations
        if (perfRecommendations && perfRecommendations.length > 0) {
            md += '### Performance Recommendations\n\n';
            perfRecommendations.forEach(rec => {
                if (typeof rec === 'string') {
                    md += `- ${rec}\n`;
                } else {
                    md += `- **${rec.title}** (${rec.priority} priority)\n`;
                    md += `  ${rec.description}\n`;
                    if (rec.category) md += `  - Category: ${rec.category}\n`;
                }
                md += '\n';
            });
        }

        return md;
    }

    formatArchitectureData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const archMetrics = metrics || data.metrics || {};
        const archRecommendations = recommendations || data.recommendations || [];
        
        md += '### Architecture Analysis\n\n';
        
        // Architecture Score
        if (data.architectureScore !== undefined) {
            md += `**Architecture Score:** ${data.architectureScore}/100\n\n`;
        }
        
        // Metrics Table
        if (archMetrics && Object.keys(archMetrics).length > 0) {
            md += '### Architecture Metrics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            
            Object.entries(archMetrics).forEach(([metric, value]) => {
                if (value !== null && value !== undefined) {
                    md += `| ${metric} | ${value} |\n`;
                }
            });
            md += '\n';
        }
        
        // Patterns
        if (data.detectedPatterns && data.detectedPatterns.length > 0) {
            md += '### Detected Patterns\n\n';
            data.detectedPatterns.forEach(pattern => {
                md += `- **${pattern.pattern || pattern.name}:** ${pattern.description}\n`;
                if (pattern.confidence) {
                    md += `  - Confidence: ${Math.round(pattern.confidence * 100)}%\n`;
                }
                if (pattern.files) {
                    md += `  - Files: ${pattern.files.join(', ')}\n`;
                }
                md += '\n';
            });
        }
        
        // Structure
        if (data.structure) {
            md += '### Project Structure\n\n';
            
            if (data.structure.organization) {
                md += `**Organization Pattern:** ${data.structure.organization}\n\n`;
            }
            
            if (data.structure.layers && data.structure.layers.length > 0) {
                md += '#### Layers\n\n';
                data.structure.layers.forEach(layer => {
                    md += `- **${layer.name}:** ${layer.path}\n`;
                });
                md += '\n';
            }
            
            if (data.structure.modules && data.structure.modules.length > 0) {
                md += '#### Modules\n\n';
                data.structure.modules.forEach(module => {
                    md += `- ${module}\n`;
                });
                md += '\n';
            }
            
            if (data.structure.utilities && data.structure.utilities.length > 0) {
                md += '#### Utilities\n\n';
                data.structure.utilities.forEach(util => {
                    md += `- ${util}\n`;
                });
                md += '\n';
            }
        }
        
        // Coupling Analysis
        if (data.coupling && Object.keys(data.coupling).length > 0) {
            md += '### Coupling Analysis\n\n';
            Object.entries(data.coupling).forEach(([module, coupling]) => {
                if (typeof coupling === 'object' && coupling !== null) {
                    Object.entries(coupling).forEach(([metric, value]) => {
                        if (value !== null && value !== undefined) {
                            md += `- **${module}.${metric}:** ${value}/100\n`;
                        }
                    });
                } else {
                    md += `- **${module}:** ${coupling}/100\n`;
                }
            });
            md += '\n';
        }
        
        // Cohesion Analysis
        if (data.cohesion && Object.keys(data.cohesion).length > 0) {
            md += '### Cohesion Analysis\n\n';
            Object.entries(data.cohesion).forEach(([module, cohesion]) => {
                if (typeof cohesion === 'object' && cohesion !== null) {
                    Object.entries(cohesion).forEach(([metric, value]) => {
                        if (value !== null && value !== undefined) {
                            md += `- **${module}.${metric}:** ${value}/100\n`;
                        }
                    });
                } else {
                    md += `- **${module}:** ${cohesion}/100\n`;
                }
            });
            md += '\n';
        }
        
        // Violations
        if (data.violations && data.violations.length > 0) {
            md += '### Architecture Violations\n\n';
            data.violations.forEach(violation => {
                md += `- **${violation.type}:** ${violation.description}\n`;
                if (violation.severity) md += `  - Severity: ${violation.severity}\n`;
                md += '\n';
            });
        }
        
        // Recommendations
        if (archRecommendations && archRecommendations.length > 0) {
            md += '### Architectural Recommendations\n\n';
            archRecommendations.forEach(rec => {
                if (typeof rec === 'string') {
                    md += `- ${rec}\n`;
                } else {
                    md += `- **${rec.title}** (${rec.priority} priority)\n`;
                    md += `  ${rec.description}\n`;
                    if (rec.category) md += `  - Category: ${rec.category}\n`;
                }
                md += '\n';
            });
        }

        return md;
    }

    formatProjectStructureData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const structureMetrics = metrics || data.metrics || {};
        const structureRecommendations = recommendations || data.recommendations || [];
        
        if (data.structure) {
            md += '### Project Structure\n\n';
            
            // Handle array of files structure
            if (data.structure.files && Array.isArray(data.structure.files)) {
                md += '#### Files\n\n';
                data.structure.files.forEach(file => {
                    const type = file.isDirectory ? 'Directory' : 'File';
                    const size = file.size ? ` (${this.formatFileSize(file.size)})` : '';
                    md += `- ${type}: \`${file.path}\`${size}\n`;
                });
                md += '\n';
            }
            
            // Handle nested tree structure
            if (typeof data.structure === 'object' && !data.structure.files) {
                md += '```\n';
                md += this.formatTree(data.structure);
                md += '\n```\n\n';
            }
            
            // File type distribution
            if (data.structure.fileTypes && Object.keys(data.structure.fileTypes).length > 0) {
                md += '#### File Type Distribution\n\n';
                md += '| Type | Count |\n';
                md += '|------|-------|\n';
                Object.entries(data.structure.fileTypes).forEach(([type, count]) => {
                    const displayType = type === '' ? 'no extension' : type;
                    md += `| ${displayType} | ${count} |\n`;
                });
                md += '\n';
            }
            
            // Largest files
            if (data.structure.largestFiles && data.structure.largestFiles.length > 0) {
                md += '#### Largest Files\n\n';
                md += '| File | Size |\n';
                md += '|------|------|\n';
                data.structure.largestFiles.slice(0, 10).forEach(file => {
                    md += `| \`${file.path}\` | ${this.formatFileSize(file.size)} |\n`;
                });
                md += '\n';
            }
        }

        if (data.statistics) {
            md += '### Project Statistics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            
            Object.entries(data.statistics).forEach(([metric, value]) => {
                md += `| ${metric} | ${value} |\n`;
            });
            md += '\n';
        }

        // Metrics Table
        if (structureMetrics && Object.keys(structureMetrics).length > 0) {
            md += '### Structure Metrics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            
            Object.entries(structureMetrics).forEach(([metric, value]) => {
                if (value !== null && value !== undefined) {
                    if (typeof value === 'object') {
                        md += `| ${metric} | ${JSON.stringify(value)} |\n`;
                    } else {
                        md += `| ${metric} | ${value} |\n`;
                    }
                }
            });
            md += '\n';
        }

        if (data.dependencies) {
            md += '### Dependencies\n\n';
            md += '#### Production Dependencies\n';
            data.dependencies.production?.forEach(dep => {
                md += `- \`${dep.name}@${dep.version}\`\n`;
            });
            md += '\n#### Development Dependencies\n';
            data.dependencies.development?.forEach(dep => {
                md += `- \`${dep.name}@${dep.version}\`\n`;
            });
            md += '\n';
        }
        
        // Recommendations
        if (structureRecommendations && structureRecommendations.length > 0) {
            md += '### Structure Recommendations\n\n';
            structureRecommendations.forEach(rec => {
                if (typeof rec === 'string') {
                    md += `- ${rec}\n`;
                } else {
                    md += `- **${rec.title}** (${rec.priority} priority)\n`;
                    md += `  ${rec.description}\n`;
                    if (rec.category) md += `  - Category: ${rec.category}\n`;
                }
                md += '\n';
            });
        }

        return md;
    }

    formatDependenciesData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const depsMetrics = metrics || data.metrics || {};
        const depsRecommendations = recommendations || data.recommendations || [];
        
        // Show packages if available (for monorepo detection)
        if (data.packages && data.packages.length > 0) {
            md += '### Packages\n\n';
            md += '| Package | Path | Dependencies | Dev Dependencies |\n';
            md += '|---------|------|--------------|------------------|\n';
            data.packages.forEach(pkg => {
                const depsCount = Object.keys(pkg.dependencies || {}).length;
                const devDepsCount = Object.keys(pkg.devDependencies || {}).length;
                md += `| \`${pkg.name}\` | \`${pkg.path}\` | ${depsCount} | ${devDepsCount} |\n`;
            });
            md += '\n';
        }
        
        // Also check in dependenciesAnalysis.packages
        if (data.dependenciesAnalysis && data.dependenciesAnalysis.packages && data.dependenciesAnalysis.packages.length > 0) {
            md += '### Packages\n\n';
            md += '| Package | Path | Dependencies | Dev Dependencies |\n';
            md += '|---------|------|--------------|------------------|\n';
            data.dependenciesAnalysis.packages.forEach(pkg => {
                const depsCount = Object.keys(pkg.dependencies || {}).length;
                const devDepsCount = Object.keys(pkg.devDependencies || {}).length;
                md += `| \`${pkg.name}\` | \`${pkg.path}\` | ${depsCount} | ${devDepsCount} |\n`;
            });
            md += '\n';
        }
        
        if (data.dependenciesAnalysis) {
            const deps = data.dependenciesAnalysis;
            
            // Metrics Table
            if (depsMetrics && Object.keys(depsMetrics).length > 0) {
                md += '### Dependencies Metrics\n\n';
                md += '| Metric | Value |\n';
                md += '|--------|-------|\n';
                
                Object.entries(depsMetrics).forEach(([metric, value]) => {
                    if (value !== null && value !== undefined) {
                        md += `| ${metric} | ${value} |\n`;
                    }
                });
                md += '\n';
            }
            
            if (deps.directDependencies && deps.directDependencies.length > 0) {
                md += '### Direct Dependencies\n\n';
                md += '| Package | Version |\n';
                md += '|---------|---------|\n';
                deps.directDependencies.forEach(dep => {
                    md += `| \`${dep.name}\` | \`${dep.version}\` |\n`;
                });
                md += '\n';
            }

            if (deps.vulnerabilities && deps.vulnerabilities.length > 0) {
                md += '### Security Vulnerabilities\n\n';
                md += '| Severity | Package | Description |\n';
                md += '|----------|---------|-------------|\n';
                deps.vulnerabilities.forEach(vuln => {
                    md += `| ${vuln.severity} | \`${vuln.package}\` | ${vuln.description} |\n`;
                });
                md += '\n';
            }
        }
        
        // Recommendations
        if (depsRecommendations && depsRecommendations.length > 0) {
            md += '### Dependencies Recommendations\n\n';
            depsRecommendations.forEach(rec => {
                if (typeof rec === 'string') {
                    md += `- ${rec}\n`;
                } else {
                    md += `- **${rec.title}** (${rec.priority} priority)\n`;
                    md += `  ${rec.description}\n`;
                    if (rec.category) md += `  - Category: ${rec.category}\n`;
                }
                md += '\n';
            });
        }

        return md;
    }

    formatTechStackData(data) {
        let md = '';
        
        if (data.techStack) {
            const tech = data.techStack;
            
            if (tech.frameworks && tech.frameworks.length > 0) {
                md += '### Frameworks\n\n';
                tech.frameworks.forEach(framework => {
                    md += `- **${framework.name}** (${framework.version})\n`;
                });
                md += '\n';
            }

            if (tech.libraries && tech.libraries.length > 0) {
                md += '### Libraries\n\n';
                tech.libraries.forEach(lib => {
                    md += `- **${lib.name}** (${lib.version})\n`;
                });
                md += '\n';
            }

            if (tech.tools && tech.tools.length > 0) {
                md += '### Development Tools\n\n';
                tech.tools.forEach(tool => {
                    md += `- **${tool.name}** (${tool.version})\n`;
                });
                md += '\n';
            }
        }

        if (data.metrics) {
            md += '### Tech Stack Metrics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            Object.entries(data.metrics).forEach(([metric, value]) => {
                md += `| ${metric} | ${value} |\n`;
            });
            md += '\n';
        }

        if (data.recommendations && data.recommendations.length > 0) {
            md += '### Recommendations\n\n';
            data.recommendations.forEach(rec => {
                md += `- ${rec.message || rec}\n`;
            });
            md += '\n';
        }

        return md;
    }

    formatRefactoringData(data) {
        let md = '';
        
        if (data.operations && data.operations.length > 0) {
            md += '### Refactoring Operations\n\n';
            data.operations.forEach(op => {
                md += `- **${op.type}:** ${op.description}\n`;
                if (op.files) {
                    md += `  - Files: ${op.files.join(', ')}\n`;
                }
                if (op.status) {
                    md += `  - Status: ${op.status}\n`;
                }
                md += '\n';
            });
        }

        if (data.metrics) {
            md += '### Refactoring Metrics\n\n';
            md += '| Metric | Before | After | Improvement |\n';
            md += '|--------|--------|-------|-------------|\n';
            Object.entries(data.metrics).forEach(([metric, value]) => {
                if (typeof value === 'object' && value.before !== undefined && value.after !== undefined) {
                    const improvement = value.after - value.before;
                    const sign = improvement > 0 ? '+' : '';
                    md += `| ${metric} | ${value.before} | ${value.after} | ${sign}${improvement} |\n`;
                } else {
                    md += `| ${metric} | ${value} | - | - |\n`;
                }
            });
            md += '\n';
        }

        if (data.recommendations && data.recommendations.length > 0) {
            md += '### Refactoring Recommendations\n\n';
            data.recommendations.forEach(rec => {
                md += `- ${rec.message || rec}\n`;
            });
            md += '\n';
        }

        return md;
    }

    formatGenerationData(data) {
        let md = '';
        
        if (data.generated && data.generated.length > 0) {
            md += '### Generated Assets\n\n';
            data.generated.forEach(asset => {
                md += `- **${asset.type}:** ${asset.path}\n`;
                if (asset.description) {
                    md += `  - Description: ${asset.description}\n`;
                }
                md += '\n';
            });
        }

        if (data.metrics) {
            md += '### Generation Metrics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            Object.entries(data.metrics).forEach(([metric, value]) => {
                md += `| ${metric} | ${value} |\n`;
            });
            md += '\n';
        }

        if (data.recommendations && data.recommendations.length > 0) {
            md += '### Generation Recommendations\n\n';
            data.recommendations.forEach(rec => {
                md += `- ${rec.message || rec}\n`;
            });
            md += '\n';
        }

        return md;
    }

    formatGenericAnalysisData(type, data) {
        let md = '';
        
        md += `### ${type} Analysis\n\n`;
        
        if (data.metrics) {
            md += '#### Metrics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            Object.entries(data.metrics).forEach(([metric, value]) => {
                md += `| ${metric} | ${value} |\n`;
            });
            md += '\n';
        }

        if (data.recommendations && data.recommendations.length > 0) {
            md += '#### Recommendations\n\n';
            data.recommendations.forEach(rec => {
                md += `- ${rec.message || rec}\n`;
            });
            md += '\n';
        }

        if (data.issues && data.issues.length > 0) {
            md += '#### Issues\n\n';
            data.issues.forEach(issue => {
                md += `- **${issue.type}:** ${issue.message}\n`;
                if (issue.file) md += `  - File: \`${issue.file}\`\n`;
                if (issue.line) md += `  - Line: ${issue.line}\n`;
                md += '\n';
            });
        }

        return md;
    }

    formatTree(structure, indent = '') {
        let result = '';
        for (const [name, children] of Object.entries(structure)) {
            result += `${indent}${name}\n`;
            if (children && typeof children === 'object') {
                result += this.formatTree(children, indent + '  ');
            }
        }
        return result;
    }

    async getAnalysisHistory(projectId) {
        const projectDir = path.join(this.projectsPath, projectId);
        try {
            const files = await fs.readdir(projectDir);
            const analysisFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.md'));
            
            const history = [];
            for (const file of analysisFiles) {
                const filepath = path.join(projectDir, file);
                const stats = await fs.stat(filepath);
                
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(filepath, 'utf8');
                    const data = JSON.parse(content);
                    history.push({
                        type: 'analysis',
                        filename: file,
                        filepath,
                        timestamp: data.timestamp,
                        analysisType: data.analysisType,
                        size: stats.size
                    });
                } else if (file.endsWith('.md')) {
                    history.push({
                        type: 'report',
                        filename: file,
                        filepath,
                        timestamp: stats.mtime.toISOString(),
                        size: stats.size
                    });
                }
            }
            
            return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            return [];
        }
    }

    async getAnalysisFile(projectId, filename) {
        const filepath = path.join(this.projectsPath, projectId, filename);
        try {
            const content = await fs.readFile(filepath, 'utf8');
            if (filename.endsWith('.json')) {
                return JSON.parse(content);
            }
            return content;
        } catch (error) {
            throw new Error(`File not found: ${filename}`);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

module.exports = AnalysisOutputService;
