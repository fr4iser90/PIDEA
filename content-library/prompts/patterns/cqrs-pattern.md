# Command Query Responsibility Segregation (CQRS) Pattern

## Overview
CQRS is an architectural pattern that separates read and write operations for a data store. Commands handle write operations and change the state, while Queries handle read operations and return data without side effects.

## Core Concepts

### Command-Query Separation
```typescript
// Commands: Write operations that change state
interface Command {
  readonly commandId: string;
  readonly timestamp: Date;
}

// Queries: Read operations that don't change state
interface Query {
  readonly queryId: string;
  readonly timestamp: Date;
}

// Command Handlers: Process commands and update state
interface CommandHandler<TCommand extends Command> {
  handle(command: TCommand): Promise<void>;
}

// Query Handlers: Process queries and return data
interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<TResult>;
}
```

### Command Bus
```typescript
class CommandBus {
  private handlers = new Map<string, CommandHandler<any>>();
  
  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler);
  }
  
  async execute<T extends Command>(command: T): Promise<void> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) {
      throw new Error(`No handler registered for ${command.constructor.name}`);
    }
    
    await handler.handle(command);
  }
}

// Query Bus
class QueryBus {
  private handlers = new Map<string, QueryHandler<any, any>>();
  
  register<TQuery extends Query, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType, handler);
  }
  
  async execute<TQuery extends Query, TResult>(query: TQuery): Promise<TResult> {
    const handler = this.handlers.get(query.constructor.name);
    if (!handler) {
      throw new Error(`No handler registered for ${query.constructor.name}`);
    }
    
    return await handler.handle(query);
  }
}
```

## Command Implementation

### Command DTOs
```typescript
// Create User Command
class CreateUserCommand implements Command {
  constructor(
    public readonly commandId: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Update User Command
class UpdateUserCommand implements Command {
  constructor(
    public readonly commandId: string,
    public readonly userId: string,
    public readonly email?: string,
    public readonly name?: string,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Delete User Command
class DeleteUserCommand implements Command {
  constructor(
    public readonly commandId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Create Order Command
class CreateOrderCommand implements Command {
  constructor(
    public readonly commandId: string,
    public readonly orderId: string,
    public readonly userId: string,
    public readonly items: OrderItemCommand[],
    public readonly timestamp: Date = new Date()
  ) {}
}

class OrderItemCommand {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: number
  ) {}
}
```

### Command Handlers
```typescript
// Create User Handler
class CreateUserHandler implements CommandHandler<CreateUserCommand> {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}
  
  async handle(command: CreateUserCommand): Promise<void> {
    // Validate command
    if (!command.email || !command.name) {
      throw new Error('Email and name are required');
    }
    
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Create user
    const user = new User(
      new UserId(command.userId),
      command.email,
      command.name
    );
    
    // Save to write model
    await this.userRepository.save(user);
    
    // Publish event
    await this.eventBus.publish(new UserCreatedEvent(
      command.userId,
      command.email,
      command.name,
      command.timestamp
    ));
  }
}

// Update User Handler
class UpdateUserHandler implements CommandHandler<UpdateUserCommand> {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}
  
  async handle(command: UpdateUserCommand): Promise<void> {
    // Get existing user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update user
    if (command.email) {
      user.updateEmail(command.email);
    }
    if (command.name) {
      user.updateName(command.name);
    }
    
    // Save changes
    await this.userRepository.save(user);
    
    // Publish event
    await this.eventBus.publish(new UserUpdatedEvent(
      command.userId,
      command.email,
      command.name,
      command.timestamp
    ));
  }
}

// Create Order Handler
class CreateOrderHandler implements CommandHandler<CreateOrderCommand> {
  constructor(
    private orderRepository: OrderRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}
  
  async handle(command: CreateOrderCommand): Promise<void> {
    // Validate user exists
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create order
    const order = new Order(
      new OrderId(command.orderId),
      new UserId(command.userId)
    );
    
    // Add items
    for (const item of command.items) {
      order.addItem(
        new ProductId(item.productId),
        item.quantity,
        new Money(item.price, 'USD')
      );
    }
    
    // Save order
    await this.orderRepository.save(order);
    
    // Publish event
    await this.eventBus.publish(new OrderCreatedEvent(
      command.orderId,
      command.userId,
      order.total,
      command.timestamp
    ));
  }
}
```

## Query Implementation

