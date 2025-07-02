# CRUD Application Patterns

## Overview
CRUD (Create, Read, Update, Delete) applications are fundamental to web development. This guide provides patterns and best practices for building robust CRUD applications.

## Architecture Patterns

### Repository Pattern
```javascript
class UserRepository {
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }
  
  async findById(id) {
    return await User.findById(id);
  }
  
  async update(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true });
  }
  
  async delete(id) {
    return await User.findByIdAndDelete(id);
  }
  
  async findAll(filters = {}) {
    return await User.find(filters);
  }
}
```

### Service Layer Pattern
```javascript
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  
  async createUser(userData) {
    // Validation
    this.validateUserData(userData);
    
    // Business logic
    const hashedPassword = await this.hashPassword(userData.password);
    const userWithHash = { ...userData, password: hashedPassword };
    
    // Persistence
    return await this.userRepository.create(userWithHash);
  }
  
  async updateUser(id, updateData) {
    // Authorization check
    if (!this.canUpdateUser(id)) {
      throw new Error('Unauthorized');
    }
    
    // Validation
    this.validateUpdateData(updateData);
    
    return await this.userRepository.update(id, updateData);
  }
}
```

## API Design

### RESTful Endpoints
```javascript
// User routes
GET    /api/users          // List all users
GET    /api/users/:id      // Get specific user
POST   /api/users          // Create new user
PUT    /api/users/:id      // Update user
DELETE /api/users/:id      // Delete user
PATCH  /api/users/:id      // Partial update
```

### Request/Response Structure
```javascript
// Create request
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user"
}

// Success response
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "email": "Email field is required"
    }
  }
}
```

## Frontend Patterns

### State Management
```javascript
// Using React hooks
const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const createUser = async (userData) => {
    try {
      const response = await api.post('/users', userData);
      setUsers(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  return { users, loading, error, fetchUsers, createUser };
};
```

### Form Handling
```javascript
const UserForm = ({ user, onSubmit }) => {
  const [formData, setFormData] = useState(user || {});
  const [errors, setErrors] = useState({});
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      await onSubmit(formData);
    } catch (err) {
      setErrors(err.response?.data?.error?.details || {});
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name || ''}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        className={errors.name ? 'error' : ''}
      />
      {errors.name && <span className="error-message">{errors.name}</span>}
      
      <button type="submit">Save</button>
    </form>
  );
};
```

## Data Validation

### Backend Validation
```javascript
const validateUser = (userData) => {
  const errors = {};
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  
  if (!userData.email || !isValidEmail(userData.email)) {
    errors.email = 'Valid email is required';
  }
  
  if (userData.password && userData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  return errors;
};
```

### Frontend Validation
```javascript
const useFormValidation = (schema) => {
  const validate = (data) => {
    try {
      schema.parse(data);
      return { isValid: true, errors: {} };
    } catch (error) {
      const errors = {};
      error.errors.forEach(err => {
        errors[err.path[0]] = err.message;
      });
      return { isValid: false, errors };
    }
  };
  
  return { validate };
};
```

## Error Handling

### Global Error Handler
```javascript
const errorHandler = (error) => {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return { type: 'VALIDATION_ERROR', message: data.message };
      case 401:
        return { type: 'UNAUTHORIZED', message: 'Please log in' };
      case 403:
        return { type: 'FORBIDDEN', message: 'Access denied' };
      case 404:
        return { type: 'NOT_FOUND', message: 'Resource not found' };
      case 500:
        return { type: 'SERVER_ERROR', message: 'Server error occurred' };
      default:
        return { type: 'UNKNOWN', message: 'An error occurred' };
    }
  }
  
  return { type: 'NETWORK_ERROR', message: 'Network error occurred' };
};
```

## Performance Optimization

### Pagination
```javascript
// Backend
const getUsers = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const users = await User.find().skip(skip).limit(limit);
  const total = await User.countDocuments();
  
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Frontend
const usePaginatedUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  
  const fetchUsers = async (page = 1) => {
    const response = await api.get(`/users?page=${page}&limit=10`);
    setUsers(response.data.users);
    setPagination(response.data.pagination);
  };
  
  return { users, pagination, fetchUsers };
};
```

### Caching
```javascript
// React Query example
const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

## Security Considerations

### Input Sanitization
```javascript
const sanitizeInput = (input) => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};
```

### CSRF Protection
```javascript
// Include CSRF token in requests
const api = axios.create({
  headers: {
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
  }
});
```

### Rate Limiting
```javascript
// Backend rate limiting
const rateLimit = require('express-rate-limit');

const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many user creation attempts'
});

app.post('/api/users', createUserLimiter, createUser);
```

## Testing

### Unit Tests
```javascript
describe('UserService', () => {
  let userService;
  let mockRepository;
  
  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    userService = new UserService(mockRepository);
  });
  
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      const expectedUser = { id: '1', ...userData };
      
      mockRepository.create.mockResolvedValue(expectedUser);
      
      const result = await userService.createUser(userData);
      
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(expectedUser);
    });
  });
});
```

### Integration Tests
```javascript
describe('User API', () => {
  it('should create a new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com'
    };
    
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);
    
    expect(response.body.data.name).toBe(userData.name);
    expect(response.body.data.email).toBe(userData.email);
  });
});
```
