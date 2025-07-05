const fs = require('fs').promises;
const path = require('path');
const semver = require('semver');

// DependencyAnalyzer Stub
class DependencyAnalyzer {
    constructor() {}

    async analyze(projectPath, options = {}) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const lockPath = path.join(projectPath, 'package-lock.json');
        let packageJson, packageLock;
        
        try {
            packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        } catch (e) {
            // Return empty results for projects without package.json
            return {
                directDependencies: [],
                directDevDependencies: [],
                transitiveDependencies: [],
                outdatedPackages: [],
                vulnerabilities: [],
                license: null,
                bundleSize: {},
                dependencyGraph: {}
            };
        }
        
        try {
            packageLock = JSON.parse(await fs.readFile(lockPath, 'utf-8'));
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

        return {
            directDependencies,
            directDevDependencies,
            transitiveDependencies,
            outdatedPackages,
            vulnerabilities,
            license,
            bundleSize,
            dependencyGraph
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
                const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
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
}

module.exports = DependencyAnalyzer; 