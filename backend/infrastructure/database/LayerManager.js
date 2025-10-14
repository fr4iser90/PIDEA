/**
 * LayerManager - Infrastructure Service for Layer Management
 * Handles layer operations and coordination
 */

const Layer = require("../../domain/entities/Layer");
const LayerType = require("../../domain/value-objects/LayerType");

class LayerManager {
  constructor(databaseConnection, eventBus = null) {
    this.databaseConnection = databaseConnection;
    this.eventBus = eventBus;
    this.layerRepository = null;
    this.logger = null;

    this.initialize();
  }

  initialize() {
    // Initialize repository
    const PostgreSQLLayerRepository = require("./PostgreSQLLayerRepository");
    this.layerRepository = new PostgreSQLLayerRepository(
      this.databaseConnection,
    );

    // Initialize logger
    const ServiceLogger = require("@logging/ServiceLogger");
    this.logger = new ServiceLogger("LayerManager");
  }

  async createLayer(name, layerType, description = "", orderIndex = null) {
    try {
      this.logger.info("Creating new layer", { name, layerType });

      // Validate inputs
      if (!name || name.trim().length === 0) {
        throw new Error("Layer name is required");
      }

      if (!LayerType.isValid(layerType)) {
        throw new Error(`Invalid layer type: ${layerType}`);
      }

      // Check if layer name already exists
      const existingLayer = await this.layerRepository.findByName(name);
      if (existingLayer) {
        throw new Error(`Layer with name '${name}' already exists`);
      }

      // Get next order index if not provided
      if (orderIndex === null) {
        orderIndex = await this.layerRepository.getNextOrderIndex();
      }

      // Create layer
      const layer = Layer.create(name, layerType, description, orderIndex);
      const createdLayer = await this.layerRepository.create(layer);

      this.logger.info("Layer created successfully", {
        id: createdLayer.id,
        name: createdLayer.name,
      });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit("layer.created", {
          layerId: createdLayer.id,
          layerName: createdLayer.name,
          layerType: createdLayer.layerType.value,
        });
      }

      return createdLayer;
    } catch (error) {
      this.logger.error("Failed to create layer", {
        name,
        layerType,
        error: error.message,
      });
      throw error;
    }
  }

  async getLayer(id) {
    try {
      const layer = await this.layerRepository.findById(id);
      if (!layer) {
        throw new Error(`Layer with id '${id}' not found`);
      }
      return layer;
    } catch (error) {
      this.logger.error("Failed to get layer", { id, error: error.message });
      throw error;
    }
  }

  async getLayerByName(name) {
    try {
      const layer = await this.layerRepository.findByName(name);
      if (!layer) {
        throw new Error(`Layer with name '${name}' not found`);
      }
      return layer;
    } catch (error) {
      this.logger.error("Failed to get layer by name", {
        name,
        error: error.message,
      });
      throw error;
    }
  }

  async getAllLayers() {
    try {
      return await this.layerRepository.findAll();
    } catch (error) {
      this.logger.error("Failed to get all layers", { error: error.message });
      throw error;
    }
  }

  async getActiveLayers() {
    try {
      return await this.layerRepository.findActive();
    } catch (error) {
      this.logger.error("Failed to get active layers", {
        error: error.message,
      });
      throw error;
    }
  }

  async getLayersByType(layerType) {
    try {
      if (!LayerType.isValid(layerType)) {
        throw new Error(`Invalid layer type: ${layerType}`);
      }
      return await this.layerRepository.findByType(layerType);
    } catch (error) {
      this.logger.error("Failed to get layers by type", {
        layerType,
        error: error.message,
      });
      throw error;
    }
  }

  async updateLayer(id, updates) {
    try {
      this.logger.info("Updating layer", { id, updates });

      const layer = await this.layerRepository.findById(id);
      if (!layer) {
        throw new Error(`Layer with id '${id}' not found`);
      }

      // Apply updates
      if (updates.name !== undefined) {
        layer.updateName(updates.name);
      }
      if (updates.description !== undefined) {
        layer.updateDescription(updates.description);
      }
      if (updates.orderIndex !== undefined) {
        layer.updateOrderIndex(updates.orderIndex);
      }
      if (updates.metadata !== undefined) {
        layer.updateMetadata(updates.metadata);
      }

      const updatedLayer = await this.layerRepository.update(layer);

      this.logger.info("Layer updated successfully", { id: updatedLayer.id });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit("layer.updated", {
          layerId: updatedLayer.id,
          layerName: updatedLayer.name,
          updates,
        });
      }

      return updatedLayer;
    } catch (error) {
      this.logger.error("Failed to update layer", { id, error: error.message });
      throw error;
    }
  }

  async activateLayer(id) {
    try {
      const layer = await this.layerRepository.findById(id);
      if (!layer) {
        throw new Error(`Layer with id '${id}' not found`);
      }

      layer.activate();
      const updatedLayer = await this.layerRepository.update(layer);

      this.logger.info("Layer activated", { id: updatedLayer.id });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit("layer.activated", {
          layerId: updatedLayer.id,
          layerName: updatedLayer.name,
        });
      }

      return updatedLayer;
    } catch (error) {
      this.logger.error("Failed to activate layer", {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  async deactivateLayer(id) {
    try {
      const layer = await this.layerRepository.findById(id);
      if (!layer) {
        throw new Error(`Layer with id '${id}' not found`);
      }

      layer.deactivate();
      const updatedLayer = await this.layerRepository.update(layer);

      this.logger.info("Layer deactivated", { id: updatedLayer.id });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit("layer.deactivated", {
          layerId: updatedLayer.id,
          layerName: updatedLayer.name,
        });
      }

      return updatedLayer;
    } catch (error) {
      this.logger.error("Failed to deactivate layer", {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  async deleteLayer(id) {
    try {
      this.logger.info("Deleting layer", { id });

      const layer = await this.layerRepository.findById(id);
      if (!layer) {
        throw new Error(`Layer with id '${id}' not found`);
      }

      await this.layerRepository.delete(id);

      this.logger.info("Layer deleted successfully", { id });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit("layer.deleted", {
          layerId: id,
          layerName: layer.name,
        });
      }

      return true;
    } catch (error) {
      this.logger.error("Failed to delete layer", { id, error: error.message });
      throw error;
    }
  }

  async reorderLayers(layerOrders) {
    try {
      this.logger.info("Reordering layers", { layerOrders });

      await this.layerRepository.reorderLayers(layerOrders);

      this.logger.info("Layers reordered successfully");

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit("layers.reordered", {
          layerOrders,
        });
      }

      return true;
    } catch (error) {
      this.logger.error("Failed to reorder layers", { error: error.message });
      throw error;
    }
  }

  async getLayerHierarchy() {
    try {
      const layers = await this.layerRepository.findActive();

      // Sort by order index
      layers.sort((a, b) => a.orderIndex - b.orderIndex);

      // Build hierarchy based on dependencies
      const hierarchy = [];
      const processed = new Set();

      const addLayerToHierarchy = (layer) => {
        if (processed.has(layer.id)) {
          return;
        }

        // Add dependencies first
        const dependencies = layer.getDependencies();
        for (const depType of dependencies) {
          const depLayer = layers.find((l) => l.layerType.value === depType);
          if (depLayer && !processed.has(depLayer.id)) {
            addLayerToHierarchy(depLayer);
          }
        }

        hierarchy.push(layer);
        processed.add(layer.id);
      };

      // Process all layers
      for (const layer of layers) {
        addLayerToHierarchy(layer);
      }

      return hierarchy;
    } catch (error) {
      this.logger.error("Failed to get layer hierarchy", {
        error: error.message,
      });
      throw error;
    }
  }

  async initializeDefaultLayers() {
    try {
      this.logger.info("Initializing default layers");

      const defaultLayers = [
        {
          name: "Domain Layer",
          type: LayerType.DOMAIN,
          description: "Core business logic and domain entities",
        },
        {
          name: "Application Layer",
          type: LayerType.APPLICATION,
          description: "Application services and use cases",
        },
        {
          name: "Infrastructure Layer",
          type: LayerType.INFRASTRUCTURE,
          description: "Database, external services, and technical concerns",
        },
        {
          name: "Presentation Layer",
          type: LayerType.PRESENTATION,
          description: "User interface and API controllers",
        },
      ];

      const createdLayers = [];

      for (let i = 0; i < defaultLayers.length; i++) {
        const { name, type, description } = defaultLayers[i];

        // Check if layer already exists
        const existingLayer = await this.layerRepository.findByName(name);
        if (!existingLayer) {
          const layer = await this.createLayer(name, type, description, i + 1);
          createdLayers.push(layer);
        }
      }

      this.logger.info("Default layers initialized", {
        created: createdLayers.length,
      });
      return createdLayers;
    } catch (error) {
      this.logger.error("Failed to initialize default layers", {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = LayerManager;
