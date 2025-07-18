# Production Security Audit – Phase 4: Production Configuration & Testing

## Overview
Phase 4 focuses on finalizing production security configuration, setting up comprehensive testing, and creating documentation for production deployment. This phase ensures all security measures are properly configured and tested before production deployment.

## Objectives
- [ ] Configure nginx security headers
- [ ] Set up security monitoring
- [ ] Create security audit script
- [ ] Test all security measures
- [ ] Document security checklist

## Deliverables

### Configuration Files
- **File**: `nginx/nginx-proxy.conf` - Enhanced security headers
- **File**: `frontend/nginx.conf` - Frontend security headers
- **File**: `docs/security/production-checklist.md` - Production security checklist
- **File**: `backend/scripts/security-monitor.js` - Security monitoring script

### Security Features
- **Enhanced Nginx Security**: Production-grade security headers
- **Security Monitoring**: Real-time security event monitoring
- **Comprehensive Testing**: End-to-end security testing
- **Production Checklist**: Complete security deployment guide
- **Security Documentation**: Production security guidelines

## Implementation Details

### Enhanced Nginx Security Configuration
```nginx
# nginx/nginx-proxy.conf - Enhanced security headers
server {
    listen 443 ssl http2;
    server_name _;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Enhanced security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss: https:; object-src 'none'; frame-src 'none';" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;
    add_header X-Download-Options "noopen" always;
    add_header X-DNS-Prefetch-Control "off" always;

    # API proxy to backend with enhanced security
    location /api/ {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        
        # Security headers for API
        add_header X-API-Version "1.0" always;
        add_header X-Request-ID $request_id always;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Request-ID $request_id;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Security: Hide server information
        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
    }

    # WebSocket proxy with security
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific security
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Static files with security headers
    location /web/ {
        alias /usr/share/nginx/html/web/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff" always;
        
        # Security: Prevent access to sensitive files
        location ~* \.(htaccess|htpasswd|ini|log|sh|sql|conf)$ {
            deny all;
        }
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* \.(htaccess|htpasswd|ini|log|sh|sql|conf)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$server_name$request_uri;
}
```

### Enhanced Frontend Nginx Configuration
```nginx
# frontend/nginx.conf - Enhanced security headers
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Security: Hide nginx version
    server_tokens off;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Enhanced security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; frame-src 'none';" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

        # API proxy to backend
        location /api/ {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Authorization $http_authorization;
            proxy_cache_bypass $http_upgrade;
            
            # Security headers for API
            add_header X-API-Version "1.0" always;
        }

        # WebSocket proxy
        location /ws {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Security: Block access to sensitive files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }

        location ~* \.(htaccess|htpasswd|ini|log|sh|sql|conf)$ {
            deny all;
            access_log off;
            log_not_found off;
        }

        # Security: Prevent access to source maps in production
        location ~* \.map$ {
            deny all;
        }
    }
}
```

