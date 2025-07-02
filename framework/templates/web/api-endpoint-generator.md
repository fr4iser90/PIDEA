# API Endpoint Generator Template

## Form Configuration

### Endpoint Overview
- **HTTP Method**: [Dropdown: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD]
- **Endpoint Path**: [Input: /api/resource or /api/resource/{id}]
- **Purpose**: [Text Area: What this endpoint does]
- **Authentication Required**: [Dropdown: None, API Key, JWT Token, OAuth, Basic Auth, Custom]
- **Authorization Level**: [Dropdown: Public, User, Admin, Super Admin, Custom Role]

### Request Parameters
- **Path Parameters**: [Text Area: Parameters in URL path]
- **Query Parameters**: [Text Area: URL query string parameters]
- **Request Body**: [Text Area: JSON structure for POST/PUT requests]
- **Content Type**: [Dropdown: application/json, application/xml, multipart/form-data, text/plain]
- **File Upload**: [Checkboxes: Single File, Multiple Files, Image Only, Document Only, Any Type]

### Response Structure
- **Success Response**: [Text Area: JSON structure for successful responses]
- **Error Responses**: [Text Area: Different error scenarios and codes]
- **Response Format**: [Dropdown: JSON, XML, CSV, Binary, Custom]
- **Pagination**: [Checkboxes: Page-based, Cursor-based, Offset-based, None]
- **Caching**: [Dropdown: No Cache, Public Cache, Private Cache, Custom Headers]

### Data Validation
- **Input Validation**: [Text Area: Required fields, data types, constraints]
- **Business Rules**: [Text Area: Custom validation logic]
- **Sanitization**: [Text Area: Data cleaning requirements]
- **Rate Limiting**: [Text Area: Request limits and throttling]

### Database Operations
- **Database Type**: [Dropdown: PostgreSQL, MySQL, MongoDB, Redis, SQLite, Other]
- **Operation Type**: [Dropdown: Create, Read, Update, Delete, Search, Aggregate]
- **Query Optimization**: [Text Area: Indexing and performance considerations]
- **Transaction Handling**: [Dropdown: None, Single Query, Multi-query Transaction, Distributed Transaction]

### Security & Privacy
- **Data Encryption**: [Checkboxes: At Rest, In Transit, End-to-End]
- **Sensitive Data**: [Text Area: PII, financial data, health data handling]
- **CORS Policy**: [Text Area: Cross-origin resource sharing settings]
- **Input Sanitization**: [Text Area: Protection against injection attacks]

### Error Handling
- **HTTP Status Codes**: [Text Area: Success and error status codes]
- **Error Messages**: [Text Area: User-friendly error descriptions]
- **Logging**: [Text Area: What to log and how]
- **Monitoring**: [Text Area: Metrics and alerts]

### Performance
- **Response Time**: [Input: Target response time in milliseconds]
- **Concurrent Requests**: [Input: Expected concurrent users]
- **Database Queries**: [Text Area: Query optimization strategies]
- **Caching Strategy**: [Text Area: What to cache and for how long]

## Generated Prompt Template

```
Create a [HTTP_METHOD] API endpoint at [ENDPOINT_PATH].

**Endpoint Overview:**
- Purpose: [PURPOSE]
- Authentication: [AUTHENTICATION_REQUIRED]
- Authorization: [AUTHORIZATION_LEVEL]

**Request Parameters:**
- Path Params: [PATH_PARAMETERS]
- Query Params: [QUERY_PARAMETERS]
- Request Body: [REQUEST_BODY]
- Content Type: [CONTENT_TYPE]
- File Upload: [FILE_UPLOAD]

**Response Structure:**
- Success: [SUCCESS_RESPONSE]
- Errors: [ERROR_RESPONSES]
- Format: [RESPONSE_FORMAT]
- Pagination: [PAGINATION]
- Caching: [CACHING]

**Data Validation:**
- Input: [INPUT_VALIDATION]
- Business Rules: [BUSINESS_RULES]
- Sanitization: [SANITIZATION]
- Rate Limiting: [RATE_LIMITING]

**Database Operations:**
- Database: [DATABASE_TYPE]
- Operation: [OPERATION_TYPE]
- Optimization: [QUERY_OPTIMIZATION]
- Transactions: [TRANSACTION_HANDLING]

**Security & Privacy:**
- Encryption: [DATA_ENCRYPTION]
- Sensitive Data: [SENSITIVE_DATA]
- CORS: [CORS_POLICY]
- Sanitization: [INPUT_SANITIZATION]

**Error Handling:**
- Status Codes: [HTTP_STATUS_CODES]
- Error Messages: [ERROR_MESSAGES]
- Logging: [LOGGING]
- Monitoring: [MONITORING]

**Performance:**
- Response Time: [RESPONSE_TIME]ms
- Concurrent: [CONCURRENT_REQUESTS] users
- Queries: [DATABASE_QUERIES]
- Caching: [CACHING_STRATEGY]

Please provide:
1. Complete endpoint implementation
2. Request/response schemas
3. Validation logic
4. Error handling
5. Security measures
6. Performance optimizations
7. Testing examples
8. Documentation and usage
```

## Usage Instructions

1. Complete all relevant form fields
2. Generate formatted API endpoint prompt
3. Submit to AI for endpoint generation
4. Review and customize the generated code
5. Implement and test thoroughly 