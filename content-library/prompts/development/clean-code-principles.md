# Clean Code Principles

## Overview
Clean Code is a software development philosophy that emphasizes writing code that is easy to read, understand, and maintain. It focuses on readability, simplicity, and expressiveness.

## Core Principles

### 1. Meaningful Names
```typescript
// ❌ Bad: Unclear names
const d = new Date();
const fn = (x: number) => x * 2;
const arr = [1, 2, 3, 4, 5];

// ✅ Good: Descriptive names
const currentDate = new Date();
const doubleValue = (value: number) => value * 2;
const userIds = [1, 2, 3, 4, 5];

// ❌ Bad: Abbreviations
const usr = getUser();
const calc = calculateTotal();
const db = getDatabase();

// ✅ Good: Full words
const user = getUser();
const total = calculateTotal();
const database = getDatabase();

// ❌ Bad: Misleading names
const userList = getUser(); // Returns single user, not list
const isUser = validateEmail(); // Returns boolean, not user

// ✅ Good: Accurate names
const user = getUser();
const isValidEmail = validateEmail();
```

### 2. Functions Should Do One Thing
```typescript
// ❌ Bad: Function does multiple things
async function processUserData(userData: any): Promise<void> {
  // Validate data
  if (!userData.email || !userData.name) {
    throw new Error('Invalid user data');
  }
  
  // Save to database
  const user = new User(userData.email, userData.name);
  await database.save(user);
  
  // Send email
  await emailService.sendWelcomeEmail(user.email);
  
  // Update cache
  await cache.set(`user:${user.id}`, user);
  
  // Log activity
  logger.info('User created', { userId: user.id });
}

// ✅ Good: Single responsibility functions
async function createUser(userData: UserData): Promise<User> {
  validateUserData(userData);
  const user = new User(userData.email, userData.name);
  await saveUser(user);
  await notifyUserCreated(user);
  return user;
}

function validateUserData(userData: UserData): void {
  if (!userData.email || !userData.name) {
    throw new Error('Email and name are required');
  }
}

async function saveUser(user: User): Promise<void> {
  await database.save(user);
  await cache.set(`user:${user.id}`, user);
}

async function notifyUserCreated(user: User): Promise<void> {
  await emailService.sendWelcomeEmail(user.email);
  logger.info('User created', { userId: user.id });
}
```

### 3. Small Functions
```typescript
// ❌ Bad: Long function with many responsibilities
function calculateOrderTotal(order: Order): number {
  let total = 0;
  
  // Calculate items total
  for (const item of order.items) {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
  }
  
  // Apply discounts
  if (order.customer.isVip) {
    total = total * 0.9; // 10% VIP discount
  }
  
  if (order.total > 100) {
    total = total * 0.95; // 5% bulk discount
  }
  
  // Apply tax
  const taxRate = 0.08; // 8% tax
  const tax = total * taxRate;
  total += tax;
  
  // Apply shipping
  if (total < 50) {
    total += 10; // $10 shipping for orders under $50
  }
  
  return total;
}

// ✅ Good: Small, focused functions
function calculateOrderTotal(order: Order): number {
  let total = calculateItemsTotal(order.items);
  total = applyDiscounts(total, order);
  total = addTax(total);
  total = addShipping(total);
  return total;
}

function calculateItemsTotal(items: OrderItem[]): number {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function applyDiscounts(total: number, order: Order): number {
  let discountedTotal = total;
  
  if (order.customer.isVip) {
    discountedTotal = applyVipDiscount(discountedTotal);
  }
  
  if (total > 100) {
    discountedTotal = applyBulkDiscount(discountedTotal);
  }
  
  return discountedTotal;
}

function applyVipDiscount(total: number): number {
  return total * 0.9; // 10% VIP discount
}

function applyBulkDiscount(total: number): number {
  return total * 0.95; // 5% bulk discount
}

function addTax(total: number): number {
  const taxRate = 0.08; // 8% tax
  return total + (total * taxRate);
}

function addShipping(total: number): number {
  if (total < 50) {
    return total + 10; // $10 shipping for orders under $50
  }
  return total;
}
```