### Query DTOs
```typescript
// Get User Query
class GetUserQuery implements Query {
  constructor(
    public readonly queryId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Get Users Query
class GetUsersQuery implements Query {
  constructor(
    public readonly queryId: string,
    public readonly limit: number = 10,
    public readonly offset: number = 0,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Get User Orders Query
class GetUserOrdersQuery implements Query {
  constructor(
    public readonly queryId: string,
    public readonly userId: string,
    public readonly status?: OrderStatus,
    public readonly limit: number = 10,
    public readonly offset: number = 0,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Search Users Query
class SearchUsersQuery implements Query {
  constructor(
    public readonly queryId: string,
    public readonly searchTerm: string,
    public readonly limit: number = 10,
    public readonly offset: number = 0,
    public readonly timestamp: Date = new Date()
  ) {}
}
```

### Query Handlers
```typescript
// Get User Handler
class GetUserHandler implements QueryHandler<GetUserQuery, UserDto> {
  constructor(private userReadRepository: UserReadRepository) {}
  
  async handle(query: GetUserQuery): Promise<UserDto> {
    const user = await this.userReadRepository.findById(query.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

// Get Users Handler
class GetUsersHandler implements QueryHandler<GetUsersQuery, UserDto[]> {
  constructor(private userReadRepository: UserReadRepository) {}
  
  async handle(query: GetUsersQuery): Promise<UserDto[]> {
    const users = await this.userReadRepository.findAll(
      query.limit,
      query.offset
    );
    
    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  }
}

// Get User Orders Handler
class GetUserOrdersHandler implements QueryHandler<GetUserOrdersQuery, OrderDto[]> {
  constructor(private orderReadRepository: OrderReadRepository) {}
  
  async handle(query: GetUserOrdersQuery): Promise<OrderDto[]> {
    const orders = await this.orderReadRepository.findByUserId(
      query.userId,
      query.status,
      query.limit,
      query.offset
    );
    
    return orders.map(order => ({
      id: order.id,
      userId: order.userId,
      items: order.items,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt
    }));
  }
}

// Search Users Handler
class SearchUsersHandler implements QueryHandler<SearchUsersQuery, UserDto[]> {
  constructor(private userReadRepository: UserReadRepository) {}
  
  async handle(query: SearchUsersQuery): Promise<UserDto[]> {
    const users = await this.userReadRepository.search(
      query.searchTerm,
      query.limit,
      query.offset
    );
    
    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  }
}
```

## Event Sourcing Integration

### Events
```typescript
// Domain Events
class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly timestamp: Date
  ) {}
}

class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email?: string,
    public readonly name?: string,
    public readonly timestamp: Date
  ) {}
}

class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly total: Money,
    public readonly timestamp: Date
  ) {}
}

// Event Handlers for Read Model
class UserReadModelEventHandler {
  constructor(private userReadRepository: UserReadRepository) {}
  
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    const user = {
      id: event.userId,
      email: event.email,
      name: event.name,
      createdAt: event.timestamp,
      updatedAt: event.timestamp
    };
    
    await this.userReadRepository.save(user);
  }
  
  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    const user = await this.userReadRepository.findById(event.userId);
    if (!user) return;
    
    if (event.email) user.email = event.email;
    if (event.name) user.name = event.name;
    user.updatedAt = event.timestamp;
    
    await this.userReadRepository.save(user);
  }
}
```

## Project Structure

```
src/
├── domain/                    # Domain Layer
│   ├── entities/             # Domain entities
│   │   ├── User.ts
│   │   └── Order.ts
│   ├── events/               # Domain events
│   │   ├── UserCreatedEvent.ts
│   │   └── OrderCreatedEvent.ts
│   └── repositories/         # Repository interfaces
│       ├── UserRepository.ts
│       └── OrderRepository.ts
├── application/              # Application Layer
│   ├── commands/            # Command DTOs
│   │   ├── CreateUserCommand.ts
│   │   └── CreateOrderCommand.ts
│   ├── queries/             # Query DTOs
│   │   ├── GetUserQuery.ts
│   │   └── GetUsersQuery.ts
│   ├── handlers/            # Command/Query handlers
│   │   ├── commands/
│   │   │   ├── CreateUserHandler.ts
│   │   │   └── CreateOrderHandler.ts
│   │   └── queries/
│   │       ├── GetUserHandler.ts
│   │       └── GetUsersHandler.ts
│   └── buses/               # Command/Query buses
│       ├── CommandBus.ts
│       └── QueryBus.ts
├── infrastructure/           # Infrastructure Layer
│   ├── write/               # Write model repositories
│   │   ├── PostgresUserRepository.ts
│   │   └── PostgresOrderRepository.ts
│   ├── read/                # Read model repositories
│   │   ├── PostgresUserReadRepository.ts
│   │   └── PostgresOrderReadRepository.ts
│   └── events/              # Event handlers
│       └── UserReadModelEventHandler.ts
└── presentation/            # Presentation Layer
    ├── controllers/         # REST controllers
    │   └── UserController.ts
    └── resolvers/           # GraphQL resolvers
        └── UserResolver.ts
```

