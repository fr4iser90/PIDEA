# Domain-Driven Design (DDD) Patterns

## Overview
Domain-Driven Design is a software development approach that focuses on creating a shared understanding between technical and non-technical stakeholders through a common language and domain model.

## Core Concepts

### Ubiquitous Language
```typescript
// Shared language between developers and domain experts
interface Order {
  orderId: OrderId;
  customer: Customer;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: Money;
  createdAt: Date;
  
  // Domain methods using ubiquitous language
  addItem(product: Product, quantity: Quantity): void;
  removeItem(itemId: OrderItemId): void;
  confirm(): void;
  cancel(): void;
  ship(): void;
}

enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}
```

### Bounded Contexts
```typescript
// Order Management Context
namespace OrderManagement {
  interface OrderRepository {
    findById(id: OrderId): Promise<Order | null>;
    save(order: Order): Promise<void>;
    findByCustomerId(customerId: CustomerId): Promise<Order[]>;
  }
  
  class OrderService {
    constructor(
      private orderRepository: OrderRepository,
      private paymentService: PaymentService,
      private inventoryService: InventoryService
    ) {}
    
    async createOrder(command: CreateOrderCommand): Promise<Order> {
      // Domain logic within bounded context
    }
  }
}

// Customer Management Context
namespace CustomerManagement {
  interface CustomerRepository {
    findById(id: CustomerId): Promise<Customer | null>;
    save(customer: Customer): Promise<void>;
  }
  
  class CustomerService {
    constructor(private customerRepository: CustomerRepository) {}
    
    async registerCustomer(command: RegisterCustomerCommand): Promise<Customer> {
      // Domain logic within bounded context
    }
  }
}
```

## Domain Models

### Entities
```typescript
// Entity with identity
class Order {
  private readonly _id: OrderId;
  private _customer: Customer;
  private _items: OrderItem[];
  private _status: OrderStatus;
  private _totalAmount: Money;
  private _createdAt: Date;
  
  constructor(
    id: OrderId,
    customer: Customer,
    items: OrderItem[] = [],
    status: OrderStatus = OrderStatus.DRAFT
  ) {
    this._id = id;
    this._customer = customer;
    this._items = items;
    this._status = status;
    this._totalAmount = this.calculateTotal();
    this._createdAt = new Date();
  }
  
  // Identity
  get id(): OrderId {
    return this._id;
  }
  
  // Domain methods
  addItem(product: Product, quantity: Quantity): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new Error('Cannot modify confirmed order');
    }
    
    const existingItem = this._items.find(item => 
      item.productId.equals(product.id)
    );
    
    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      const newItem = new OrderItem(
        new OrderItemId(),
        product.id,
        product.name,
        product.price,
        quantity
      );
      this._items.push(newItem);
    }
    
    this._totalAmount = this.calculateTotal();
  }
  
  confirm(): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new Error('Order can only be confirmed from draft status');
    }
    
    if (this._items.length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    
    this._status = OrderStatus.CONFIRMED;
  }
  
  private calculateTotal(): Money {
    return this._items.reduce(
      (total, item) => total.add(item.totalPrice),
      Money.zero()
    );
  }
}
```

### Value Objects
```typescript
// Immutable value objects
class Money {
  private readonly _amount: number;
  private readonly _currency: string;
  
  constructor(amount: number, currency: string = 'USD') {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    this._amount = amount;
    this._currency = currency;
  }
  
  get amount(): number {
    return this._amount;
  }
  
  get currency(): string {
    return this._currency;
  }
  
  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return new Money(this._amount + other._amount, this._currency);
  }
  
  subtract(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    return new Money(this._amount - other._amount, this._currency);
  }
  
  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }
  
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }
  
  static zero(currency: string = 'USD'): Money {
    return new Money(0, currency);
  }
}

class Email {
  private readonly _value: string;
  
  constructor(value: string) {
    if (!this.isValidEmail(value)) {
      throw new Error('Invalid email format');
    }
    this._value = value.toLowerCase();
  }
  
  get value(): string {
    return this._value;
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  equals(other: Email): boolean {
    return this._value === other._value;
  }
}
```

