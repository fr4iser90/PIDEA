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
        const filename = `analysis-report-${timestamp}.md`;
        const filepath = path.join(projectDir, filename);

        let markdown = `# Project Analysis Report\n\n`;
        markdown += `**Project ID:** ${projectId}\n`;
        markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

        // Repository Structure Section
        markdown += `## Repository Structure\n\n`;
        const repoStructure = analysisResults['Repository Structure'] || analysisResults['projectStructure'];
        if (repoStructure) {
            markdown += this.formatAnalysisData('Repository Structure', repoStructure);
        } else {
            markdown += `### Project Structure\n\nNo repository structure data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Architecture Section
        markdown += `## Architecture\n\n`;
        const architecture = analysisResults['Architecture'] || analysisResults['architecture'];
        if (architecture) {
            markdown += this.formatAnalysisData('Architecture', architecture);
        } else {
            markdown += `### Architecture Analysis\n\nNo architecture data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Code Quality Section
        markdown += `## Code Quality\n\n`;
        const codeQuality = analysisResults['Code Quality'] || analysisResults['codeQuality'];
        if (codeQuality) {
            markdown += this.formatAnalysisData('Code Quality', codeQuality);
        } else {
            markdown += `### Code Quality Analysis\n\nNo code quality data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Dependencies Section
        markdown += `## Dependencies\n\n`;
        const dependencies = analysisResults['Dependencies'] || analysisResults['dependencies'];
        if (dependencies) {
            markdown += this.formatAnalysisData('Dependencies', dependencies);
        } else {
            markdown += `### Dependencies Analysis\n\nNo dependencies data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Tech Stack Section
        markdown += `## Tech Stack\n\n`;
        const techStack = analysisResults['Tech Stack'] || analysisResults['techStack'];
        if (techStack) {
            markdown += this.formatAnalysisData('Tech Stack', techStack);
        } else {
            markdown += `### Tech Stack Analysis\n\nNo tech stack data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Performance Section
        markdown += `## Performance\n\n`;
        const performance = analysisResults['Performance'] || analysisResults['performance'];
        if (performance) {
            markdown += this.formatAnalysisData('Performance', performance);
        } else {
            markdown += `### Performance Analysis\n\nNo performance data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Security Section
        markdown += `## Security\n\n`;
        const security = analysisResults['Security'] || analysisResults['security'];
        if (security) {
            markdown += this.formatAnalysisData('Security', security);
        } else {
            markdown += `### Security Analysis\n\nNo security data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Refactoring Section
        markdown += `## Refactoring\n\n`;
        const refactoring = analysisResults['Refactoring'] || analysisResults['refactoring'];
        if (refactoring) {
            markdown += this.formatAnalysisData('Refactoring', refactoring);
        } else {
            markdown += `### Refactoring Analysis\n\nNo refactoring data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Generation Section
        markdown += `## Generation\n\n`;
        const generation = analysisResults['Generation'] || analysisResults['generation'];
        if (generation) {
            markdown += this.formatAnalysisData('Generation', generation);
        } else {
            markdown += `### Generation Analysis\n\nNo generation data available.\n\n`;
        }
        markdown += `\n---\n\n`;

        // Suggestions Section
        markdown += `## Suggestions\n\n`;
        markdown += this.generateComprehensiveSuggestions(analysisResults);
        markdown += `\n---\n\n`;

        await fs.writeFile(filepath, markdown);
        return { filepath, filename };
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
                suggestions += `#### 🔴 High Priority\n\n`;
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
                suggestions += `#### 🟡 Medium Priority\n\n`;
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
                suggestions += `#### 🟢 Low Priority\n\n`;
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
        
        // Configuration
        if (data.configuration) {
            md += '### Configuration\n\n';
            
            if (data.configuration.linting) {
                md += '#### Linting\n';
                md += `- ESLint: ${data.configuration.linting.hasESLint ? '✅' : '❌'}\n`;
                md += `- Prettier: ${data.configuration.linting.hasPrettier ? '✅' : '❌'}\n`;
                md += `- Husky: ${data.configuration.linting.hasHusky ? '✅' : '❌'}\n`;
                md += `- Lint-staged: ${data.configuration.linting.hasLintStaged ? '✅' : '❌'}\n`;
                md += '\n';
            }
            
            if (data.configuration.formatting) {
                md += '#### Formatting\n';
                md += `- Prettier: ${data.configuration.formatting.hasPrettier ? '✅' : '❌'}\n`;
                md += `- EditorConfig: ${data.configuration.formatting.hasEditorConfig ? '✅' : '❌'}\n`;
                md += `- VSCode Settings: ${data.configuration.formatting.hasVSCodeSettings ? '✅' : '❌'}\n`;
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
                    md += `- **${rec.title}** (${rec.priority} priority)\n`;
                    md += `  ${rec.description}\n`;
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
                const severity = vuln.severity === 'high' ? '🔴' : vuln.severity === 'medium' ? '🟡' : '🟢';
                md += `| ${severity} ${vuln.severity} | ${vuln.type} | ${vuln.description} | \`${vuln.file || 'N/A'}\` |\n`;
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
                let status = '🟢 Good';
                if (metric.includes('time') && value > 1000) status = '🔴 Slow';
                else if (metric.includes('size') && value > 1000000) status = '🟡 Large';
                
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
                    const icon = file.isDirectory ? '📁' : '📄';
                    const size = file.size ? ` (${this.formatFileSize(file.size)})` : '';
                    md += `- ${icon} \`${file.path}\`${size}\n`;
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
                    md += `| ${metric} | ${value} |\n`;
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
                    const severity = vuln.severity === 'high' ? '🔴' : vuln.severity === 'medium' ? '🟡' : '🟢';
                    md += `| ${severity} ${vuln.severity} | \`${vuln.package}\` | ${vuln.description} |\n`;
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