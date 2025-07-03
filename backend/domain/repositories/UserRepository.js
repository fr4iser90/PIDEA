const User = require('../entities/User');

class UserRepository {
  async save(user) {
    if (!(user instanceof User)) {
      throw new Error('Invalid user entity');
    }
    throw new Error('save method must be implemented');
  }

  async findById(id) {
    if (!id) {
      throw new Error('User id is required');
    }
    throw new Error('findById method must be implemented');
  }

  async findByEmail(email) {
    if (!email) {
      throw new Error('User email is required');
    }
    throw new Error('findByEmail method must be implemented');
  }

  async findAll() {
    throw new Error('findAll method must be implemented');
  }

  async delete(id) {
    if (!id) {
      throw new Error('User id is required');
    }
    throw new Error('delete method must be implemented');
  }

  async update(user) {
    if (!(user instanceof User)) {
      throw new Error('Invalid user entity');
    }
    throw new Error('update method must be implemented');
  }

  async exists(email) {
    if (!email) {
      throw new Error('User email is required');
    }
    throw new Error('exists method must be implemented');
  }

  async findByRole(role) {
    if (!role) {
      throw new Error('User role is required');
    }
    throw new Error('findByRole method must be implemented');
  }
}

module.exports = UserRepository; 