### 4. Avoid Side Effects
```typescript
// ❌ Bad: Function with side effects
function processPayment(order: Order): boolean {
  // Side effect: modifies order state
  order.status = 'PAID';
  order.paymentDate = new Date();
  
  // Side effect: sends email
  emailService.sendPaymentConfirmation(order.customer.email);
  
  // Side effect: updates database
  database.updateOrder(order);
  
  return true;
}

// ✅ Good: Pure function with explicit side effects
function processPayment(order: Order): PaymentResult {
  const paymentResult = validatePayment(order);
  
  if (paymentResult.isValid) {
    const updatedOrder = markOrderAsPaid(order);
    const events = [
      new OrderPaidEvent(updatedOrder.id),
      new PaymentProcessedEvent(updatedOrder.paymentId)
    ];
    
    return {
      success: true,
      order: updatedOrder,
      events
    };
  }
  
  return {
    success: false,
    error: paymentResult.error
  };
}

function markOrderAsPaid(order: Order): Order {
  return {
    ...order,
    status: 'PAID',
    paymentDate: new Date()
  };
}
```

### 5. Command Query Separation
```typescript
// ❌ Bad: Function that both queries and commands
function getUserOrders(userId: string): Order[] {
  const orders = database.getOrders(userId);
  
  // Side effect: updates last accessed time
  database.updateUserLastAccessed(userId);
  
  return orders;
}

// ✅ Good: Separate query and command
function getUserOrders(userId: string): Order[] {
  return database.getOrders(userId);
}

function updateUserLastAccessed(userId: string): void {
  database.updateUserLastAccessed(userId);
}

// Usage
const orders = getUserOrders(userId);
updateUserLastAccessed(userId);
```

### 6. Error Handling
```typescript
// ❌ Bad: Ignoring errors
function saveUser(user: User): void {
  try {
    database.save(user);
  } catch (error) {
    // Silent failure
  }
}

// ❌ Bad: Generic error handling
function saveUser(user: User): void {
  try {
    database.save(user);
  } catch (error) {
    throw new Error('Something went wrong');
  }
}

// ✅ Good: Specific error handling
function saveUser(user: User): Promise<void> {
  try {
    return database.save(user);
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      throw new UserSaveError('Database connection failed', error);
    }
    
    if (error instanceof ValidationError) {
      throw new UserSaveError('Invalid user data', error);
    }
    
    throw new UserSaveError('Failed to save user', error);
  }
}

// Custom error classes
class UserSaveError extends Error {
  constructor(message: string, public readonly cause: Error) {
    super(message);
    this.name = 'UserSaveError';
  }
}
```

### 7. Don't Repeat Yourself (DRY)
```typescript
// ❌ Bad: Repeated code
function validateUser(user: User): string[] {
  const errors: string[] = [];
  
  if (!user.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(user.email)) {
    errors.push('Email is invalid');
  }
  
  if (!user.name) {
    errors.push('Name is required');
  } else if (user.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!user.password) {
    errors.push('Password is required');
  } else if (user.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  return errors;
}

function validateProduct(product: Product): string[] {
  const errors: string[] = [];
  
  if (!product.name) {
    errors.push('Name is required');
  } else if (product.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!product.price) {
    errors.push('Price is required');
  } else if (product.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  return errors;
}

// ✅ Good: Reusable validation
function validateUser(user: User): ValidationResult {
  return validateObject(user, {
    email: [required(), email()],
    name: [required(), minLength(2)],
    password: [required(), minLength(8)]
  });
}

function validateProduct(product: Product): ValidationResult {
  return validateObject(product, {
    name: [required(), minLength(2)],
    price: [required(), positiveNumber()]
  });
}

// Reusable validation functions
function required(): Validator {
  return (value: any) => value ? null : 'Field is required';
}

function minLength(min: number): Validator {
  return (value: any) => value && value.length >= min ? null : `Must be at least ${min} characters`;
}

function email(): Validator {
  return (value: any) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Invalid email format';
  };
}

function positiveNumber(): Validator {
  return (value: any) => value > 0 ? null : 'Must be greater than 0';
}

function validateObject(obj: any, rules: ValidationRules): ValidationResult {
  const errors: string[] = [];
  
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const error = validator(obj[field]);
      if (error) {
        errors.push(`${field}: ${error}`);
        break;
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}
```

