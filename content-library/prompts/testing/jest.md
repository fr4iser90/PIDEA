# Jest Unit Testing

## Overview
Jest is a comprehensive JavaScript testing framework that provides a complete testing solution with built-in mocking, assertion library, and test runner. This guide covers Jest best practices, advanced features, and testing patterns.

## Basic Setup
```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
```

## Basic Test Structure
```javascript
// user.test.js
import { UserService } from '../services/UserService';
import { UserRepository } from '../repositories/UserRepository';

// Mock the repository
jest.mock('../repositories/UserRepository');

describe('UserService', () => {
  let userService;
  let mockUserRepository;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh instance for each test
    userService = new UserService();
    mockUserRepository = new UserRepository();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };
      
      const expectedUser = {
        id: 1,
        ...userData,
        createdAt: new Date()
      };

      mockUserRepository.create.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid email format');
    });

    it('should validate required fields', async () => {
      // Arrange
      const userData = {
        name: '',
        email: 'john@example.com',
        password: ''
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Name and password are required');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 1;
      const expectedUser = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com'
      };

      mockUserRepository.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = 999;
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

## Advanced Testing Patterns

### Testing Async Code
```javascript
describe('Async Operations', () => {
  it('should handle async operations with done callback', (done) => {
    setTimeout(() => {
      expect(true).toBe(true);
      done();
    }, 100);
  });

  it('should handle promises', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should handle rejected promises', async () => {
    await expect(Promise.reject(new Error('fail')))
      .rejects
      .toThrow('fail');
  });

  it('should wait for multiple promises', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3)
    ];

    const results = await Promise.all(promises);
    expect(results).toEqual([1, 2, 3]);
  });
});
```

### Mocking Functions and Modules
```javascript
// Mocking individual functions
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mocking modules
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mocking with implementation
jest.mock('../services/EmailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    validateEmail: jest.fn().mockReturnValue(true)
  }))
}));

// Partial mocking
jest.mock('../utils/validator', () => ({
  ...jest.requireActual('../utils/validator'),
  validateEmail: jest.fn().mockReturnValue(true)
}));
```

### Testing Error Scenarios
```javascript
describe('Error Handling', () => {
  it('should handle specific error types', async () => {
    const error = new Error('Database connection failed');
    error.code = 'DB_CONNECTION_ERROR';

    mockUserRepository.create.mockRejectedValue(error);

    await expect(userService.createUser({}))
      .rejects
      .toMatchObject({
        message: 'Database connection failed',
        code: 'DB_CONNECTION_ERROR'
      });
  });

  it('should handle timeout errors', async () => {
    jest.useFakeTimers();
    
    const promise = userService.createUserWithTimeout({});
    
    jest.advanceTimersByTime(5000);
    
    await expect(promise).rejects.toThrow('Operation timed out');
    
    jest.useRealTimers();
  });
});
```

### Testing with Snapshots
```javascript
describe('Snapshot Testing', () => {
  it('should match user object snapshot', () => {
    const user = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date('2023-01-01')
    };

    expect(user).toMatchSnapshot();
  });

  it('should match component snapshot', () => {
    const component = render(<UserProfile user={mockUser} />);
    expect(component).toMatchSnapshot();
  });

  it('should update snapshot when structure changes', () => {
    const user = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      profile: {
        avatar: 'avatar.jpg',
        bio: 'Software Developer'
      }
    };

    expect(user).toMatchSnapshot();
  });
});
```

### Testing with Custom Matchers
```javascript
// Custom matcher
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
});

// Using custom matcher
describe('Email Validation', () => {
  it('should validate email format', () => {
    expect('john@example.com').toBeValidEmail();
    expect('invalid-email').not.toBeValidEmail();
  });
});
```

### Testing with Test Utilities
```javascript
// test-utils.js
export const createMockUser = (overrides = {}) => ({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date(),
  ...overrides
});

export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides
});

export const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Using test utilities
describe('User Controller', () => {
  it('should create user', async () => {
    const req = createMockRequest({
      body: { name: 'John', email: 'john@example.com' }
    });
    const res = createMockResponse();

    await userController.createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(Number),
        name: 'John',
        email: 'john@example.com'
      })
    );
  });
});
```

### Testing Database Operations
```javascript
describe('Database Operations', () => {
  let db;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await db.clear();
  });

  it('should create and retrieve user', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com'
    };

    const createdUser = await userRepository.create(userData);
    expect(createdUser.id).toBeDefined();

    const retrievedUser = await userRepository.findById(createdUser.id);
    expect(retrievedUser).toEqual(createdUser);
  });
});
```

### Testing API Endpoints
```javascript
describe('API Endpoints', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create user via API', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: userData.name,
      email: userData.email
    });
    expect(response.body.password).toBeUndefined();
  });

  it('should return 400 for invalid data', async () => {
    const invalidData = {
      name: '',
      email: 'invalid-email'
    };

    await request(app)
      .post('/api/users')
      .send(invalidData)
      .expect(400);
  });
});
```

## Best Practices

### Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### Mocking Strategy
- Mock external dependencies
- Use realistic mock data
- Verify mock calls when relevant
- Avoid over-mocking

### Coverage and Quality
- Aim for high coverage but focus on quality
- Test edge cases and error scenarios
- Use meaningful assertions
- Keep tests maintainable

### Performance
- Use `beforeAll` for expensive setup
- Clean up resources in `afterAll`
- Avoid unnecessary async operations
- Use appropriate timeouts 