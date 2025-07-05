const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const semver = require('semver');

// DependencyAnalyzer Stub
class DependencyAnalyzer {
    constructor() {}

    async analyzeDependencies(projectPath, options = {}) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const lockPath = path.join(projectPath, 'package-lock.json');
        let packageJson, packageLock;
        
        try {
            packageJson = JSON.parse(await fsPromises.readFile(packageJsonPath, 'utf-8'));
        } catch (e) {
            console.error('Error reading package.json:', e);
            // Return empty results for projects without package.json
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
        
        try {
            packageLock = JSON.parse(await fsPromises.readFile(lockPath, 'utf-8'));
        } catch (e) {
            packageLock = null;
        }

        // Direct dependencies
        const directDependencies = this.extractDeps(packageJson.dependencies, packageLock);
        const directDevDependencies = this.extractDeps(packageJson.devDependencies, packageLock);
        // Transitive dependencies (from lock file)
        const transitiveDependencies = packageLock ? this.extractTransitiveDeps(packageLock) : [];

        // Outdated check (local only, no registry fetch)
        const outdatedPackages = await this.findOutdatedPackages(directDependencies, projectPath);

        // License info
        const license = packageJson.license || null;

        // Vulnerabilities: Not supported offline, return empty
        const vulnerabilities = [];

        // Bundle size: Not supported, return empty
        const bundleSize = {};

        // Dependency graph: Not supported, return empty
        const dependencyGraph = {};

        // Calculate real metrics
        const metrics = {
            directDependencyCount: directDependencies.length,
            transitiveDependencyCount: transitiveDependencies.length,
            totalDependencies: directDependencies.length + transitiveDependencies.length,
            vulnerabilityCount: vulnerabilities.length,
            outdatedPackageCount: outdatedPackages.length,
            licenseIssueCount: license ? 0 : 1,
            bundleSize: Object.keys(bundleSize).length > 0 ? Object.values(bundleSize).reduce((a, b) => a + b, 0) : 0,
            averageDependencyAge: this.calculateAverageAge(directDependencies),
            securityScore: vulnerabilities.length === 0 ? 100 : Math.max(0, 100 - vulnerabilities.length * 10),
            updateScore: outdatedPackages.length === 0 ? 100 : Math.max(0, 100 - outdatedPackages.length * 5)
        };

        return {
            directDependencies,
            directDevDependencies,
            transitiveDependencies,
            outdatedPackages,
            vulnerabilities,
            license,
            bundleSize,
            dependencyGraph,
            metrics
        };
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
        // Only checks if installed version mismatches required (no registry fetch)
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
                // Not installed or not found
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
        if (dependencies.length === 0) return 0;
        
        let totalAge = 0;
        let validDeps = 0;
        
        for (const dep of dependencies) {
            if (dep.installed) {
                try {
                    // Calculate age based on version (simplified)
                    const version = dep.installed;
                    const parts = version.split('.');
                    if (parts.length >= 3) {
                        const major = parseInt(parts[0]);
                        const minor = parseInt(parts[1]);
                        const patch = parseInt(parts[2]);
                        // Simplified age calculation
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
}

module.exports = DependencyAnalyzer; 