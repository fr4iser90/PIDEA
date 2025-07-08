# Event-Driven Architecture Patterns

## Overview
Event-Driven Architecture (EDA) is a software architecture pattern that promotes the production, detection, consumption, and reaction to events. It enables loose coupling between components and supports asynchronous processing.

## Core Concepts

### Event Definition
```typescript
// Base Event Interface
interface Event {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly version: number;
  readonly data: any;
}

// Domain Events
class UserCreatedEvent implements Event {
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly timestamp: Date,
    public readonly version: number,
    public readonly data: {
      userId: string;
      email: string;
      name: string;
    }
  ) {
    this.eventType = 'UserCreated';
  }
  
  readonly eventType: string;
}

class UserUpdatedEvent implements Event {
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly timestamp: Date,
    public readonly version: number,
    public readonly data: {
      userId: string;
      email?: string;
      name?: string;
    }
  ) {
    this.eventType = 'UserUpdated';
  }
  
  readonly eventType: string;
}

class OrderCreatedEvent implements Event {
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly timestamp: Date,
    public readonly version: number,
    public readonly data: {
      orderId: string;
      userId: string;
      items: OrderItem[];
      total: Money;
    }
  ) {
    this.eventType = 'OrderCreated';
  }
  
  readonly eventType: string;
}
```

### Event Bus Implementation
```typescript
// Event Bus Interface
interface EventBus {
  publish(event: Event): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}

// Event Handler Interface
interface EventHandler {
  handle(event: Event): Promise<void>;
}

// In-Memory Event Bus
class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();
  
  async publish(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    
    const promises = handlers.map(handler => 
      handler.handle(event).catch(error => {
        console.error(`Error handling event ${event.eventType}:`, error);
      })
    );
    
    await Promise.all(promises);
  }
  
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

// Redis Event Bus (for distributed systems)
class RedisEventBus implements EventBus {
  constructor(
    private redis: Redis,
    private channel: string = 'events'
  ) {}
  
  async publish(event: Event): Promise<void> {
    const message = JSON.stringify({
      eventType: event.eventType,
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      timestamp: event.timestamp.toISOString(),
      version: event.version,
      data: event.data
    });
    
    await this.redis.publish(this.channel, message);
  }
  
  subscribe(eventType: string, handler: EventHandler): void {
    this.redis.subscribe(this.channel, (message) => {
      const eventData = JSON.parse(message);
      if (eventData.eventType === eventType) {
        handler.handle(this.deserializeEvent(eventData));
      }
    });
  }
  
  unsubscribe(eventType: string, handler: EventHandler): void {
    // Redis doesn't support selective unsubscription
    // Implementation depends on specific requirements
  }
  
  private deserializeEvent(eventData: any): Event {
    // Convert JSON back to Event object
    return {
      eventId: eventData.eventId,
      eventType: eventData.eventType,
      aggregateId: eventData.aggregateId,
      timestamp: new Date(eventData.timestamp),
      version: eventData.version,
      data: eventData.data
    };
  }
}
```

