# Singleton Design Pattern

## Overview
The Singleton pattern ensures that a class has only one instance and provides a global point of access to that instance. This pattern is useful for managing shared resources, configuration settings, and logging systems.

## Basic Implementation

### Simple Singleton
```typescript
class Singleton {
  private static instance: Singleton;
  
  private constructor() {
    // Private constructor prevents direct instantiation
  }
  
  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
  
  public doSomething(): void {
    console.log('Singleton is doing something');
  }
}

// Usage
const instance1 = Singleton.getInstance();
const instance2 = Singleton.getInstance();

console.log(instance1 === instance2); // true
```

### Thread-Safe Singleton (Java)
```java
public class Singleton {
    private static volatile Singleton instance;
    private static final Object lock = new Object();
    
    private Singleton() {
        // Private constructor
    }
    
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (lock) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

## Advanced Implementations

### Lazy Initialization with Error Handling
```typescript
class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private connection: any = null;
  private isConnected: boolean = false;
  
  private constructor() {
    // Private constructor
  }
  
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
  
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    
    try {
      this.connection = await this.createConnection();
      this.isConnected = true;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }
  
  public disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
      this.isConnected = false;
      console.log('Database disconnected');
    }
  }
  
  public executeQuery(query: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.connection.query(query);
  }
  
  private async createConnection(): Promise<any> {
    // Simulate database connection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          query: (sql: string) => Promise.resolve({ rows: [] })
        });
      }, 1000);
    });
  }
}

// Usage
const db1 = DatabaseConnection.getInstance();
const db2 = DatabaseConnection.getInstance();

console.log(db1 === db2); // true

await db1.connect();
await db2.executeQuery('SELECT * FROM users');
```

### Configuration Manager Singleton
```typescript
interface AppConfig {
  database: {
    host: string;
    port: number;
    name: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file: string;
  };
}

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AppConfig;
  private configFile: string;
  
  private constructor(configFile: string = 'config.json') {
    this.configFile = configFile;
    this.config = this.loadDefaultConfig();
  }
  
  public static getInstance(configFile?: string): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager(configFile);
    }
    return ConfigurationManager.instance;
  }
  
  public getConfig(): AppConfig {
    return { ...this.config };
  }
  
  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }
  
  public getDatabaseConfig() {
    return this.config.database;
  }
  
  public getApiConfig() {
    return this.config.api;
  }
  
  public getLoggingConfig() {
    return this.config.logging;
  }
  
  private loadDefaultConfig(): AppConfig {
    return {
      database: {
        host: 'localhost',
        port: 5432,
        name: 'myapp'
      },
      api: {
        baseUrl: 'https://api.example.com',
        timeout: 5000
      },
      logging: {
        level: 'info',
        file: 'app.log'
      }
    };
  }
  
  private saveConfig(): void {
    // Save configuration to file
    console.log('Configuration saved');
  }
}

// Usage
const config1 = ConfigurationManager.getInstance();
const config2 = ConfigurationManager.getInstance();

console.log(config1 === config2); // true

const dbConfig = config1.getDatabaseConfig();
console.log(dbConfig.host); // localhost

config1.updateConfig({
  database: { host: 'production-db.example.com' }
});
```

### Logger Singleton
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  private maxLogs: number = 1000;
  
  private constructor() {
    // Private constructor
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  public setLogLevel(level: LogLevel): void {
    this.minLevel = level;
  }
  
  public setMaxLogs(max: number): void {
    this.maxLogs = max;
    this.trimLogs();
  }
  
  public debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  public info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  public warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  public error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }
  
  public getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }
  
  public clearLogs(): void {
    this.logs = [];
  }
  
  private log(level: LogLevel, message: string, context?: any): void {
    if (level < this.minLevel) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    };
    
    this.logs.push(entry);
    this.trimLogs();
    
    // Output to console
    const levelName = LogLevel[level];
    console.log(`[${levelName}] ${message}`, context || '');
  }
  
  private trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

// Usage
const logger1 = Logger.getInstance();
const logger2 = Logger.getInstance();

console.log(logger1 === logger2); // true

logger1.setLogLevel(LogLevel.DEBUG);
logger1.info('Application started');
logger1.debug('Debug information', { userId: 123 });
logger1.warn('Warning message');
logger1.error('Error occurred', { error: 'Database connection failed' });

const logs = logger1.getLogs(LogLevel.WARN);
console.log(logs.length); // Number of warn and error logs
```

## Registry Pattern with Singleton

### Service Registry
```typescript
interface Service {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, Service> = new Map();
  
  private constructor() {
    // Private constructor
  }
  
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }
  
  public register(service: Service): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service ${service.name} is already registered`);
    }
    this.services.set(service.name, service);
  }
  
  public unregister(serviceName: string): boolean {
    return this.services.delete(serviceName);
  }
  
  public getService(serviceName: string): Service | undefined {
    return this.services.get(serviceName);
  }
  
  public getAllServices(): Service[] {
    return Array.from(this.services.values());
  }
  
  public async startAllServices(): Promise<void> {
    const promises = Array.from(this.services.values()).map(service => service.start());
    await Promise.all(promises);
  }
  
  public async stopAllServices(): Promise<void> {
    const promises = Array.from(this.services.values()).map(service => service.stop());
    await Promise.all(promises);
  }
  
  public getRunningServices(): Service[] {
    return Array.from(this.services.values()).filter(service => service.isRunning());
  }
}

// Example services
class DatabaseService implements Service {
  public name = 'database';
  private running = false;
  
  async start(): Promise<void> {
    console.log('Starting database service...');
    this.running = true;
  }
  
