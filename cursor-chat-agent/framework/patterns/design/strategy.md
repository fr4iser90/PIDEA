# Strategy Design Pattern

## Overview
The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. It allows algorithms to vary independently from clients that use them.

## Basic Strategy Pattern

### Simple Strategy Implementation
```javascript
// Strategy Interface
class PaymentStrategy {
  pay(amount) {
    throw new Error('pay method must be implemented');
  }
}

// Concrete Strategies
class CreditCardPayment extends PaymentStrategy {
  constructor(cardNumber, cvv, expiryDate) {
    super();
    this.cardNumber = cardNumber;
    this.cvv = cvv;
    this.expiryDate = expiryDate;
  }

  pay(amount) {
    return `Paid $${amount} using Credit Card ending in ${this.cardNumber.slice(-4)}`;
  }
}

class PayPalPayment extends PaymentStrategy {
  constructor(email) {
    super();
    this.email = email;
  }

  pay(amount) {
    return `Paid $${amount} using PayPal account ${this.email}`;
  }
}

class BitcoinPayment extends PaymentStrategy {
  constructor(walletAddress) {
    super();
    this.walletAddress = walletAddress;
  }

  pay(amount) {
    return `Paid $${amount} using Bitcoin wallet ${this.walletAddress.slice(0, 8)}...`;
  }
}

// Context
class ShoppingCart {
  constructor() {
    this.items = [];
    this.paymentStrategy = null;
  }

  addItem(item) {
    this.items.push(item);
  }

  setPaymentStrategy(strategy) {
    this.paymentStrategy = strategy;
  }

  checkout() {
    const total = this.items.reduce((sum, item) => sum + item.price, 0);
    
    if (!this.paymentStrategy) {
      throw new Error('Payment strategy not set');
    }
    
    return this.paymentStrategy.pay(total);
  }
}

// Usage
const cart = new ShoppingCart();
cart.addItem({ name: 'Laptop', price: 999 });
cart.addItem({ name: 'Mouse', price: 25 });

cart.setPaymentStrategy(new CreditCardPayment('1234567890123456', '123', '12/25'));
console.log(cart.checkout()); // "Paid $1024 using Credit Card ending in 3456"

cart.setPaymentStrategy(new PayPalPayment('user@example.com'));
console.log(cart.checkout()); // "Paid $1024 using PayPal account user@example.com"
```

## Advanced Strategy Patterns

### Strategy with Configuration
```javascript
class CompressionStrategy {
  compress(data) {
    throw new Error('compress method must be implemented');
  }

  decompress(data) {
    throw new Error('decompress method must be implemented');
  }
}

class GzipCompression extends CompressionStrategy {
  constructor(level = 6) {
    super();
    this.level = level;
  }

  compress(data) {
    return `Gzip compressed (level ${this.level}): ${data.length} bytes`;
  }

  decompress(data) {
    return `Gzip decompressed: ${data} bytes`;
  }
}

class LZ4Compression extends CompressionStrategy {
  constructor(acceleration = 1) {
    super();
    this.acceleration = acceleration;
  }

  compress(data) {
    return `LZ4 compressed (acceleration ${this.acceleration}): ${data.length} bytes`;
  }

  decompress(data) {
    return `LZ4 decompressed: ${data} bytes`;
  }
}

class CompressionContext {
  constructor(strategy = null) {
    this.strategy = strategy;
    this.compressionHistory = [];
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  compress(data) {
    if (!this.strategy) {
      throw new Error('Compression strategy not set');
    }

    const startTime = Date.now();
    const result = this.strategy.compress(data);
    const endTime = Date.now();

    this.compressionHistory.push({
      strategy: this.strategy.constructor.name,
      dataSize: data.length,
      compressionTime: endTime - startTime,
      timestamp: new Date()
    });

    return result;
  }

  getCompressionStats() {
    return this.compressionHistory;
  }
}
```

### Strategy Registry
```javascript
class StrategyRegistry {
  constructor() {
    this.strategies = new Map();
    this.defaultStrategy = null;
  }

  register(name, strategy, isDefault = false) {
    this.strategies.set(name, strategy);
    
    if (isDefault || !this.defaultStrategy) {
      this.defaultStrategy = strategy;
    }
  }

  getStrategy(name) {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Strategy not found: ${name}`);
    }
    return strategy;
  }

  getDefaultStrategy() {
    return this.defaultStrategy;
  }

  listStrategies() {
    return Array.from(this.strategies.keys());
  }
}

// Usage
const registry = new StrategyRegistry();
registry.register('gzip', new GzipCompression(9), true);
registry.register('lz4', new LZ4Compression(3));

const context = new CompressionContext(registry.getDefaultStrategy());
```

## Domain-Specific Strategies

### Sorting Strategies
```javascript
class SortStrategy {
  sort(array) {
    throw new Error('sort method must be implemented');
  }
}

