# Refactor Suggestions

## Overview
Systematic approach to identifying and implementing code refactoring opportunities. This guide provides patterns, techniques, and best practices for improving code quality through refactoring.

## Refactoring Categories

### Code Smells Detection
- **Long Methods**: Methods exceeding 20-30 lines
- **Large Classes**: Classes with too many responsibilities
- **Duplicate Code**: Repeated logic across multiple locations
- **Long Parameter Lists**: Methods with excessive parameters
- **Data Clumps**: Groups of data that should be objects
- **Primitive Obsession**: Overuse of primitive types
- **Switch Statements**: Complex conditional logic
- **Lazy Class**: Classes with minimal functionality
- **Speculative Generality**: Unused abstractions
- **Temporary Field**: Fields used only in certain circumstances

### Performance Issues
- **N+1 Queries**: Inefficient database access patterns
- **Memory Leaks**: Resources not properly disposed
- **Inefficient Algorithms**: Suboptimal data structures
- **Redundant Computations**: Repeated expensive operations
- **Blocking Operations**: Synchronous operations in async contexts

### Maintainability Problems
- **Tight Coupling**: Excessive dependencies between components
- **Feature Envy**: Methods that use more data from other objects
- **Inappropriate Intimacy**: Classes knowing too much about each other
- **Message Chains**: Long sequences of method calls
- **Middle Man**: Classes that only delegate to other classes

## Refactoring Techniques

### Extract Method
```javascript
// Before
function calculateTotal(items) {
  let total = 0;
  for (let item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// After
function calculateTotal(items) {
  return items.reduce((total, item) => total + calculateItemTotal(item), 0);
}

function calculateItemTotal(item) {
  return item.price * item.quantity;
}
```

### Extract Class
```javascript
// Before
class OrderProcessor {
  processOrder(order) {
    // Validate order
    if (!order.customerId) throw new Error('Customer ID required');
    if (!order.items || order.items.length === 0) throw new Error('Items required');
    
    // Calculate total
    let total = 0;
    for (let item of order.items) {
      total += item.price * item.quantity;
    }
    
    // Apply discounts
    if (total > 100) total *= 0.9;
    
    // Save to database
    return this.saveOrder({ ...order, total });
  }
}

// After
class OrderValidator {
  validate(order) {
    if (!order.customerId) throw new Error('Customer ID required');
    if (!order.items || order.items.length === 0) throw new Error('Items required');
  }
}

class PriceCalculator {
  calculateTotal(items) {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
  
  applyDiscounts(total) {
    return total > 100 ? total * 0.9 : total;
  }
}

class OrderProcessor {
  constructor(validator, calculator, repository) {
    this.validator = validator;
    this.calculator = calculator;
    this.repository = repository;
  }
  
  processOrder(order) {
    this.validator.validate(order);
    const subtotal = this.calculator.calculateTotal(order.items);
    const total = this.calculator.applyDiscounts(subtotal);
    return this.repository.saveOrder({ ...order, total });
  }
}
```

### Replace Conditional with Polymorphism
```javascript
// Before
class OrderProcessor {
  processOrder(order) {
    switch (order.type) {
      case 'standard':
        return this.processStandardOrder(order);
      case 'express':
        return this.processExpressOrder(order);
      case 'bulk':
        return this.processBulkOrder(order);
      default:
        throw new Error('Unknown order type');
    }
  }
}

// After
class OrderProcessor {
  processOrder(order) {
    const processor = this.createOrderProcessor(order.type);
    return processor.process(order);
  }
  
  createOrderProcessor(type) {
    const processors = {
      standard: new StandardOrderProcessor(),
      express: new ExpressOrderProcessor(),
      bulk: new BulkOrderProcessor()
    };
    return processors[type] || new StandardOrderProcessor();
  }
}

class StandardOrderProcessor {
  process(order) {
    // Standard processing logic
  }
}

class ExpressOrderProcessor {
  process(order) {
    // Express processing logic
  }
}

class BulkOrderProcessor {
  process(order) {
    // Bulk processing logic
  }
}
```

### Introduce Parameter Object
```javascript
// Before
function createUser(name, email, age, address, phone, preferences) {
  // Complex user creation logic
}

// After
class UserCreationParams {
  constructor(name, email, age, address, phone, preferences) {
    this.name = name;
    this.email = email;
    this.age = age;
    this.address = address;
    this.phone = phone;
    this.preferences = preferences;
  }
  
  validate() {
    if (!this.name) throw new Error('Name is required');
    if (!this.email) throw new Error('Email is required');
    // Additional validation
  }
}

function createUser(params) {
  params.validate();
  // User creation logic
}
```

## Database Refactoring

### Query Optimization
```sql
-- Before: N+1 Query Problem
SELECT * FROM users;
-- Then for each user:
SELECT * FROM orders WHERE user_id = ?;

-- After: Single Query with JOIN
SELECT u.*, o.* 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id;
```

