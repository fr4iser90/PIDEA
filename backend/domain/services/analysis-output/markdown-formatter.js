const CONSTANTS = require('./constants');
const UTILS = require('./utils');

/**
 * Markdown formatter service for analysis reports
 */
class MarkdownFormatter {
    /**
     * Format code quality data
     * @param {Object} data - Code quality data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
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
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
            
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

    /**
     * Format security data
     * @param {Object} data - Security data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatSecurityData(data, metrics = null, recommendations = null) {
        let md = '';
        let securityData = data;
        let securityMetrics = metrics;
        let securityRecommendations = recommendations;

        // Wrapper-Handling
        if (data && data.result && typeof data.result === 'object') {
            securityData = data.result;
            securityMetrics = metrics || data.metrics;
            securityRecommendations = recommendations || data.recommendations;
        }
        if (data && data.securityAnalysis && typeof data.securityAnalysis === 'object') {
            securityData = data.securityAnalysis;
            securityMetrics = metrics || data.metrics;
            securityRecommendations = recommendations || data.recommendations;
        }
        if (data && data.configuration && data.dependencies && data.codeIssues) {
            securityData = data;
            securityMetrics = metrics || { overallScore: data.securityScore || 0 };
            securityRecommendations = recommendations || data.recommendations || [];
        }
        if (!securityMetrics) {
            securityMetrics = securityData.metrics || {};
        }
        if (!securityRecommendations) {
            securityRecommendations = securityData.recommendations || [];
        }

        // Security Score
        if (securityData.securityScore !== undefined) {
            md += `**Security Score:** ${securityData.securityScore}/100\n\n`;
        }

        // Security Configuration
        md += '### Security Configuration\n\n';
        
        // Present security middleware
        if (securityData.configuration && Array.isArray(securityData.configuration.securityMiddleware)) {
            if (securityData.configuration.securityMiddleware.length > 0) {
                md += '**✅ Present Security Features:**\n';
                securityData.configuration.securityMiddleware.forEach(middleware => {
                    md += `- ${middleware}\n`;
                });
                md += '\n';
            } else {
                md += '**Keine Sicherheitsfeatures gefunden**\n\n';
            }
        } else {
            md += '**Keine Sicherheitsfeatures gefunden**\n\n';
        }
        
        // Missing security middleware
        if (securityData.configuration && Array.isArray(securityData.configuration.missingSecurity)) {
            if (securityData.configuration.missingSecurity.length > 0) {
                md += '**❌ Missing Security Features:**\n';
                securityData.configuration.missingSecurity.forEach(missing => {
                    md += `- ${missing}\n`;
                });
                md += '\n';
            } else {
                md += '**Keine fehlenden Sicherheitsfeatures**\n\n';
            }
        } else {
            md += '**Keine fehlenden Sicherheitsfeatures**\n\n';
        }

        // Dependency Vulnerabilities
        if (securityData.dependencies) {
            const deps = securityData.dependencies;
            if (deps.vulnerable && deps.vulnerable.length > 0) {
                md += '### Dependency Vulnerabilities\n\n';
                md += CONSTANTS.MARKDOWN_TEMPLATES.VULNERABILITY_TABLE_HEADER;
                deps.vulnerable.forEach(vuln => {
                    md += `| ${vuln.package} | ${vuln.version} | ${vuln.severity} | ${vuln.description} |\n`;
                });
                md += '\n';
            } else {
                md += '### Dependency Vulnerabilities\n\n';
                md += '✅ **No vulnerable dependencies found**\n\n';
            }
        }
        
        // Code Security Issues
        if (securityData.codeIssues && securityData.codeIssues.length > 0) {
            md += '### Code Security Issues\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.SECURITY_ISSUES_TABLE_HEADER;
            securityData.codeIssues.forEach(issue => {
                md += `| \`${issue.file}\` | ${issue.line} | ${issue.severity} | ${issue.type} | ${issue.description} |\n`;
            });
            md += '\n';
        } else if (securityData.codeIssues !== undefined) {
            md += '### Code Security Issues\n\n';
            md += '✅ **No security issues found in code**\n\n';
        }
        
        // Secrets Analysis
        if (securityData.secrets) {
            md += '### Secrets Analysis\n\n';
            if (securityData.secrets.found && securityData.secrets.found.length > 0) {
                md += '**❌ Hardcoded Secrets Found:**\n';
                md += CONSTANTS.MARKDOWN_TEMPLATES.SECRETS_TABLE_HEADER;
                securityData.secrets.found.forEach(secret => {
                    md += `| \`${secret.file}\` | ${secret.line} | ${secret.type} | ${secret.description} |\n`;
                });
                md += '\n';
            } else {
                md += '✅ **No hardcoded secrets found**\n\n';
            }
            if (securityData.secrets.patterns && securityData.secrets.patterns.length > 0) {
                md += '**Secret Patterns Detected:**\n';
                securityData.secrets.patterns.forEach(pattern => {
                    md += `- ${pattern.pattern}: ${pattern.count} occurrences\n`;
                });
                md += '\n';
            }
        }
        
        // Metrics Table
        if (securityMetrics && Object.keys(securityMetrics).length > 0) {
            md += '### Security Metrics\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
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

    /**
     * Format performance data
     * @param {Object} data - Performance data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatPerformanceData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const perfMetrics = metrics || data.metrics || {};
        const perfRecommendations = recommendations || data.recommendations || [];
        
        if (perfMetrics && Object.keys(perfMetrics).length > 0) {
            md += '### Performance Metrics\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER_WITH_STATUS;
            
            Object.entries(perfMetrics).forEach(([metric, value]) => {
                let status = 'Good';
                if (metric.includes('time') && value > CONSTANTS.PERFORMANCE_THRESHOLDS.SLOW_TIME_MS) status = 'Slow';
                else if (metric.includes('size') && value > CONSTANTS.PERFORMANCE_THRESHOLDS.LARGE_SIZE_BYTES) status = 'Large';
                
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

    /**
     * Format architecture data
     * @param {Object} data - Architecture data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatArchitectureData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use package-specific metrics from data if available, otherwise use passed metrics
        const archMetrics = data.metrics || metrics || {};
        const archRecommendations = recommendations || data.recommendations || [];
            
        md += '### Architecture Analysis\n\n';
        
        // Architecture Score
        if (data.architectureScore !== undefined) {
            md += `**Architecture Score:** ${data.architectureScore}/100\n\n`;
        }
        
        // Metrics Table
        if (archMetrics && Object.keys(archMetrics).length > 0) {
            md += '### Architecture Metrics\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
            
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

    /**
     * Format project structure data
     * @param {Object} data - Project structure data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
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
                    const size = file.size ? ` (${UTILS.formatFileSize(file.size)})` : '';
                    md += `- ${type}: \`${file.path}\`${size}\n`;
                });
                md += '\n';
            }
            
            // Handle nested tree structure
            if (typeof data.structure === 'object' && !data.structure.files) {
                md += '```\n';
                md += UTILS.formatTree(data.structure);
                md += '\n```\n\n';
            }
            
            // File type distribution
            if (data.structure.fileTypes && Object.keys(data.structure.fileTypes).length > 0) {
                md += '#### File Type Distribution\n\n';
                md += CONSTANTS.MARKDOWN_TEMPLATES.FILE_TYPES_TABLE_HEADER;
                Object.entries(data.structure.fileTypes).forEach(([type, count]) => {
                    const displayType = type === '' ? 'no extension' : type;
                    md += `| ${displayType} | ${count} |\n`;
                });
                md += '\n';
            }
            
            // Largest files
            if (data.structure.largestFiles && data.structure.largestFiles.length > 0) {
                md += '#### Largest Files\n\n';
                md += CONSTANTS.MARKDOWN_TEMPLATES.LARGEST_FILES_TABLE_HEADER;
                data.structure.largestFiles.slice(0, 10).forEach(file => {
                    md += `| \`${file.path}\` | ${UTILS.formatFileSize(file.size)} |\n`;
                });
                md += '\n';
            }
        }

        if (data.statistics) {
            md += '### Project Statistics\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
            
            Object.entries(data.statistics).forEach(([metric, value]) => {
                md += `| ${metric} | ${value} |\n`;
            });
            md += '\n';
        }

        // Metrics Table
        if (structureMetrics && Object.keys(structureMetrics).length > 0) {
            md += '### Structure Metrics\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
            
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

    /**
     * Format dependencies data
     * @param {Object} data - Dependencies data
     * @param {Object} metrics - Metrics object
     * @param {Array} recommendations - Recommendations array
     * @returns {string} Formatted markdown
     */
    formatDependenciesData(data, metrics = null, recommendations = null) {
        let md = '';
        
        // Use provided metrics or extract from data
        const depsMetrics = metrics || data.metrics || {};
        const depsRecommendations = recommendations || data.recommendations || [];
        
        // Show packages if available (for monorepo detection)
        if (data.packages && data.packages.length > 0) {
            md += '### Packages\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.PACKAGE_TABLE_HEADER;
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
            md += CONSTANTS.MARKDOWN_TEMPLATES.PACKAGE_TABLE_HEADER;
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
                md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
                
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

    /**
     * Format tech stack data
     * @param {Object} data - Tech stack data
     * @returns {string} Formatted markdown
     */
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
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
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

    /**
     * Format refactoring data
     * @param {Object} data - Refactoring data
     * @returns {string} Formatted markdown
     */
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

    /**
     * Format generation data
     * @param {Object} data - Generation data
     * @returns {string} Formatted markdown
     */
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
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
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

    /**
     * Format generic analysis data
     * @param {string} type - Analysis type
     * @param {Object} data - Analysis data
     * @returns {string} Formatted markdown
     */
    formatGenericAnalysisData(type, data) {
        let md = '';
        
        md += `### ${UTILS.formatAnalysisType(type)} Analysis\n\n`;
        
        if (data.metrics) {
            md += '#### Metrics\n\n';
            md += CONSTANTS.MARKDOWN_TEMPLATES.TABLE_HEADER;
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

    /**
     * Format analysis data based on type
     * @param {string} type - Analysis type
     * @param {Object} data - Analysis data
     * @returns {string} Formatted markdown
     */
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
}

module.exports = MarkdownFormatter; 