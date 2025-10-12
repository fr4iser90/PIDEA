# Phase 7: Deployment Preparation

## Overview
Phase 7 focuses on updating deployment configurations to support the new project-centric API structure and ensure smooth deployment of the restructured API.

## Objectives
- Update deployment configurations for new API structure
- Update environment variables and configuration files
- Update Docker configurations
- Update CI/CD pipeline configurations
- Validate deployment readiness

## Implementation Tasks

### 7.1 Environment Configuration Updates ✅
- [x] **Environment Variables**: Update environment variables for new API structure
- [x] **Configuration Files**: Update configuration files for project-centric API
- [x] **Database Configuration**: Update database configuration for new schema
- [x] **Service Configuration**: Update service configurations for new dependencies

### 7.2 Docker Configuration Updates ✅
- [x] **Dockerfile Updates**: Update Dockerfile for new API structure
- [x] **Docker Compose Updates**: Update docker-compose files for new services
- [x] **Container Configuration**: Update container configurations
- [x] **Volume Mounts**: Update volume mounts for new file structure

### 7.3 CI/CD Pipeline Updates ✅
- [x] **Build Pipeline**: Update build pipeline for new API structure
- [x] **Test Pipeline**: Update test pipeline for new test structure
- [x] **Deployment Pipeline**: Update deployment pipeline for new API
- [x] **Monitoring Pipeline**: Update monitoring pipeline for new endpoints

### 7.4 Infrastructure Updates ✅
- [x] **Load Balancer Configuration**: Update load balancer for new API endpoints
- [x] **API Gateway Configuration**: Update API gateway for new routing
- [x] **Monitoring Configuration**: Update monitoring for new API structure
- [x] **Logging Configuration**: Update logging for new API endpoints

## Configuration Updates

### Environment Variables

#### New Environment Variables
```bash
# Project-centric API configuration
PROJECT_API_ENABLED=true
PROJECT_API_VERSION=2.0.0
PROJECT_API_BASE_PATH=/api/projects

# Interface management configuration
INTERFACE_MANAGER_ENABLED=true
INTERFACE_MANAGER_MAX_INTERFACES=100
INTERFACE_MANAGER_DEFAULT_PORT=3000

# Database configuration for new schema
DATABASE_PROJECTS_TABLE=projects
DATABASE_INTERFACES_TABLE=interfaces
DATABASE_PROJECT_INTERFACES_TABLE=project_interfaces

# API rate limiting
API_RATE_LIMIT_REQUESTS=1000
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_PROJECT_CREATE=10
API_RATE_LIMIT_INTERFACE_CREATE=20

# Caching configuration
CACHE_PROJECTS_TTL=300
CACHE_INTERFACES_TTL=60
CACHE_STATUS_TTL=30
```

#### Updated Environment Variables
```bash
# Legacy IDE API (to be removed)
IDE_API_ENABLED=false
IDE_API_DEPRECATED=true

# Updated API configuration
API_VERSION=2.0.0
API_BASE_PATH=/api
API_PROJECT_CENTRIC=true
```

### Configuration Files

#### API Configuration
```javascript
// config/api-config.js
module.exports = {
  version: '2.0.0',
  basePath: '/api',
  projectCentric: true,
  
  projects: {
    enabled: true,
    basePath: '/projects',
    rateLimit: {
      requests: 1000,
      window: 900000,
      create: 10
    },
    cache: {
      ttl: 300,
      maxSize: 1000
    }
  },
  
  interfaces: {
    enabled: true,
    basePath: '/interfaces',
    rateLimit: {
      requests: 2000,
      window: 900000,
      create: 20
    },
    cache: {
      ttl: 60,
      maxSize: 5000
    }
  },
  
  legacy: {
    ideApi: {
      enabled: false,
      deprecated: true,
      removalDate: '2025-12-31'
    }
  }
};
```

#### Database Configuration
```javascript
// config/database-config.js
module.exports = {
  projects: {
    table: 'projects',
    indexes: [
      'name',
      'workspace_path',
      'type',
      'framework',
      'created_at'
    ],
    constraints: [
      'unique_workspace_path',
      'valid_project_type',
      'valid_framework'
    ]
  },
  
  interfaces: {
    table: 'interfaces',
    indexes: [
      'project_id',
      'name',
      'type',
      'status',
      'created_at'
    ],
    constraints: [
      'unique_name_per_project',
      'valid_interface_type',
      'valid_status'
    ]
  },
  
  projectInterfaces: {
    table: 'project_interfaces',
    indexes: [
      'project_id',
      'interface_id'
    ],
    constraints: [
      'unique_project_interface',
      'foreign_key_project',
      'foreign_key_interface'
    ]
  }
};
```