  async stop(): Promise<void> {
    console.log('Stopping database service...');
    this.running = false;
  }
  
  isRunning(): boolean {
    return this.running;
  }
}

class EmailService implements Service {
  public name = 'email';
  private running = false;
  
  async start(): Promise<void> {
    console.log('Starting email service...');
    this.running = true;
  }
  
  async stop(): Promise<void> {
    console.log('Stopping email service...');
    this.running = false;
  }
  
  isRunning(): boolean {
    return this.running;
  }
}

// Usage
const registry = ServiceRegistry.getInstance();

const dbService = new DatabaseService();
const emailService = new EmailService();

registry.register(dbService);
registry.register(emailService);

await registry.startAllServices();
console.log(registry.getRunningServices().length); // 2
```

## Singleton with Dependency Injection

### Container Singleton
```typescript
interface ServiceFactory<T> {
  create(): T;
}

class DependencyContainer {
  private static instance: DependencyContainer;
  private services: Map<string, any> = new Map();
  private factories: Map<string, ServiceFactory<any>> = new Map();
  
  private constructor() {
    // Private constructor
  }
  
  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }
  
  public register<T>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory);
  }
  
  public registerSingleton<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }
  
  public resolve<T>(name: string): T {
    // Check if service is already instantiated
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    // Check if factory exists
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      const instance = factory.create();
      this.services.set(name, instance); // Cache the instance
      return instance;
    }
    
    throw new Error(`Service ${name} not found`);
  }
  
  public clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

// Usage
interface UserService {
  getUsers(): Promise<any[]>;
}

class UserServiceImpl implements UserService {
  async getUsers(): Promise<any[]> {
    return [{ id: 1, name: 'John' }];
  }
}

const container = DependencyContainer.getInstance();

// Register factory
container.register<UserService>('userService', {
  create: () => new UserServiceImpl()
});

// Register singleton
container.registerSingleton('config', { apiUrl: 'https://api.example.com' });

// Resolve services
const userService = container.resolve<UserService>('userService');
const config = container.resolve('config');

console.log(userService === container.resolve<UserService>('userService')); // true
```

## Testing Singletons

### Unit Testing
```typescript
describe('ConfigurationManager', () => {
  beforeEach(() => {
    // Clear singleton instance for testing
    (ConfigurationManager as any).instance = null;
  });
  
  test('should return the same instance', () => {
    const instance1 = ConfigurationManager.getInstance();
    const instance2 = ConfigurationManager.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('should load default configuration', () => {
    const config = ConfigurationManager.getInstance();
    const appConfig = config.getConfig();
    
    expect(appConfig.database.host).toBe('localhost');
    expect(appConfig.api.baseUrl).toBe('https://api.example.com');
  });
  
  test('should update configuration', () => {
    const config = ConfigurationManager.getInstance();
    
    config.updateConfig({
      database: { host: 'test-db.example.com' }
    });
    
    const updatedConfig = config.getConfig();
    expect(updatedConfig.database.host).toBe('test-db.example.com');
  });
});

describe('Logger', () => {
  beforeEach(() => {
    (Logger as any).instance = null;
  });
  
  test('should log messages at correct level', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.WARN);
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    logger.debug('Debug message'); // Should not log
    logger.info('Info message');   // Should not log
    logger.warn('Warning message'); // Should log
    logger.error('Error message');  // Should log
    
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
  
  test('should maintain log history', () => {
    const logger = Logger.getInstance();
    
    logger.info('Test message');
    
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test message');
  });
});
```

## Anti-Patterns and Best Practices

### Common Anti-Patterns
```typescript
// ❌ Bad: Global variable instead of singleton
let globalConfig = {};

// ❌ Bad: Multiple instances possible
class BadSingleton {
  constructor() {
    // Public constructor allows multiple instances
  }
}

// ❌ Bad: No lazy initialization
class EagerSingleton {
  private static instance = new EagerSingleton(); // Always created
  
  private constructor() {}
  
  static getInstance() {
    return EagerSingleton.instance;
  }
}
```

### Best Practices
```typescript
// ✅ Good: Proper singleton implementation
class GoodSingleton {
  private static instance: GoodSingleton | null = null;
  private initialized = false;
  
  private constructor() {
    if (GoodSingleton.instance) {
      throw new Error('Use getInstance() method');
    }
  }
  
  public static getInstance(): GoodSingleton {
    if (!GoodSingleton.instance) {
      GoodSingleton.instance = new GoodSingleton();
    }
    return GoodSingleton.instance;
  }
  
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Perform initialization
    await this.setup();
    this.initialized = true;
  }
  
  private async setup(): Promise<void> {
    // Setup logic
  }
  
  // Prevent cloning
  public clone(): never {
    throw new Error('Singleton cannot be cloned');
  }
  
  // Prevent serialization
  public toJSON(): never {
    throw new Error('Singleton cannot be serialized');
  }
}
```

## Performance Considerations

### Memory Management
```typescript
class ResourceManager {
  private static instance: ResourceManager;
  private resources: Map<string, any> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  private constructor() {
    // Set up cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }
  
  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }
  
  public addResource(key: string, resource: any): void {
    this.resources.set(key, {
      data: resource,
      lastAccessed: Date.now()
    });
  }
  
  public getResource(key: string): any {
    const resource = this.resources.get(key);
    if (resource) {
      resource.lastAccessed = Date.now();
      return resource.data;
    }
    return null;
  }
  
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    for (const [key, resource] of this.resources.entries()) {
      if (now - resource.lastAccessed > maxAge) {
        this.resources.delete(key);
      }
    }
  }
  
  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.resources.clear();
    (ResourceManager as any).instance = null;
  }
}
```
