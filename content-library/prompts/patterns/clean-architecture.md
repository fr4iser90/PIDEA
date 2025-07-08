# Clean Architecture Patterns

## Overview
Clean Architecture is a software design philosophy that emphasizes separation of concerns and dependency inversion. The architecture is organized in layers, with dependencies pointing inward toward the domain layer.

## Core Principles

### Dependency Rule
```typescript
// Dependencies point inward: Presentation → Application → Domain
// Infrastructure depends on Domain, not vice versa

// ✅ Correct: Domain has no dependencies
class User {
  constructor(private id: UserId, private name: string) {}
  
  changeName(newName: string): void {
    if (!newName.trim()) {
      throw new Error('Name cannot be empty');
    }
    this.name = newName.trim();
  }
}

// ✅ Correct: Application depends on Domain
class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}
  
  async execute(command: CreateUserCommand): Promise<User> {
    const user = new User(command.id, command.name);
    await this.userRepository.save(user);
    return user;
  }
}

// ✅ Correct: Infrastructure implements Domain interfaces
class PostgresUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    // Database implementation
  }
  
  async findById(id: UserId): Promise<User | null> {
    // Database implementation
  }
}
```

### Layer Responsibilities

#### Domain Layer (Innermost)
```typescript
// Entities - Core business objects
class Order {
  private readonly _id: OrderId;
  private _items: OrderItem[];
  private _status: OrderStatus;
  
  constructor(id: OrderId) {
    this._id = id;
    this._items = [];
    this._status = OrderStatus.DRAFT;
  }
  
  addItem(product: Product, quantity: number): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new Error('Cannot modify confirmed order');
    }
    
    const item = new OrderItem(product.id, product.name, product.price, quantity);
    this._items.push(item);
  }
  
  confirm(): void {
    if (this._items.length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    this._status = OrderStatus.CONFIRMED;
  }
}

// Value Objects - Immutable objects
class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }
  
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}

// Repository Interfaces - Data access contracts
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

// Domain Services - Business logic that doesn't belong to entities
class OrderPricingService {
  calculateTotal(order: Order): Money {
    const subtotal = order.items.reduce(
      (total, item) => total.add(item.totalPrice),
      new Money(0, 'USD')
    );
    
    const tax = this.calculateTax(subtotal);
    return subtotal.add(tax);
  }
  
  private calculateTax(subtotal: Money): Money {
    const taxRate = 0.08; // 8% tax
    return new Money(subtotal.amount * taxRate, subtotal.currency);
  }
}
```

#### Application Layer
```typescript
// Use Cases - Application business rules
class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private userRepository: UserRepository,
    private pricingService: OrderPricingService
  ) {}
  
  async execute(command: CreateOrderCommand): Promise<CreateOrderResponse> {
    // 1. Validate user exists
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // 2. Create order
    const order = new Order(command.orderId);
    
    // 3. Add items
    for (const item of command.items) {
      order.addItem(item.product, item.quantity);
    }
    
    // 4. Calculate total
    const total = this.pricingService.calculateTotal(order);
    
    // 5. Save order
    await this.orderRepository.save(order);
    
    return {
      orderId: order.id,
      total: total,
      status: order.status
    };
  }
}

// Commands - Input DTOs for write operations
class CreateOrderCommand {
  constructor(
    public readonly orderId: OrderId,
    public readonly userId: UserId,
    public readonly items: OrderItemCommand[]
  ) {}
}

// Queries - Input DTOs for read operations
class GetUserOrdersQuery {
  constructor(
    public readonly userId: UserId,
    public readonly limit: number = 10,
    public readonly offset: number = 0
  ) {}
}

// Response DTOs - Output DTOs
class CreateOrderResponse {
  constructor(
    public readonly orderId: OrderId,
    public readonly total: Money,
    public readonly status: OrderStatus
  ) {}
}
```

