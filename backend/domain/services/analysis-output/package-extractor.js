const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Package extraction service for monorepo detection
 */
class PackageExtractor {
    /**
     * Extract packages from analysis results
     * @param {Object} analysisResults - Analysis results object
     * @returns {Array} Array of package objects
     */
    extractPackagesFromAnalysis(analysisResults) {
        const packages = [];
        
        logger.debug('DEBUG: extractPackagesFromAnalysis called with:', Object.keys(analysisResults));
        
        // Extract packages from dependencies analysis (multiple possible locations)
        if (analysisResults.Dependencies && analysisResults.Dependencies.data && analysisResults.Dependencies.data.packages) {
            logger.debug('DEBUG: Found packages in Dependencies.data.packages');
            packages.push(...analysisResults.Dependencies.data.packages);
        }
        
        // Extract packages from structure analysis (where they actually are!)
        if (analysisResults.structure && analysisResults.structure.data && analysisResults.structure.data.dependenciesAnalysis && analysisResults.structure.data.dependenciesAnalysis.packages) {
            logger.debug('DEBUG: Found packages in structure.data.dependenciesAnalysis.packages');
            packages.push(...analysisResults.structure.data.dependenciesAnalysis.packages);
        }
        
        // Extract packages from architecture analysis (new structure)
        if (analysisResults.Architecture && analysisResults.Architecture.data) {
            // Check for new monorepo structure
            if (analysisResults.Architecture.data.isMonorepo && analysisResults.Architecture.data.packages) {
                logger.debug('DEBUG: Found packages in Architecture.data.packages (monorepo)');
                packages.push(...analysisResults.Architecture.data.packages);
            }
            // Check for old structure
            else if (analysisResults.Architecture.data.packages) {
                logger.debug('DEBUG: Found packages in Architecture.data.packages (legacy)');
                packages.push(...analysisResults.Architecture.data.packages);
            }
        }
        
        // Check all possible locations recursively
        const checkForPackages = (obj, path = '') => {
            if (obj && typeof obj === 'object') {
                if (obj.packages && Array.isArray(obj.packages)) {
                    logger.debug(`DEBUG: Found packages in ${path}.packages`);
                    packages.push(...obj.packages);
                }
                Object.entries(obj).forEach(([key, value]) => {
                    checkForPackages(value, path ? `${path}.${key}` : key);
                });
            }
        };
        
        checkForPackages(analysisResults);
        
        logger.debug('DEBUG: Total packages found:', packages.length);
        
        // If no packages found, assume single package
        if (packages.length === 0) {
            logger.debug('DEBUG: No packages found, using single package');
            packages.push({ name: 'root', path: '.', relativePath: '.' });
        }
        
        return packages;
    }

    /**
     * Filter analysis results for a specific package
     * @param {Object} analysisResults - Analysis results object
     * @param {Object} pkg - Package object
     * @returns {Object} Filtered analysis results for the package
     */
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
                    if (result.data.isMonorepo && result.data.packages) {
                        logger.debug('DEBUG: Found packages in Architecture.data.packages (monorepo)');
                        packageResults[type] = {
                            ...result,
                            data: result.data
                        };
                    }
                }
                // For code quality, use package-specific data if available
                else if (type === 'Code Quality' && result.data) {
                    // Check if this is a monorepo with package-specific code quality data
                    if (result.data.isMonorepo && result.data.packageQualityAnalyses && result.data.packageQualityAnalyses[pkg.name]) {
                        const packageQuality = result.data.packageQualityAnalyses[pkg.name];
                        const qualityAnalysis = packageQuality.qualityAnalysis;
                        
                        const packageQualityData = {
                            package: pkg.name,
                            packagePath: pkg.path,
                            overallScore: qualityAnalysis.overallScore,
                            metrics: qualityAnalysis.metrics || {},
                            issues: qualityAnalysis.issues || [],
                            recommendations: qualityAnalysis.recommendations || [],
                            configuration: qualityAnalysis.configuration || {},
                            coverage: qualityAnalysis.coverage || {},
                            realMetrics: qualityAnalysis.realMetrics || {},
                            // Package-specific data
                            lintingResults: packageQuality.lintingResults || [],
                            complexityMetrics: packageQuality.complexityMetrics || {},
                            maintainabilityIndex: packageQuality.maintainabilityIndex,
                            testCoverage: packageQuality.testCoverage,
                            codeDuplication: packageQuality.codeDuplication || {},
                            codeStyleIssues: packageQuality.codeStyleIssues || [],
                            documentationCoverage: packageQuality.documentationCoverage,
                            performanceIssues: packageQuality.performanceIssues || [],
                            largeFiles: packageQuality.largeFiles || [],
                            magicNumberFiles: packageQuality.magicNumberFiles || [],
                            complexityIssuesList: packageQuality.complexityIssuesList || [],
                            lintingIssuesList: packageQuality.lintingIssuesList || []
                        };
                        
                        // Calculate package-specific metrics
                        packageQualityData.metrics = {
                            lintingIssues: packageQualityData.realMetrics.lintingIssues || 0,
                            averageComplexity: packageQualityData.realMetrics.averageComplexity || 0,
                            maintainabilityIndex: packageQualityData.realMetrics.maintainabilityIndex || 0,
                            testCoverage: packageQualityData.realMetrics.testCoverage || 0,
                            codeDuplicationPercentage: packageQualityData.realMetrics.codeDuplicationPercentage || 0,
                            codeStyleIssues: packageQualityData.realMetrics.codeStyleIssues || 0,
                            documentationCoverage: packageQualityData.realMetrics.documentationCoverage || 0,
                            performanceIssues: packageQualityData.realMetrics.performanceIssues || 0,
                            overallQualityScore: packageQualityData.realMetrics.overallQualityScore || 0
                        };
                        
                        packageResults[type] = {
                            ...result,
                            data: packageQualityData
                        };
                    }
                }
                // For security, use package-specific data ONLY if available
                else if (type === 'Security' && result.data) {
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
                            criticalVulnerabilities: this.countCriticalVulnerabilities(packageSecurityData.vulnerabilities),
                            highVulnerabilities: this.countHighVulnerabilities(packageSecurityData.vulnerabilities),
                            mediumVulnerabilities: this.countMediumVulnerabilities(packageSecurityData.vulnerabilities),
                            lowVulnerabilities: this.countLowVulnerabilities(packageSecurityData.vulnerabilities)
                        };
                        
                        packageResults[type] = {
                            ...result,
                            data: packageSecurityData
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

    /**
     * Count critical vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of critical vulnerabilities
     */
    countCriticalVulnerabilities(vulnerabilities) {
        return vulnerabilities.filter(v => v.severity === 'critical').length;
    }

    /**
     * Count high vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of high vulnerabilities
     */
    countHighVulnerabilities(vulnerabilities) {
        return vulnerabilities.filter(v => v.severity === 'high').length;
    }

    /**
     * Count medium vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of medium vulnerabilities
     */
    countMediumVulnerabilities(vulnerabilities) {
        return vulnerabilities.filter(v => v.severity === 'medium').length;
    }

    /**
     * Count low vulnerabilities
     * @param {Array} vulnerabilities - Vulnerabilities array
     * @returns {number} Count of low vulnerabilities
     */
    countLowVulnerabilities(vulnerabilities) {
        return vulnerabilities.filter(v => v.severity === 'low').length;
    }
}

module.exports = PackageExtractor; 