# Test Generator

## Overview
Comprehensive guide for generating automated tests across different testing levels and frameworks. This guide provides patterns, strategies, and best practices for creating effective test suites.

## Testing Levels

### Unit Tests
Tests for individual functions, methods, or classes in isolation.

### Integration Tests
Tests for component interactions and external dependencies.

### End-to-End Tests
Tests for complete user workflows and system behavior.

### Performance Tests
Tests for system performance, load handling, and scalability.

## Test Generation Patterns

### Function Testing
```javascript
// Function to test
function calculateTotal(items, taxRate = 0.1) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  const subtotal = items.reduce((sum, item) => {
    if (!item.price || !item.quantity) {
      throw new Error('Each item must have price and quantity');
    }
    return sum + (item.price * item.quantity);
  }, 0);
  
  return subtotal * (1 + taxRate);
}

// Generated unit tests
describe('calculateTotal', () => {
  test('should calculate total with default tax rate', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 }
    ];
    
    const result = calculateTotal(items);
    expect(result).toBe(27.5); // (10*2 + 5*1) * 1.1
  });
  
  test('should calculate total with custom tax rate', () => {
    const items = [
      { price: 100, quantity: 1 }
    ];
    
    const result = calculateTotal(items, 0.2);
    expect(result).toBe(120); // 100 * 1.2
  });
  
  test('should throw error for non-array input', () => {
    expect(() => calculateTotal('invalid')).toThrow('Items must be an array');
  });
  
  test('should throw error for items without price', () => {
    const items = [{ quantity: 1 }];
    expect(() => calculateTotal(items)).toThrow('Each item must have price and quantity');
  });
  
  test('should throw error for items without quantity', () => {
    const items = [{ price: 10 }];
    expect(() => calculateTotal(items)).toThrow('Each item must have price and quantity');
  });
  
  test('should handle empty array', () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });
});
```

### Class Testing
```javascript
// Class to test
class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }
  
  async createUser(userData) {
    // Validate user data
    if (!userData.email || !userData.name) {
      throw new Error('Email and name are required');
    }
    
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Create user
    const user = await this.userRepository.create(userData);
    
    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email);
    
    return user;
  }
  
  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

// Generated unit tests
describe('UserService', () => {
  let userService;
  let mockUserRepository;
  let mockEmailService;
  
  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn()
    };
    
    mockEmailService = {
      sendWelcomeEmail: jest.fn()
    };
    
    userService = new UserService(mockUserRepository, mockEmailService);
  });
  
  describe('createUser', () => {
    test('should create user successfully', async () => {
      const userData = { name: 'John Doe', email: 'john@example.com' };
      const createdUser = { id: 1, ...userData };
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockEmailService.sendWelcomeEmail.mockResolvedValue();
      
      const result = await userService.createUser(userData);
      
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(userData.email);
      expect(result).toEqual(createdUser);
    });
    
    test('should throw error when email is missing', async () => {
      const userData = { name: 'John Doe' };
      
      await expect(userService.createUser(userData)).rejects.toThrow('Email and name are required');
    });
    
    test('should throw error when name is missing', async () => {
      const userData = { email: 'john@example.com' };
      
      await expect(userService.createUser(userData)).rejects.toThrow('Email and name are required');
    });
    
    test('should throw error when user already exists', async () => {
      const userData = { name: 'John Doe', email: 'john@example.com' };
      const existingUser = { id: 1, ...userData };
      
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      
      await expect(userService.createUser(userData)).rejects.toThrow('User with this email already exists');
    });
    
    test('should handle repository errors', async () => {
      const userData = { name: 'John Doe', email: 'john@example.com' };
      
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'));
      
      await expect(userService.createUser(userData)).rejects.toThrow('Database error');
    });
  });
  
  describe('getUserById', () => {
    test('should return user when found', async () => {
      const user = { id: 1, name: 'John Doe', email: 'john@example.com' };
      
      mockUserRepository.findById.mockResolvedValue(user);
      
      const result = await userService.getUserById(1);
      
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });
    
    test('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      
      await expect(userService.getUserById(999)).rejects.toThrow('User not found');
    });
  });
});
```

### API Testing
```javascript
// API endpoint to test
app.post('/api/users', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Generated API tests
describe('User API', () => {
  let app;
  let server;
  
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Setup routes
    app.post('/api/users', userController.createUser);
    app.get('/api/users/:id', userController.getUserById);
    
    server = app.listen(0);
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  beforeEach(async () => {
    // Clear database or reset mocks
    await clearDatabase();
  });
  
  describe('POST /api/users', () => {
    test('should create user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);
      
      expect(response.body).toMatchObject(userData);
      expect(response.body.id).toBeDefined();
    });
    
    test('should return 400 for invalid data', async () => {
      const userData = { name: 'John Doe' }; // Missing email
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);
      
      expect(response.body.error).toBe('Email and name are required');
    });
    
    test('should return 400 for duplicate email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      // Create first user
      await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);
      
      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);
      
      expect(response.body.error).toBe('User with this email already exists');
    });
  });
  
  describe('GET /api/users/:id', () => {
    test('should return user when found', async () => {
      // Create user first
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com'
        });
      
      const userId = createResponse.body.id;
      
      // Get user
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        id: userId,
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
    
    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/999')
        .expect(404);
      
      expect(response.body.error).toBe('User not found');
    });
  });
});
```

