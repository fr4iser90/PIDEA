const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  constructor(id, email, passwordHash, role, createdAt, updatedAt, metadata = {}) {
    this._id = id || uuidv4();
    this._email = email;
    this._passwordHash = passwordHash;
    this._role = role || 'user';
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
    this._metadata = metadata;
    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get email() { return this._email; }
  get passwordHash() { return this._passwordHash; }
  get role() { return this._role; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  get metadata() { return { ...this._metadata }; }

  // Domain methods
  isAdmin() {
    return this._role === 'admin';
  }

  isUser() {
    return this._role === 'user';
  }

  hasPermission(permission) {
    if (this.isAdmin()) return true;
    
    const userPermissions = {
      'user': ['read:own', 'write:own', 'chat:own', 'ide:own'],
      'admin': ['read:all', 'write:all', 'chat:all', 'ide:all', 'user:manage']
    };
    
    return userPermissions[this._role]?.includes(permission) || false;
  }

  canAccessResource(resourceType, resourceOwnerId) {
    if (this.isAdmin()) return true;
    if (resourceOwnerId === this._id) return true;
    
    const ownResourcePermissions = {
      'chat': ['read:own', 'write:own'],
      'ide': ['ide:own'],
      'workspace': ['read:own', 'write:own']
    };
    
    return ownResourcePermissions[resourceType]?.some(permission => 
      this.hasPermission(permission)
    ) || false;
  }

  updateLastActivity() {
    this._updatedAt = new Date();
  }

  // Business rules validation
  _validate() {
    if (!this._email || !this._isValidEmail(this._email)) {
      throw new Error('User email must be a valid email address');
    }
    if (!this._passwordHash || typeof this._passwordHash !== 'string' || this._passwordHash.length < 10) {
      throw new Error('User password hash is missing or invalid');
    }
    if (!['user', 'admin'].includes(this._role)) {
      throw new Error('User role must be either "user" or "admin"');
    }
    if (!(this._createdAt instanceof Date)) {
      throw new Error('User createdAt must be a Date object');
    }
    if (!(this._updatedAt instanceof Date)) {
      throw new Error('User updatedAt must be a Date object');
    }
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Factory methods
  static async createUser(email, password, role = 'user', metadata = {}) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    return new User(null, email, passwordHash, role, new Date(), new Date(), metadata);
  }

  static async createAdmin(email, password, metadata = {}) {
    return await User.createUser(email, password, 'admin', metadata);
  }

  // Password verification
  async verifyPassword(password) {
    return await bcrypt.compare(password, this._passwordHash);
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      email: this._email,
      role: this._role,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      metadata: this._metadata
    };
  }

  toJSONWithPassword() {
    return {
      id: this._id,
      email: this._email,
      passwordHash: this._passwordHash,
      role: this._role,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      metadata: this._metadata
    };
  }

  static fromJSON(data) {
    try {
      if (!data.passwordHash || typeof data.passwordHash !== 'string' || data.passwordHash.length < 10) {
        throw new Error('User password hash is missing or invalid in DB');
      }
      return new User(
        data.id,
        data.email,
        data.passwordHash,
        data.role,
        new Date(data.createdAt),
        new Date(data.updatedAt),
        data.metadata
      );
    } catch (err) {
      throw new Error('User.fromJSON failed: ' + err.message);
    }
  }
}

module.exports = User; 