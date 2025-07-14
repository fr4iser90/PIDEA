const LogStandardizer = require('@logging/LogStandardizer');

describe('LogStandardizer', () => {
  let standardizer;

  beforeEach(() => {
    standardizer = new LogStandardizer();
  });

  describe('sanitize', () => {
    it('should mask secrets in messages', () => {
      const message = 'User password: secret123 and token: abc123';
      const result = standardizer.sanitize(message);
      
      expect(result.message).toContain('password: [MASKED]');
      expect(result.message).toContain('token: [MASKED]');
      expect(result.message).not.toContain('secret123');
      expect(result.message).not.toContain('abc123');
    });

    it('should mask file paths', () => {
      const message = 'File located at /home/user/documents/file.txt';
      const result = standardizer.sanitize(message);
      
      expect(result.message).toContain('[PATH]');
      expect(result.message).not.toContain('/home/user/documents/file.txt');
    });

    it('should sanitize metadata objects', () => {
      const message = 'User login';
      const meta = {
        password: 'secret123',
        token: 'abc123',
        path: '/home/user/file.txt',
        safe: 'data'
      };
      
      const result = standardizer.sanitize(message, meta);
      
      expect(result.meta.password).toBe('[MASKED]');
      expect(result.meta.token).toBe('[MASKED]');
      expect(result.meta.path).toBe('[PATH]');
      expect(result.meta.safe).toBe('data');
    });

    it('should handle circular references', () => {
      const obj = { name: 'test' };
      obj.self = obj;
      
      const result = standardizer.sanitizeObject(obj);
      expect(result.name).toBe('test');
      expect(result.self).toBe('[CIRCULAR]');
    });
  });

  describe('maskSecrets', () => {
    it('should mask various secret patterns', () => {
      const patterns = [
        'password: secret123',
        'token=abc123',
        'api_key: xyz789',
        'auth_token: def456'
      ];
      
      patterns.forEach(pattern => {
        const result = standardizer.maskSecrets(pattern);
        expect(result).toContain('[MASKED]');
        expect(result).not.toMatch(/secret123|abc123|xyz789|def456/);
      });
    });

    it('should handle quoted values', () => {
      const patterns = [
        'password: "secret123"',
        'token=\'abc123\'',
        'api_key: "xyz789"'
      ];
      
      patterns.forEach(pattern => {
        const result = standardizer.maskSecrets(pattern);
        expect(result).toContain('[MASKED]');
        expect(result).not.toMatch(/secret123|abc123|xyz789/);
      });
    });

    it('should handle unquoted values', () => {
      const patterns = [
        'password: secret123',
        'token=abc123',
        'api_key: xyz789'
      ];
      
      patterns.forEach(pattern => {
        const result = standardizer.maskSecrets(pattern);
        expect(result).toContain('[MASKED]');
        expect(result).not.toMatch(/secret123|abc123|xyz789/);
      });
    });

    it('should not mask non-sensitive data', () => {
      const safeData = [
        'username: john',
        'email: test@example.com',
        'age: 25',
        'status: active'
      ];
      
      safeData.forEach(data => {
        const result = standardizer.maskSecrets(data);
        expect(result).toBe(data);
      });
    });
  });

  describe('maskPaths', () => {
    it('should mask various path patterns', () => {
      const paths = [
        '/home/user/file.txt',
        '/Users/username/documents',
        '/tmp/tempfile',
        '/var/log/app.log'
      ];
      
      paths.forEach(path => {
        const result = standardizer.maskPaths(path);
        expect(result).toBe('[PATH]');
      });
    });

    it('should mask nested paths', () => {
      const paths = [
        '/home/user/documents/project/src/file.js',
        '/Users/username/Library/Application Support/app/config.json',
        '/var/www/html/public/assets/css/style.css'
      ];
      
      paths.forEach(path => {
        const result = standardizer.maskPaths(path);
        expect(result).toBe('[PATH]');
      });
    });

    it('should not mask relative paths', () => {
      const relativePaths = [
        './file.txt',
        '../config.json',
        'src/components/Button.jsx',
        'assets/images/logo.png'
      ];
      
      relativePaths.forEach(path => {
        const result = standardizer.maskPaths(path);
        expect(result).toBe(path);
      });
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          password: 'secret123',
          settings: {
            theme: 'dark',
            token: 'abc123'
          }
        },
        config: {
          api_key: 'xyz789',
          safe: 'data'
        }
      };
      
      const result = standardizer.sanitizeObject(obj);
      
      expect(result.user.name).toBe('John');
      expect(result.user.password).toBe('[MASKED]');
      expect(result.user.settings.theme).toBe('dark');
      expect(result.user.settings.token).toBe('[MASKED]');
      expect(result.config.api_key).toBe('[MASKED]');
      expect(result.config.safe).toBe('data');
    });

    it('should sanitize arrays', () => {
      const arr = [
        { name: 'user1', password: 'pass1' },
        { name: 'user2', token: 'token2' },
        { name: 'user3', safe: 'data' }
      ];
      
      const result = standardizer.sanitizeObject(arr);
      
      expect(result[0].name).toBe('user1');
      expect(result[0].password).toBe('[MASKED]');
      expect(result[1].name).toBe('user2');
      expect(result[1].token).toBe('[MASKED]');
      expect(result[2].name).toBe('user3');
      expect(result[2].safe).toBe('data');
    });

    it('should handle null and undefined', () => {
      const obj = {
        name: 'test',
        password: null,
        token: undefined,
        safe: 'data'
      };
      
      const result = standardizer.sanitizeObject(obj);
      
      expect(result.name).toBe('test');
      expect(result.password).toBe(null);
      expect(result.token).toBe(undefined);
      expect(result.safe).toBe('data');
    });

    it('should handle sensitive keys case-insensitively', () => {
      const obj = {
        PASSWORD: 'secret123',
        Token: 'abc123',
        API_KEY: 'xyz789',
        Auth_Token: 'def456'
      };
      
      const result = standardizer.sanitizeObject(obj);
      
      expect(result.PASSWORD).toBe('[MASKED]');
      expect(result.Token).toBe('[MASKED]');
      expect(result.API_KEY).toBe('[MASKED]');
      expect(result.Auth_Token).toBe('[MASKED]');
    });
  });

  describe('containsSensitiveData', () => {
    it('should detect sensitive data in strings', () => {
      const sensitiveStrings = [
        'password: secret123',
        'token=abc123',
        'File at /home/user/file.txt',
        'api_key: xyz789'
      ];
      
      sensitiveStrings.forEach(str => {
        expect(standardizer.containsSensitiveData(str)).toBe(true);
      });
    });

    it('should not detect sensitive data in safe strings', () => {
      const safeStrings = [
        'username: john',
        'email: test@example.com',
        'File at ./relative/path',
        'status: active'
      ];
      
      safeStrings.forEach(str => {
        expect(standardizer.containsSensitiveData(str)).toBe(false);
      });
    });

    it('should handle non-string inputs', () => {
      expect(standardizer.containsSensitiveData(null)).toBe(false);
      expect(standardizer.containsSensitiveData(undefined)).toBe(false);
      expect(standardizer.containsSensitiveData(123)).toBe(false);
      expect(standardizer.containsSensitiveData({})).toBe(false);
    });
  });

  describe('getSensitivePatterns', () => {
    it('should return patterns found in text', () => {
      const text = 'password: secret123 and token: abc123';
      const patterns = standardizer.getSensitivePatterns(text);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('secret_pattern_0');
      expect(patterns).toContain('secret_pattern_1');
    });

    it('should return empty array for safe text', () => {
      const text = 'username: john and email: test@example.com';
      const patterns = standardizer.getSensitivePatterns(text);
      
      expect(patterns).toEqual([]);
    });
  });

  describe('custom patterns', () => {
    it('should allow adding custom secret patterns', () => {
      standardizer.addSecretPattern('custom_secret: [^\\s]+');
      
      const text = 'custom_secret: mysecret123';
      const result = standardizer.maskSecrets(text);
      
      expect(result).toContain('[MASKED]');
      expect(result).not.toContain('mysecret123');
    });

    it('should allow adding custom path patterns', () => {
      standardizer.addPathPattern('/custom/[^\\s]+');
      
      const text = '/custom/myfile.txt';
      const result = standardizer.maskPaths(text);
      
      expect(result).toBe('[PATH]');
    });

    it('should allow adding custom sensitive keys', () => {
      standardizer.addSensitiveKey('custom_key');
      
      const obj = { custom_key: 'secret123' };
      const result = standardizer.sanitizeObject(obj);
      
      expect(result.custom_key).toBe('[MASKED]');
    });
  });
}); 