### Component Testing (React)
```javascript
// React component to test
function UserProfile({ user, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      onDelete(user.id);
    }
  };
  
  if (isEditing) {
    return (
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <button type="submit">Save</button>
        <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
      </form>
    );
  }
  
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <button onClick={() => setIsEditing(true)}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}

// Generated component tests
describe('UserProfile', () => {
  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com'
  };
  
  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should render user information', () => {
    render(
      <UserProfile
        user={mockUser}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
  
  test('should show edit form when edit button is clicked', () => {
    render(
      <UserProfile
        user={mockUser}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    
    fireEvent.click(screen.getByText('Edit'));
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
  
  test('should call onUpdate when form is submitted', () => {
    render(
      <UserProfile
        user={mockUser}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    
    fireEvent.click(screen.getByText('Edit'));
    
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    fireEvent.click(screen.getByText('Save'));
    
    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockUser,
      name: 'Jane Doe'
    });
  });
  
  test('should cancel editing when cancel button is clicked', () => {
    render(
      <UserProfile
        user={mockUser}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });
  
  test('should call onDelete when delete is confirmed', () => {
    window.confirm = jest.fn(() => true);
    
    render(
      <UserProfile
        user={mockUser}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    
    fireEvent.click(screen.getByText('Delete'));
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this user?');
    expect(mockOnDelete).toHaveBeenCalledWith(mockUser.id);
  });
  
  test('should not call onDelete when delete is cancelled', () => {
    window.confirm = jest.fn(() => false);
    
    render(
      <UserProfile
        user={mockUser}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );
    
    fireEvent.click(screen.getByText('Delete'));
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
});
```

## Test Data Generation

### Factory Pattern
```javascript
// Test data factory
class UserFactory {
  static create(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 1000),
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date(),
      ...overrides
    };
  }
  
  static createMany(count, overrides = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.create({ ...overrides, id: index + 1 })
    );
  }
  
  static createInvalid() {
    return {
      name: '',
      email: 'invalid-email'
    };
  }
}

// Usage in tests
describe('UserService', () => {
  test('should create user', async () => {
    const userData = UserFactory.create({ name: 'Jane Doe' });
    // Test implementation
  });
  
  test('should handle multiple users', async () => {
    const users = UserFactory.createMany(5);
    // Test implementation
  });
  
  test('should reject invalid user', async () => {
    const invalidUser = UserFactory.createInvalid();
    // Test implementation
  });
});
```

### Faker Integration
```javascript
import { faker } from '@faker-js/faker';

class UserFactory {
  static create(overrides = {}) {
    return {
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      createdAt: faker.date.past(),
      ...overrides
    };
  }
  
  static createWithSpecificEmail(email) {
    return this.create({ email });
  }
  
  static createAdmin() {
    return this.create({
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    });
  }
}
```

## Performance Testing

### Load Testing
```javascript
// Load test for API endpoint
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
  },
};

export default function() {
  const response = http.post('http://localhost:3000/api/users', {
    name: 'Test User',
    email: 'test@example.com'
  });
  
  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Memory Testing
```javascript
// Memory leak test
describe('Memory Leak Test', () => {
  test('should not leak memory during repeated operations', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform operation multiple times
    for (let i = 0; i < 1000; i++) {
      const user = UserFactory.create();
      processUser(user);
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## Test Automation

### CI/CD Integration
```yaml
# GitHub Actions workflow
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16, 18, 20]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    
    - run: npm run lint
    
    - run: npm run test:unit
    
    - run: npm run test:integration
    
    - run: npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### Test Coverage
```javascript
// Jest configuration for coverage
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/serviceWorker.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
```

## Best Practices

### Test Organization
- Group related tests using describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### Test Data Management
- Use factories for test data generation
- Avoid hard-coded test data
- Clean up test data after each test
- Use realistic but minimal test data

### Mocking and Stubbing
- Mock external dependencies
- Use dependency injection for testability
- Avoid mocking implementation details
- Keep mocks simple and focused

### Performance Considerations
- Run tests in parallel when possible
- Use test databases for integration tests
- Implement test timeouts
- Monitor test execution time

## Conclusion

Effective test generation requires understanding of the codebase, testing principles, and appropriate tools. By following these patterns and best practices, developers can create comprehensive test suites that ensure code quality and reliability.

Remember that tests are living documentation and should be maintained alongside the code they test. Regular test maintenance and updates are essential for keeping test suites effective and relevant.
