const UserRepository = require('@repositories/UserRepository');
const User = require('@/domain/entities/User');

class PostgreSQLUserRepository extends UserRepository {
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
      INSERT INTO users (id, email, password_hash, role, created_at, updated_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = EXCLUDED.updated_at,
        metadata = EXCLUDED.metadata
    `;

    const userData = user.toJSONWithPassword();
    const metadataValue = this.db.getType() === 'postgresql' ? userData.metadata : JSON.stringify(userData.metadata);
    
    await this.db.execute(sql, [
      userData.id,
      userData.email,
      userData.passwordHash,
      userData.role,
      userData.createdAt,
      userData.updatedAt,
      metadataValue
    ]);

    return user;
  }

  async findById(id) {
    if (!id) {
      throw new Error('User id is required');
    }

    const sql = 'SELECT * FROM users WHERE id = $1';
    const row = await this.db.getOne(sql, [id]);
    
    if (!row) return null;
    
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (error) {
        console.warn('Failed to parse metadata for user:', id, error.message);
        metadata = {};
      }
    }
    
    const userData = {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata
    };
    
    return User.fromJSON(userData);
  }

  async findByEmail(email) {
    if (!email) {
      throw new Error('User email is required');
    }

    const sql = 'SELECT * FROM users WHERE email = $1';
    const row = await this.db.getOne(sql, [email]);
    
    if (!row) return null;
    
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (error) {
        console.warn('Failed to parse metadata for user:', email, error.message);
        metadata = {};
      }
    }
    
    const userData = {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
          console.warn('Failed to parse metadata for user:', row.id, error.message);
          metadata = {};
        }
      }
      const userData = {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata
      };
      return User.fromJSON(userData);
    });
  }

  async delete(id) {
    if (!id) {
      throw new Error('User id is required');
    }

    const sql = 'DELETE FROM users WHERE id = $1';
    const result = await this.db.execute(sql, [id]);
    return result.rowsAffected > 0;
  }

  async update(user) {
    if (!(user instanceof User)) {
      throw new Error('Invalid user entity');
    }

    const sql = `
      UPDATE users 
      SET email = $2, password_hash = $3, role = $4, updated_at = $5, metadata = $6
      WHERE id = $1
    `;

    const userData = user.toJSONWithPassword();
    const metadataValue = this.db.getType() === 'postgresql' ? userData.metadata : JSON.stringify(userData.metadata);
    
    const result = await this.db.execute(sql, [
      userData.id,
      userData.email,
      userData.passwordHash,
      userData.role,
      userData.updatedAt,
      metadataValue
    ]);

    return result.rowsAffected > 0;
  }

  async exists(email) {
    if (!email) {
      throw new Error('User email is required');
    }

    const sql = 'SELECT COUNT(*) as count FROM users WHERE email = $1';
    const result = await this.db.getOne(sql, [email]);
    return result.count > 0;
  }

  async findByRole(role) {
    if (!role) {
      throw new Error('User role is required');
    }

    const sql = 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC';
    const rows = await this.db.query(sql, [role]);
    
    return rows.map(row => {
      let metadata = {};
      if (row.metadata) {
        try {
          metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        } catch (error) {
          console.warn('Failed to parse metadata for user:', row.id, error.message);
          metadata = {};
        }
      }
      const userData = {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata
      };
      return User.fromJSON(userData);
    });
  }
}

module.exports = PostgreSQLUserRepository; 