/**
 * TaskTemplateRepository Interface
 * Defines the contract for task template persistence operations
 */
class TaskTemplateRepository {
  async save(template) { throw new Error('save method must be implemented'); }
  async findById(id) { throw new Error('findById method must be implemented'); }
  async findByName(name) { throw new Error('findByName method must be implemented'); }
  async findAll(filters = {}) { throw new Error('findAll method must be implemented'); }
  async findByType(type, filters = {}) { throw new Error('findByType method must be implemented'); }
  async findByCategory(category, filters = {}) { throw new Error('findByCategory method must be implemented'); }
  async findByTags(tags, filters = {}) { throw new Error('findByTags method must be implemented'); }
  async findActive(filters = {}) { throw new Error('findActive method must be implemented'); }
  async findInactive(filters = {}) { throw new Error('findInactive method must be implemented'); }
  async findMostUsed(limit = 10, filters = {}) { throw new Error('findMostUsed method must be implemented'); }
  async findRecentlyUsed(days = 7, filters = {}) { throw new Error('findRecentlyUsed method must be implemented'); }
  async update(id, updates) { throw new Error('update method must be implemented'); }
  async delete(id) { throw new Error('delete method must be implemented'); }
  async bulkSave(templates) { throw new Error('bulkSave method must be implemented'); }
  async bulkUpdate(updates) { throw new Error('bulkUpdate method must be implemented'); }
  async bulkDelete(ids) { throw new Error('bulkDelete method must be implemented'); }
  async search(searchTerm, filters = {}) { throw new Error('search method must be implemented'); }
  async findWithPagination(page = 1, limit = 10, filters = {}, sort = {}) { throw new Error('findWithPagination method must be implemented'); }
  async exists(id) { throw new Error('exists method must be implemented'); }
  async getStatistics(filters = {}) { throw new Error('getStatistics method must be implemented'); }
  async clear() { throw new Error('clear method must be implemented'); }
}

module.exports = TaskTemplateRepository; 