# Microservices Architecture Patterns

## Overview
Microservices architecture decomposes applications into small, independent services that communicate through well-defined APIs. This guide covers modern microservices patterns, best practices, and implementation strategies.

## Core Patterns

### Service Decomposition
```javascript
// Domain-driven service boundaries
class UserService {
  constructor(userRepository, eventBus) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
  }

  async createUser(userData) {
    // Validate user data
    const user = await this.userRepository.create(userData);
    
    // Publish domain event
    await this.eventBus.publish('user.created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date()
    });
    
    return user;
  }

  async getUserById(id) {
    return await this.userRepository.findById(id);
  }

  async updateUser(id, updates) {
    const user = await this.userRepository.update(id, updates);
    
    await this.eventBus.publish('user.updated', {
      userId: user.id,
      changes: updates,
      timestamp: new Date()
    });
    
    return user;
  }
}

class OrderService {
  constructor(orderRepository, userService, eventBus) {
    this.orderRepository = orderRepository;
    this.userService = userService;
    this.eventBus = eventBus;
  }

  async createOrder(orderData) {
    // Validate user exists
    const user = await this.userService.getUserById(orderData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const order = await this.orderRepository.create(orderData);
    
    await this.eventBus.publish('order.created', {
      orderId: order.id,
      userId: order.userId,
      total: order.total,
      timestamp: new Date()
    });
    
    return order;
  }
}
```

### API Gateway Pattern
```javascript
// Express.js API Gateway
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Service routing
app.use('/api/users', authenticate, createProxyMiddleware({
  target: process.env.USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/users'
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('X-User-ID', req.user.sub);
  }
}));

app.use('/api/orders', authenticate, createProxyMiddleware({
  target: process.env.ORDER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '/orders'
  }
}));

app.use('/api/products', createProxyMiddleware({
  target: process.env.PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/products'
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('API Gateway Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
```

### Event-Driven Communication
```javascript
// Event Bus implementation
class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.eventStore = [];
  }

  async publish(eventType, eventData) {
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      data: eventData,
      timestamp: new Date(),
      version: '1.0'
    };

    // Store event
    this.eventStore.push(event);

    // Notify subscribers
    const subscribers = this.subscribers.get(eventType) || [];
    const promises = subscribers.map(handler => handler(event));
    
    await Promise.allSettled(promises);
    
    return event;
  }

  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);
  }

  async replayEvents(fromTimestamp) {
    const events = this.eventStore.filter(event => 
      event.timestamp >= fromTimestamp
    );
    
    for (const event of events) {
      const subscribers = this.subscribers.get(event.type) || [];
      await Promise.all(subscribers.map(handler => handler(event)));
    }
  }
}

// Service with event handling
class NotificationService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.eventBus.subscribe('user.created', this.handleUserCreated.bind(this));
    this.eventBus.subscribe('order.created', this.handleOrderCreated.bind(this));
    this.eventBus.subscribe('order.shipped', this.handleOrderShipped.bind(this));
  }

  async handleUserCreated(event) {
    const { userId, email } = event.data;
    
    // Send welcome email
    await this.sendEmail(email, 'Welcome!', 'Welcome to our platform!');
    
    // Send welcome SMS
    await this.sendSMS(userId, 'Welcome to our platform!');
  }

  async handleOrderCreated(event) {
    const { orderId, userId, total } = event.data;
    
    // Send order confirmation
    await this.sendOrderConfirmation(userId, orderId, total);
  }

  async handleOrderShipped(event) {
    const { orderId, userId, trackingNumber } = event.data;
    
    // Send shipping notification
    await this.sendShippingNotification(userId, orderId, trackingNumber);
  }

  async sendEmail(to, subject, body) {
    // Email sending logic
    console.log(`Sending email to ${to}: ${subject}`);
  }

  async sendSMS(userId, message) {
    // SMS sending logic
    console.log(`Sending SMS to user ${userId}: ${message}`);
  }
}
```

## Data Management Patterns

### Database per Service
```javascript
// User Service with its own database
class UserRepository {
  constructor(database) {
    this.db = database;
  }

  async create(userData) {
    const user = {
      id: crypto.randomUUID(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.db.query(
      'INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, user.name, user.email, user.passwordHash, user.createdAt, user.updatedAt]
    );

    return user;
  }

  async findById(id) {
    const [rows] = await this.db.query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    return rows[0] || null;
  }

  async findByEmail(email) {
    const [rows] = await this.db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    return rows[0] || null;
  }

  async update(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), new Date(), id];
    
    await this.db.query(
      `UPDATE users SET ${fields}, updated_at = ? WHERE id = ?`,
      values
    );

    return await this.findById(id);
  }
}

// Order Service with its own database
class OrderRepository {
  constructor(database) {
    this.db = database;
  }

  async create(orderData) {
    const order = {
      id: crypto.randomUUID(),
      ...orderData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.db.query(
      'INSERT INTO orders (id, user_id, total, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [order.id, order.userId, order.total, order.status, order.createdAt, order.updatedAt]
    );

    // Create order items
    for (const item of orderData.items) {
      await this.db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [order.id, item.productId, item.quantity, item.price]
      );
    }

    return order;
  }

  async findById(id) {
    const [rows] = await this.db.query(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (!rows[0]) return null;

    const [items] = await this.db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    return {
      ...rows[0],
      items
    };
  }
}
```

