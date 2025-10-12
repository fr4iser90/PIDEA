/**
 * LayerManager Unit Tests
 * Tests for layer management functionality
 */

const LayerManager = require('../../infrastructure/database/LayerManager');
const Layer = require('../../domain/entities/Layer');
const LayerType = require('../../domain/value-objects/LayerType');

describe('LayerManager', () => {
  let layerManager;
  let mockDatabaseConnection;
  let mockEventBus;

  beforeEach(() => {
    mockDatabaseConnection = {
      execute: jest.fn()
    };
    mockEventBus = {
      emit: jest.fn()
    };
    
    layerManager = new LayerManager(mockDatabaseConnection, mockEventBus);
  });

  describe('createLayer', () => {
    it('should create a new layer successfully', async () => {
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN, 'Test description', 1);
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [mockLayer.toDatabaseRow()]
      });

      const result = await layerManager.createLayer('Test Layer', LayerType.DOMAIN, 'Test description', 1);

      expect(result).toBeInstanceOf(Layer);
      expect(result.name).toBe('Test Layer');
      expect(result.layerType.value).toBe(LayerType.DOMAIN);
      expect(mockEventBus.emit).toHaveBeenCalledWith('layer.created', expect.any(Object));
    });

    it('should throw error for empty name', async () => {
      await expect(layerManager.createLayer('', LayerType.DOMAIN))
        .rejects.toThrow('Layer name is required');
    });

    it('should throw error for invalid layer type', async () => {
      await expect(layerManager.createLayer('Test Layer', 'invalid'))
        .rejects.toThrow('Invalid layer type: invalid');
    });

    it('should throw error for duplicate name', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [Layer.create('Test Layer', LayerType.DOMAIN).toDatabaseRow()]
      });

      await expect(layerManager.createLayer('Test Layer', LayerType.DOMAIN))
        .rejects.toThrow("Layer with name 'Test Layer' already exists");
    });
  });

  describe('getLayer', () => {
    it('should return layer by id', async () => {
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN);
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: [mockLayer.toDatabaseRow()]
      });

      const result = await layerManager.getLayer(mockLayer.id);

      expect(result).toBeInstanceOf(Layer);
      expect(result.id).toBe(mockLayer.id);
    });

    it('should throw error for non-existent layer', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      await expect(layerManager.getLayer('non-existent'))
        .rejects.toThrow("Layer with id 'non-existent' not found");
    });
  });

  describe('getAllLayers', () => {
    it('should return all layers', async () => {
      const mockLayers = [
        Layer.create('Layer 1', LayerType.DOMAIN),
        Layer.create('Layer 2', LayerType.APPLICATION)
      ];
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockLayers.map(layer => layer.toDatabaseRow())
      });

      const result = await layerManager.getAllLayers();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Layer);
      expect(result[1]).toBeInstanceOf(Layer);
    });
  });

  describe('updateLayer', () => {
    it('should update layer successfully', async () => {
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN);
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }) // getLayer
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }); // update

      const result = await layerManager.updateLayer(mockLayer.id, { name: 'Updated Layer' });

      expect(result).toBeInstanceOf(Layer);
      expect(mockEventBus.emit).toHaveBeenCalledWith('layer.updated', expect.any(Object));
    });

    it('should throw error for non-existent layer', async () => {
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: []
      });

      await expect(layerManager.updateLayer('non-existent', { name: 'Updated' }))
        .rejects.toThrow("Layer with id 'non-existent' not found");
    });
  });

  describe('activateLayer', () => {
    it('should activate layer successfully', async () => {
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN);
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }) // getLayer
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }); // update

      const result = await layerManager.activateLayer(mockLayer.id);

      expect(result).toBeInstanceOf(Layer);
      expect(mockEventBus.emit).toHaveBeenCalledWith('layer.activated', expect.any(Object));
    });
  });

  describe('deactivateLayer', () => {
    it('should deactivate layer successfully', async () => {
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN);
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }) // getLayer
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }); // update

      const result = await layerManager.deactivateLayer(mockLayer.id);

      expect(result).toBeInstanceOf(Layer);
      expect(mockEventBus.emit).toHaveBeenCalledWith('layer.deactivated', expect.any(Object));
    });
  });

  describe('deleteLayer', () => {
    it('should delete layer successfully', async () => {
      const mockLayer = Layer.create('Test Layer', LayerType.DOMAIN);
      mockDatabaseConnection.execute
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }) // getLayer
        .mockResolvedValueOnce({ rows: [mockLayer.toDatabaseRow()] }); // delete

      const result = await layerManager.deleteLayer(mockLayer.id);

      expect(result).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('layer.deleted', expect.any(Object));
    });
  });

  describe('getLayerHierarchy', () => {
    it('should return layers in dependency order', async () => {
      const mockLayers = [
        Layer.create('Domain Layer', LayerType.DOMAIN, '', 1),
        Layer.create('Application Layer', LayerType.APPLICATION, '', 2),
        Layer.create('Infrastructure Layer', LayerType.INFRASTRUCTURE, '', 3),
        Layer.create('Presentation Layer', LayerType.PRESENTATION, '', 4)
      ];
      mockDatabaseConnection.execute.mockResolvedValue({
        rows: mockLayers.map(layer => layer.toDatabaseRow())
      });

      const result = await layerManager.getLayerHierarchy();

      expect(result).toHaveLength(4);
      expect(result[0].layerType.value).toBe(LayerType.DOMAIN);
      expect(result[1].layerType.value).toBe(LayerType.APPLICATION);
      expect(result[2].layerType.value).toBe(LayerType.INFRASTRUCTURE);
      expect(result[3].layerType.value).toBe(LayerType.PRESENTATION);
    });
  });

  describe('initializeDefaultLayers', () => {
    it('should initialize default layers', async () => {
      mockDatabaseConnection.execute
        .mockResolvedValue({ rows: [] }) // findByName calls
        .mockResolvedValue({ rows: [Layer.create('Domain Layer', LayerType.DOMAIN).toDatabaseRow()] }); // create calls

      const result = await layerManager.initializeDefaultLayers();

      expect(result).toHaveLength(4);
      expect(result[0]).toBeInstanceOf(Layer);
    });
  });
});