class BubbleSort extends SortStrategy {
  sort(array) {
    const arr = [...array];
    const n = arr.length;
    
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }
    
    return arr;
  }
}

class QuickSort extends SortStrategy {
  sort(array) {
    if (array.length <= 1) return array;
    
    const pivot = array[Math.floor(array.length / 2)];
    const left = array.filter(x => x < pivot);
    const middle = array.filter(x => x === pivot);
    const right = array.filter(x => x > pivot);
    
    return [...this.sort(left), ...middle, ...this.sort(right)];
  }
}

class MergeSort extends SortStrategy {
  sort(array) {
    if (array.length <= 1) return array;
    
    const mid = Math.floor(array.length / 2);
    const left = this.sort(array.slice(0, mid));
    const right = this.sort(array.slice(mid));
    
    return this.merge(left, right);
  }

  merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        result.push(left[i]);
        i++;
      } else {
        result.push(right[j]);
        j++;
      }
    }
    
    return result.concat(left.slice(i), right.slice(j));
  }
}

class SortContext {
  constructor(strategy = new QuickSort()) {
    this.strategy = strategy;
    this.sortHistory = [];
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  sort(array) {
    const startTime = performance.now();
    const result = this.strategy.sort(array);
    const endTime = performance.now();

    this.sortHistory.push({
      strategy: this.strategy.constructor.name,
      arraySize: array.length,
      sortTime: endTime - startTime,
      timestamp: new Date()
    });

    return result;
  }

  getOptimalStrategy(arraySize) {
    if (arraySize < 50) return new BubbleSort();
    if (arraySize < 1000) return new QuickSort();
    return new MergeSort();
  }
}
```

### Caching Strategies
```javascript
class CacheStrategy {
  get(key) {
    throw new Error('get method must be implemented');
  }

  set(key, value) {
    throw new Error('set method must be implemented');
  }

  delete(key) {
    throw new Error('delete method must be implemented');
  }
}

class LRUCache extends CacheStrategy {
  constructor(capacity = 100) {
    super();
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  delete(key) {
    return this.cache.delete(key);
  }
}

class LFUCache extends CacheStrategy {
  constructor(capacity = 100) {
    super();
    this.capacity = capacity;
    this.cache = new Map();
    this.frequency = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const count = this.frequency.get(key) || 0;
    this.frequency.set(key, count + 1);
    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      return;
    }

    if (this.cache.size >= this.capacity) {
      const leastFrequent = this.getLeastFrequentKey();
      this.cache.delete(leastFrequent);
      this.frequency.delete(leastFrequent);
    }

    this.cache.set(key, value);
    this.frequency.set(key, 1);
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    this.frequency.delete(key);
    return deleted;
  }

  getLeastFrequentKey() {
    let minFreq = Infinity;
    let leastFrequentKey = null;

    for (const [key, freq] of this.frequency) {
      if (freq < minFreq) {
        minFreq = freq;
        leastFrequentKey = key;
      }
    }

    return leastFrequentKey;
  }
}

class CacheContext {
  constructor(strategy = new LRUCache()) {
    this.strategy = strategy;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  get(key) {
    const value = this.strategy.get(key);
    if (value !== null) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value;
  }

  set(key, value) {
    this.strategy.set(key, value);
    this.stats.sets++;
  }

  delete(key) {
    const deleted = this.strategy.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }
}
```

## Strategy with State Management

### Dynamic Strategy Selection
```javascript
class StrategySelector {
  constructor() {
    this.strategies = new Map();
    this.conditions = new Map();
  }

  addStrategy(name, strategy, condition) {
    this.strategies.set(name, strategy);
    this.conditions.set(name, condition);
  }

  selectStrategy(context) {
    for (const [name, condition] of this.conditions) {
      if (condition(context)) {
        return this.strategies.get(name);
      }
    }
    
    throw new Error('No suitable strategy found');
  }
}

// Example: Database Connection Strategy
class DatabaseStrategy {
  connect(config) {
    throw new Error('connect method must be implemented');
  }
}

class MySQLStrategy extends DatabaseStrategy {
  connect(config) {
    return `Connected to MySQL: ${config.host}:${config.port}`;
  }
}

class PostgreSQLStrategy extends DatabaseStrategy {
  connect(config) {
    return `Connected to PostgreSQL: ${config.host}:${config.port}`;
  }
}

class MongoDBStrategy extends DatabaseStrategy {
  connect(config) {
    return `Connected to MongoDB: ${config.host}:${config.port}`;
  }
}

class DatabaseContext {
  constructor() {
    this.selector = new StrategySelector();
    this.setupStrategies();
  }