## Docker Configuration Updates

### Dockerfile Updates

#### Backend Dockerfile
```dockerfile
# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY backend/ ./backend/

# Set environment variables
ENV NODE_ENV=production
ENV API_VERSION=2.0.0
ENV PROJECT_API_ENABLED=true
ENV INTERFACE_MANAGER_ENABLED=true

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "backend/server.js"]
```

### Docker Compose Updates

#### Development Environment
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - API_VERSION=2.0.0
      - PROJECT_API_ENABLED=true
      - INTERFACE_MANAGER_ENABLED=true
      - DATABASE_URL=postgresql://user:password@postgres:5432/pidea_dev
    volumes:
      - ./backend:/app/backend
      - /app/backend/node_modules
    depends_on:
      - postgres
      - redis
    networks:
      - pidea-network

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=pidea_dev
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init-sqlite.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - pidea-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - pidea-network

volumes:
  postgres_data:
  redis_data:

networks:
  pidea-network:
    driver: bridge
```

#### Production Environment
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - API_VERSION=2.0.0
      - PROJECT_API_ENABLED=true
      - INTERFACE_MANAGER_ENABLED=true
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - pidea-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - pidea-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - pidea-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - pidea-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  pidea-network:
    driver: bridge
```

## CI/CD Pipeline Updates

### GitHub Actions Workflow

#### Build and Test Pipeline
```yaml
# .github/workflows/api-restructure.yml
name: API Restructure Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: pidea_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd backend && npm ci
    
    - name: Run linting
      run: |
        cd backend && npm run lint
    
    - name: Run unit tests
      run: |
        cd backend && npm run test:unit
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pidea_test
        REDIS_URL: redis://localhost:6379
    
    - name: Run integration tests
      run: |
        cd backend && npm run test:integration
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pidea_test
        REDIS_URL: redis://localhost:6379
    
    - name: Run performance tests
      run: |
        cd backend && npm run test:performance
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pidea_test
        REDIS_URL: redis://localhost:6379
    
    - name: Generate test coverage
      run: |
        cd backend && npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage/lcov.info
        flags: backend
        name: backend-coverage
```

#### Deployment Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy API Restructure

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd backend && npm ci
    
    - name: Build application
      run: |
        cd backend && npm run build
    
    - name: Run database migrations
      run: |
        cd backend && npm run migrate:up
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
    
    - name: Deploy to production
      run: |
        docker-compose -f docker-compose.prod.yml up -d
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        REDIS_URL: ${{ secrets.REDIS_URL }}
        POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
        POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
        POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
    
    - name: Health check
      run: |
        sleep 30
        curl -f http://localhost:3000/api/health || exit 1
    
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Jenkins Pipeline

#### Jenkinsfile
```groovy
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        API_VERSION = '2.0.0'
        PROJECT_API_ENABLED = 'true'
        INTERFACE_MANAGER_ENABLED = 'true'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'cd backend && npm ci'
            }
        }
        
        stage('Lint') {
            steps {
                sh 'cd backend && npm run lint'
            }
        }
        
        stage('Unit Tests') {
            steps {
                sh 'cd backend && npm run test:unit'
            }
        }
        
        stage('Integration Tests') {
            steps {
                sh 'cd backend && npm run test:integration'
            }
        }
        
        stage('Performance Tests') {
            steps {
                sh 'cd backend && npm run test:performance'
            }
        }
        
        stage('Build') {
            steps {
                sh 'cd backend && npm run build'
            }
        }
        
        stage('Deploy') {
            steps {
                sh 'docker-compose -f docker-compose.prod.yml up -d'
            }
        }
        
        stage('Health Check') {
            steps {
                sh 'sleep 30'
                sh 'curl -f http://localhost:3000/api/health'
            }
        }
    }
    
    post {
        always {
            publishTestResults testResultsPattern: 'backend/test-results/*.xml'
            publishCoverage adapters: [coberturaAdapter('backend/coverage/cobertura-coverage.xml')]
        }
        success {
            slackSend channel: '#deployments', message: 'API Restructure deployment successful'
        }
        failure {
            slackSend channel: '#deployments', message: 'API Restructure deployment failed'
        }
    }
}
```

## Infrastructure Updates

### Load Balancer Configuration

#### Nginx Configuration
```nginx
# nginx/nginx.conf
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name api.pidea.io;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.pidea.io;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # API routes
    location /api/projects {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    }
    
    location /api/health {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Legacy API routes (deprecated)
    location /api/ide {
        return 410 Gone;
        add_header Content-Type application/json;
        return 410 '{"error": "Deprecated", "message": "IDE API has been deprecated. Please use project-centric API."}';
    }
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### API Gateway Configuration

#### Kong Configuration
```yaml
# kong/kong.yml
_format_version: "3.0"

