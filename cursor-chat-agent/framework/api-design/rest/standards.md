# REST API Design Standards

## Overview
REST (Representational State Transfer) is an architectural style for designing networked applications. This guide covers REST API design principles, best practices, and implementation standards.

## Core Principles

### Resource-Oriented Design
```javascript
// Good: Resource-based URLs
GET    /api/users              // List users
GET    /api/users/123          // Get specific user
POST   /api/users              // Create user
PUT    /api/users/123          // Update user
DELETE /api/users/123          // Delete user

// Bad: Action-based URLs
GET    /api/getUsers
POST   /api/createUser
PUT    /api/updateUser
DELETE /api/deleteUser
```

### HTTP Methods Usage
```javascript
// GET - Retrieve resources
GET /api/users                 // List all users
GET /api/users?page=1&limit=10 // Paginated list
GET /api/users/123             // Get specific user
GET /api/users/123/posts       // Get user's posts

// POST - Create resources
POST /api/users                // Create new user
POST /api/users/123/posts      // Create post for user

// PUT - Update entire resource
PUT /api/users/123             // Replace entire user object

// PATCH - Partial update
PATCH /api/users/123           // Update specific fields

// DELETE - Remove resources
DELETE /api/users/123          // Delete user
DELETE /api/users/123/posts/456 // Delete specific post
```

## URL Design Standards

### Resource Naming
```javascript
// Use nouns, not verbs
/api/users                    // ✅ Good
/api/user-management          // ✅ Good
/api/getUsers                 // ❌ Bad
/api/createUser               // ❌ Bad

// Use plural nouns for collections
/api/users                    // ✅ Good
/api/posts                    // ✅ Good
/api/user                     // ❌ Bad

// Use lowercase with hyphens
/api/user-profiles            // ✅ Good
/api/userProfiles             // ❌ Bad
/api/UserProfiles             // ❌ Bad

// Hierarchical relationships
/api/users/123/posts          // User's posts
/api/users/123/posts/456/comments // Post's comments
```

### Query Parameters
```javascript
// Pagination
GET /api/users?page=1&limit=10&offset=0

// Filtering
GET /api/users?status=active&role=admin
GET /api/posts?category=tech&author=john

// Sorting
GET /api/users?sort=name&order=asc
GET /api/posts?sort=created_at&order=desc

// Searching
GET /api/users?search=john
GET /api/posts?q=javascript&type=article

// Field selection
GET /api/users?fields=id,name,email
GET /api/posts?include=author,comments
```

## Response Standards

### Status Codes
```javascript
// 2xx Success
200 OK                    // Request successful
201 Created              // Resource created
202 Accepted             // Request accepted for processing
204 No Content           // Request successful, no content

// 3xx Redirection
301 Moved Permanently    // Resource moved permanently
302 Found                // Resource found at different location
304 Not Modified         // Resource not modified

// 4xx Client Errors
400 Bad Request          // Invalid request
401 Unauthorized         // Authentication required
403 Forbidden            // Access denied
404 Not Found            // Resource not found
409 Conflict             // Resource conflict
422 Unprocessable Entity // Validation failed

// 5xx Server Errors
500 Internal Server Error // Server error
502 Bad Gateway          // Gateway error
503 Service Unavailable   // Service temporarily unavailable
```

### Response Format
```javascript
// Success Response
{
  "success": true,
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2023-01-01T00:00:00Z"
  },
  "meta": {
    "timestamp": "2023-01-01T00:00:00Z",
    "version": "1.0"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2023-01-01T00:00:00Z",
    "version": "1.0"
  }
}

// Collection Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    },
    "timestamp": "2023-01-01T00:00:00Z",
    "version": "1.0"
  }
}
```

## Authentication & Authorization

### JWT Authentication
```javascript
// Request with Authorization header
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Login endpoint
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### API Keys
```javascript
// Request with API key
GET /api/data
X-API-Key: your-api-key-here

// Or in query parameter (less secure)
GET /api/data?api_key=your-api-key-here
```

## Validation & Error Handling

### Input Validation
```javascript
// Request validation
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "age": 25
}

// Validation error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email address",
        "value": "invalid-email"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters long",
        "value": "123"
      }
    ]
  }
}
```

### Error Codes
```javascript
// Standard error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
```

## Rate Limiting

### Rate Limit Headers
```javascript
// Response headers
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200

// Rate limit exceeded response
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset": 1640995200
    }
  }
}
```

## Versioning

### URL Versioning
```javascript
// Version in URL path
GET /api/v1/users
GET /api/v2/users

// Version in header
GET /api/users
Accept: application/vnd.myapp.v1+json

// Version in query parameter
GET /api/users?version=1
```

## Documentation Standards

### OpenAPI/Swagger
```yaml
openapi: 3.0.0
info:
  title: MyApp API
  version: 1.0.0
  description: API documentation for MyApp

servers:
  - url: https://api.myapp.com/v1
    description: Production server
  - url: https://staging-api.myapp.com/v1
    description: Staging server

paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '400':
          description: Bad request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
          format: email
      required:
        - id
        - name
        - email

    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
```

## Best Practices

### Performance
- Use pagination for large collections
- Implement caching with ETags
- Use compression (gzip)
- Optimize database queries
- Use CDN for static content

### Security
- Use HTTPS in production
- Implement proper authentication
- Validate all inputs
- Sanitize outputs
- Use rate limiting
- Log security events

### Maintainability
- Use consistent naming conventions
- Document all endpoints
- Version your APIs
- Use meaningful error messages
- Implement proper logging
- Write comprehensive tests

### Monitoring
- Track API usage metrics
- Monitor response times
- Set up error alerting
- Log all requests
- Monitor rate limiting
- Track user behavior 