### Saga Pattern for Distributed Transactions
```javascript
// Saga orchestrator
class OrderSaga {
  constructor(orderService, paymentService, inventoryService, eventBus) {
    this.orderService = orderService;
    this.paymentService = paymentService;
    this.inventoryService = inventoryService;
    this.eventBus = eventBus;
  }

  async createOrder(orderData) {
    const sagaId = crypto.randomUUID();
    
    try {
      // Step 1: Create order
      const order = await this.orderService.createOrder({
        ...orderData,
        sagaId,
        status: 'pending'
      });

      // Step 2: Reserve inventory
      await this.inventoryService.reserveItems(orderData.items, sagaId);

      // Step 3: Process payment
      const payment = await this.paymentService.processPayment({
        orderId: order.id,
        amount: order.total,
        sagaId
      });

      // Step 4: Confirm order
      await this.orderService.confirmOrder(order.id, sagaId);

      // Step 5: Commit inventory
      await this.inventoryService.commitReservation(sagaId);

      // Step 6: Commit payment
      await this.paymentService.confirmPayment(payment.id, sagaId);

      // Saga completed successfully
      await this.eventBus.publish('order.saga.completed', {
        orderId: order.id,
        sagaId
      });

      return order;

    } catch (error) {
      // Compensate for failures
      await this.compensate(sagaId, error);
      throw error;
    }
  }

  async compensate(sagaId, error) {
    console.error(`Saga ${sagaId} failed, compensating...`, error);

    try {
      // Compensate in reverse order
      await this.paymentService.cancelPayment(sagaId);
      await this.inventoryService.releaseReservation(sagaId);
      await this.orderService.cancelOrder(sagaId);

      await this.eventBus.publish('order.saga.failed', {
        sagaId,
        error: error.message
      });

    } catch (compensationError) {
      console.error('Compensation failed:', compensationError);
      // Manual intervention required
      await this.eventBus.publish('order.saga.compensation.failed', {
        sagaId,
        error: compensationError.message
      });
    }
  }
}
```

## Service Discovery and Load Balancing

### Service Registry
```javascript
// Service registry implementation
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
  }

  register(serviceName, serviceInstance) {
    const service = {
      name: serviceName,
      instance: serviceInstance,
      healthCheck: this.createHealthCheck(serviceInstance),
      lastHeartbeat: Date.now(),
      status: 'healthy'
    };

    this.services.set(serviceName, service);
    this.startHealthCheck(serviceName);
    
    console.log(`Service ${serviceName} registered`);
  }

  deregister(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      clearInterval(service.healthCheck);
      this.services.delete(serviceName);
      console.log(`Service ${serviceName} deregistered`);
    }
  }

  getService(serviceName) {
    const service = this.services.get(serviceName);
    if (service && service.status === 'healthy') {
      return service.instance;
    }
    return null;
  }

  getAllServices() {
    return Array.from(this.services.values())
      .filter(service => service.status === 'healthy')
      .map(service => ({
        name: service.name,
        instance: service.instance
      }));
  }

  createHealthCheck(serviceInstance) {
    return setInterval(async () => {
      try {
        await serviceInstance.healthCheck();
        this.updateServiceStatus(serviceInstance.name, 'healthy');
      } catch (error) {
        this.updateServiceStatus(serviceInstance.name, 'unhealthy');
      }
    }, 30000); // Check every 30 seconds
  }

  updateServiceStatus(serviceName, status) {
    const service = this.services.get(serviceName);
    if (service) {
      service.status = status;
      service.lastHeartbeat = Date.now();
    }
  }
}

// Load balancer
class LoadBalancer {
  constructor(serviceRegistry) {
    this.serviceRegistry = serviceRegistry;
    this.strategies = {
      roundRobin: this.roundRobin.bind(this),
      leastConnections: this.leastConnections.bind(this),
      random: this.random.bind(this)
    };
  }

  async routeRequest(serviceName, request, strategy = 'roundRobin') {
    const services = this.serviceRegistry.getAllServices()
      .filter(service => service.name === serviceName);

    if (services.length === 0) {
      throw new Error(`No healthy instances of ${serviceName} available`);
    }

    const selectedService = this.strategies[strategy](services);
    return await selectedService.instance.handleRequest(request);
  }

  roundRobin(services) {
    // Simple round-robin implementation
    const index = Math.floor(Math.random() * services.length);
    return services[index];
  }

  leastConnections(services) {
    // Return service with least active connections
    return services.reduce((min, service) => 
      service.instance.activeConnections < min.instance.activeConnections ? service : min
    );
  }

  random(services) {
    return services[Math.floor(Math.random() * services.length)];
  }
}
```

## Resilience Patterns

### Circuit Breaker
```javascript
class CircuitBreaker {
  constructor(failureThreshold = 5, timeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  shouldAttemptReset() {
    return Date.now() - this.lastFailureTime >= this.timeout;
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Usage in service
class ResilientService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker();
  }

  async callExternalService(data) {
    return await this.circuitBreaker.execute(async () => {
      // External service call
      const response = await fetch('https://external-service.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`External service error: ${response.status}`);
      }

      return await response.json();
    });
  }
}
```

### Retry Pattern
```javascript
class RetryPolicy {
  constructor(maxRetries = 3, backoffMs = 1000) {
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }

  async execute(operation) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = this.backoffMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retryPolicy = new RetryPolicy(3, 1000);

const result = await retryPolicy.execute(async () => {
  return await externalService.call();
});
```

## Best Practices

### Service Design
- Keep services small and focused
- Use domain-driven design principles
- Implement proper error handling
- Use async communication patterns

### Data Management
- Use database per service pattern
- Implement eventual consistency
- Use event sourcing for audit trails
- Implement proper data versioning

### Security
- Implement service-to-service authentication
- Use API gateways for security
- Encrypt data in transit and at rest
- Implement proper authorization

### Monitoring
- Use distributed tracing
- Implement health checks
- Monitor service metrics
- Set up alerting for failures 