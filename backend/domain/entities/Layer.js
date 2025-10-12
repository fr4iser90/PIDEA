/**
 * Layer - Domain Entity for Architectural Layers
 * Represents a single architectural layer in the system
 */

const { v4: uuidv4 } = require('uuid');
const LayerType = require('../value-objects/LayerType');

class Layer {
  constructor(
    id = uuidv4(),
    name,
    description = '',
    layerType,
    orderIndex = 0,
    isActive = true,
    metadata = {},
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    createdBy = 'me'
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.layerType = layerType instanceof LayerType ? layerType : new LayerType(layerType);
    this.orderIndex = orderIndex;
    this.isActive = isActive;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
  }

  static create(name, layerType, description = '', orderIndex = 0) {
    return new Layer(
      uuidv4(),
      name,
      description,
      layerType,
      orderIndex,
      true,
      {},
      new Date().toISOString(),
      new Date().toISOString(),
      'me'
    );
  }

  static fromDatabaseRow(row) {
    return new Layer(
      row.id,
      row.name,
      row.description,
      row.layer_type,
      row.order_index,
      row.is_active,
      row.metadata ? JSON.parse(row.metadata) : {},
      row.created_at,
      row.updated_at,
      row.created_by
    );
  }

  toDatabaseRow() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      layer_type: this.layerType.value,
      order_index: this.orderIndex,
      is_active: this.isActive,
      metadata: JSON.stringify(this.metadata),
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      created_by: this.createdBy
    };
  }

  updateName(name) {
    if (!name || name.trim().length === 0) {
      throw new Error('Layer name cannot be empty');
    }
    this.name = name.trim();
    this.updatedAt = new Date().toISOString();
  }

  updateDescription(description) {
    this.description = description || '';
    this.updatedAt = new Date().toISOString();
  }

  updateOrderIndex(orderIndex) {
    if (typeof orderIndex !== 'number' || orderIndex < 0) {
      throw new Error('Order index must be a non-negative number');
    }
    this.orderIndex = orderIndex;
    this.updatedAt = new Date().toISOString();
  }

  activate() {
    this.isActive = true;
    this.updatedAt = new Date().toISOString();
  }

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date().toISOString();
  }

  updateMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date().toISOString();
  }

  getMetadata(key) {
    return this.metadata[key];
  }

  setMetadata(key, value) {
    this.metadata[key] = value;
    this.updatedAt = new Date().toISOString();
  }

  canDependOn(targetLayer) {
    if (!(targetLayer instanceof Layer)) {
      throw new Error('Target must be a Layer instance');
    }
    return this.layerType.canDependOn(targetLayer.layerType);
  }

  getDependencies() {
    return this.layerType.getDependencies();
  }

  getTaskCategories() {
    return this.layerType.getTaskCategories();
  }

  getTaskTypes() {
    return this.layerType.getTaskTypes();
  }

  getDescription() {
    return this.layerType.getDescription();
  }

  equals(other) {
    return other instanceof Layer && this.id === other.id;
  }

  toString() {
    return `Layer(${this.id}, ${this.name}, ${this.layerType.value})`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      layerType: this.layerType.value,
      orderIndex: this.orderIndex,
      isActive: this.isActive,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy
    };
  }
}

module.exports = Layer;