#### Infrastructure Layer
```typescript
// Repository Implementations
class PostgresOrderRepository implements OrderRepository {
  constructor(private db: Database) {}
  
  async save(order: Order): Promise<void> {
    const orderData = {
      id: order.id.value,
      userId: order.userId.value,
      status: order.status,
      total: order.total.amount,
      currency: order.total.currency,
      createdAt: new Date()
    };
    
    await this.db.query(
      'INSERT INTO orders (id, user_id, status, total, currency, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [orderData.id, orderData.userId, orderData.status, orderData.total, orderData.currency, orderData.createdAt]
    );
  }
  
  async findById(id: OrderId): Promise<Order | null> {
    const result = await this.db.query(
      'SELECT * FROM orders WHERE id = $1',
      [id.value]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapToOrder(result.rows[0]);
  }
  
  private mapToOrder(row: any): Order {
    const order = new Order(new OrderId(row.id));
    // Map database row to domain object
    return order;
  }
}

// External Service Implementations
class EmailService implements NotificationService {
  constructor(private emailProvider: EmailProvider) {}
  
  async sendOrderConfirmation(order: Order, user: User): Promise<void> {
    const email = {
      to: user.email,
      subject: 'Order Confirmation',
      body: `Your order ${order.id} has been confirmed. Total: ${order.total}`
    };
    
    await this.emailProvider.send(email);
  }
}

// Database Configuration
class DatabaseConfig {
  static createConnection(): Database {
    return new Database({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }
}
```

#### Presentation Layer
```typescript
// REST Controllers
class OrderController {
  constructor(
    private createOrderUseCase: CreateOrderUseCase,
    private getUserOrdersUseCase: GetUserOrdersUseCase
  ) {}
  
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const command = new CreateOrderCommand(
        new OrderId(req.body.orderId),
        new UserId(req.body.userId),
        req.body.items.map(item => new OrderItemCommand(
          new ProductId(item.productId),
          item.quantity
        ))
      );
      
      const result = await this.createOrderUseCase.execute(command);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const query = new GetUserOrdersQuery(
        new UserId(req.params.userId),
        parseInt(req.query.limit as string) || 10,
        parseInt(req.query.offset as string) || 0
      );
      
      const orders = await this.getUserOrdersUseCase.execute(query);
      
      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

// GraphQL Resolvers
class OrderResolver {
  constructor(private createOrderUseCase: CreateOrderUseCase) {}
  
  async createOrder(parent: any, args: any): Promise<any> {
    const command = new CreateOrderCommand(
      new OrderId(args.orderId),
      new UserId(args.userId),
      args.items
    );
    
    return await this.createOrderUseCase.execute(command);
  }
}
```

## Project Structure

```
src/
├── domain/                    # Domain Layer (No dependencies)
│   ├── entities/             # Business entities
│   │   ├── User.ts
│   │   ├── Order.ts
│   │   └── Product.ts
│   ├── value-objects/        # Value objects
│   │   ├── UserId.ts
│   │   ├── Money.ts
│   │   └── Email.ts
│   ├── repositories/         # Repository interfaces
│   │   ├── UserRepository.ts
│   │   └── OrderRepository.ts
│   └── services/             # Domain services
│       └── OrderPricingService.ts
├── application/              # Application Layer (Depends on Domain)
│   ├── use-cases/           # Use cases
│   │   ├── CreateOrderUseCase.ts
│   │   └── GetUserOrdersUseCase.ts
│   ├── commands/            # Command DTOs
│   │   └── CreateOrderCommand.ts
│   ├── queries/             # Query DTOs
│   │   └── GetUserOrdersQuery.ts
│   └── responses/           # Response DTOs
│       └── CreateOrderResponse.ts
├── infrastructure/           # Infrastructure Layer (Depends on Domain)
│   ├── database/            # Database implementations
│   │   ├── PostgresUserRepository.ts
│   │   └── PostgresOrderRepository.ts
│   ├── external/            # External services
│   │   ├── EmailService.ts
│   │   └── PaymentService.ts
│   └── config/              # Configuration
│       └── DatabaseConfig.ts
└── presentation/            # Presentation Layer (Depends on Application)
    ├── controllers/         # REST controllers
    │   └── OrderController.ts
    ├── resolvers/           # GraphQL resolvers
    │   └── OrderResolver.ts
    └── middlewares/         # Middleware
        └── AuthMiddleware.ts
```

## Dependency Injection