### Security Monitoring Script
```javascript
// backend/scripts/security-monitor.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Logger = require('@logging/Logger');
const logger = new Logger('SecurityMonitor');

class SecurityMonitor {
  constructor() {
    this.projectPath = process.cwd();
    this.monitoringInterval = 5 * 60 * 1000; // 5 minutes
    this.securityLogPath = path.join(this.projectPath, 'logs', 'security.log');
    this.alertThresholds = {
      failedLogins: 10,
      suspiciousRequests: 50,
      errorRate: 0.05 // 5%
    };
  }

  async startMonitoring() {
    logger.info('🔒 Starting security monitoring...');
    
    // Create security log directory
    const logDir = path.dirname(this.securityLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Start monitoring loop
    setInterval(() => {
      this.performSecurityCheck();
    }, this.monitoringInterval);

    // Initial check
    this.performSecurityCheck();
  }

  async performSecurityCheck() {
    try {
      const checks = await Promise.all([
        this.checkFailedLogins(),
        this.checkSuspiciousRequests(),
        this.checkErrorRate(),
        this.checkDependencyVulnerabilities(),
        this.checkSecurityHeaders(),
        this.checkRateLimiting()
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        checks: checks,
        overallStatus: checks.every(check => check.status === 'ok') ? 'ok' : 'warning'
      };

      // Log security report
      this.logSecurityEvent('security_check', report);

      // Send alerts if needed
      if (report.overallStatus !== 'ok') {
        await this.sendSecurityAlert(report);
      }

      logger.info(`Security check completed: ${report.overallStatus}`);
    } catch (error) {
      logger.error('Security check failed:', error);
      this.logSecurityEvent('security_check_error', { error: error.message });
    }
  }

  async checkFailedLogins() {
    try {
      // Check application logs for failed login attempts
      const logContent = fs.readFileSync(this.securityLogPath, 'utf8');
      const failedLogins = (logContent.match(/failed login/i) || []).length;
      
      return {
        name: 'failed_logins',
        status: failedLogins < this.alertThresholds.failedLogins ? 'ok' : 'warning',
        value: failedLogins,
        threshold: this.alertThresholds.failedLogins
      };
    } catch (error) {
      return { name: 'failed_logins', status: 'error', error: error.message };
    }
  }

  async checkSuspiciousRequests() {
    try {
      // Check for suspicious request patterns
      const logContent = fs.readFileSync(this.securityLogPath, 'utf8');
      const suspiciousPatterns = [
        /sql injection/i,
        /xss/i,
        /path traversal/i,
        /unauthorized access/i
      ];

      let suspiciousCount = 0;
      suspiciousPatterns.forEach(pattern => {
        const matches = logContent.match(pattern) || [];
        suspiciousCount += matches.length;
      });

      return {
        name: 'suspicious_requests',
        status: suspiciousCount < this.alertThresholds.suspiciousRequests ? 'ok' : 'warning',
        value: suspiciousCount,
        threshold: this.alertThresholds.suspiciousRequests
      };
    } catch (error) {
      return { name: 'suspicious_requests', status: 'error', error: error.message };
    }
  }

  async checkErrorRate() {
    try {
      // Calculate error rate from logs
      const logContent = fs.readFileSync(this.securityLogPath, 'utf8');
      const totalRequests = (logContent.match(/request/i) || []).length;
      const errorRequests = (logContent.match(/error/i) || []).length;
      
      const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;

      return {
        name: 'error_rate',
        status: errorRate < this.alertThresholds.errorRate ? 'ok' : 'warning',
        value: errorRate,
        threshold: this.alertThresholds.errorRate
      };
    } catch (error) {
      return { name: 'error_rate', status: 'error', error: error.message };
    }
  }

  async checkDependencyVulnerabilities() {
    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditResult);
      
      const criticalVulns = auditData.metadata.vulnerabilities.critical || 0;
      const highVulns = auditData.metadata.vulnerabilities.high || 0;

      return {
        name: 'dependency_vulnerabilities',
        status: (criticalVulns === 0 && highVulns === 0) ? 'ok' : 'warning',
        value: { critical: criticalVulns, high: highVulns },
        threshold: { critical: 0, high: 0 }
      };
    } catch (error) {
      return { name: 'dependency_vulnerabilities', status: 'error', error: error.message };
    }
  }

  async checkSecurityHeaders() {
    try {
      // Check if security headers are properly configured
      const response = await fetch('http://localhost:3000/api/health');
      const headers = response.headers;
      
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
      ];

      const missingHeaders = requiredHeaders.filter(header => !headers.get(header));

      return {
        name: 'security_headers',
        status: missingHeaders.length === 0 ? 'ok' : 'warning',
        value: { present: requiredHeaders.length - missingHeaders.length, missing: missingHeaders },
        threshold: { missing: 0 }
      };
    } catch (error) {
      return { name: 'security_headers', status: 'error', error: error.message };
    }
  }

  async checkRateLimiting() {
    try {
      // Test rate limiting functionality
      const requests = [];
      for (let i = 0; i < 15; i++) {
        try {
          const response = await fetch('http://localhost:3000/api/health');
          requests.push(response.status);
        } catch (error) {
          requests.push('error');
        }
      }

      const rateLimited = requests.filter(status => status === 429).length;

      return {
        name: 'rate_limiting',
        status: rateLimited > 0 ? 'ok' : 'warning',
        value: { rateLimited, total: requests.length },
        threshold: { rateLimited: 1 }
      };
    } catch (error) {
      return { name: 'rate_limiting', status: 'error', error: error.message };
    }
  }

  logSecurityEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      data
    };

    fs.appendFileSync(this.securityLogPath, JSON.stringify(logEntry) + '\n');
  }

  async sendSecurityAlert(report) {
    // Send security alert (implement based on your notification system)
    logger.warn('🚨 Security alert:', report);
    
    // Example: Send email, Slack notification, etc.
    // await this.sendEmail(report);
    // await this.sendSlackNotification(report);
  }
}

// Run monitor if called directly
if (require.main === module) {
  const monitor = new SecurityMonitor();
  monitor.startMonitoring();
}

module.exports = SecurityMonitor;
```

