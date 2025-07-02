# Factory Design Pattern

## Overview
The Factory pattern provides an interface for creating objects without specifying their exact classes. It encapsulates object creation logic and promotes loose coupling between classes.

## Basic Factory Pattern

### Simple Factory
```javascript
class VehicleFactory {
  static createVehicle(type, config) {
    switch (type) {
      case 'car':
        return new Car(config);
      case 'motorcycle':
        return new Motorcycle(config);
      case 'truck':
        return new Truck(config);
      default:
        throw new Error(`Unknown vehicle type: ${type}`);
    }
  }
}

class Car {
  constructor(config) {
    this.type = 'car';
    this.wheels = 4;
    this.engine = config.engine || 'gasoline';
    this.color = config.color || 'white';
  }

  start() {
    return `${this.color} car with ${this.engine} engine starting...`;
  }
}

class Motorcycle {
  constructor(config) {
    this.type = 'motorcycle';
    this.wheels = 2;
    this.engine = config.engine || 'gasoline';
    this.color = config.color || 'black';
  }

  start() {
    return `${this.color} motorcycle with ${this.engine} engine starting...`;
  }
}

// Usage
const car = VehicleFactory.createVehicle('car', { 
  engine: 'electric', 
  color: 'red' 
});
const motorcycle = VehicleFactory.createVehicle('motorcycle', { 
  color: 'blue' 
});
```

### Factory Method Pattern
```javascript
// Abstract Creator
class VehicleCreator {
  createVehicle(config) {
    const vehicle = this.factoryMethod(config);
    this.validateVehicle(vehicle);
    return vehicle;
  }

  factoryMethod(config) {
    throw new Error('factoryMethod must be implemented');
  }

  validateVehicle(vehicle) {
    if (!vehicle.start) {
      throw new Error('Vehicle must have start method');
    }
  }
}

// Concrete Creators
class CarCreator extends VehicleCreator {
  factoryMethod(config) {
    return new Car(config);
  }
}

class MotorcycleCreator extends VehicleCreator {
  factoryMethod(config) {
    return new Motorcycle(config);
  }
}

// Usage
const carCreator = new CarCreator();
const car = carCreator.createVehicle({ engine: 'hybrid', color: 'green' });
```

## Advanced Factory Patterns

### Abstract Factory Pattern
```javascript
// Abstract Factory
class VehicleFactory {
  createEngine() {
    throw new Error('createEngine must be implemented');
  }

  createWheels() {
    throw new Error('createWheels must be implemented');
  }

  createBody() {
    throw new Error('createBody must be implemented');
  }
}

// Concrete Factories
class ElectricVehicleFactory extends VehicleFactory {
  createEngine() {
    return new ElectricEngine();
  }

  createWheels() {
    return new AlloyWheels();
  }

  createBody() {
    return new LightweightBody();
  }
}

class GasolineVehicleFactory extends VehicleFactory {
  createEngine() {
    return new GasolineEngine();
  }

  createWheels() {
    return new SteelWheels();
  }

  createBody() {
    return new StandardBody();
  }
}

// Product Classes
class ElectricEngine {
  start() {
    return 'Electric engine starting silently...';
  }
}

class GasolineEngine {
  start() {
    return 'Gasoline engine starting with roar...';
  }
}

// Vehicle Assembly
class VehicleAssembler {
  constructor(factory) {
    this.factory = factory;
  }

  assembleVehicle() {
    const engine = this.factory.createEngine();
    const wheels = this.factory.createWheels();
    const body = this.factory.createBody();

    return new Vehicle(engine, wheels, body);
  }
}

class Vehicle {
  constructor(engine, wheels, body) {
    this.engine = engine;
    this.wheels = wheels;
    this.body = body;
  }

  start() {
    return this.engine.start();
  }
}
```

### Registry Pattern
```javascript
class VehicleRegistry {
  constructor() {
    this.vehicles = new Map();
    this.creators = new Map();
  }

  register(type, creator) {
    this.creators.set(type, creator);
  }

  create(type, config) {
    const creator = this.creators.get(type);
    if (!creator) {
      throw new Error(`Unknown vehicle type: ${type}`);
    }
    return creator(config);
  }

  getAvailableTypes() {
    return Array.from(this.creators.keys());
  }
}

// Usage
const registry = new VehicleRegistry();
registry.register('car', (config) => new Car(config));
registry.register('motorcycle', (config) => new Motorcycle(config));
registry.register('truck', (config) => new Truck(config));

const vehicle = registry.create('car', { engine: 'electric' });
```

