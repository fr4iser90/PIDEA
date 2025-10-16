/**
 * Project Domain Entity
 * Represents a project with its business rules and invariants
 */
import { ProjectId } from '../value-objects/ProjectId.js';
import { PortConfiguration } from '../value-objects/PortConfiguration.js';

export class Project {
  constructor(id, name, workspacePath, options = {}) {
    this._id = id instanceof ProjectId ? id : new ProjectId(id);
    this._name = this.validateName(name);
    this._workspacePath = this.validateWorkspacePath(workspacePath);
    this._description = options.description || '';
    this._type = options.type || 'development';
    this._framework = options.framework || '';
    this._language = options.language || '';
    this._packageManager = options.packageManager || '';
    this._portConfiguration = options.portConfiguration ? 
      (options.portConfiguration instanceof PortConfiguration ? 
        options.portConfiguration : 
        new PortConfiguration(options.portConfiguration.port, options.portConfiguration.host)) : 
      null;
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._isActive = options.isActive !== undefined ? options.isActive : true;
    
    this.validateInvariants();
  }

  get id() {
    return this._id;
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

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  get isActive() {
    return this._isActive;
  }

  validateName(name) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Project name must be a non-empty string');
    }
    if (name.length > 100) {
      throw new Error('Project name must be less than 100 characters');
    }
    return name.trim();
  }

  validateWorkspacePath(path) {
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      throw new Error('Workspace path must be a non-empty string');
    }
    return path.trim();
  }

  validateInvariants() {
    if (!this._id) {
      throw new Error('Project must have a valid ID');
    }
    if (!this._name) {
      throw new Error('Project must have a name');
    }
    if (!this._workspacePath) {
      throw new Error('Project must have a workspace path');
    }
  }

  updateName(newName) {
    this._name = this.validateName(newName);
    this._updatedAt = new Date();
  }

  updateDescription(newDescription) {
    this._description = newDescription || '';
    this._updatedAt = new Date();
  }

  updatePortConfiguration(portConfig) {
    this._portConfiguration = portConfig instanceof PortConfiguration ? 
      portConfig : 
      new PortConfiguration(portConfig.port, portConfig.host);
    this._updatedAt = new Date();
  }

  activate() {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate() {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  equals(other) {
    return other instanceof Project && this._id.equals(other._id);
  }

  toJSON() {
    return {
      id: this._id.value,
      name: this._name,
      workspacePath: this._workspacePath,
      description: this._description,
      type: this._type,
      framework: this._framework,
      language: this._language,
      packageManager: this._packageManager,
      portConfiguration: this._portConfiguration ? {
        port: this._portConfiguration.port,
        host: this._portConfiguration.host
      } : null,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      isActive: this._isActive
    };
  }

  static fromJSON(data) {
    return new Project(
      data.id,
      data.name,
      data.workspacePath,
      {
        description: data.description,
        type: data.type,
        framework: data.framework,
        language: data.language,
        packageManager: data.packageManager,
        portConfiguration: data.portConfiguration,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        isActive: data.isActive
      }
    );
  }
}