### Event Handlers
```typescript
// User Event Handlers
class UserEventHandler implements EventHandler {
  constructor(
    private userReadRepository: UserReadRepository,
    private emailService: EmailService,
    private auditService: AuditService
  ) {}
  
  async handle(event: Event): Promise<void> {
    switch (event.eventType) {
      case 'UserCreated':
        await this.handleUserCreated(event as UserCreatedEvent);
        break;
      case 'UserUpdated':
        await this.handleUserUpdated(event as UserUpdatedEvent);
        break;
      default:
        console.warn(`Unknown event type: ${event.eventType}`);
    }
  }
  
  private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // Update read model
    const user = {
      id: event.data.userId,
      email: event.data.email,
      name: event.data.name,
      createdAt: event.timestamp,
      updatedAt: event.timestamp
    };
    
    await this.userReadRepository.save(user);
    
    // Send welcome email
    await this.emailService.sendWelcomeEmail(event.data.email, event.data.name);
    
    // Audit log
    await this.auditService.log('USER_CREATED', {
      userId: event.data.userId,
      email: event.data.email,
      timestamp: event.timestamp
    });
  }
  
  private async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    // Update read model
    const user = await this.userReadRepository.findById(event.data.userId);
    if (!user) return;
    
    if (event.data.email) user.email = event.data.email;
    if (event.data.name) user.name = event.data.name;
    user.updatedAt = event.timestamp;
    
    await this.userReadRepository.save(user);
    
    // Audit log
    await this.auditService.log('USER_UPDATED', {
      userId: event.data.userId,
      changes: event.data,
      timestamp: event.timestamp
    });
  }
}

// Order Event Handlers
class OrderEventHandler implements EventHandler {
  constructor(
    private orderReadRepository: OrderReadRepository,
    private inventoryService: InventoryService,
    private notificationService: NotificationService
  ) {}
  
  async handle(event: Event): Promise<void> {
    switch (event.eventType) {
      case 'OrderCreated':
        await this.handleOrderCreated(event as OrderCreatedEvent);
        break;
      default:
        console.warn(`Unknown event type: ${event.eventType}`);
    }
  }
  
  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Update read model
    const order = {
      id: event.data.orderId,
      userId: event.data.userId,
      items: event.data.items,
      total: event.data.total,
      status: 'CREATED',
      createdAt: event.timestamp,
      updatedAt: event.timestamp
    };
    
    await this.orderReadRepository.save(order);
    
    // Update inventory
    for (const item of event.data.items) {
      await this.inventoryService.reserveStock(item.productId, item.quantity);
    }
    
    // Send notification
    await this.notificationService.sendOrderConfirmation(
      event.data.userId,
      event.data.orderId,
      event.data.total
    );
  }
}
```

### Event Sourcing
```typescript
// Event Store Interface
interface EventStore {
  saveEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void>;
  getEvents(aggregateId: string): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
}

// In-Memory Event Store
class InMemoryEventStore implements EventStore {
  private events: Event[] = [];
  
  async saveEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void> {
    const existingEvents = this.events.filter(e => e.aggregateId === aggregateId);
    const currentVersion = existingEvents.length;
    
    if (currentVersion !== expectedVersion) {
      throw new Error(`Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`);
    }
    
    this.events.push(...events);
  }
  
  async getEvents(aggregateId: string): Promise<Event[]> {
    return this.events
      .filter(e => e.aggregateId === aggregateId)
      .sort((a, b) => a.version - b.version);
  }
  
  async getAllEvents(): Promise<Event[]> {
    return this.events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

// PostgreSQL Event Store
class PostgresEventStore implements EventStore {
  constructor(private db: Database) {}
  
  async saveEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Check current version
      const result = await trx.query(
        'SELECT MAX(version) as current_version FROM events WHERE aggregate_id = $1',
        [aggregateId]
      );
      
      const currentVersion = result.rows[0]?.current_version || 0;
      
      if (currentVersion !== expectedVersion) {
        throw new Error(`Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`);
      }
      
      // Insert events
      for (const event of events) {
        await trx.query(
          `INSERT INTO events (event_id, event_type, aggregate_id, version, timestamp, data)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            event.eventId,
            event.eventType,
            event.aggregateId,
            event.version,
            event.timestamp,
            JSON.stringify(event.data)
          ]
        );
      }
    });
  }
  
  async getEvents(aggregateId: string): Promise<Event[]> {
    const result = await this.db.query(
      'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY version',
      [aggregateId]
    );
    
    return result.rows.map(this.mapRowToEvent);
  }
  
  async getAllEvents(): Promise<Event[]> {
    const result = await this.db.query(
      'SELECT * FROM events ORDER BY timestamp'
    );
    
    return result.rows.map(this.mapRowToEvent);
  }
  
  private mapRowToEvent(row: any): Event {
    return {
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      version: row.version,
      timestamp: new Date(row.timestamp),
      data: JSON.parse(row.data)
    };
  }
}
```

### Aggregate Implementation
```typescript
// Base Aggregate Class
abstract class Aggregate {
  private _events: Event[] = [];
  private _version: number = 0;
  
  get events(): Event[] {
    return [...this._events];
  }
  
  get version(): number {
    return this._version;
  }
  
  protected apply(event: Event): void {
    this._events.push(event);
    this._version++;
  }
  
  protected addEvent(eventType: string, data: any): void {
    const event = {
      eventId: generateId(),
      eventType,
      aggregateId: this.getAggregateId(),
      timestamp: new Date(),
      version: this._version + 1,
      data
    };
    
    this.apply(event);
  }
  
