/**
 * TaskSuggestionRepository Interface
 * Defines the contract for task suggestion persistence operations
 */
class TaskSuggestionRepository {
  async save(suggestion) { throw new Error('save method must be implemented'); }
  async findById(id) { throw new Error('findById method must be implemented'); }
  async findAll(filters = {}) { throw new Error('findAll method must be implemented'); }
  async findByProjectId(projectId, filters = {}) { throw new Error('findByProjectId method must be implemented'); }
  async findByUserId(userId, filters = {}) { throw new Error('findByUserId method must be implemented'); }
  async findByStatus(status, filters = {}) { throw new Error('findByStatus method must be implemented'); }
  async findByType(type, filters = {}) { throw new Error('findByType method must be implemented'); }
  async findByConfidence(confidence, filters = {}) { throw new Error('findByConfidence method must be implemented'); }
  async findPending(filters = {}) { throw new Error('findPending method must be implemented'); }
  async findApplied(filters = {}) { throw new Error('findApplied method must be implemented'); }
  async findRejected(filters = {}) { throw new Error('findRejected method must be implemented'); }
  async findExpired(filters = {}) { throw new Error('findExpired method must be implemented'); }
  async findHighConfidence(filters = {}) { throw new Error('findHighConfidence method must be implemented'); }
  async findRequiringHumanReview(filters = {}) { throw new Error('findRequiringHumanReview method must be implemented'); }
  async findAutoApplicable(filters = {}) { throw new Error('findAutoApplicable method must be implemented'); }
  async update(id, updates) { throw new Error('update method must be implemented'); }
  async delete(id) { throw new Error('delete method must be implemented'); }
  async bulkSave(suggestions) { throw new Error('bulkSave method must be implemented'); }
  async bulkUpdate(updates) { throw new Error('bulkUpdate method must be implemented'); }
  async bulkDelete(ids) { throw new Error('bulkDelete method must be implemented'); }
  async search(searchTerm, filters = {}) { throw new Error('search method must be implemented'); }
  async findWithPagination(page = 1, limit = 10, filters = {}, sort = {}) { throw new Error('findWithPagination method must be implemented'); }
  async exists(id) { throw new Error('exists method must be implemented'); }
  async getStatistics(filters = {}) { throw new Error('getStatistics method must be implemented'); }
  async clear() { throw new Error('clear method must be implemented'); }
}

module.exports = TaskSuggestionRepository; 