### 8. Use Descriptive Variables
```typescript
// ❌ Bad: Magic numbers and unclear variables
function calculateShippingCost(weight: number, distance: number): number {
  const x = weight * 0.5;
  const y = distance * 0.1;
  const z = x + y;
  
  if (z > 100) {
    return z * 0.8;
  }
  
  return z;
}

// ✅ Good: Descriptive variables and constants
function calculateShippingCost(weight: number, distance: number): number {
  const WEIGHT_RATE = 0.5; // $0.50 per pound
  const DISTANCE_RATE = 0.1; // $0.10 per mile
  const BULK_DISCOUNT_THRESHOLD = 100; // $100
  const BULK_DISCOUNT_RATE = 0.8; // 20% discount
  
  const weightCost = weight * WEIGHT_RATE;
  const distanceCost = distance * DISTANCE_RATE;
  const baseShippingCost = weightCost + distanceCost;
  
  if (baseShippingCost > BULK_DISCOUNT_THRESHOLD) {
    return baseShippingCost * BULK_DISCOUNT_RATE;
  }
  
  return baseShippingCost;
}
```

### 9. Use Meaningful Comments
```typescript
// ❌ Bad: Obvious comments
// Loop through users
for (const user of users) {
  // Check if user is active
  if (user.isActive) {
    // Send email
    sendEmail(user.email);
  }
}

// ❌ Bad: Outdated comments
// This function calculates the total price
function calculateTotal(items: Item[]): number {
  // TODO: Add tax calculation
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good: Explain why, not what
function calculateTotal(items: Item[]): number {
  // Tax calculation removed due to international shipping requirements
  // See JIRA-1234 for details
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good: Complex business logic explanation
function applyDiscounts(total: number, customer: Customer): number {
  // VIP customers get 10% discount on orders over $100
  // This is a promotional offer that expires on 2024-12-31
  if (customer.isVip && total > 100) {
    return total * 0.9;
  }
  
  return total;
}
```

### 10. Formatting and Structure
```typescript
// ❌ Bad: Poor formatting
function processOrder(order:Order,customer:Customer):boolean{
if(order.items.length===0)return false;
let total=0;for(const item of order.items){total+=item.price*item.quantity;}
if(customer.isVip)total*=0.9;if(total>100)total*=0.95;return total>0;}

// ✅ Good: Clear formatting
function processOrder(order: Order, customer: Customer): boolean {
  if (order.items.length === 0) {
    return false;
  }
  
  const total = calculateOrderTotal(order);
  const discountedTotal = applyCustomerDiscounts(total, customer);
  
  return discountedTotal > 0;
}

function calculateOrderTotal(order: Order): number {
  return order.items.reduce(
    (total, item) => total + (item.price * item.quantity),
    0
  );
}

function applyCustomerDiscounts(total: number, customer: Customer): number {
  let discountedTotal = total;
  
  if (customer.isVip) {
    discountedTotal *= 0.9;
  }
  
  if (total > 100) {
    discountedTotal *= 0.95;
  }
  
  return discountedTotal;
}
```

## Code Review Checklist

