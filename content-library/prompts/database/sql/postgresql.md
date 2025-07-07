# PostgreSQL Database

## Overview
PostgreSQL is a powerful, open-source object-relational database system. This guide covers PostgreSQL best practices, advanced features, performance optimization, and common patterns.

## Basic Setup
```sql
-- Create database
CREATE DATABASE myapp;

-- Create user with permissions
CREATE USER myapp_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE myapp TO myapp_user;

-- Connect to database
\c myapp;

-- Create schema
CREATE SCHEMA IF NOT EXISTS app_schema;
SET search_path TO app_schema;
```

## Table Design
```sql
-- Users table with proper constraints
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,50}$')
);

-- Posts table with foreign key
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0
);

-- Comments table with self-referencing foreign key
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- Tags table
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship table
CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, tag_id)
);
```

## Indexes and Performance
```sql
-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at) WHERE status = 'published';
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_created_at ON posts(created_at);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Partial indexes for active content
CREATE INDEX idx_posts_active ON posts(id, title, slug, published_at) 
WHERE status = 'published';

-- Composite indexes for common queries
CREATE INDEX idx_posts_user_status ON posts(user_id, status, created_at);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at);

-- Full-text search indexes
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_posts_title_search ON posts USING gin(to_tsvector('english', title));
```

## Triggers and Functions
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slug
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET post_count = post_count - 1 WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_post_count
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_post_counts();
```

## Advanced Queries
```sql
-- Complex query with joins and aggregations
SELECT 
    u.username,
    u.email,
    COUNT(p.id) as post_count,
    COUNT(c.id) as comment_count,
    MAX(p.created_at) as last_post_date,
    AVG(p.view_count) as avg_views
FROM users u
LEFT JOIN posts p ON u.id = p.user_id AND p.status = 'published'
LEFT JOIN comments c ON u.id = c.user_id AND c.is_deleted = false
WHERE u.is_active = true
GROUP BY u.id, u.username, u.email
HAVING COUNT(p.id) > 0
ORDER BY post_count DESC, avg_views DESC;

-- Recursive query for comment threads
WITH RECURSIVE comment_tree AS (
    -- Base case: top-level comments
    SELECT 
        id, 
        content, 
        user_id, 
        parent_id, 
        created_at,
        1 as level,
        ARRAY[id] as path
    FROM comments 
    WHERE post_id = 1 AND parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child comments
    SELECT 
        c.id, 
        c.content, 
        c.user_id, 
        c.parent_id, 
        c.created_at,
        ct.level + 1,
        ct.path || c.id
    FROM comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE c.is_deleted = false
)
SELECT 
    ct.*,
    u.username,
    u.email
FROM comment_tree ct
JOIN users u ON ct.user_id = u.id
ORDER BY ct.path;

-- Full-text search query
SELECT 
    p.id,
    p.title,
    p.slug,
    p.content,
    ts_rank(to_tsvector('english', p.title || ' ' || p.content), query) as rank,
    u.username as author
FROM posts p
JOIN users u ON p.user_id = u.id,
to_tsquery('english', 'postgresql & database') query
WHERE p.status = 'published'
    AND to_tsvector('english', p.title || ' ' || p.content) @@ query
ORDER BY rank DESC;

-- Window functions for analytics
SELECT 
    user_id,
    title,
    view_count,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY view_count DESC) as user_rank,
    ROW_NUMBER() OVER (ORDER BY view_count DESC) as global_rank,
    LAG(view_count) OVER (PARTITION BY user_id ORDER BY created_at) as prev_views,
    LEAD(view_count) OVER (PARTITION BY user_id ORDER BY created_at) as next_views
FROM posts
WHERE status = 'published'
ORDER BY user_id, view_count DESC;
```

## Data Types and Constraints
```sql
-- Custom data types
CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

-- JSON data type for flexible schema
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    profile_data JSONB NOT NULL DEFAULT '{}',
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Array data type
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tags TEXT[],
    categories TEXT[],
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Check constraints
ALTER TABLE posts ADD CONSTRAINT positive_view_count CHECK (view_count >= 0);
ALTER TABLE posts ADD CONSTRAINT positive_like_count CHECK (like_count >= 0);
ALTER TABLE users ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

## Partitioning
```sql
-- Partition posts table by date
CREATE TABLE posts (
    id BIGSERIAL,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create partitions for different time periods
CREATE TABLE posts_2023 PARTITION OF posts
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE posts_2024 PARTITION OF posts
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE posts_future PARTITION OF posts
    FOR VALUES FROM ('2025-01-01') TO (MAXVALUE);

-- Create indexes on partitions
CREATE INDEX idx_posts_2023_user_id ON posts_2023(user_id);
CREATE INDEX idx_posts_2024_user_id ON posts_2024(user_id);
```

## Backup and Recovery
```sql
-- Create backup
pg_dump -h localhost -U myapp_user -d myapp -f backup.sql

-- Create compressed backup
pg_dump -h localhost -U myapp_user -d myapp | gzip > backup.sql.gz

-- Restore from backup
psql -h localhost -U myapp_user -d myapp -f backup.sql

-- Restore compressed backup
gunzip -c backup.sql.gz | psql -h localhost -U myapp_user -d myapp

-- Continuous archiving setup
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'

-- Create base backup
pg_basebackup -h localhost -U myapp_user -D /var/lib/postgresql/backup -Ft -z -P
```

## Performance Tuning
```sql
-- Analyze table statistics
ANALYZE users;
ANALYZE posts;
ANALYZE comments;

-- Vacuum tables
VACUUM ANALYZE users;
VACUUM ANALYZE posts;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'posts';

-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Security
```sql
-- Create read-only user
CREATE USER readonly_user WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE myapp TO readonly_user;
GRANT USAGE ON SCHEMA app_schema TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA app_schema TO readonly_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA app_schema TO readonly_user;

-- Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_select_policy ON posts
    FOR SELECT USING (
        status = 'published' OR 
        auth.uid() = user_id
    );

CREATE POLICY posts_insert_policy ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY posts_update_policy ON posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Encrypt sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash passwords
UPDATE users SET password_hash = crypt(password, gen_salt('bf'));

-- Encrypt sensitive fields
ALTER TABLE users ADD COLUMN ssn_encrypted BYTEA;
UPDATE users SET ssn_encrypted = pgp_sym_encrypt(ssn, 'encryption_key');
```

## Best Practices

### Design
- Use appropriate data types
- Implement proper constraints
- Create meaningful indexes
- Use transactions for data integrity
- Plan for scalability

### Performance
- Monitor query performance
- Use EXPLAIN ANALYZE
- Optimize slow queries
- Regular maintenance (VACUUM, ANALYZE)
- Use connection pooling

### Security
- Implement least privilege access
- Use prepared statements
- Encrypt sensitive data
- Regular security updates
- Monitor access logs 