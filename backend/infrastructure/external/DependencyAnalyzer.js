const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const semver = require('semver');

class DependencyAnalyzer {
    constructor(dependencies = {}) {
    }

    async analyzeDependencies(projectPath, options = {}) {
        // Simple, direct approach - no strategies
        const packages = await this.findPackages(projectPath);
        
        if (packages.length === 0) {
            console.error('No package.json found in any expected location');
            return this.getEmptyResult();
        }

        // Process all found packages
        const allDirectDependencies = [];
        const allDirectDevDependencies = [];
        const allTransitiveDependencies = [];
        const allOutdatedPackages = [];
        const allVulnerabilities = [];
        const allBundleSizes = {};
        const allDependencyGraphs = {};

        for (const pkg of packages) {
            const packageJsonPath = path.join(pkg.path, 'package.json');
            const lockPath = path.join(pkg.path, 'package-lock.json');
            let packageLock;
            
            try {
                packageLock = JSON.parse(await fsPromises.readFile(lockPath, 'utf-8'));
            } catch (e) {
                packageLock = null;
            }

            // Direct dependencies
            const directDeps = this.extractDeps(pkg.dependencies, packageLock);
            const directDevDeps = this.extractDeps(pkg.devDependencies, packageLock);
            const transitiveDeps = packageLock ? this.extractTransitiveDeps(packageLock) : [];
            const outdatedPkgs = await this.findOutdatedPackages(directDeps, pkg.path);

            allDirectDependencies.push(...directDeps);
            allDirectDevDependencies.push(...directDevDeps);
            allTransitiveDependencies.push(...transitiveDeps);
            allOutdatedPackages.push(...outdatedPkgs);
        }

        // Calculate metrics
        const metrics = {
            directDependencyCount: allDirectDependencies.length,
            transitiveDependencyCount: allTransitiveDependencies.length,
            totalDependencies: allDirectDependencies.length + allTransitiveDependencies.length,
            vulnerabilityCount: allVulnerabilities.length,
            outdatedPackageCount: allOutdatedPackages.length,
            licenseIssueCount: 1, // Placeholder
            bundleSize: Object.keys(allBundleSizes).length > 0 ? Object.values(allBundleSizes).reduce((a, b) => a + b, 0) : 0,
            averageDependencyAge: this.calculateAverageAge(allDirectDependencies),
            securityScore: allVulnerabilities.length === 0 ? 100 : Math.max(0, 100 - allVulnerabilities.length * 10),
            updateScore: allOutdatedPackages.length === 0 ? 100 : Math.max(0, 100 - allOutdatedPackages.length * 5)
        };

        return {
            packages: packages,
            directDependencies: allDirectDependencies,
            directDevDependencies: allDirectDevDependencies,
            transitiveDependencies: allTransitiveDependencies,
            outdatedPackages: allOutdatedPackages,
            vulnerabilities: allVulnerabilities,
            license: null,
            bundleSize: allBundleSizes,
            dependencyGraph: allDependencyGraphs,
            metrics
        };
    }