## Configuration-Driven Factory

### JSON Configuration
```javascript
class ConfigurableFactory {
  constructor(config) {
    this.config = config;
    this.creators = new Map();
    this.loadConfiguration();
  }

  loadConfiguration() {
    Object.entries(this.config.vehicles).forEach(([type, vehicleConfig]) => {
      this.creators.set(type, (config) => this.createFromConfig(type, vehicleConfig, config));
    });
  }

  createFromConfig(type, vehicleConfig, userConfig) {
    const mergedConfig = { ...vehicleConfig.defaults, ...userConfig };
    
    return new Vehicle({
      type,
      ...mergedConfig,
      features: this.resolveFeatures(vehicleConfig.features, mergedConfig)
    });
  }

  resolveFeatures(featureConfigs, userConfig) {
    return featureConfigs
      .filter(feature => userConfig.features?.includes(feature.name))
      .map(feature => new feature.class(feature.config));
  }
}

// Configuration
const factoryConfig = {
  vehicles: {
    car: {
      defaults: {
        wheels: 4,
        engine: 'gasoline',
        color: 'white'
      },
      features: [
        { name: 'navigation', class: NavigationSystem, config: {} },
        { name: 'bluetooth', class: BluetoothSystem, config: {} },
        { name: 'backupCamera', class: BackupCamera, config: {} }
      ]
    },
    motorcycle: {
      defaults: {
        wheels: 2,
        engine: 'gasoline',
        color: 'black'
      },
      features: [
        { name: 'gps', class: GPSSystem, config: {} },
        { name: 'heatedGrips', class: HeatedGrips, config: {} }
      ]
    }
  }
};

const factory = new ConfigurableFactory(factoryConfig);
const car = factory.create('car', { 
  color: 'red', 
  features: ['navigation', 'bluetooth'] 
});
```

## Dependency Injection with Factory

### Service Factory
```javascript
class ServiceFactory {
  constructor(container) {
    this.container = container;
    this.services = new Map();
  }

  register(name, creator) {
    this.services.set(name, creator);
  }

  create(name, config = {}) {
    const creator = this.services.get(name);
    if (!creator) {
      throw new Error(`Service not found: ${name}`);
    }
    return creator(this.container, config);
  }

  singleton(name, creator) {
    if (!this.services.has(name)) {
      this.services.set(name, creator);
    }
    return this.create(name);
  }
}

// Service Container
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.factory = new ServiceFactory(this);
  }

  register(name, service) {
    this.services.set(name, service);
  }

  get(name) {
    return this.services.get(name);
  }

  resolve(dependencies) {
    return dependencies.map(dep => this.get(dep));
  }
}

// Usage
const container = new ServiceContainer();
const factory = container.factory;

factory.register('database', (container, config) => {
  return new Database(config.connectionString);
});

factory.register('userService', (container, config) => {
  const database = container.get('database');
  return new UserService(database, config);
});

factory.register('authService', (container, config) => {
  const userService = container.get('userService');
  return new AuthService(userService, config);
});

// Create services
const database = factory.create('database', { connectionString: 'mongodb://localhost' });
const userService = factory.create('userService', { cacheEnabled: true });
```

## Testing with Factory Pattern

### Mock Factory
```javascript
class MockVehicleFactory {
  constructor() {
    this.createdVehicles = [];
    this.mockVehicles = new Map();
  }

  createVehicle(type, config) {
    const vehicle = this.mockVehicles.get(type) || new MockVehicle(type, config);
    this.createdVehicles.push({ type, config, vehicle });
    return vehicle;
  }

  setMockVehicle(type, mockVehicle) {
    this.mockVehicles.set(type, mockVehicle);
  }

  getCreatedVehicles() {
    return this.createdVehicles;
  }

  reset() {
    this.createdVehicles = [];
    this.mockVehicles.clear();
  }
}

class MockVehicle {
  constructor(type, config) {
    this.type = type;
    this.config = config;
    this.startCalled = false;
    this.stopCalled = false;
  }

  start() {
    this.startCalled = true;
    return `Mock ${this.type} starting`;
  }

  stop() {
    this.stopCalled = true;
    return `Mock ${this.type} stopping`;
  }
}

// Test usage
describe('VehicleFactory', () => {
  let factory;

  beforeEach(() => {
    factory = new MockVehicleFactory();
  });

  test('should create vehicle with correct type', () => {
    const vehicle = factory.createVehicle('car', { color: 'red' });
    expect(vehicle.type).toBe('car');
    expect(vehicle.config.color).toBe('red');
  });

  test('should track created vehicles', () => {
    factory.createVehicle('car', {});
    factory.createVehicle('motorcycle', {});
    
    const created = factory.getCreatedVehicles();
    expect(created).toHaveLength(2);
    expect(created[0].type).toBe('car');
    expect(created[1].type).toBe('motorcycle');
  });
});
```