### Schema Refactoring
```sql
-- Before: Denormalized data
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_address TEXT,
  -- order fields
);

-- After: Normalized schema
CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  address TEXT
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

## Performance Refactoring

### Caching Implementation
```javascript
// Before: No caching
class UserService {
  async getUserById(id) {
    return await this.database.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// After: With caching
class UserService {
  constructor(cache) {
    this.cache = cache;
  }
  
  async getUserById(id) {
    const cacheKey = `user:${id}`;
    let user = await this.cache.get(cacheKey);
    
    if (!user) {
      user = await this.database.query('SELECT * FROM users WHERE id = ?', [id]);
      await this.cache.set(cacheKey, user, 3600); // Cache for 1 hour
    }
    
    return user;
  }
}
```

### Async/Await Refactoring
```javascript
// Before: Callback hell
function processUserData(userId, callback) {
  getUser(userId, (user) => {
    getOrders(user.id, (orders) => {
      getPreferences(user.id, (preferences) => {
        callback({ user, orders, preferences });
      });
    });
  });
}

// After: Async/await
async function processUserData(userId) {
  const user = await getUser(userId);
  const [orders, preferences] = await Promise.all([
    getOrders(user.id),
    getPreferences(user.id)
  ]);
  
  return { user, orders, preferences };
}
```

## Refactoring Process

### Assessment Phase
1. **Identify Smells**: Use static analysis tools and manual review
2. **Prioritize Issues**: Focus on high-impact, low-effort changes
3. **Plan Approach**: Determine refactoring strategy and order
4. **Set Goals**: Define success criteria and metrics

### Implementation Phase
1. **Write Tests**: Ensure existing functionality is covered
2. **Make Small Changes**: Refactor incrementally
3. **Run Tests**: Verify changes don't break functionality
4. **Commit Frequently**: Small, atomic commits
5. **Review Progress**: Regular check-ins and reviews

### Validation Phase
1. **Performance Testing**: Measure improvements
2. **Code Review**: Get feedback from team
3. **Integration Testing**: Ensure system still works
4. **Documentation**: Update docs and comments

## Tools and Automation

### Static Analysis Tools
- **ESLint**: JavaScript/TypeScript code quality
- **SonarQube**: Multi-language code analysis
- **PMD**: Java static analysis
- **Pylint**: Python code analysis

### Refactoring Tools
- **IDE Refactoring**: Built-in refactoring support
- **Automated Refactoring**: Scripts for common patterns
- **Code Generators**: Templates for common refactoring

### Monitoring Tools
- **Performance Profilers**: Identify bottlenecks
- **Memory Analyzers**: Detect memory leaks
- **Code Coverage**: Ensure test coverage

## Best Practices

### Before Refactoring
- **Understand the Code**: Read and comprehend existing code
- **Write Tests**: Ensure you have good test coverage
- **Backup**: Create branches or backups
- **Plan Incrementally**: Break large refactoring into small steps

### During Refactoring
- **One Change at a Time**: Make small, focused changes
- **Run Tests Frequently**: Verify each change works
- **Keep It Working**: Don't break existing functionality
- **Communicate**: Keep team informed of changes

### After Refactoring
- **Measure Impact**: Compare before/after metrics
- **Document Changes**: Update documentation
- **Share Knowledge**: Educate team on improvements
- **Monitor Performance**: Watch for any regressions

## Common Refactoring Patterns

### Strategy Pattern
```javascript
// Before: Switch statements
function calculateShipping(order) {
  switch (order.shippingMethod) {
    case 'standard': return order.weight * 2;
    case 'express': return order.weight * 5;
    case 'overnight': return order.weight * 10;
  }
}

// After: Strategy pattern
class ShippingCalculator {
  constructor(strategies) {
    this.strategies = strategies;
  }
  
  calculate(order) {
    const strategy = this.strategies[order.shippingMethod];
    return strategy.calculate(order);
  }
}

const strategies = {
  standard: { calculate: (order) => order.weight * 2 },
  express: { calculate: (order) => order.weight * 5 },
  overnight: { calculate: (order) => order.weight * 10 }
};
```

### Factory Pattern
```javascript
// Before: Direct instantiation
function createProcessor(type) {
  if (type === 'json') return new JsonProcessor();
  if (type === 'xml') return new XmlProcessor();
  if (type === 'csv') return new CsvProcessor();
}

// After: Factory pattern
class ProcessorFactory {
  static create(type) {
    const processors = {
      json: JsonProcessor,
      xml: XmlProcessor,
      csv: CsvProcessor
    };
    
    const ProcessorClass = processors[type];
    if (!ProcessorClass) {
      throw new Error(`Unknown processor type: ${type}`);
    }
    
    return new ProcessorClass();
  }
}
```

## Conclusion

Refactoring is an essential skill for maintaining code quality and system health. By following these guidelines and using appropriate tools, developers can systematically improve code while maintaining functionality and performance.

Remember that refactoring is not a one-time activity but a continuous process of code improvement. Regular refactoring helps prevent technical debt and keeps codebases maintainable and scalable.
