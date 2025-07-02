# GitHub Actions CI/CD

## Overview
GitHub Actions provides automated workflows for building, testing, and deploying applications. This guide covers modern CI/CD patterns, best practices, and common workflows.

## Basic Workflow Structure
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint
      
      - name: Build application
        run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Multi-Platform Testing
```yaml
jobs:
  test-matrix:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results-${{ matrix.os }}-${{ matrix.node-version }}
          path: coverage/
```

## Docker Build and Push
```yaml
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: myapp/myapp
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Deployment Workflows
```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add your deployment commands here
      
      - name: Run smoke tests
        run: |
          echo "Running smoke tests"
          # Add your smoke test commands here
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'Staging deployment successful!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add your production deployment commands here
      
      - name: Run health checks
        run: |
          echo "Running health checks"
          # Add your health check commands here
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'Production deployment successful!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Security Scanning
```yaml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

## Caching Strategies
```yaml
jobs:
  build-with-cache:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            node_modules
            ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      
      - name: Install dependencies
        run: npm ci
      
      - name: Cache build artifacts
        uses: actions/cache@v3
        with:
          path: |
            dist/
            build/
          key: ${{ runner.os }}-build-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-build-
      
      - name: Build application
        run: npm run build
```

## Conditional Workflows
```yaml
name: Conditional CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run analysis
        run: echo "Running analysis"
      
      - name: Conditional step
        if: github.ref == 'refs/heads/main'
        run: echo "This only runs on main branch"
      
      - name: PR specific step
        if: github.event_name == 'pull_request'
        run: echo "This only runs on PRs"

  deploy:
    runs-on: ubuntu-latest
    needs: analyze
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Deploy only on main push
        run: echo "Deploying to production"
```

## Environment Management
```yaml
jobs:
  deploy-with-environments:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy with environment secrets
        run: |
          echo "Deploying with environment variables"
          echo "API_KEY: ${{ secrets.API_KEY }}"
          echo "DATABASE_URL: ${{ secrets.DATABASE_URL }}"
      
      - name: Wait for approval
        if: environment.environment_protection_rules.approvals > 0
        run: echo "Waiting for approval"
```

## Reusable Workflows
```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '18'
      test-command:
        required: false
        type: string
        default: 'npm test'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: ${{ inputs.test-command }}

# .github/workflows/main.yml
name: Main Workflow

on:
  push:
    branches: [ main ]

jobs:
  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20'
      test-command: 'npm run test:ci'
```

## Best Practices

### Workflow Organization
- Keep workflows focused and single-purpose
- Use reusable workflows for common tasks
- Separate concerns (test, build, deploy)
- Use environment protection rules

### Security
- Use secrets for sensitive data
- Implement least privilege access
- Scan for vulnerabilities
- Audit dependencies regularly

### Performance
- Use caching for dependencies and build artifacts
- Parallelize jobs when possible
- Use matrix builds for multi-platform testing
- Optimize Docker layers

### Monitoring
- Set up notifications for failures
- Use status checks for deployments
- Monitor workflow performance
- Track deployment metrics 