/**
 * PostgreSQL Layer Repository
 * Handles database operations for Layer entities
 */

const Layer = require("../../domain/entities/Layer");
const LayerType = require("../../domain/value-objects/LayerType");

class PostgreSQLLayerRepository {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.tableName = "layers";
  }

  async init() {
    // Table creation is handled by migrations
    // This method can be used for additional initialization if needed
  }

  async create(layer) {
    const row = layer.toDatabaseRow();
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    try {
      const result = await this.databaseConnection.execute(sql, values);
      return Layer.fromDatabaseRow(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create layer: ${error.message}`);
    }
  }

  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = $1`;

    try {
      const result = await this.databaseConnection.execute(sql, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return Layer.fromDatabaseRow(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find layer by id: ${error.message}`);
    }
  }

  async findByName(name) {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = $1`;

    try {
      const result = await this.databaseConnection.execute(sql, [name]);
      if (result.rows.length === 0) {
        return null;
      }
      return Layer.fromDatabaseRow(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find layer by name: ${error.message}`);
    }
  }

  async findByType(layerType) {
    const sql = `SELECT * FROM ${this.tableName} WHERE layer_type = $1 ORDER BY order_index`;

    try {
      const result = await this.databaseConnection.execute(sql, [layerType]);
      return result.rows.map((row) => Layer.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Failed to find layers by type: ${error.message}`);
    }
  }

  async findAll() {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY order_index`;

    try {
      const result = await this.databaseConnection.execute(sql);
      return result.rows.map((row) => Layer.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Failed to find all layers: ${error.message}`);
    }
  }

  async findActive() {
    const sql = `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY order_index`;

    try {
      const result = await this.databaseConnection.execute(sql);
      return result.rows.map((row) => Layer.fromDatabaseRow(row));
    } catch (error) {
      throw new Error(`Failed to find active layers: ${error.message}`);
    }
  }

  async update(layer) {
    const row = layer.toDatabaseRow();
    const columns = Object.keys(row).filter(
      (key) => key !== "id" && key !== "created_at" && key !== "created_by",
    );
    const values = columns.map((col) => row[col]);
    const setClause = columns
      .map((col, index) => `${col} = $${index + 1}`)
      .join(", ");

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $${columns.length + 1}
      RETURNING *
    `;

    try {
      const result = await this.databaseConnection.execute(sql, [
        ...values,
        layer.id,
      ]);
      if (result.rows.length === 0) {
        throw new Error("Layer not found");
      }
      return Layer.fromDatabaseRow(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update layer: ${error.message}`);
    }
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;

    try {
      const result = await this.databaseConnection.execute(sql, [id]);
      if (result.rows.length === 0) {
        throw new Error("Layer not found");
      }
      return Layer.fromDatabaseRow(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to delete layer: ${error.message}`);
    }
  }

  async count() {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    try {
      const result = await this.databaseConnection.execute(sql);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Failed to count layers: ${error.message}`);
    }
  }

  async countByType(layerType) {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE layer_type = $1`;

    try {
      const result = await this.databaseConnection.execute(sql, [layerType]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Failed to count layers by type: ${error.message}`);
    }
  }

  async exists(id) {
    const sql = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1)`;

    try {
      const result = await this.databaseConnection.execute(sql, [id]);
      return result.rows[0].exists;
    } catch (error) {
      throw new Error(`Failed to check layer existence: ${error.message}`);
    }
  }

  async existsByName(name) {
    const sql = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE name = $1)`;

    try {
      const result = await this.databaseConnection.execute(sql, [name]);
      return result.rows[0].exists;
    } catch (error) {
      throw new Error(`Failed to check layer name existence: ${error.message}`);
    }
  }

  async getNextOrderIndex() {
    const sql = `SELECT MAX(order_index) as max_order FROM ${this.tableName}`;

    try {
      const result = await this.databaseConnection.execute(sql);
      const maxOrder = result.rows[0].max_order;
      return maxOrder ? maxOrder + 1 : 1;
    } catch (error) {
      throw new Error(`Failed to get next order index: ${error.message}`);
    }
  }

  async reorderLayers(layerOrders) {
    // layerOrders is an array of { id, orderIndex }
    const sql = `
      UPDATE ${this.tableName}
      SET order_index = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    try {
      for (const { id, orderIndex } of layerOrders) {
        await this.databaseConnection.execute(sql, [orderIndex, id]);
      }
      return true;
    } catch (error) {
      throw new Error(`Failed to reorder layers: ${error.message}`);
    }
  }
}

module.exports = PostgreSQLLayerRepository;
