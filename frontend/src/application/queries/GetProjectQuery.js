/**
 * GetProjectQuery
 * Query for retrieving project information
 */
export class GetProjectQuery {
  constructor(projectId, options = {}) {
    this._projectId = projectId;
    this._includeStatistics = options.includeStatistics || false;
    this._includeTasks = options.includeTasks || false;
    this._includeAnalysis = options.includeAnalysis || false;
    this._includeChatSessions = options.includeChatSessions || false;
  }

  get projectId() {
    return this._projectId;
  }

  get includeStatistics() {
    return this._includeStatistics;
  }

  get includeTasks() {
    return this._includeTasks;
  }

  get includeAnalysis() {
    return this._includeAnalysis;
  }

  get includeChatSessions() {
    return this._includeChatSessions;
  }

  toJSON() {
    return {
      projectId: this._projectId,
      includeStatistics: this._includeStatistics,
      includeTasks: this._includeTasks,
      includeAnalysis: this._includeAnalysis,
      includeChatSessions: this._includeChatSessions
    };
  }

  static fromJSON(data) {
    return new GetProjectQuery(
      data.projectId,
      {
        includeStatistics: data.includeStatistics,
        includeTasks: data.includeTasks,
        includeAnalysis: data.includeAnalysis,
        includeChatSessions: data.includeChatSessions
      }
    );
  }
}
