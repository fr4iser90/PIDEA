const fs = require('fs').promises;
const path = require('path');
const CONSTANTS = require('./constants');
const MarkdownFormatter = require('./markdown-formatter');
const PackageExtractor = require('./package-extractor');
const SecurityAggregator = require('./security-aggregator');

/**
 * Report generator service for creating markdown reports
 */
class ReportGenerator {
    constructor() {
        this.markdownFormatter = new MarkdownFormatter();
        this.packageExtractor = new PackageExtractor();
        this.securityAggregator = new SecurityAggregator();
    }

    /**
     * Generate markdown report for a project
     * @param {string} projectId - Project ID
     * @param {Object} analysisResults - Analysis results
     * @param {string} projectsPath - Projects path
     * @returns {Promise<Object>} Report generation result
     */
    async generateMarkdownReport(projectId, analysisResults, projectsPath) {
        const projectDir = path.join(projectsPath, projectId);
        await fs.mkdir(projectDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFilename = `analysis-report-${timestamp}`;
        
        // Check if this is a monorepo with multiple packages
        const packages = this.packageExtractor.extractPackagesFromAnalysis(analysisResults);
        
        if (packages.length > 1) {
            // Generate separate reports for each package
            return await this.generateMonorepoReports(projectId, analysisResults, packages, baseFilename, projectDir);
        } else {
            // Generate single report for single package
            return await this.generateSinglePackageReport(projectId, analysisResults, baseFilename, projectDir);
        }
    }

    /**
     * Generate monorepo reports
     * @param {string} projectId - Project ID
     * @param {Object} analysisResults - Analysis results
     * @param {Array} packages - Packages array
     * @param {string} baseFilename - Base filename
     * @param {string} projectDir - Project directory
     * @returns {Promise<Object>} Report generation result
     */
    async generateMonorepoReports(projectId, analysisResults, packages, baseFilename, projectDir) {
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
            const filteredResults = this.packageExtractor.filterAnalysisResultsForPackage(analysisResults, pkg);
            
            // Generate package-specific sections (NO Performance/Security here!)
            const sections = [
                { key: 'Architecture', filename: 'architecture' },
                { key: 'Code Quality', filename: 'code-quality' },
                { key: 'Dependencies', filename: 'dependencies' },
                { key: 'Tech Stack', filename: 'tech-stack' }
            ];
            
            for (const section of sections) {
                const data = filteredResults[section.key] || filteredResults[section.key.toLowerCase()];
                if (data) {
                    packageMarkdown += `## ${section.key}\n\n`;
                    
                    switch (section.key) {
                        case 'Repository Structure':
                            packageMarkdown += this.markdownFormatter.formatProjectStructureData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Architecture':
                            packageMarkdown += this.markdownFormatter.formatArchitectureData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Code Quality':
                            packageMarkdown += this.markdownFormatter.formatCodeQualityData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Dependencies':
                            packageMarkdown += this.markdownFormatter.formatDependenciesData(data.data || data, data.metrics, data.recommendations);
                            break;
                        case 'Tech Stack':
                            packageMarkdown += this.markdownFormatter.formatTechStackData(data.data || data);
                            break;
                    }
                }
            }
            
            // Security-Report pro Package
            packageMarkdown += '## Security\n\n';
            
            // Check if there's a monorepo security analysis with package-specific data
            const securityData = analysisResults['Security'] || analysisResults['security'];
            
            if (securityData && securityData.data && securityData.data.isMonorepo && 
                securityData.data.packageSecurityAnalyses && securityData.data.packageSecurityAnalyses[pkg.name]) {
                
                const packageSecurity = securityData.data.packageSecurityAnalyses[pkg.name];
                const securityAnalysis = packageSecurity.securityAnalysis;
                
                const packageSecurityData = {
                    package: pkg.name,
                    packagePath: pkg.path,
                    securityScore: securityAnalysis.securityScore || 100,
                    overallRiskLevel: securityAnalysis.overallRiskLevel || 'low',
                    vulnerabilities: securityAnalysis.vulnerabilities || [],
                    codeIssues: securityAnalysis.codeIssues || [],
                    configuration: securityAnalysis.configuration || {},
                    dependencies: securityAnalysis.dependencies || {},
                    secrets: securityAnalysis.secrets || {},
                    recommendations: securityAnalysis.recommendations || []
                };
                
                // Calculate metrics for this package
                packageSecurityData.metrics = {
                    vulnerabilityCount: packageSecurityData.vulnerabilities.length,
                    codeIssueCount: packageSecurityData.codeIssues.length,
                    secretCount: packageSecurityData.secrets.found?.length || 0,
                    missingSecurityCount: packageSecurityData.configuration.missingSecurity?.length || 0,
                    criticalVulnerabilities: this.packageExtractor.countCriticalVulnerabilities(packageSecurityData.vulnerabilities),
                    highVulnerabilities: this.packageExtractor.countHighVulnerabilities(packageSecurityData.vulnerabilities),
                    mediumVulnerabilities: this.packageExtractor.countMediumVulnerabilities(packageSecurityData.vulnerabilities),
                    lowVulnerabilities: this.packageExtractor.countLowVulnerabilities(packageSecurityData.vulnerabilities)
                };
                
                const secMd = this.markdownFormatter.formatSecurityData(packageSecurityData, packageSecurityData.metrics, packageSecurityData.recommendations);
                packageMarkdown += secMd;
            } else if (filteredResults['Security'] && filteredResults['Security'].data) {
                // Fallback to filtered results if no monorepo data
                const secData = filteredResults['Security'].data;
                const secMd = this.markdownFormatter.formatSecurityData(secData, secData.metrics, secData.recommendations);
                packageMarkdown += secMd;
            } else {
                // No security data available for this package
                packageMarkdown += '**No security analysis available for this package.**\n\n';
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
            sharedMarkdown += this.markdownFormatter.formatProjectStructureData(sharedStructureData.data || sharedStructureData, sharedStructureData.metrics, sharedStructureData.recommendations);
            
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
                        sectionMarkdown += this.markdownFormatter.formatPerformanceData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Security':
                        // Special handling for security to aggregate package data
                        if (data.data && data.data.isMonorepo && data.data.packageSecurityAnalyses) {
                            // Create aggregated security data from all packages
                            const aggregatedSecurityData = this.securityAggregator.aggregateSecurityData(data.data);
                            sectionMarkdown += this.markdownFormatter.formatSecurityData(aggregatedSecurityData, aggregatedSecurityData.metrics, aggregatedSecurityData.recommendations);
                        } else {
                            sectionMarkdown += this.markdownFormatter.formatSecurityData(data.data || data, data.metrics, data.recommendations);
                        }
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

    /**
     * Generate single package report
     * @param {string} projectId - Project ID
     * @param {Object} analysisResults - Analysis results
     * @param {string} baseFilename - Base filename
     * @param {string} projectDir - Project directory
     * @returns {Promise<Object>} Report generation result
     */
    async generateSinglePackageReport(projectId, analysisResults, baseFilename, projectDir) {
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
                        sectionMarkdown += this.markdownFormatter.formatProjectStructureData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Architecture':
                        sectionMarkdown += this.markdownFormatter.formatArchitectureData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Code Quality':
                        sectionMarkdown += this.markdownFormatter.formatCodeQualityData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Dependencies':
                        sectionMarkdown += this.markdownFormatter.formatDependenciesData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Tech Stack':
                        sectionMarkdown += this.markdownFormatter.formatTechStackData(data.data || data);
                        break;
                    case 'Performance':
                        sectionMarkdown += this.markdownFormatter.formatPerformanceData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Security':
                        sectionMarkdown += this.markdownFormatter.formatSecurityData(data.data || data, data.metrics, data.recommendations);
                        break;
                    case 'Refactoring':
                        sectionMarkdown += this.markdownFormatter.formatRefactoringData(data.data || data);
                        break;
                    case 'Generation':
                        sectionMarkdown += this.markdownFormatter.formatGenerationData(data.data || data);
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

    /**
     * Generate comprehensive suggestions
     * @param {Object} analysisResults - Analysis results
     * @returns {string} Formatted suggestions
     */
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
}

module.exports = ReportGenerator; 