```typescript
// Container configuration
class Container {
  private services = new Map();
  
  register<T>(token: string, implementation: T): void {
    this.services.set(token, implementation);
  }
  
  resolve<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service ${token} not registered`);
    }
    return service;
  }
}

// Dependency setup
const container = new Container();

// Infrastructure
container.register('Database', DatabaseConfig.createConnection());
container.register('UserRepository', new PostgresUserRepository(container.resolve('Database')));
container.register('OrderRepository', new PostgresOrderRepository(container.resolve('Database')));

// Application
container.register('CreateOrderUseCase', new CreateOrderUseCase(
  container.resolve('OrderRepository'),
  container.resolve('UserRepository'),
  container.resolve('OrderPricingService')
));

// Presentation
container.register('OrderController', new OrderController(
  container.resolve('CreateOrderUseCase'),
  container.resolve('GetUserOrdersUseCase')
));
```

## Testing Strategy

### Domain Layer Testing
```typescript
describe('Order Entity', () => {
  it('should add item to draft order', () => {
    const order = new Order(new OrderId('order-1'));
    const product = new Product(new ProductId('prod-1'), 'Test Product', new Money(10, 'USD'));
    
    order.addItem(product, 2);
    
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
  });
  
  it('should not allow adding items to confirmed order', () => {
    const order = new Order(new OrderId('order-1'));
    order.confirm();
    const product = new Product(new ProductId('prod-1'), 'Test Product', new Money(10, 'USD'));
    
    expect(() => order.addItem(product, 1)).toThrow('Cannot modify confirmed order');
  });
});
```

### Use Case Testing
```typescript
describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockOrderRepository = {
      save: jest.fn(),
      findById: jest.fn()
    };
    
    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn()
    };
    
    useCase = new CreateOrderUseCase(
      mockOrderRepository,
      mockUserRepository,
      new OrderPricingService()
    );
  });
  
  it('should create order successfully', async () => {
    const user = new User(new UserId('user-1'), 'John Doe');
    mockUserRepository.findById.mockResolvedValue(user);
    mockOrderRepository.save.mockResolvedValue();
    
    const command = new CreateOrderCommand(
      new OrderId('order-1'),
      new UserId('user-1'),
      [new OrderItemCommand(new ProductId('prod-1'), 2)]
    );
    
    const result = await useCase.execute(command);
    
    expect(result.orderId.value).toBe('order-1');
    expect(mockOrderRepository.save).toHaveBeenCalled();
  });
});
```

## Benefits

### Maintainability
- Clear separation of concerns
- Easy to understand and modify
- Reduced coupling between layers

### Testability
- Each layer can be tested independently
- Easy to mock dependencies
- High test coverage achievable

### Flexibility
- Easy to change implementations
- Framework independence
- Technology agnostic

### Scalability
- Clear boundaries for team organization
- Easy to add new features
- Modular architecture

## Common Anti-Patterns

### ❌ Domain Layer Dependencies
```typescript
// Wrong: Domain depends on infrastructure
import { Database } from '../infrastructure/database';

class User {
  save(): void {
    const db = new Database(); // ❌ Domain shouldn't know about database
    db.save(this);
  }
}
```

### ❌ Circular Dependencies
```typescript
// Wrong: Circular dependency between layers
// Application → Domain → Infrastructure → Application
```

### ❌ Anemic Domain Model
```typescript
// Wrong: Domain objects are just data containers
class Order {
  id: string;
  items: OrderItem[];
  status: string;
  // No business logic
}
```

## Migration Strategy

### Phase 1: Identify Boundaries
1. Map current dependencies
2. Identify domain concepts
3. Define layer boundaries

### Phase 2: Extract Domain Layer
1. Create domain entities
2. Move business logic to domain
3. Define repository interfaces

### Phase 3: Create Application Layer
1. Implement use cases
2. Create command/query objects
3. Orchestrate domain operations

### Phase 4: Refactor Infrastructure
1. Implement repository interfaces
2. Move external service calls
3. Update dependency injection

### Phase 5: Update Presentation
1. Use application layer use cases
2. Remove direct infrastructure calls
3. Update controllers/resolvers 