  abstract getAggregateId(): string;
}

// User Aggregate
class User extends Aggregate {
  private _id: UserId;
  private _email: string;
  private _name: string;
  private _isActive: boolean = true;
  
  constructor(id: UserId, email: string, name: string) {
    super();
    this._id = id;
    this._email = email;
    this._name = name;
    
    this.addEvent('UserCreated', {
      userId: id.value,
      email,
      name
    });
  }
  
  static fromEvents(events: Event[]): User {
    const user = new User(
      new UserId(events[0].data.userId),
      events[0].data.email,
      events[0].data.name
    );
    
    // Apply all events
    for (const event of events.slice(1)) {
      user.applyEvent(event);
    }
    
    return user;
  }
  
  updateEmail(email: string): void {
    if (!this._isActive) {
      throw new Error('Cannot update inactive user');
    }
    
    this._email = email;
    
    this.addEvent('UserUpdated', {
      userId: this._id.value,
      email
    });
  }
  
  updateName(name: string): void {
    if (!this._isActive) {
      throw new Error('Cannot update inactive user');
    }
    
    this._name = name;
    
    this.addEvent('UserUpdated', {
      userId: this._id.value,
      name
    });
  }
  
  deactivate(): void {
    if (!this._isActive) {
      throw new Error('User is already inactive');
    }
    
    this._isActive = false;
    
    this.addEvent('UserDeactivated', {
      userId: this._id.value
    });
  }
  
  private applyEvent(event: Event): void {
    switch (event.eventType) {
      case 'UserUpdated':
        if (event.data.email) this._email = event.data.email;
        if (event.data.name) this._name = event.data.name;
        break;
      case 'UserDeactivated':
        this._isActive = false;
        break;
    }
  }
  
  getAggregateId(): string {
    return this._id.value;
  }
  
  get id(): UserId { return this._id; }
  get email(): string { return this._email; }
  get name(): string { return this._name; }
  get isActive(): boolean { return this._isActive; }
}
```

### Repository with Event Sourcing
```typescript
// Event-Sourced Repository
class EventSourcedUserRepository implements UserRepository {
  constructor(
    private eventStore: EventStore,
    private eventBus: EventBus
  ) {}
  
  async save(user: User): Promise<void> {
    const events = user.events;
    const expectedVersion = user.version - events.length;
    
    await this.eventStore.saveEvents(user.getAggregateId(), events, expectedVersion);
    
    // Publish events
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }
  
  async findById(id: UserId): Promise<User | null> {
    const events = await this.eventStore.getEvents(id.value);
    
    if (events.length === 0) {
      return null;
    }
    
    return User.fromEvents(events);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    // This would require a read model or index
    // For now, we'll get all events and filter
    const allEvents = await this.eventStore.getAllEvents();
    const userEvents = allEvents.filter(e => 
      e.eventType === 'UserCreated' && e.data.email === email
    );
    
    if (userEvents.length === 0) {
      return null;
    }
    
    const userId = userEvents[0].data.userId;
    return this.findById(new UserId(userId));
  }
}
```

## Project Structure

```
src/
├── domain/                    # Domain Layer
│   ├── aggregates/           # Event-sourced aggregates
│   │   ├── User.ts
│   │   └── Order.ts
│   ├── events/               # Domain events
│   │   ├── UserCreatedEvent.ts
│   │   ├── UserUpdatedEvent.ts
│   │   └── OrderCreatedEvent.ts
│   └── repositories/         # Repository interfaces
│       ├── UserRepository.ts
│       └── OrderRepository.ts
├── application/              # Application Layer
│   ├── handlers/            # Event handlers
│   │   ├── UserEventHandler.ts
│   │   └── OrderEventHandler.ts
│   └── services/            # Application services
│       └── UserService.ts
├── infrastructure/           # Infrastructure Layer
│   ├── event-store/         # Event store implementations
│   │   ├── InMemoryEventStore.ts
│   │   └── PostgresEventStore.ts
│   ├── event-bus/           # Event bus implementations
│   │   ├── InMemoryEventBus.ts
│   │   └── RedisEventBus.ts
│   ├── repositories/        # Repository implementations
│   │   └── EventSourcedUserRepository.ts
│   └── read-models/         # Read model repositories
│       ├── UserReadRepository.ts
│       └── OrderReadRepository.ts
└── presentation/            # Presentation Layer
    ├── controllers/         # REST controllers
    │   └── UserController.ts
    └── resolvers/           # GraphQL resolvers
        └── UserResolver.ts