### Aggregates
```typescript
// Aggregate Root
class Order {
  private readonly _id: OrderId;
  private _customer: Customer;
  private _items: OrderItem[];
  private _status: OrderStatus;
  private _totalAmount: Money;
  private _createdAt: Date;
  private _version: number;
  
  // Aggregate ensures consistency
  addItem(product: Product, quantity: Quantity): void {
    // Business rule: Cannot add items to shipped order
    if (this._status === OrderStatus.SHIPPED) {
      throw new Error('Cannot modify shipped order');
    }
    
    // Business rule: Check inventory availability
    if (!product.isAvailable(quantity)) {
      throw new Error('Insufficient inventory');
    }
    
    // Business rule: Maximum items per order
    if (this._items.length >= 10) {
      throw new Error('Order cannot have more than 10 items');
    }
    
    const existingItem = this._items.find(item => 
      item.productId.equals(product.id)
    );
    
    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      const newItem = new OrderItem(
        new OrderItemId(),
        product.id,
        product.name,
        product.price,
        quantity
      );
      this._items.push(newItem);
    }
    
    this._totalAmount = this.calculateTotal();
    this._version++;
  }
  
  // Aggregate ensures consistency
  confirm(): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new Error('Order can only be confirmed from draft status');
    }
    
    if (this._items.length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    
    // Business rule: Customer must have valid payment method
    if (!this._customer.hasValidPaymentMethod()) {
      throw new Error('Customer must have valid payment method');
    }
    
    this._status = OrderStatus.CONFIRMED;
    this._version++;
  }
}

// Aggregate members
class OrderItem {
  private readonly _id: OrderItemId;
  private readonly _productId: ProductId;
  private readonly _productName: string;
  private readonly _unitPrice: Money;
  private _quantity: Quantity;
  
  constructor(
    id: OrderItemId,
    productId: ProductId,
    productName: string,
    unitPrice: Money,
    quantity: Quantity
  ) {
    this._id = id;
    this._productId = productId;
    this._productName = productName;
    this._unitPrice = unitPrice;
    this._quantity = quantity;
  }
  
  increaseQuantity(additionalQuantity: Quantity): void {
    this._quantity = this._quantity.add(additionalQuantity);
  }
  
  get totalPrice(): Money {
    return this._unitPrice.multiply(this._quantity.value);
  }
}
```

## Domain Services

### Domain Services
```typescript
// Domain service for complex business logic
class OrderPricingService {
  calculateTotalPrice(
    items: OrderItem[],
    customer: Customer,
    discountCode?: DiscountCode
  ): Money {
    let subtotal = items.reduce(
      (total, item) => total.add(item.totalPrice),
      Money.zero()
    );
    
    // Apply customer tier discounts
    const tierDiscount = this.calculateTierDiscount(subtotal, customer.tier);
    subtotal = subtotal.subtract(tierDiscount);
    
    // Apply discount code if valid
    if (discountCode && discountCode.isValid()) {
      const codeDiscount = discountCode.calculateDiscount(subtotal);
      subtotal = subtotal.subtract(codeDiscount);
    }
    
    // Apply tax
    const tax = this.calculateTax(subtotal, customer.address.state);
    subtotal = subtotal.add(tax);
    
    return subtotal;
  }
  
  private calculateTierDiscount(subtotal: Money, tier: CustomerTier): Money {
    switch (tier) {
      case CustomerTier.GOLD:
        return subtotal.multiply(0.10); // 10% discount
      case CustomerTier.SILVER:
        return subtotal.multiply(0.05); // 5% discount
      default:
        return Money.zero();
    }
  }
  
  private calculateTax(subtotal: Money, state: string): Money {
    const taxRates: Record<string, number> = {
      'CA': 0.085,
      'NY': 0.08,
      'TX': 0.0625
    };
    
    const rate = taxRates[state] || 0.06;
    return subtotal.multiply(rate);
  }
}
```

### Application Services
```typescript
// Application service orchestrating domain objects
class OrderApplicationService {
  constructor(
    private orderRepository: OrderRepository,
    private customerRepository: CustomerRepository,
    private productRepository: ProductRepository,
    private orderPricingService: OrderPricingService,
    private eventBus: EventBus
  ) {}
  
  async createOrder(command: CreateOrderCommand): Promise<OrderId> {
    // Load aggregates
    const customer = await this.customerRepository.findById(command.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    const products = await this.productRepository.findByIds(command.items.map(i => i.productId));
    if (products.length !== command.items.length) {
      throw new Error('Some products not found');
    }
    
    // Create order aggregate
    const orderId = new OrderId();
    const order = new Order(orderId, customer);
    
    // Add items to order
    for (const item of command.items) {
      const product = products.find(p => p.id.equals(item.productId));
      if (!product) continue;
      
      order.addItem(product, new Quantity(item.quantity));
    }
    
    // Calculate pricing
    const totalPrice = this.orderPricingService.calculateTotalPrice(
      order.items,
      customer,
      command.discountCode
    );
    
    // Save order
    await this.orderRepository.save(order);
    
    // Publish domain events
    await this.eventBus.publish(new OrderCreatedEvent(orderId, customer.id, totalPrice));
    
    return orderId;
  }
  
  async confirmOrder(orderId: OrderId): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    order.confirm();
    await this.orderRepository.save(order);
    
    await this.eventBus.publish(new OrderConfirmedEvent(orderId));
  }
}
```