### Production Security Checklist
```markdown
# docs/security/production-checklist.md
# Production Security Checklist

## Pre-Deployment Security Checks

### Environment Configuration
- [ ] All environment variables are properly set
- [ ] No sensitive data in environment files
- [ ] Database credentials are secure
- [ ] JWT secrets are strong and unique
- [ ] API keys are properly configured

### Security Packages
- [ ] All security packages are up to date
- [ ] No critical vulnerabilities in dependencies
- [ ] Security audit script is functional
- [ ] Rate limiting is configured
- [ ] CORS is properly configured

### Authentication & Authorization
- [ ] JWT tokens have appropriate expiry times
- [ ] Refresh token rotation is implemented
- [ ] Brute force protection is active
- [ ] Session management is working
- [ ] User permissions are properly configured

### Network Security
- [ ] HTTPS is enabled and configured
- [ ] SSL/TLS certificates are valid
- [ ] Security headers are properly set
- [ ] Firewall rules are configured
- [ ] Rate limiting is active

### Application Security
- [ ] Input validation is working
- [ ] SQL injection protection is active
- [ ] XSS protection is configured
- [ ] CSRF protection is implemented
- [ ] File upload security is configured

## Deployment Security Checks

### Server Configuration
- [ ] Server is hardened (no unnecessary services)
- [ ] SSH access is properly configured
- [ ] Firewall rules are active
- [ ] Logging is configured
- [ ] Monitoring is active

### Database Security
- [ ] Database is not publicly accessible
- [ ] Database credentials are secure
- [ ] Database backups are configured
- [ ] Database logging is enabled
- [ ] Connection encryption is enabled

### Application Deployment
- [ ] Application starts successfully
- [ ] All health checks pass
- [ ] Security monitoring is active
- [ ] Error logging is working
- [ ] Performance monitoring is active

## Post-Deployment Security Checks

### Security Testing
- [ ] Security headers are present
- [ ] Rate limiting is working
- [ ] Authentication flows work correctly
- [ ] Authorization is properly enforced
- [ ] Input validation is working

### Monitoring & Alerting
- [ ] Security monitoring is active
- [ ] Alerts are configured
- [ ] Logs are being collected
- [ ] Performance monitoring is active
- [ ] Error tracking is configured

### Documentation
- [ ] Security documentation is complete
- [ ] Incident response plan is ready
- [ ] Contact information is documented
- [ ] Rollback procedures are documented
- [ ] Security policies are documented

## Ongoing Security Maintenance

### Regular Checks
- [ ] Weekly security audits
- [ ] Monthly dependency updates
- [ ] Quarterly security reviews
- [ ] Annual penetration testing
- [ ] Continuous monitoring

### Incident Response
- [ ] Incident response team is identified
- [ ] Communication plan is ready
- [ ] Escalation procedures are documented
- [ ] Recovery procedures are tested
- [ ] Post-incident review process is defined

## Security Metrics

### Key Performance Indicators
- [ ] Zero critical vulnerabilities
- [ ] < 1% authentication failure rate
- [ ] < 5% error rate
- [ ] < 100ms average response time
- [ ] 99.9% uptime

### Security Metrics
- [ ] Failed login attempts < 10 per hour
- [ ] Suspicious requests < 50 per day
- [ ] Security incidents = 0
- [ ] All security tests passing
- [ ] Compliance requirements met
```

## Dependencies
- Requires: Phase 3 (Authentication & Authorization Hardening)
- Blocks: None (final phase)

## Estimated Time
2 hours

## Success Criteria
- [ ] Nginx security headers properly configured
- [ ] Security monitoring script functional
- [ ] All security measures tested
- [ ] Production checklist created
- [ ] Security documentation complete
- [ ] All tests passing

## Testing
- [ ] Test nginx configuration
- [ ] Verify security headers in browser
- [ ] Test security monitoring script
- [ ] Run comprehensive security tests
- [ ] Verify production checklist items
- [ ] Test incident response procedures

## Rollback Plan
If issues occur:
1. Revert nginx configuration to previous version
2. Disable security monitoring temporarily
3. Restore original security settings
4. Test application functionality

## Notes
- Nginx configuration should be tested in staging environment first
- Security monitoring should be configured based on actual usage patterns
- Production checklist should be reviewed and updated regularly
- Security documentation should be accessible to the team 