```

## Benefits

### Loose Coupling
- Components communicate through events
- No direct dependencies between components
- Easy to add new event handlers

### Scalability
- Asynchronous processing
- Horizontal scaling of event handlers
- Independent scaling of read and write models

### Maintainability
- Clear event flow
- Easy to understand system behavior
- Simple to add new features

### Audit Trail
- Complete history of all changes
- Event sourcing provides full audit trail
- Easy to debug and troubleshoot

## Common Anti-Patterns

### ❌ Synchronous Event Handling
```typescript
// Wrong: Blocking on event processing
class UserService {
  async createUser(data: CreateUserData): Promise<User> {
    const user = new User(data.id, data.email, data.name);
    await this.repository.save(user);
    
    // ❌ Blocking on event processing
    await this.eventBus.publish(user.events[0]);
    
    return user;
  }
}
```

### ❌ Events with Side Effects
```typescript
// Wrong: Events that cause side effects in handlers
class UserEventHandler {
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // ❌ Side effect: sending email in event handler
    await this.emailService.sendWelcomeEmail(event.data.email);
    
    // ❌ Side effect: creating audit log
    await this.auditService.log('USER_CREATED', event.data);
  }
}
```

### ❌ Large Event Payloads
```typescript
// Wrong: Events with too much data
class OrderCreatedEvent {
  constructor(
    public readonly data: {
      orderId: string;
      userId: string;
      items: OrderItem[];
      total: Money;
      // ❌ Too much data in event
      customerAddress: Address;
      paymentMethod: PaymentMethod;
      shippingDetails: ShippingDetails;
      // ... many more fields
    }
  ) {}
}
```

## Testing Strategy

### Event Handler Testing
```typescript
describe('UserEventHandler', () => {
  let handler: UserEventHandler;
  let mockUserReadRepository: jest.Mocked<UserReadRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  
  beforeEach(() => {
    mockUserReadRepository = {
      save: jest.fn()
    };
    
    mockEmailService = {
      sendWelcomeEmail: jest.fn()
    };
    
    handler = new UserEventHandler(
      mockUserReadRepository,
      mockEmailService,
      mockAuditService
    );
  });
  
  it('should handle UserCreated event', async () => {
    const event = new UserCreatedEvent(
      'event-1',
      'user-1',
      new Date(),
      1,
      {
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      }
    );
    
    await handler.handle(event);
    
    expect(mockUserReadRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
    );
    
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
      'test@example.com',
      'Test User'
    );
  });
});
```

### Aggregate Testing
```typescript
describe('User Aggregate', () => {
  it('should create user with UserCreated event', () => {
    const user = new User(
      new UserId('user-1'),
      'test@example.com',
      'Test User'
    );
    
    expect(user.events).toHaveLength(1);
    expect(user.events[0].eventType).toBe('UserCreated');
    expect(user.events[0].data).toEqual({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User'
    });
  });
  
  it('should update email with UserUpdated event', () => {
    const user = new User(
      new UserId('user-1'),
      'old@example.com',
      'Test User'
    );
    
    user.updateEmail('new@example.com');
    
    expect(user.events).toHaveLength(2);
    expect(user.events[1].eventType).toBe('UserUpdated');
    expect(user.events[1].data).toEqual({
      userId: 'user-1',
      email: 'new@example.com'
    });
  });
});
```

## Migration Strategy

### Phase 1: Introduce Event Bus
1. Create EventBus interface and implementation
2. Add event publishing to existing operations
3. Create basic event handlers

### Phase 2: Implement Event Sourcing
1. Create EventStore interface and implementation
2. Convert aggregates to event-sourced
3. Update repositories to use event sourcing

### Phase 3: Add Read Models
1. Create read model repositories
2. Implement event handlers for read models
3. Update queries to use read models

### Phase 4: Optimize and Scale
1. Add event persistence
2. Implement event replay capabilities
3. Add monitoring and observability 