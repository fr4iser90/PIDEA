/**
 * ProjectCreatedEvent Domain Event
 * Raised when a new project is created
 */
export class ProjectCreatedEvent {
  constructor(projectId, projectName, workspacePath, createdAt) {
    this._projectId = projectId;
    this._projectName = projectName;
    this._workspacePath = workspacePath;
    this._createdAt = createdAt || new Date();
    this._eventType = 'ProjectCreated';
  }

  get projectId() {
    return this._projectId;
  }

  get projectName() {
    return this._projectName;
  }

  get workspacePath() {
    return this._workspacePath;
  }

  get createdAt() {
    return this._createdAt;
  }

  get eventType() {
    return this._eventType;
  }

  toJSON() {
    return {
      eventType: this._eventType,
      projectId: this._projectId,
      projectName: this._projectName,
      workspacePath: this._workspacePath,
      createdAt: this._createdAt.toISOString()
    };
  }

  static fromJSON(data) {
    return new ProjectCreatedEvent(
      data.projectId,
      data.projectName,
      data.workspacePath,
      new Date(data.createdAt)
    );
  }
}