### Function Quality
- [ ] Function has a single responsibility
- [ ] Function is small (ideally < 20 lines)
- [ ] Function name clearly describes what it does
- [ ] Function has no side effects (or they're explicit)
- [ ] Function parameters are minimal and clear

### Variable Quality
- [ ] Variable names are descriptive and meaningful
- [ ] No magic numbers (use constants)
- [ ] Variables are declared close to their use
- [ ] No unused variables

### Error Handling
- [ ] Errors are handled appropriately
- [ ] Error messages are clear and helpful
- [ ] Custom error types are used when needed
- [ ] No silent failures

### Code Structure
- [ ] Code follows consistent formatting
- [ ] No code duplication (DRY principle)
- [ ] Comments explain why, not what
- [ ] Code is self-documenting

### Testing
- [ ] Functions are testable
- [ ] Edge cases are handled
- [ ] Error conditions are tested
- [ ] Tests are readable and maintainable

## Benefits

### Maintainability
- Easy to understand and modify
- Reduced bug introduction
- Faster development cycles

### Readability
- Self-documenting code
- Clear intent and purpose
- Easy onboarding for new developers

### Testability
- Pure functions are easy to test
- Clear inputs and outputs
- Minimal dependencies

### Collaboration
- Consistent coding standards
- Easier code reviews
- Better team productivity

## Common Anti-Patterns

### ❌ Long Functions
```typescript
// Wrong: Function doing too many things
function processUserRegistration(userData: any): void {
  // 100+ lines of mixed responsibilities
}
```

### ❌ Deep Nesting
```typescript
// Wrong: Too many nested conditions
function processOrder(order: Order): void {
  if (order.isValid) {
    if (order.customer.isActive) {
      if (order.items.length > 0) {
        if (order.total > 0) {
          // Process order
        }
      }
    }
  }
}
```

### ❌ Global State
```typescript
// Wrong: Global variables
let currentUser: User | null = null;
let isAuthenticated = false;

function login(user: User): void {
  currentUser = user;
  isAuthenticated = true;
}
```

### ❌ Premature Optimization
```typescript
// Wrong: Optimizing before measuring
function findUser(users: User[], id: string): User | null {
  // Using Map for O(1) lookup when array is small
  const userMap = new Map(users.map(u => [u.id, u]));
  return userMap.get(id) || null;
}
```

## Refactoring Examples

### Extract Method
```typescript
// Before: Long function
function calculateOrderSummary(order: Order): OrderSummary {
  const itemsTotal = order.items.reduce((sum, item) => sum + item.price, 0);
  const tax = itemsTotal * 0.08;
  const shipping = itemsTotal > 50 ? 0 : 10;
  const total = itemsTotal + tax + shipping;
  
  return {
    itemsCount: order.items.length,
    itemsTotal,
    tax,
    shipping,
    total
  };
}

// After: Extracted methods
function calculateOrderSummary(order: Order): OrderSummary {
  const itemsTotal = calculateItemsTotal(order.items);
  const tax = calculateTax(itemsTotal);
  const shipping = calculateShipping(itemsTotal);
  const total = itemsTotal + tax + shipping;
  
  return {
    itemsCount: order.items.length,
    itemsTotal,
    tax,
    shipping,
    total
  };
}

function calculateItemsTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function calculateTax(subtotal: number): number {
  return subtotal * 0.08;
}

function calculateShipping(subtotal: number): number {
  return subtotal > 50 ? 0 : 10;
}
```

### Replace Conditional with Polymorphism
```typescript
// Before: Conditional logic
function calculateDiscount(customer: Customer, order: Order): number {
  if (customer.type === 'VIP') {
    return order.total * 0.1;
  } else if (customer.type === 'PREMIUM') {
    return order.total * 0.05;
  } else {
    return 0;
  }
}

// After: Polymorphic behavior
interface Customer {
  calculateDiscount(order: Order): number;
}

class VipCustomer implements Customer {
  calculateDiscount(order: Order): number {
    return order.total * 0.1;
  }
}

class PremiumCustomer implements Customer {
  calculateDiscount(order: Order): number {
    return order.total * 0.05;
  }
}

class RegularCustomer implements Customer {
  calculateDiscount(order: Order): number {
    return 0;
  }
}
```

## Tools and Practices

### Linting
```json
{
  "rules": {
    "max-lines-per-function": ["error", 20],
    "max-params": ["error", 3],
    "no-magic-numbers": "error",
    "prefer-const": "error",
    "no-unused-vars": "error"
  }
}
```

### Code Review Process
1. **Automated Checks**: Linting, formatting, tests
2. **Peer Review**: Code review by team members
3. **Documentation**: Update docs if needed
4. **Testing**: Ensure all tests pass

### Continuous Improvement
- Regular code quality audits
- Refactoring sessions
- Learning from code reviews
- Staying updated with best practices 