## Performance Optimizations

### Cached Factory
```javascript
class CachedVehicleFactory {
  constructor() {
    this.cache = new Map();
    this.creators = new Map();
  }

  register(type, creator) {
    this.creators.set(type, creator);
  }

  create(type, config) {
    const cacheKey = this.generateCacheKey(type, config);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey).clone();
    }

    const creator = this.creators.get(type);
    if (!creator) {
      throw new Error(`Unknown vehicle type: ${type}`);
    }

    const vehicle = creator(config);
    this.cache.set(cacheKey, vehicle);
    
    return vehicle.clone();
  }

  generateCacheKey(type, config) {
    return `${type}:${JSON.stringify(config)}`;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### Pool Factory
```javascript
class VehiclePool {
  constructor(creator, maxSize = 10) {
    this.creator = creator;
    this.maxSize = maxSize;
    this.pool = [];
    this.inUse = new Set();
  }

  acquire(config) {
    let vehicle = this.pool.pop();
    
    if (!vehicle) {
      vehicle = this.creator(config);
    } else {
      vehicle.reset(config);
    }
    
    this.inUse.add(vehicle);
    return vehicle;
  }

  release(vehicle) {
    if (this.inUse.has(vehicle)) {
      this.inUse.delete(vehicle);
      
      if (this.pool.length < this.maxSize) {
        this.pool.push(vehicle);
      }
    }
  }

  getPoolSize() {
    return this.pool.length;
  }

  getInUseCount() {
    return this.inUse.size;
  }
}

class PooledVehicleFactory {
  constructor() {
    this.pools = new Map();
  }

  createVehicle(type, config) {
    if (!this.pools.has(type)) {
      const creator = this.getCreator(type);
      this.pools.set(type, new VehiclePool(creator));
    }
    
    return this.pools.get(type).acquire(config);
  }

  releaseVehicle(vehicle) {
    const pool = this.pools.get(vehicle.type);
    if (pool) {
      pool.release(vehicle);
    }
  }
}
```

## Error Handling

### Robust Factory
```javascript
class RobustVehicleFactory {
  constructor() {
    this.creators = new Map();
    this.errorHandlers = new Map();
    this.retryAttempts = 3;
  }

  register(type, creator, errorHandler = null) {
    this.creators.set(type, creator);
    if (errorHandler) {
      this.errorHandlers.set(type, errorHandler);
    }
  }

  async create(type, config) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const creator = this.creators.get(type);
        if (!creator) {
          throw new Error(`Unknown vehicle type: ${type}`);
        }
        
        return await creator(config);
      } catch (error) {
        lastError = error;
        
        const errorHandler = this.errorHandlers.get(type);
        if (errorHandler) {
          const handled = await errorHandler(error, attempt, config);
          if (handled) {
            continue;
          }
        }
        
        if (attempt === this.retryAttempts) {
          throw new Error(`Failed to create vehicle after ${this.retryAttempts} attempts: ${error.message}`);
        }
      }
    }
  }
}

// Error Handler Example
const carErrorHandler = async (error, attempt, config) => {
  if (error.message.includes('database')) {
    // Retry with different database connection
    config.databaseUrl = getBackupDatabaseUrl();
    return true;
  }
  return false;
};
```

## Best Practices

### Design Principles
- Keep factories focused on single responsibility
- Use dependency injection for complex object creation
- Implement proper error handling and validation
- Consider performance implications of object creation
- Use configuration files for complex factory setups

### Implementation Guidelines
- Prefer composition over inheritance
- Use interfaces for factory contracts
- Implement proper logging for debugging
- Consider thread safety for concurrent access
- Use builder pattern for complex object construction

### Testing Strategies
- Mock factories for unit testing
- Test factory error conditions
- Verify object creation with different configurations
- Test factory performance under load
- Validate object state after creation 