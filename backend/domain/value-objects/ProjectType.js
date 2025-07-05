/**
 * ProjectType Value Object
 * Manages project types with detection and business logic
 */
class ProjectType {
  static MONOREPO = 'monorepo';
  static SINGLE_REPO = 'single_repo';
  static MICROSERVICES = 'microservices';
  static FRONTEND = 'frontend';
  static BACKEND = 'backend';
  static FULLSTACK = 'fullstack';
  static MOBILE = 'mobile';
  static DESKTOP = 'desktop';
  static LIBRARY = 'library';
  static API = 'api';
  static CLI = 'cli';
  static PLUGIN = 'plugin';
  static UNKNOWN = 'unknown';

  constructor(type) {
    this._validate(type);
    this._value = type;
  }

  get value() {
    return this._value;
  }

  isMonorepo() {
    return this._value === ProjectType.MONOREPO;
  }

  isSingleRepo() {
    return this._value === ProjectType.SINGLE_REPO;
  }

  isMicroservices() {
    return this._value === ProjectType.MICROSERVICES;
  }

  isFrontend() {
    return this._value === ProjectType.FRONTEND;
  }

  isBackend() {
    return this._value === ProjectType.BACKEND;
  }

  isFullstack() {
    return this._value === ProjectType.FULLSTACK;
  }

  isMobile() {
    return this._value === ProjectType.MOBILE;
  }

  isDesktop() {
    return this._value === ProjectType.DESKTOP;
  }

  isLibrary() {
    return this._value === ProjectType.LIBRARY;
  }

  isAPI() {
    return this._value === ProjectType.API;
  }

  isCLI() {
    return this._value === ProjectType.CLI;
  }

  isPlugin() {
    return this._value === ProjectType.PLUGIN;
  }

  isUnknown() {
    return this._value === ProjectType.UNKNOWN;
  }

  requiresFrontendStrategy() {
    return [
      ProjectType.FRONTEND,
      ProjectType.FULLSTACK
    ].includes(this._value);
  }

  requiresBackendStrategy() {
    return [
      ProjectType.BACKEND,
      ProjectType.FULLSTACK,
      ProjectType.API,
      ProjectType.MICROSERVICES
    ].includes(this._value);
  }

  requiresMonorepoStrategy() {
    return [
      ProjectType.MONOREPO
    ].includes(this._value);
  }

  requiresMicroservicesStrategy() {
    return [
      ProjectType.MICROSERVICES
    ].includes(this._value);
  }

  getDefaultStrategies() {
    const strategyMap = {
      [ProjectType.MONOREPO]: ['MonorepoStrategy'],
      [ProjectType.SINGLE_REPO]: ['SingleRepoStrategy'],
      [ProjectType.MICROSERVICES]: ['MicroservicesStrategy'],
      [ProjectType.FRONTEND]: ['FrontendStrategy'],
      [ProjectType.BACKEND]: ['BackendStrategy'],
      [ProjectType.FULLSTACK]: ['FullStackStrategy'],
      [ProjectType.MOBILE]: ['MobileStrategy'],
      [ProjectType.DESKTOP]: ['DesktopStrategy'],
      [ProjectType.LIBRARY]: ['SingleRepoStrategy'],
      [ProjectType.API]: ['BackendStrategy'],
      [ProjectType.CLI]: ['SingleRepoStrategy'],
      [ProjectType.PLUGIN]: ['SingleRepoStrategy'],
      [ProjectType.UNKNOWN]: ['SingleRepoStrategy']
    };
    return strategyMap[this._value] || ['SingleRepoStrategy'];
  }

  getDefaultTemplates() {
    const templateMap = {
      [ProjectType.MONOREPO]: ['monorepo-analysis', 'monorepo-build', 'monorepo-deploy'],
      [ProjectType.SINGLE_REPO]: ['basic-analysis', 'basic-build', 'basic-test'],
      [ProjectType.MICROSERVICES]: ['microservices-analysis', 'microservices-deploy', 'microservices-test'],
      [ProjectType.FRONTEND]: ['frontend-analysis', 'frontend-build', 'frontend-test'],
      [ProjectType.BACKEND]: ['backend-analysis', 'backend-build', 'backend-test'],
      [ProjectType.FULLSTACK]: ['fullstack-analysis', 'fullstack-build', 'fullstack-deploy'],
      [ProjectType.MOBILE]: ['mobile-analysis', 'mobile-build', 'mobile-test'],
      [ProjectType.DESKTOP]: ['desktop-analysis', 'desktop-build', 'desktop-test'],
      [ProjectType.LIBRARY]: ['library-analysis', 'library-build', 'library-test'],
      [ProjectType.API]: ['api-analysis', 'api-build', 'api-test'],
      [ProjectType.CLI]: ['cli-analysis', 'cli-build', 'cli-test'],
      [ProjectType.PLUGIN]: ['plugin-analysis', 'plugin-build', 'plugin-test'],
      [ProjectType.UNKNOWN]: ['basic-analysis', 'basic-build']
    };
    return templateMap[this._value] || ['basic-analysis'];
  }