  setupStrategies() {
    this.selector.addStrategy('mysql', new MySQLStrategy(), 
      config => config.type === 'mysql');
    this.selector.addStrategy('postgresql', new PostgreSQLStrategy(), 
      config => config.type === 'postgresql');
    this.selector.addStrategy('mongodb', new MongoDBStrategy(), 
      config => config.type === 'mongodb');
  }

  connect(config) {
    const strategy = this.selector.selectStrategy(config);
    return strategy.connect(config);
  }
}
```

## Strategy with Validation

### Validation Strategies
```javascript
class ValidationStrategy {
  validate(data) {
    throw new Error('validate method must be implemented');
  }
}

class EmailValidation extends ValidationStrategy {
  validate(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: emailRegex.test(email),
      errors: emailRegex.test(email) ? [] : ['Invalid email format']
    };
  }
}

class PasswordValidation extends ValidationStrategy {
  validate(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

class FormValidator {
  constructor() {
    this.validators = new Map();
  }

  addValidator(field, strategy) {
    this.validators.set(field, strategy);
  }

  validate(formData) {
    const results = {};
    let isValid = true;

    for (const [field, value] of Object.entries(formData)) {
      const validator = this.validators.get(field);
      if (validator) {
        const result = validator.validate(value);
        results[field] = result;
        if (!result.isValid) {
          isValid = false;
        }
      }
    }

    return {
      isValid,
      results
    };
  }
}
```

## Performance Optimization

### Strategy Caching
```javascript
class CachedStrategy {
  constructor(strategy, cacheSize = 1000) {
    this.strategy = strategy;
    this.cache = new Map();
    this.cacheSize = cacheSize;
  }

  execute(...args) {
    const key = this.generateKey(args);
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = this.strategy.execute(...args);
    
    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, result);
    return result;
  }

  generateKey(args) {
    return JSON.stringify(args);
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### Strategy Composition
```javascript
class CompositeStrategy {
  constructor(strategies = []) {
    this.strategies = strategies;
  }

  addStrategy(strategy) {
    this.strategies.push(strategy);
  }

  execute(data) {
    let result = data;
    
    for (const strategy of this.strategies) {
      result = strategy.execute(result);
    }
    
    return result;
  }
}

// Example: Data Processing Pipeline
class DataFilterStrategy {
  constructor(predicate) {
    this.predicate = predicate;
  }

  execute(data) {
    return data.filter(this.predicate);
  }
}

class DataTransformStrategy {
  constructor(transformer) {
    this.transformer = transformer;
  }

  execute(data) {
    return data.map(this.transformer);
  }
}

class DataSortStrategy {
  constructor(comparator) {
    this.comparator = comparator;
  }

  execute(data) {
    return [...data].sort(this.comparator);
  }
}

// Usage
const pipeline = new CompositeStrategy([
  new DataFilterStrategy(x => x > 0),
  new DataTransformStrategy(x => x * 2),
  new DataSortStrategy((a, b) => b - a)
]);

const result = pipeline.execute([-1, 5, 2, 0, 8, -3]);
console.log(result); // [16, 10, 4]
```

## Testing Strategies

### Strategy Testing
```javascript
class StrategyTestSuite {
  constructor() {
    this.testCases = [];
  }

  addTestCase(input, expectedOutput, description) {
    this.testCases.push({ input, expectedOutput, description });
  }

  testStrategy(strategy) {
    const results = [];

    for (const testCase of this.testCases) {
      try {
        const actualOutput = strategy.execute(testCase.input);
        const passed = JSON.stringify(actualOutput) === JSON.stringify(testCase.expectedOutput);
        
        results.push({
          description: testCase.description,
          passed,
          input: testCase.input,
          expected: testCase.expectedOutput,
          actual: actualOutput
        });
      } catch (error) {
        results.push({
          description: testCase.description,
          passed: false,
          input: testCase.input,
          expected: testCase.expectedOutput,
          actual: error.message
        });
      }
    }

    return results;
  }
}

// Example usage
const testSuite = new StrategyTestSuite();
testSuite.addTestCase([3, 1, 4, 1, 5], [1, 1, 3, 4, 5], 'Sort ascending');
testSuite.addTestCase([], [], 'Empty array');
testSuite.addTestCase([1], [1], 'Single element');

const bubbleSort = new BubbleSort();
const results = testSuite.testStrategy(bubbleSort);
console.log(results);
```

## Best Practices

### Design Principles
- Keep strategies focused on single responsibility
- Use interfaces for strategy contracts
- Implement proper error handling
- Consider performance implications
- Use dependency injection for strategy creation

### Implementation Guidelines
- Prefer composition over inheritance
- Use factory pattern for strategy creation
- Implement proper logging for debugging
- Consider thread safety for concurrent access
- Use builder pattern for complex strategy configuration

### Testing Strategies
- Test each strategy independently
- Test strategy selection logic
- Verify strategy performance characteristics
- Test error conditions and edge cases
- Use mock strategies for integration testing 