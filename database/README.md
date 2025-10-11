# PIDEA Database

## Overview
PIDEA uses a single-user database system designed for managing local IDEs (Cursor, VSCode, etc.) and development projects.

## Database Files

### `init.sql` (Legacy - Generic)
- **Status**: Deprecated
- **Purpose**: Was a generic schema that tried to work with both PostgreSQL and SQLite
- **Issue**: UUID generation syntax conflicts between databases

### `init-postgres.sql` (PostgreSQL)
- **Status**: Active
- **Purpose**: PostgreSQL-specific schema with proper UUID generation
- **Features**:
  - Uses `uuid-ossp` extension
  - `uuid_generate_v4()::text` for ID generation
  - PostgreSQL-specific optimizations

### `init-sqlite.sql` (SQLite)
- **Status**: Active
- **Purpose**: SQLite-specific schema without UUID generation
- **Features**:
  - Simple `TEXT PRIMARY KEY` for IDs
  - SQLite-compatible syntax
  - No UUID extensions needed

## Usage

### Development (SQLite)
```bash
# The system automatically uses SQLite in development
npm run dev
```

### Production (PostgreSQL)
```bash
# Use PostgreSQL in production
docker-compose -f docker-compose.prod.yml up
```

## Schema Features

### Secure Token System
- `access_token_start`: First 20 characters for quick lookup
- `access_token_hash`: SHA-256 hash for secure validation
- **Security**: Never stores complete JWT tokens

### Single User System
- All tables use `'me'` as default user ID
- Designed for personal IDE management
- No multi-user complexity

### Project Management
- IDE configuration (Cursor, VSCode, etc.)
- Development server ports
- Framework and language metadata
- Task hierarchies and workflows
- Interface management and switching
- Project interface configurations

## Migration Strategy

### Database Schema Enhancement (2025-10-11)
1. **Migration 005**: Add interface management fields to projects table
2. **Migration 006**: Create project_interfaces table for interface management
3. **Rollback Support**: Complete rollback scripts for safe deployment
4. **Testing**: Integration tests for all migration scripts

### Clean Migration (Previous)
1. **Phase 1**: Run database migration to add `access_token_hash` column
2. **Phase 2**: Deploy new secure token system
3. **Phase 3**: Monitor and validate secure token operation
4. **Phase 4**: Clean up any old sessions without hashes

### Database Selection
The system automatically detects and uses the appropriate database:
- **Development**: SQLite (fallback)
- **Production**: PostgreSQL (primary)

## Security Features

### Token Storage
- ✅ No complete JWT tokens stored
- ✅ SHA-256 hash validation
- ✅ Constant-time comparison
- ✅ Environment-specific salt

### Database Security
- ✅ Prepared statements
- ✅ Input validation
- ✅ SQL injection protection
- ✅ Secure connection handling

## Performance

### Indexes
- Token lookup optimization
- Project and task queries
- Analysis result caching
- Chat session management
- Interface management queries
- Project interface lookups

### Optimization
- Efficient token prefix lookups
- Batch operations support
- Minimal hash computation overhead
- Ready for caching implementation

## Troubleshooting

### Common Issues

#### "column access_token_hash does not exist"
- **Cause**: Database not migrated to new schema
- **Solution**: Restart with clean database or run migration

#### UUID Generation Errors
- **Cause**: Wrong schema for database type
- **Solution**: Use correct `init-*.sql` file

#### Database Connection Issues
- **Cause**: Wrong database configuration
- **Solution**: Check environment variables and Docker setup

### Reset Database
```bash
# Development (SQLite)
docker-compose -f docker-compose.dev.yml down
docker volume rm pidea_pidea-db-dev-data
docker-compose -f docker-compose.dev.yml up

# Production (PostgreSQL)
docker-compose -f docker-compose.prod.yml down
docker volume rm pidea_pidea-db-prod-data
docker-compose -f docker-compose.prod.yml up
```

### Migration Management
```bash
# Validate migration scripts
node database/migrations/utils/migration_validator.js

# Check rollback availability
node database/migrations/utils/rollback_manager.js

# Run migration tests
npm test -- backend/tests/integration/database/migrations/
```

## Environment Variables

### Database Configuration
```bash
# Database Type
DATABASE_TYPE=sqlite|postgresql

# PostgreSQL (Production)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pidea
POSTGRES_USER=pidea
POSTGRES_PASSWORD=secure_password

# SQLite (Development)
SQLITE_PATH=./data/pidea.db
```

### Security Configuration
```bash
# Token Security
TOKEN_SALT_SECRET=your-secret-salt
TOKEN_PREFIX_LENGTH=20
```

## Best Practices

### Development
1. Use SQLite for local development
2. Test with clean database regularly
3. Use `init-sqlite.sql` for schema

### Production
1. Use PostgreSQL for production
2. Regular database backups
3. Use `init-postgres.sql` for schema
4. Monitor database performance

### Security
1. Never store complete tokens
2. Use environment-specific salts
3. Regular security audits
4. Monitor access patterns 