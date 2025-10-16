/**
 * CreateProjectCommand
 * Command for creating a new project
 */
export class CreateProjectCommand {
  constructor(name, workspacePath, options = {}) {
    this._name = name;
    this._workspacePath = workspacePath;
    this._description = options.description || '';
    this._type = options.type || 'development';
    this._framework = options.framework || '';
    this._language = options.language || '';
    this._packageManager = options.packageManager || '';
    this._portConfiguration = options.portConfiguration || null;
    this._metadata = options.metadata || {};
  }

  get name() {
    return this._name;
  }

  get workspacePath() {
    return this._workspacePath;
  }

  get description() {
    return this._description;
  }

  get type() {
    return this._type;
  }

  get framework() {
    return this._framework;
  }

  get language() {
    return this._language;
  }

  get packageManager() {
    return this._packageManager;
  }

  get portConfiguration() {
    return this._portConfiguration;
  }

  get metadata() {
    return this._metadata;
  }

  toJSON() {
    return {
      name: this._name,
      workspacePath: this._workspacePath,
      description: this._description,
      type: this._type,
      framework: this._framework,
      language: this._language,
      packageManager: this._packageManager,
      portConfiguration: this._portConfiguration,
      metadata: this._metadata
    };
  }

  static fromJSON(data) {
    return new CreateProjectCommand(
      data.name,
      data.workspacePath,
      {
        description: data.description,
        type: data.type,
        framework: data.framework,
        language: data.language,
        packageManager: data.packageManager,
        portConfiguration: data.portConfiguration,
        metadata: data.metadata
      }
    );
  }
}
