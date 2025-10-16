/**
 * GetAnalysisQuery
 * Query for retrieving analysis results
 */
export class GetAnalysisQuery {
  constructor(options = {}) {
    this._projectId = options.projectId || null;
    this._category = options.category || null;
    this._status = options.status || null;
    this._limit = options.limit || 50;
    this._offset = options.offset || 0;
    this._sortBy = options.sortBy || 'createdAt';
    this._sortOrder = options.sortOrder || 'desc';
    this._includeResults = options.includeResults || false;
  }

  get projectId() {
    return this._projectId;
  }

  get category() {
    return this._category;
  }

  get status() {
    return this._status;
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

  get includeResults() {
    return this._includeResults;
  }

  toJSON() {
    return {
      projectId: this._projectId,
      category: this._category,
      status: this._status,
      limit: this._limit,
      offset: this._offset,
      sortBy: this._sortBy,
      sortOrder: this._sortOrder,
      includeResults: this._includeResults
    };
  }

  static fromJSON(data) {
    return new GetAnalysisQuery({
      projectId: data.projectId,
      category: data.category,
      status: data.status,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
      includeResults: data.includeResults
    });
  }
}