## Repositories

### Repository Pattern
```typescript
// Repository interface
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  delete(id: OrderId): Promise<void>;
}

// Repository implementation
class OrderRepositoryImpl implements OrderRepository {
  constructor(private db: Database) {}
  
  async findById(id: OrderId): Promise<Order | null> {
    const orderData = await this.db.query(
      'SELECT * FROM orders WHERE id = ?',
      [id.value]
    );
    
    if (!orderData) {
      return null;
    }
    
    const itemsData = await this.db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id.value]
    );
    
    return this.mapToOrder(orderData, itemsData);
  }
  
  async save(order: Order): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Save order
      await tx.query(
        `INSERT INTO orders (id, customer_id, status, total_amount, version) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         status = VALUES(status), 
         total_amount = VALUES(total_amount), 
         version = VALUES(version)`,
        [
          order.id.value,
          order.customer.id.value,
          order.status,
          order.totalAmount.amount,
          order.version
        ]
      );
      
      // Save order items
      for (const item of order.items) {
        await tx.query(
          `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) 
           VALUES (?, ?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE 
           quantity = VALUES(quantity)`,
          [
            item.id.value,
            order.id.value,
            item.productId.value,
            item.quantity.value,
            item.unitPrice.amount
          ]
        );
      }
    });
  }
  
  private mapToOrder(orderData: any, itemsData: any[]): Order {
    // Map database data to domain object
    const customer = new Customer(
      new CustomerId(orderData.customer_id),
      orderData.customer_name,
      new Email(orderData.customer_email)
    );
    
    const items = itemsData.map(itemData => 
      new OrderItem(
        new OrderItemId(itemData.id),
        new ProductId(itemData.product_id),
        itemData.product_name,
        new Money(itemData.unit_price),
        new Quantity(itemData.quantity)
      )
    );
    
    return new Order(
      new OrderId(orderData.id),
      customer,
      items,
      orderData.status as OrderStatus
    );
  }
}
```

## Domain Events

### Event Sourcing
```typescript
// Domain events
abstract class DomainEvent {
  readonly occurredOn: Date;
  
  constructor() {
    this.occurredOn = new Date();
  }
}

class OrderCreatedEvent extends DomainEvent {
  constructor(
    readonly orderId: OrderId,
    readonly customerId: CustomerId,
    readonly totalAmount: Money
  ) {
    super();
  }
}

class OrderConfirmedEvent extends DomainEvent {
  constructor(readonly orderId: OrderId) {
    super();
  }
}

class OrderItemAddedEvent extends DomainEvent {
  constructor(
    readonly orderId: OrderId,
    readonly productId: ProductId,
    readonly quantity: Quantity
  ) {
    super();
  }
}

// Event store
interface EventStore {
  append(aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void>;
  getEvents(aggregateId: string): Promise<DomainEvent[]>;
}

// Event handler
class OrderEventHandler {
  constructor(
    private inventoryService: InventoryService,
    private notificationService: NotificationService
  ) {}
  
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Update inventory
    await this.inventoryService.reserveItems(event.orderId, event.items);
    
    // Send confirmation email
    await this.notificationService.sendOrderConfirmation(event.customerId, event.orderId);
  }
  
  async handleOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    // Process payment
    await this.paymentService.processPayment(event.orderId);
    
    // Update inventory
    await this.inventoryService.deductItems(event.orderId);
  }
}
```

## Specifications

### Specification Pattern
```typescript
// Specification interface
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

// Concrete specifications
class OrderStatusSpecification implements Specification<Order> {
  constructor(private status: OrderStatus) {}
  
  isSatisfiedBy(order: Order): boolean {
    return order.status === this.status;
  }
  
  and(other: Specification<Order>): Specification<Order> {
    return new AndSpecification(this, other);
  }
  
  or(other: Specification<Order>): Specification<Order> {
    return new OrSpecification(this, other);
  }
  
  not(): Specification<Order> {
    return new NotSpecification(this);
  }
}

class OrderAmountSpecification implements Specification<Order> {
  constructor(private minAmount: Money) {}
  
  isSatisfiedBy(order: Order): boolean {
    return order.totalAmount.amount >= this.minAmount.amount;
  }
  
  and(other: Specification<Order>): Specification<Order> {
    return new AndSpecification(this, other);
  }
  
  or(other: Specification<Order>): Specification<Order> {
    return new OrSpecification(this, other);
  }
  
  not(): Specification<Order> {
    return new NotSpecification(this);
  }
}

// Composite specifications
class AndSpecification<T> implements Specification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {}
  
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
  
  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }
  
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }
  
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

// Using specifications in repository
class OrderRepositoryImpl implements OrderRepository {
  async findBySpecification(spec: Specification<Order>): Promise<Order[]> {
    const orders = await this.findAll();
    return orders.filter(order => spec.isSatisfiedBy(order));
  }
  
  async findHighValueConfirmedOrders(): Promise<Order[]> {
    const confirmedSpec = new OrderStatusSpecification(OrderStatus.CONFIRMED);
    const highValueSpec = new OrderAmountSpecification(new Money(1000));
    const combinedSpec = confirmedSpec.and(highValueSpec);
    
    return this.findBySpecification(combinedSpec);
  }
}
```

## Anti-Corruption Layer

### Anti-Corruption Layer
```typescript
// External system interface
interface LegacyOrderSystem {
  getOrder(orderNumber: string): Promise<LegacyOrderData>;
  createOrder(orderData: LegacyOrderData): Promise<string>;
}

// Anti-corruption layer
class OrderSystemAdapter {
  constructor(private legacySystem: LegacyOrderSystem) {}
  
  async getOrder(orderId: OrderId): Promise<Order | null> {
    try {
      const legacyData = await this.legacySystem.getOrder(orderId.value);
      return this.mapFromLegacy(legacyData);
    } catch (error) {
      // Handle legacy system errors
      console.error('Legacy system error:', error);
      return null;
    }
  }
  
  async createOrder(order: Order): Promise<void> {
    const legacyData = this.mapToLegacy(order);
    await this.legacySystem.createOrder(legacyData);
  }
  
  private mapFromLegacy(legacyData: LegacyOrderData): Order {
    // Transform legacy data to domain model
    const customer = new Customer(
      new CustomerId(legacyData.customerId),
      legacyData.customerName,
      new Email(legacyData.customerEmail)
    );
    
    const items = legacyData.items.map(item => 
      new OrderItem(
        new OrderItemId(item.id),
        new ProductId(item.productId),
        item.productName,
        new Money(item.unitPrice),
        new Quantity(item.quantity)
      )
    );
    
    return new Order(
      new OrderId(legacyData.orderNumber),
      customer,
      items,
      this.mapLegacyStatus(legacyData.status)
    );
  }
  
  private mapToLegacy(order: Order): LegacyOrderData {
    // Transform domain model to legacy format
    return {
      orderNumber: order.id.value,
      customerId: order.customer.id.value,
      customerName: order.customer.name,
      customerEmail: order.customer.email.value,
      status: this.mapToLegacyStatus(order.status),
      items: order.items.map(item => ({
        id: item.id.value,
        productId: item.productId.value,
        productName: item.productName,
        unitPrice: item.unitPrice.amount,
        quantity: item.quantity.value
      }))
    };
  }
  
  private mapLegacyStatus(legacyStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'PENDING': OrderStatus.DRAFT,
      'APPROVED': OrderStatus.CONFIRMED,
      'SHIPPED': OrderStatus.SHIPPED,
      'DELIVERED': OrderStatus.DELIVERED,
      'CANCELLED': OrderStatus.CANCELLED
    };
    
    return statusMap[legacyStatus] || OrderStatus.DRAFT;
  }
  
  private mapToLegacyStatus(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.DRAFT]: 'PENDING',
      [OrderStatus.CONFIRMED]: 'APPROVED',
      [OrderStatus.SHIPPED]: 'SHIPPED',
      [OrderStatus.DELIVERED]: 'DELIVERED',
      [OrderStatus.CANCELLED]: 'CANCELLED'
    };
    
    return statusMap[status];
  }
}
```