  getComplexityScore() {
    const complexityMap = {
      [ProjectType.MONOREPO]: 5,
      [ProjectType.MICROSERVICES]: 5,
      [ProjectType.FULLSTACK]: 4,
      [ProjectType.MOBILE]: 4,
      [ProjectType.DESKTOP]: 4,
      [ProjectType.BACKEND]: 3,
      [ProjectType.FRONTEND]: 3,
      [ProjectType.API]: 3,
      [ProjectType.LIBRARY]: 2,
      [ProjectType.CLI]: 2,
      [ProjectType.PLUGIN]: 2,
      [ProjectType.SINGLE_REPO]: 1,
      [ProjectType.UNKNOWN]: 1
    };
    return complexityMap[this._value] || 1;
  }

  _validate(type) {
    const validTypes = [
      ProjectType.MONOREPO,
      ProjectType.SINGLE_REPO,
      ProjectType.MICROSERVICES,
      ProjectType.FRONTEND,
      ProjectType.BACKEND,
      ProjectType.FULLSTACK,
      ProjectType.MOBILE,
      ProjectType.DESKTOP,
      ProjectType.LIBRARY,
      ProjectType.API,
      ProjectType.CLI,
      ProjectType.PLUGIN,
      ProjectType.UNKNOWN
    ];

    if (!validTypes.includes(type)) {
      throw new Error(`Invalid project type: ${type}`);
    }
  }

  toString() {
    return this._value;
  }

  equals(other) {
    return other instanceof ProjectType && this._value === other._value;
  }

  static fromString(type) {
    return new ProjectType(type);
  }

  static detectFromFiles(files) {
    if (!files || files.length === 0) {
      return new ProjectType(ProjectType.UNKNOWN);
    }

    const fileNames = files.map(f => f.toLowerCase());
    const hasPackageJson = fileNames.some(f => f.includes('package.json'));
    const hasLernaJson = fileNames.some(f => f.includes('lerna.json'));
    const hasYarnWorkspaces = fileNames.some(f => f.includes('yarn.lock')) && fileNames.some(f => f.includes('workspaces'));
    const hasDockerCompose = fileNames.some(f => f.includes('docker-compose'));
    const hasKubernetes = fileNames.some(f => f.includes('kubernetes') || f.includes('k8s'));
    const hasReact = fileNames.some(f => f.includes('react') || f.includes('jsx') || f.includes('tsx'));
    const hasVue = fileNames.some(f => f.includes('vue'));
    const hasAngular = fileNames.some(f => f.includes('angular'));
    const hasExpress = fileNames.some(f => f.includes('express'));
    const hasFastify = fileNames.some(f => f.includes('fastify'));
    const hasNestJS = fileNames.some(f => f.includes('nest'));
    const hasMobile = fileNames.some(f => f.includes('react-native') || f.includes('flutter') || f.includes('ios') || f.includes('android'));
    const hasDesktop = fileNames.some(f => f.includes('electron') || f.includes('tauri'));
    const hasCLI = fileNames.some(f => f.includes('bin/') || f.includes('cli') || f.includes('command'));
    const hasAPI = fileNames.some(f => f.includes('api/') || f.includes('routes/') || f.includes('controllers/'));
    const hasFrontend = hasReact || hasVue || hasAngular;
    const hasBackend = hasExpress || hasFastify || hasNestJS || hasAPI;

    // Detection logic
    if (hasLernaJson || hasYarnWorkspaces) {
      return new ProjectType(ProjectType.MONOREPO);
    }

    if (hasDockerCompose || hasKubernetes) {
      return new ProjectType(ProjectType.MICROSERVICES);
    }

    if (hasMobile) {
      return new ProjectType(ProjectType.MOBILE);
    }

    if (hasDesktop) {
      return new ProjectType(ProjectType.DESKTOP);
    }

    if (hasCLI) {
      return new ProjectType(ProjectType.CLI);
    }

    if (hasFrontend && hasBackend) {
      return new ProjectType(ProjectType.FULLSTACK);
    }

    if (hasFrontend) {
      return new ProjectType(ProjectType.FRONTEND);
    }

    if (hasBackend) {
      return new ProjectType(ProjectType.BACKEND);
    }

    if (hasAPI) {
      return new ProjectType(ProjectType.API);
    }

    if (hasPackageJson) {
      return new ProjectType(ProjectType.LIBRARY);
    }

    return new ProjectType(ProjectType.UNKNOWN);
  }

  static getAllTypes() {
    return [
      ProjectType.MONOREPO,
      ProjectType.SINGLE_REPO,
      ProjectType.MICROSERVICES,
      ProjectType.FRONTEND,
      ProjectType.BACKEND,
      ProjectType.FULLSTACK,
      ProjectType.MOBILE,
      ProjectType.DESKTOP,
      ProjectType.LIBRARY,
      ProjectType.API,
      ProjectType.CLI,
      ProjectType.PLUGIN,
      ProjectType.UNKNOWN
    ];
  }
}

module.exports = ProjectType; 