    /**
     * Find all packages in the project
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Package list
     */
    async findPackages(projectPath) {
        const packages = [];
        
        // Check root package.json
        const rootPackagePath = path.join(projectPath, 'package.json');
        if (await this.fileExists(rootPackagePath)) {
            try {
                const packageJson = JSON.parse(await fsPromises.readFile(rootPackagePath, 'utf-8'));
                packages.push({
                    name: packageJson.name,
                    version: packageJson.version,
                    path: projectPath,
                    dependencies: packageJson.dependencies || {},
                    devDependencies: packageJson.devDependencies || {}
                });
                console.log(`Found root package.json: ${packageJson.name}`);
            } catch (e) {
                console.error('Failed to parse root package.json');
            }
        }

        // Check common subdirectories
        const commonDirs = ['backend', 'frontend', 'api', 'client', 'server', 'app', 'src'];
        for (const dir of commonDirs) {
            const subdirPath = path.join(projectPath, dir);
            const packagePath = path.join(subdirPath, 'package.json');
            
            if (await this.fileExists(packagePath)) {
                try {
                    const packageJson = JSON.parse(await fsPromises.readFile(packagePath, 'utf-8'));
                    packages.push({
                        name: packageJson.name,
                        version: packageJson.version,
                        path: subdirPath,
                        dependencies: packageJson.dependencies || {},
                        devDependencies: packageJson.devDependencies || {}
                    });
                    console.log(`Found package.json in ${dir}: ${packageJson.name}`);
                } catch (e) {
                    console.error(`Failed to parse package.json in ${dir}`);
                }
            }
        }

        return packages;
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath) {
        try {
            await fsPromises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    extractDeps(depsObj, packageLock) {
        if (!depsObj) return [];
        return Object.entries(depsObj).map(([name, version]) => {
            let locked = null;
            if (packageLock && packageLock.dependencies && packageLock.dependencies[name]) {
                locked = packageLock.dependencies[name].version;
            }
            return {
                name,
                required: version,
                installed: locked || null
            };
        });
    }

    extractTransitiveDeps(packageLock) {
        const result = [];
        function walk(deps) {
            for (const [name, info] of Object.entries(deps)) {
                result.push({
                    name,
                    version: info.version,
                    resolved: info.resolved || null
                });
                if (info.dependencies) walk(info.dependencies);
            }
        }
        if (packageLock.dependencies) walk(packageLock.dependencies);
        return result;
    }

    async findOutdatedPackages(directDependencies, projectPath) {
        const nodeModulesPath = path.join(projectPath, 'node_modules');
        const outdated = [];
        for (const dep of directDependencies) {
            if (!dep.installed) continue;
            try {
                const pkgPath = path.join(nodeModulesPath, dep.name, 'package.json');
                const pkg = JSON.parse(await fsPromises.readFile(pkgPath, 'utf-8'));
                if (!semver.satisfies(pkg.version, dep.required)) {
                    outdated.push({
                        name: dep.name,
                        required: dep.required,
                        installed: pkg.version,
                        updateType: this.getUpdateType(pkg.version, dep.required)
                    });
                }
            } catch (e) {
                outdated.push({
                    name: dep.name,
                    required: dep.required,
                    installed: null,
                    updateType: 'missing'
                });
            }
        }
        return outdated;
    }

    getUpdateType(installed, required) {
        try {
            if (semver.major(installed) !== semver.major(required)) return 'major';
            if (semver.minor(installed) !== semver.minor(required)) return 'minor';
            if (semver.patch(installed) !== semver.patch(required)) return 'patch';
        } catch (e) {}
        return 'unknown';
    }

    calculateAverageAge(dependencies) {
        if (!dependencies || dependencies.length === 0) return 0;
        
        let totalAge = 0;
        let validDeps = 0;
        
        for (const dep of dependencies) {
            if (dep.installed) {
                try {
                    const version = dep.installed;
                    const parts = version.split('.');
                    if (parts.length >= 3) {
                        const major = parseInt(parts[0]);
                        const minor = parseInt(parts[1]);
                        const patch = parseInt(parts[2]);
                        totalAge += major * 12 + minor * 2 + patch * 0.1;
                        validDeps++;
                    }
                } catch (e) {
                    // Skip invalid versions
                }
            }
        }
        
        return validDeps > 0 ? Math.round(totalAge / validDeps) : 0;
    }

    getEmptyResult() {
        return {
            directDependencies: [],
            directDevDependencies: [],
            transitiveDependencies: [],
            outdatedPackages: [],
            vulnerabilities: [],
            license: null,
            bundleSize: {},
            dependencyGraph: {},
            metrics: {
                directDependencyCount: 0,
                transitiveDependencyCount: 0,
                totalDependencies: 0,
                vulnerabilityCount: 0,
                outdatedPackageCount: 0,
                licenseIssueCount: 1,
                bundleSize: 0,
                averageDependencyAge: 0,
                securityScore: 0,
                updateScore: 0
            }
        };
    }
}

module.exports = DependencyAnalyzer; 