/**
 * GetTasksQuery
 * Query for retrieving tasks
 */
export class GetTasksQuery {
  constructor(options = {}) {
    this._projectId = options.projectId || null;
    this._status = options.status || null;
    this._type = options.type || null;
    this._priority = options.priority || null;
    this._limit = options.limit || 50;
    this._offset = options.offset || 0;
    this._sortBy = options.sortBy || 'createdAt';
    this._sortOrder = options.sortOrder || 'desc';
  }

  get projectId() {
    return this._projectId;
  }

  get status() {
    return this._status;
  }

  get type() {
    return this._type;
  }

  get priority() {
    return this._priority;
  }

  get limit() {
    return this._limit;
  }

  get offset() {
    return this._offset;
  }

  get sortBy() {
    return this._sortBy;
  }

  get sortOrder() {
    return this._sortOrder;
  }

  toJSON() {
    return {
      projectId: this._projectId,
      status: this._status,
      type: this._type,
      priority: this._priority,
      limit: this._limit,
      offset: this._offset,
      sortBy: this._sortBy,
      sortOrder: this._sortOrder
    };
  }

  static fromJSON(data) {
    return new GetTasksQuery({
      projectId: data.projectId,
      status: data.status,
      type: data.type,
      priority: data.priority,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder
    });
  }
}