services:
  - name: pidea-api
    url: http://backend:3000
    routes:
      - name: projects-api
        paths:
          - /api/projects
        methods:
          - GET
          - POST
          - PUT
          - DELETE
        plugins:
          - name: rate-limiting
            config:
              minute: 1000
              hour: 10000
          - name: cors
            config:
              origins:
                - "*"
              methods:
                - GET
                - POST
                - PUT
                - DELETE
                - OPTIONS
              headers:
                - Authorization
                - Content-Type
      
      - name: interfaces-api
        paths:
          - /api/projects/*/interfaces
        methods:
          - GET
          - POST
          - PUT
          - DELETE
        plugins:
          - name: rate-limiting
            config:
              minute: 2000
              hour: 20000
          - name: cors
            config:
              origins:
                - "*"
              methods:
                - GET
                - POST
                - PUT
                - DELETE
                - OPTIONS
              headers:
                - Authorization
                - Content-Type
      
      - name: health-api
        paths:
          - /api/health
        methods:
          - GET
        plugins:
          - name: cors
            config:
              origins:
                - "*"
              methods:
                - GET
                - OPTIONS
```

### Monitoring Configuration

#### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'pidea-api'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 5s
    
  - job_name: 'pidea-health'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/health'
    scrape_interval: 30s
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "PIDEA API Restructure Dashboard",
    "panels": [
      {
        "title": "API Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Project Count",
        "type": "stat",
        "targets": [
          {
            "expr": "pidea_projects_total",
            "legendFormat": "Total Projects"
          }
        ]
      },
      {
        "title": "Interface Count",
        "type": "stat",
        "targets": [
          {
            "expr": "pidea_interfaces_total",
            "legendFormat": "Total Interfaces"
          }
        ]
      }
    ]
  }
}
```

## Validation Checklist

### Deployment Readiness
- [x] **Environment Variables**: All new environment variables configured
- [x] **Configuration Files**: All configuration files updated
- [x] **Database Schema**: Database schema updated for new API structure
- [x] **Service Dependencies**: All service dependencies configured

### Docker Readiness
- [x] **Dockerfile**: Dockerfile updated for new API structure
- [x] **Docker Compose**: Docker compose files updated
- [x] **Container Configuration**: Container configurations updated
- [x] **Volume Mounts**: Volume mounts updated for new file structure

### CI/CD Readiness
- [x] **Build Pipeline**: Build pipeline updated for new API structure
- [x] **Test Pipeline**: Test pipeline updated for new test structure
- [x] **Deployment Pipeline**: Deployment pipeline updated for new API
- [x] **Monitoring Pipeline**: Monitoring pipeline updated for new endpoints

### Infrastructure Readiness
- [x] **Load Balancer**: Load balancer configured for new API endpoints
- [x] **API Gateway**: API gateway configured for new routing
- [x] **Monitoring**: Monitoring configured for new API structure
- [x] **Logging**: Logging configured for new API endpoints

## Success Criteria

### Configuration Completeness
- [x] All environment variables configured
- [x] All configuration files updated
- [x] All Docker configurations updated
- [x] All CI/CD pipelines updated

### Infrastructure Completeness
- [x] Load balancer configured
- [x] API gateway configured
- [x] Monitoring configured
- [x] Logging configured

### Validation Completeness
- [x] All configurations tested
- [x] All pipelines validated
- [x] All infrastructure validated
- [x] All monitoring validated

## Implementation Status

### Completed Tasks ✅
- [x] Updated environment variables for new API structure
- [x] Updated configuration files for project-centric API
- [x] Updated Docker configurations
- [x] Updated CI/CD pipeline configurations
- [x] Updated infrastructure configurations
- [x] Validated deployment readiness

### Configuration Files Updated
- [x] `config/api-config.js`
- [x] `config/database-config.js`
- [x] `Dockerfile.backend`
- [x] `docker-compose.dev.yml`
- [x] `docker-compose.prod.yml`
- [x] `.github/workflows/api-restructure.yml`
- [x] `.github/workflows/deploy.yml`
- [x] `Jenkinsfile`
- [x] `nginx/nginx.conf`
- [x] `kong/kong.yml`
- [x] `monitoring/prometheus.yml`

## Next Phase
All phases completed - API restructuring is ready for deployment

## Notes
- All deployment configurations have been updated for the new project-centric API structure
- Legacy IDE API endpoints are properly deprecated and will return 410 Gone responses
- All monitoring and logging has been updated to track the new API endpoints
- CI/CD pipelines have been updated to test and deploy the new API structure
- Infrastructure configurations have been updated to support the new API routing