## Controller Implementation

```typescript
// REST Controller
class UserController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus
  ) {}
  
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const command = new CreateUserCommand(
        generateId(),
        generateId(),
        req.body.email,
        req.body.name
      );
      
      await this.commandBus.execute(command);
      
      res.status(201).json({
        success: true,
        data: { userId: command.userId }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const query = new GetUserQuery(
        generateId(),
        req.params.userId
      );
      
      const user = await this.queryBus.execute(query);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = new GetUsersQuery(
        generateId(),
        parseInt(req.query.limit as string) || 10,
        parseInt(req.query.offset as string) || 0
      );
      
      const users = await this.queryBus.execute(query);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

// GraphQL Resolver
class UserResolver {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus
  ) {}
  
  async createUser(parent: any, args: any): Promise<any> {
    const command = new CreateUserCommand(
      generateId(),
      generateId(),
      args.email,
      args.name
    );
    
    await this.commandBus.execute(command);
    
    return { userId: command.userId };
  }
  
  async user(parent: any, args: any): Promise<any> {
    const query = new GetUserQuery(generateId(), args.id);
    return await this.queryBus.execute(query);
  }
  
  async users(parent: any, args: any): Promise<any[]> {
    const query = new GetUsersQuery(
      generateId(),
      args.limit || 10,
      args.offset || 0
    );
    
    return await this.queryBus.execute(query);
  }
}
```

## Benefits

### Scalability
- Separate read and write models can be optimized independently
- Read models can be replicated for better performance
- Write models can be optimized for consistency

### Performance
- Read models can be denormalized for faster queries
- Write models can be optimized for fast writes
- Caching strategies can be applied differently

### Maintainability
- Clear separation of concerns
- Easy to understand and modify
- Reduced coupling between read and write operations

### Flexibility
- Different data models for reads and writes
- Easy to add new query models
- Independent evolution of read and write sides

## Common Anti-Patterns

### ❌ Shared Models
```typescript
// Wrong: Using same model for commands and queries
class User {
  // Mixed responsibilities
  save(): void { /* Write logic */ }
  toDto(): UserDto { /* Read logic */ }
}
```

### ❌ Query Side Effects
```typescript
// Wrong: Queries that change state
class GetUserHandler {
  async handle(query: GetUserQuery): Promise<UserDto> {
    const user = await this.repository.findById(query.userId);
    user.lastAccessed = new Date(); // ❌ Side effect in query
    await this.repository.save(user);
    return user.toDto();
  }
}
```

### ❌ Command Returns Data
```typescript
// Wrong: Commands that return data
class CreateUserHandler {
  async handle(command: CreateUserCommand): Promise<UserDto> { // ❌ Should return void
    const user = new User(command.userId, command.email, command.name);
    await this.repository.save(user);
    return user.toDto(); // ❌ Command should not return data
  }
}
```

## Testing Strategy

### Command Handler Testing
```typescript
describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockEventBus: jest.Mocked<EventBus>;
  
  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn()
    };
    
    mockEventBus = {
      publish: jest.fn()
    };
    
    handler = new CreateUserHandler(mockUserRepository, mockEventBus);
  });
  
  it('should create user successfully', async () => {
    const command = new CreateUserCommand('cmd-1', 'user-1', 'test@example.com', 'Test User');
    
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.save.mockResolvedValue();
    mockEventBus.publish.mockResolvedValue();
    
    await handler.handle(command);
    
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        email: 'test@example.com'
      })
    );
  });
});
```

### Query Handler Testing
```typescript
describe('GetUserHandler', () => {
  let handler: GetUserHandler;
  let mockUserReadRepository: jest.Mocked<UserReadRepository>;
  
  beforeEach(() => {
    mockUserReadRepository = {
      findById: jest.fn()
    };
    
    handler = new GetUserHandler(mockUserReadRepository);
  });
  
  it('should return user data', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const query = new GetUserQuery('query-1', 'user-1');
    mockUserReadRepository.findById.mockResolvedValue(user);
    
    const result = await handler.handle(query);
    
    expect(result).toEqual(user);
    expect(mockUserReadRepository.findById).toHaveBeenCalledWith('user-1');
  });
});
```

## Migration Strategy

### Phase 1: Introduce Command/Query Buses
1. Create CommandBus and QueryBus
2. Register existing handlers
3. Update controllers to use buses

### Phase 2: Separate Read/Write Models
1. Create read model repositories
2. Implement event handlers for read models
3. Update query handlers to use read models

### Phase 3: Optimize Read Models
1. Denormalize data for better query performance
2. Add caching strategies
3. Implement read model replication

### Phase 4: Event Sourcing (Optional)
1. Implement event store
2. Add event sourcing to command handlers
3. Create event handlers for read models 