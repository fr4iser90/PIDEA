const UserSession = require('@domain/entities/UserSession');

class UserSessionRepository {
  async save(session) {
    if (!(session instanceof UserSession)) {
      throw new Error('Invalid session entity');
    }
    throw new Error('save method must be implemented');
  }

  async findById(id) {
    if (!id) {
      throw new Error('Session id is required');
    }
    throw new Error('findById method must be implemented');
  }

  async findByUserId(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }
    throw new Error('findByUserId method must be implemented');
  }

  async findByAccessToken(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    throw new Error('findByAccessToken method must be implemented');
  }

  async findByRefreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    throw new Error('findByRefreshToken method must be implemented');
  }

  async findActiveSessionsByUserId(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }
    throw new Error('findActiveSessionsByUserId method must be implemented');
  }

  async delete(id) {
    if (!id) {
      throw new Error('Session id is required');
    }
    throw new Error('delete method must be implemented');
  }

  async deleteByUserId(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }
    throw new Error('deleteByUserId method must be implemented');
  }

  async deleteExpiredSessions() {
    throw new Error('deleteExpiredSessions method must be implemented');
  }

  async update(session) {
    if (!(session instanceof UserSession)) {
      throw new Error('Invalid session entity');
    }
    throw new Error('update method must be implemented');
  }
}

module.exports = UserSessionRepository; 