/**
 * CleanDependenciesHandler - Handles dependency cleaning refactoring
 * Implements the Handler pattern for dependency cleaning
 */
const fs = require('fs').promises;
const path = require('path');
const EventBus = require('../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../domain/repositories/AnalysisRepository');

class CleanDependenciesHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.logger = dependencies.logger || console;
    }

    async handle(command) {
        this.logger.info(`Starting dependency cleaning for project: ${command.projectPath}`);

        try {
            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getRefactorOptions();
            const outputConfig = command.getOutputConfiguration();

            // Step 1: Analyze current dependencies
            const currentDependencies = await this.analyzeCurrentDependencies(command.projectPath);
            
            // Step 2: Identify unused dependencies
            const unusedDependencies = await this.identifyUnusedDependencies(command.projectPath, currentDependencies);
            
            // Step 3: Check for duplicate dependencies
            const duplicateDependencies = await this.findDuplicateDependencies(currentDependencies);
            
            // Step 4: Check security vulnerabilities
            let securityIssues = null;
            if (options.checkSecurity) {
                securityIssues = await this.checkSecurityVulnerabilities(currentDependencies);
            }
            
            // Step 5: Generate cleaning plan
            const cleaningPlan = await this.generateCleaningPlan({
                currentDependencies,
                unusedDependencies,
                duplicateDependencies,
                securityIssues,
                options
            });
            
            // Step 6: Execute cleaning (if enabled)
            let executionResults = null;
            if (options.removeUnused || options.consolidateDuplicates) {
                executionResults = await this.executeCleaning(command.projectPath, cleaningPlan, options);
            }
            
            // Step 7: Update versions (if enabled)
            let updateResults = null;
            if (options.updateVersions) {
                updateResults = await this.updateDependencyVersions(command.projectPath, cleaningPlan);
            }
            
            // Step 8: Validate changes
            let validationResults = null;
            if (options.validateChanges) {
                validationResults = await this.validateChanges(command.projectPath, cleaningPlan);
            }

            // Step 9: Generate output
            const output = await this.generateOutput({
                command,
                currentDependencies,
                unusedDependencies,
                duplicateDependencies,
                securityIssues,
                cleaningPlan,
                executionResults,
                updateResults,
                validationResults,
                outputConfig
            });

            // Step 10: Save results
            await this.saveResults(command, output);

            this.logger.info(`Dependency cleaning completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`Dependency cleaning failed for project ${command.projectPath}:`, error);
            
            await this.eventBus.publish('dependency.cleaning.failed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message,
                timestamp: new Date()
            });

            throw error;
        }
    }

    async analyzeCurrentDependencies(projectPath) {
        this.logger.info('Analyzing current dependencies...');
        
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageLockPath = path.join(projectPath, 'package-lock.json');
        
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            const packageLock = packageLockPath ? JSON.parse(await fs.readFile(packageLockPath, 'utf-8')) : null;
            
            const dependencies = {
                direct: {
                    dependencies: packageJson.dependencies || {},
                    devDependencies: packageJson.devDependencies || {},
                    peerDependencies: packageJson.peerDependencies || {},
                    optionalDependencies: packageJson.optionalDependencies || {}
                },
                transitive: {},
                metadata: {
                    totalDirect: 0,
                    totalTransitive: 0,
                    totalSize: 0,
                    vulnerabilities: 0
                }
            };

            // Calculate totals
            dependencies.metadata.totalDirect = Object.keys(dependencies.direct.dependencies).length +
                                               Object.keys(dependencies.direct.devDependencies).length +
                                               Object.keys(dependencies.direct.peerDependencies).length +
                                               Object.keys(dependencies.direct.optionalDependencies).length;

            // Analyze transitive dependencies if package-lock.json exists
            if (packageLock && packageLock.dependencies) {
                dependencies.transitive = this.analyzeTransitiveDependencies(packageLock.dependencies);
                dependencies.metadata.totalTransitive = Object.keys(dependencies.transitive).length;
            }

            return dependencies;
        } catch (error) {
            throw new Error(`Failed to analyze dependencies: ${error.message}`);
        }
    }

    analyzeTransitiveDependencies(dependencies, result = {}) {
        for (const [name, info] of Object.entries(dependencies)) {
            result[name] = {
                version: info.version,
                resolved: info.resolved,
                integrity: info.integrity,
                requires: info.requires || {},
                dependencies: info.dependencies || {}
            };

            if (info.dependencies) {
                this.analyzeTransitiveDependencies(info.dependencies, result);
            }
        }

        return result;
    }

    async identifyUnusedDependencies(projectPath, currentDependencies) {
        this.logger.info('Identifying unused dependencies...');
        
        const unused = {
            dependencies: [],
            devDependencies: [],
            totalUnused: 0,
            potentialSavings: 0
        };

        try {
            // Get all code files
            const codeFiles = await this.getAllCodeFiles(projectPath);
            
            // Check each dependency
            const allDeps = {
                ...currentDependencies.direct.dependencies,
                ...currentDependencies.direct.devDependencies
            };

            for (const [depName, depVersion] of Object.entries(allDeps)) {
                const isUsed = await this.checkDependencyUsage(depName, codeFiles);
                
                if (!isUsed) {
                    const depType = currentDependencies.direct.dependencies[depName] ? 'dependencies' : 'devDependencies';
                    unused[depType].push({
                        name: depName,
                        version: depVersion,
                        type: depType,
                        reason: 'Not imported or used in code'
                    });
                }
            }

            unused.totalUnused = unused.dependencies.length + unused.devDependencies.length;
            
            return unused;
        } catch (error) {
            throw new Error(`Failed to identify unused dependencies: ${error.message}`);
        }
    }

    async getAllCodeFiles(projectPath) {
        const files = [];
        
        const scanDir = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
                    await scanDir(fullPath);
                } else if (entry.isFile() && this.isCodeFile(entry.name)) {
                    files.push(fullPath);
                }
            }
        };

        await scanDir(projectPath);
        return files;
    }

    shouldSkipDirectory(dirName) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];
        return skipDirs.includes(dirName);
    }

    isCodeFile(fileName) {
        const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.json'];
        return codeExtensions.some(ext => fileName.endsWith(ext));
    }

    async checkDependencyUsage(depName, codeFiles) {
        for (const filePath of codeFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                
                // Check for import statements
                if (content.includes(`from '${depName}'`) || 
                    content.includes(`from "${depName}"`) ||
                    content.includes(`require('${depName}')`) ||
                    content.includes(`require("${depName}")`)) {
                    return true;
                }
                
                // Check for package.json references
                if (filePath.endsWith('package.json') && content.includes(`"${depName}"`)) {
                    return true;
                }
            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }
        
        return false;
    }

    async findDuplicateDependencies(currentDependencies) {
        this.logger.info('Finding duplicate dependencies...');
        
        const duplicates = [];
        const versionMap = {};

        // Check direct dependencies
        const allDeps = {
            ...currentDependencies.direct.dependencies,
            ...currentDependencies.direct.devDependencies
        };

        for (const [name, version] of Object.entries(allDeps)) {
            if (!versionMap[name]) {
                versionMap[name] = [];
            }
            versionMap[name].push({ version, type: 'direct' });
        }

        // Check transitive dependencies
        for (const [name, info] of Object.entries(currentDependencies.transitive)) {
            if (!versionMap[name]) {
                versionMap[name] = [];
            }
            versionMap[name].push({ version: info.version, type: 'transitive' });
        }

        // Find duplicates
        for (const [name, versions] of Object.entries(versionMap)) {
            if (versions.length > 1) {
                const uniqueVersions = [...new Set(versions.map(v => v.version))];
                if (uniqueVersions.length > 1) {
                    duplicates.push({
                        name,
                        versions: uniqueVersions,
                        occurrences: versions,
                        recommendation: this.getVersionRecommendation(uniqueVersions)
                    });
                }
            }
        }

        return duplicates;
    }

    getVersionRecommendation(versions) {
        // Simple version recommendation - use the highest version
        const sortedVersions = versions.sort((a, b) => {
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aPart = aParts[i] || 0;
                const bPart = bParts[i] || 0;
                if (aPart !== bPart) {
                    return bPart - aPart;
                }
            }
            return 0;
        });

        return sortedVersions[0];
    }

    async checkSecurityVulnerabilities(currentDependencies) {
        this.logger.info('Checking security vulnerabilities...');
        
        // This is a simplified implementation
        // In a real scenario, you would integrate with npm audit or similar tools
        const vulnerabilities = {
            high: [],
            medium: [],
            low: [],
            total: 0
        };

        // Simulate vulnerability check
        const allDeps = {
            ...currentDependencies.direct.dependencies,
            ...currentDependencies.direct.devDependencies
        };

        for (const [name, version] of Object.entries(allDeps)) {
            // Simulate vulnerability detection
            if (this.isKnownVulnerable(name, version)) {
                const severity = this.getVulnerabilitySeverity(name);
                vulnerabilities[severity].push({
                    name,
                    version,
                    severity,
                    description: `Known vulnerability in ${name}@${version}`,
                    recommendation: `Update to latest version`
                });
            }
        }

        vulnerabilities.total = vulnerabilities.high.length + vulnerabilities.medium.length + vulnerabilities.low.length;
        
        return vulnerabilities;
    }

    isKnownVulnerable(name, version) {
        // Simplified vulnerability check
        const vulnerablePackages = {
            'lodash': ['<4.17.21'],
            'moment': ['<2.29.4'],
            'axios': ['<1.6.0']
        };

        return vulnerablePackages[name] && vulnerablePackages[name].some(range => 
            this.satisfiesVersion(version, range)
        );
    }

    satisfiesVersion(version, range) {
        // Simplified version range checking
        if (range.startsWith('<')) {
            const targetVersion = range.substring(1);
            return this.compareVersions(version, targetVersion) < 0;
        }
        return false;
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 !== part2) {
                return part1 - part2;
            }
        }
        return 0;
    }

    getVulnerabilitySeverity(name) {
        const severityMap = {
            'lodash': 'high',
            'moment': 'medium',
            'axios': 'low'
        };
        return severityMap[name] || 'low';
    }

    async generateCleaningPlan(data) {
        const { currentDependencies, unusedDependencies, duplicateDependencies, securityIssues, options } = data;
        
        this.logger.info('Generating cleaning plan...');
        
        const plan = {
            actions: [],
            recommendations: [],
            estimatedSavings: 0
        };

        // Add remove unused dependencies action
        if (options.removeUnused && unusedDependencies.totalUnused > 0) {
            plan.actions.push({
                type: 'remove_unused',
                dependencies: [...unusedDependencies.dependencies, ...unusedDependencies.devDependencies],
                reason: 'Unused dependencies detected',
                priority: 'high'
            });
        }

        // Add consolidate duplicates action
        if (options.consolidateDuplicates && duplicateDependencies.length > 0) {
            plan.actions.push({
                type: 'consolidate_duplicates',
                duplicates: duplicateDependencies,
                reason: 'Duplicate dependencies detected',
                priority: 'medium'
            });
        }

        // Add security updates action
        if (options.checkSecurity && securityIssues.total > 0) {
            plan.actions.push({
                type: 'security_updates',
                vulnerabilities: securityIssues,
                reason: 'Security vulnerabilities detected',
                priority: 'critical'
            });
        }

        // Generate recommendations
        plan.recommendations = this.generateRecommendations(data);

        return plan;
    }

    generateRecommendations(data) {
        const { currentDependencies, unusedDependencies, duplicateDependencies, securityIssues } = data;
        const recommendations = [];

        if (unusedDependencies.totalUnused > 10) {
            recommendations.push({
                type: 'performance',
                message: `High number of unused dependencies (${unusedDependencies.totalUnused}). Consider removing them to reduce bundle size.`,
                priority: 'high'
            });
        }

        if (duplicateDependencies.length > 5) {
            recommendations.push({
                type: 'maintainability',
                message: `Multiple duplicate dependencies detected (${duplicateDependencies.length}). Consider consolidating versions.`,
                priority: 'medium'
            });
        }

        if (securityIssues.high.length > 0) {
            recommendations.push({
                type: 'security',
                message: `Critical security vulnerabilities detected (${securityIssues.high.length} high, ${securityIssues.medium.length} medium). Update immediately.`,
                priority: 'critical'
            });
        }

        return recommendations;
    }

    async executeCleaning(projectPath, cleaningPlan, options) {
        this.logger.info('Executing dependency cleaning...');
        
        const results = {
            removed: [],
            consolidated: [],
            errors: [],
            skipped: []
        };

        for (const action of cleaningPlan.actions) {
            try {
                if (action.type === 'remove_unused') {
                    const removed = await this.removeUnusedDependencies(projectPath, action.dependencies);
                    results.removed.push(...removed);
                } else if (action.type === 'consolidate_duplicates') {
                    const consolidated = await this.consolidateDuplicateDependencies(projectPath, action.duplicates);
                    results.consolidated.push(...consolidated);
                }
            } catch (error) {
                results.errors.push({
                    action,
                    error: error.message
                });
            }
        }

        return results;
    }

    async removeUnusedDependencies(projectPath, dependencies) {
        const removed = [];
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            
            for (const dep of dependencies) {
                if (packageJson.dependencies && packageJson.dependencies[dep.name]) {
                    delete packageJson.dependencies[dep.name];
                    removed.push({ name: dep.name, type: 'dependencies' });
                } else if (packageJson.devDependencies && packageJson.devDependencies[dep.name]) {
                    delete packageJson.devDependencies[dep.name];
                    removed.push({ name: dep.name, type: 'devDependencies' });
                }
            }

            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            
        } catch (error) {
            throw new Error(`Failed to remove unused dependencies: ${error.message}`);
        }

        return removed;
    }

    async consolidateDuplicateDependencies(projectPath, duplicates) {
        const consolidated = [];
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            
            for (const duplicate of duplicates) {
                const recommendedVersion = duplicate.recommendation;
                
                if (packageJson.dependencies && packageJson.dependencies[duplicate.name]) {
                    packageJson.dependencies[duplicate.name] = recommendedVersion;
                    consolidated.push({ name: duplicate.name, version: recommendedVersion, type: 'dependencies' });
                } else if (packageJson.devDependencies && packageJson.devDependencies[duplicate.name]) {
                    packageJson.devDependencies[duplicate.name] = recommendedVersion;
                    consolidated.push({ name: duplicate.name, version: recommendedVersion, type: 'devDependencies' });
                }
            }

            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            
        } catch (error) {
            throw new Error(`Failed to consolidate duplicate dependencies: ${error.message}`);
        }

        return consolidated;
    }

    async updateDependencyVersions(projectPath, cleaningPlan) {
        this.logger.info('Updating dependency versions...');
        
        const results = {
            updated: [],
            errors: []
        };

        // This is a simplified implementation
        // In a real scenario, you would use npm update or similar tools
        
        return results;
    }

    async validateChanges(projectPath, cleaningPlan) {
        this.logger.info('Validating dependency changes...');
        
        const results = {
            valid: true,
            issues: [],
            metrics: {}
        };

        try {
            // Check if package.json is still valid
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            
            // Basic validation
            if (!packageJson.name || !packageJson.version) {
                results.valid = false;
                results.issues.push({
                    type: 'invalid_package_json',
                    message: 'Package.json is missing required fields'
                });
            }

            // Calculate new metrics
            const newDependencies = await this.analyzeCurrentDependencies(projectPath);
            results.metrics = newDependencies.metadata;
            
        } catch (error) {
            results.valid = false;
            results.issues.push({
                type: 'validation_error',
                message: error.message
            });
        }

        return results;
    }

    async generateOutput(data) {
        const { command, currentDependencies, unusedDependencies, duplicateDependencies, securityIssues, cleaningPlan, executionResults, updateResults, validationResults, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                totalDependencies: currentDependencies.metadata.totalDirect,
                unusedDependencies: unusedDependencies.totalUnused,
                duplicateDependencies: duplicateDependencies.length,
                securityVulnerabilities: securityIssues.total,
                actionsExecuted: cleaningPlan.actions.length,
                dependenciesRemoved: executionResults?.removed?.length || 0,
                dependenciesConsolidated: executionResults?.consolidated?.length || 0,
                validationPassed: validationResults?.valid || false
            },
            currentDependencies: outputConfig.includeRawData ? currentDependencies : currentDependencies.metadata,
            unusedDependencies,
            duplicateDependencies,
            securityIssues,
            cleaningPlan: {
                actions: cleaningPlan.actions,
                recommendations: cleaningPlan.recommendations
            },
            results: {
                execution: executionResults,
                updates: updateResults,
                validation: validationResults
            }
        };

        if (outputConfig.includeMetrics) {
            output.metrics = {
                before: currentDependencies.metadata,
                after: validationResults?.metrics || currentDependencies.metadata
            };
        }

        return output;
    }

    async saveResults(command, output) {
        try {
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'dependency_cleaning',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            await this.eventBus.publish('dependency.cleaning.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save dependency cleaning results:', error);
        }
    }
}

module.exports = CleanDependenciesHandler; 