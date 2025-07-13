const UserRepository = require('@repositories/UserRepository');
const User = require('@entities/User');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SQLiteUserRepository extends UserRepository {
  constructor(databaseConnection) {
    super();
    this.db = databaseConnection;
  }

  async save(user) {
    if (!(user instanceof User)) {
      if (!user.passwordHash || typeof user.passwordHash !== 'string' || user.passwordHash.length < 10) {
        throw new Error('User password hash is missing or invalid (save)');
      }
      user = new User(
        user.id,
        user.email,
        user.passwordHash,
        user.role || 'user',
        user.createdAt || new Date(),
        user.updatedAt || new Date(),
        user.metadata || {}
      );
    }

    const sql = `
      INSERT OR REPLACE INTO users (id, email, username, password_hash, role, status, metadata, created_at, updated_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const userData = user.toJSONWithPassword();
    
    await this.db.execute(sql, [
      userData.id,
      userData.email,
      userData.username || userData.email,
      userData.passwordHash,
      userData.role,
      userData.status || 'active',
      JSON.stringify(userData.metadata),
      userData.createdAt,
      userData.updatedAt,
      userData.lastLogin || null
    ]);

    return user;
  }

  async findById(id) {
    if (!id) {
      throw new Error('User id is required');
    }

    const sql = 'SELECT * FROM users WHERE id = ?';
    const row = await this.db.getOne(sql, [id]);
    
    if (!row) return null;
    
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (error) {
        logger.warn('Failed to parse metadata for user:', id, error.message);
        metadata = {};
      }
    }
    
    const userData = {
      id: row.id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
      metadata
    };
    
    return User.fromJSON(userData);
  }

  async findByEmail(email) {
    if (!email) {
      throw new Error('User email is required');
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    const row = await this.db.getOne(sql, [email]);
    
    if (!row) return null;
    
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (error) {
        logger.warn('Failed to parse metadata for user:', email, error.message);
        metadata = {};
      }
    }
    
    const userData = {
      id: row.id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
      metadata
    };
    
    return User.fromJSON(userData);
  }

  async findAll() {
    const sql = 'SELECT * FROM users ORDER BY created_at DESC';
    const rows = await this.db.query(sql);
    
    return rows.map(row => {
      let metadata = {};
      if (row.metadata) {
        try {
          metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        } catch (error) {
          logger.warn('Failed to parse metadata for user:', row.id, error.message);
          metadata = {};
        }
      }
      
      const userData = {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.password_hash,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLogin: row.last_login,
        metadata
      };
      
      return User.fromJSON(userData);
    });
  }

  async delete(id) {
    if (!id) {
      throw new Error('User id is required');
    }

    const sql = 'DELETE FROM users WHERE id = ?';
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async update(user) {
    if (!(user instanceof User)) {
      throw new Error('Invalid user entity');
    }

    const sql = `
      UPDATE users 
      SET email = ?, username = ?, password_hash = ?, role = ?, status = ?, updated_at = ?, metadata = ?
      WHERE id = ?
    `;

    const userData = user.toJSONWithPassword();
    const result = await this.db.execute(sql, [
      userData.email,
      userData.username || userData.email,
      userData.passwordHash,
      userData.role,
      userData.status || 'active',
      userData.updatedAt,
      JSON.stringify(userData.metadata),
      userData.id
    ]);

    return result.rowsAffected > 0;
  }

  async exists(email) {
    if (!email) {
      throw new Error('User email is required');
    }

    const sql = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    const result = await this.db.getOne(sql, [email]);
    return result.count > 0;
  }

  async findByRole(role) {
    if (!role) {
      throw new Error('User role is required');
    }

    const sql = 'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [role]);
    
    return rows.map(row => {
      let metadata = {};
      if (row.metadata) {
        try {
          metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        } catch (error) {
          logger.warn('Failed to parse metadata for user:', row.id, error.message);
          metadata = {};
        }
      }
      
      const userData = {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.password_hash,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLogin: row.last_login,
        metadata
      };
      
      return User.fromJSON(userData);
    });
  }
}

module.exports = SQLiteUserRepository; 