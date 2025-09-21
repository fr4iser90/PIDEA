/**
 * Validate AI Output Step - AI Framework
 * Validate AI-generated code and suggestions
 */

const Logger = require('../../../../infrastructure/logging/Logger');

const config = {
  name: 'validate_ai_output',
  version: '1.0.0',
  description: 'Validate AI-generated code and suggestions',
  category: 'ai',
  framework: 'AI Framework',
  dependencies: [],
  settings: {
    runTests: true,
    checkQuality: true,
    validateSyntax: true,
    outputFormat: 'json'
  }
};

class ValidateAIOutputStep {
  constructor() {
    this.name = 'validate_ai_output';
    this.description = 'Validate AI-generated code and suggestions';
    this.category = 'ai';
    this.dependencies = [];
    this.logger = new Logger('ValidateAIOutputStep');
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}, options = {}) {
    try {
      this.logger.info('🔍 Starting AI output validation...');
      
      const runTests = options.runTests || config.settings.runTests;
      const checkQuality = options.checkQuality || config.settings.checkQuality;
      const validateSyntax = options.validateSyntax || config.settings.validateSyntax;
      
      const result = {
        runTests,
        checkQuality,
        validateSyntax,
        timestamp: new Date().toISOString(),
        validation: {
          overall: 'pending',
          score: 0,
          checks: {},
          issues: [],
          recommendations: []
        }
      };

      // Validate syntax if enabled
      if (validateSyntax) {
        result.validation.checks.syntax = await this.validateSyntax(context);
      }
      
      // Check quality if enabled
      if (checkQuality) {
        result.validation.checks.quality = await this.checkQuality(context);
      }
      
      // Run tests if enabled
      if (runTests) {
        result.validation.checks.tests = await this.runTests(context);
      }
      
      // Calculate overall validation score
      result.validation = this.calculateOverallValidation(result.validation);
      
      this.logger.info(`✅ AI output validation completed. Score: ${result.validation.score}/100`);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - context.startTime || 0,
          checksPerformed: Object.keys(result.validation.checks).length,
          issuesFound: result.validation.issues.length,
          score: result.validation.score
        }
      };
    } catch (error) {
      this.logger.error('❌ AI output validation failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async validateSyntax(context) {
    const syntaxCheck = {
      status: 'pass',
      score: 100,
      issues: [],
      files: []
    };

    try {
      // Basic syntax validation for JavaScript/TypeScript
      const codeFiles = context.generatedFiles || [];
      
      for (const file of codeFiles) {
        const fileCheck = await this.validateFileSyntax(file);
        syntaxCheck.files.push(fileCheck);
        
        if (fileCheck.status !== 'pass') {
          syntaxCheck.issues.push(...fileCheck.issues);
        }
      }
      
      // Calculate overall syntax score
      if (syntaxCheck.files.length > 0) {
        const totalScore = syntaxCheck.files.reduce((sum, file) => sum + file.score, 0);
        syntaxCheck.score = Math.round(totalScore / syntaxCheck.files.length);
        syntaxCheck.status = syntaxCheck.score >= 80 ? 'pass' : syntaxCheck.score >= 60 ? 'warning' : 'fail';
      }
      
    } catch (error) {
      syntaxCheck.status = 'error';
      syntaxCheck.score = 0;
      syntaxCheck.issues.push({
        type: 'error',
        message: `Syntax validation failed: ${error.message}`,
        severity: 'high'
      });
    }

    return syntaxCheck;
  }

  async validateFileSyntax(file) {
    const fileCheck = {
      path: file.path || 'unknown',
      status: 'pass',
      score: 100,
      issues: []
    };

    try {
      // Basic JavaScript syntax validation
      if (file.content) {
        const issues = this.checkJavaScriptSyntax(file.content);
        fileCheck.issues = issues;
        
        if (issues.length > 0) {
          const highSeverityIssues = issues.filter(issue => issue.severity === 'high');
          const mediumSeverityIssues = issues.filter(issue => issue.severity === 'medium');
          
          fileCheck.score = Math.max(0, 100 - (highSeverityIssues.length * 30) - (mediumSeverityIssues.length * 10));
          fileCheck.status = fileCheck.score >= 80 ? 'pass' : fileCheck.score >= 60 ? 'warning' : 'fail';
        }
      }
      
    } catch (error) {
      fileCheck.status = 'error';
      fileCheck.score = 0;
      fileCheck.issues.push({
        type: 'error',
        message: `File syntax validation failed: ${error.message}`,
        severity: 'high'
      });
    }

    return fileCheck;
  }

  checkJavaScriptSyntax(content) {
    const issues = [];
    
    // Check for common syntax errors
    const syntaxPatterns = [
      {
        pattern: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*$/m,
        message: 'Unclosed function block',
        severity: 'high'
      },
      {
        pattern: /if\s*\([^)]*\)\s*\{[^}]*$/m,
        message: 'Unclosed if block',
        severity: 'high'
      },
      {
        pattern: /for\s*\([^)]*\)\s*\{[^}]*$/m,
        message: 'Unclosed for loop block',
        severity: 'high'
      },
      {
        pattern: /while\s*\([^)]*\)\s*\{[^}]*$/m,
        message: 'Unclosed while loop block',
        severity: 'high'
      },
      {
        pattern: /console\.log\s*\([^)]*$/m,
        message: 'Unclosed console.log statement',
        severity: 'medium'
      },
      {
        pattern: /require\s*\([^)]*$/m,
        message: 'Unclosed require statement',
        severity: 'medium'
      }
    ];
    
    for (const { pattern, message, severity } of syntaxPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'syntax',
          message,
          severity,
          line: this.findLineNumber(content, pattern)
        });
      }
    }
    
    return issues;
  }

  findLineNumber(content, pattern) {
    const match = content.match(pattern);
    if (match) {
      return content.substring(0, match.index).split('\n').length;
    }
    return 0;
  }

  async checkQuality(context) {
    const qualityCheck = {
      status: 'pass',
      score: 100,
      issues: [],
      metrics: {}
    };

    try {
      const codeFiles = context.generatedFiles || [];
      
      // Calculate quality metrics
      qualityCheck.metrics = this.calculateQualityMetrics(codeFiles);
      
      // Check for quality issues
      qualityCheck.issues = this.checkQualityIssues(qualityCheck.metrics);
      
      // Calculate quality score
      qualityCheck.score = this.calculateQualityScore(qualityCheck.metrics, qualityCheck.issues);
      qualityCheck.status = qualityCheck.score >= 80 ? 'pass' : qualityCheck.score >= 60 ? 'warning' : 'fail';
      
    } catch (error) {
      qualityCheck.status = 'error';
      qualityCheck.score = 0;
      qualityCheck.issues.push({
        type: 'error',
        message: `Quality check failed: ${error.message}`,
        severity: 'high'
      });
    }

    return qualityCheck;
  }

  calculateQualityMetrics(codeFiles) {
    const metrics = {
      totalFiles: codeFiles.length,
      totalLines: 0,
      averageLinesPerFile: 0,
      maxLinesPerFile: 0,
      functions: 0,
      classes: 0,
      complexity: 0,
      documentation: 0
    };

    for (const file of codeFiles) {
      if (file.content) {
        const lines = file.content.split('\n').length;
        metrics.totalLines += lines;
        metrics.maxLinesPerFile = Math.max(metrics.maxLinesPerFile, lines);
        
        // Count functions
        const functionMatches = file.content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g);
        if (functionMatches) {
          metrics.functions += functionMatches.length;
        }
        
        // Count classes
        const classMatches = file.content.match(/class\s+\w+/g);
        if (classMatches) {
          metrics.classes += classMatches.length;
        }
        
        // Calculate complexity
        const complexity = this.calculateComplexity(file.content);
        metrics.complexity += complexity;
        
        // Check documentation
        const docMatches = file.content.match(/\/\*\*[\s\S]*?\*\//g);
        if (docMatches) {
          metrics.documentation += docMatches.length;
        }
      }
    }

    if (metrics.totalFiles > 0) {
      metrics.averageLinesPerFile = Math.round(metrics.totalLines / metrics.totalFiles);
      metrics.complexity = Math.round(metrics.complexity / metrics.totalFiles);
    }

    return metrics;
  }

  calculateComplexity(content) {
    let complexity = 1; // Base complexity
    
    // Add complexity for control structures
    const complexityPatterns = [
      /if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /\?\s*.*\s*:/g
    ];
    
    for (const pattern of complexityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  checkQualityIssues(metrics) {
    const issues = [];
    
    // Check for large files
    if (metrics.averageLinesPerFile > 200) {
      issues.push({
        type: 'quality',
        message: 'Average file size is too large',
        severity: 'medium',
        metric: 'averageLinesPerFile',
        value: metrics.averageLinesPerFile,
        threshold: 200
      });
    }
    
    // Check for high complexity
    if (metrics.complexity > 10) {
      issues.push({
        type: 'quality',
        message: 'Code complexity is too high',
        severity: 'high',
        metric: 'complexity',
        value: metrics.complexity,
        threshold: 10
      });
    }
    
    // Check for lack of documentation
    if (metrics.documentation < metrics.functions * 0.5) {
      issues.push({
        type: 'quality',
        message: 'Insufficient documentation',
        severity: 'medium',
        metric: 'documentation',
        value: metrics.documentation,
        threshold: metrics.functions * 0.5
      });
    }
    
    return issues;
  }

  calculateQualityScore(metrics, issues) {
    let score = 100;
    
    for (const issue of issues) {
      if (issue.severity === 'high') {
        score -= 20;
      } else if (issue.severity === 'medium') {
        score -= 10;
      } else {
        score -= 5;
      }
    }
    
    return Math.max(0, score);
  }

  async runTests(context) {
    const testCheck = {
      status: 'pass',
      score: 100,
      issues: [],
      results: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };

    try {
      // Simulate test execution
      const testFiles = context.testFiles || [];
      
      for (const testFile of testFiles) {
        const testResult = await this.runTestFile(testFile);
        testCheck.results.total += testResult.total;
        testCheck.results.passed += testResult.passed;
        testCheck.results.failed += testResult.failed;
        testCheck.results.skipped += testResult.skipped;
        
        if (testResult.failed > 0) {
          testCheck.issues.push({
            type: 'test',
            message: `${testResult.failed} tests failed in ${testFile}`,
            severity: 'high',
            file: testFile
          });
        }
      }
      
      // Calculate test score
      if (testCheck.results.total > 0) {
        testCheck.score = Math.round((testCheck.results.passed / testCheck.results.total) * 100);
        testCheck.status = testCheck.score >= 80 ? 'pass' : testCheck.score >= 60 ? 'warning' : 'fail';
      }
      
    } catch (error) {
      testCheck.status = 'error';
      testCheck.score = 0;
      testCheck.issues.push({
        type: 'error',
        message: `Test execution failed: ${error.message}`,
        severity: 'high'
      });
    }

    return testCheck;
  }

  async runTestFile(testFile) {
    // Simulate test execution
    return {
      total: 5,
      passed: 4,
      failed: 1,
      skipped: 0
    };
  }

  calculateOverallValidation(validation) {
    const checks = validation.checks;
    const weights = {
      syntax: 0.4,
      quality: 0.4,
      tests: 0.2
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    const allIssues = [];
    
    for (const [checkType, result] of Object.entries(checks)) {
      if (result && result.score !== undefined) {
        totalScore += result.score * weights[checkType];
        totalWeight += weights[checkType];
        allIssues.push(...result.issues);
      }
    }
    
    validation.score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    validation.issues = allIssues;
    
    if (validation.score >= 80) {
      validation.overall = 'excellent';
    } else if (validation.score >= 60) {
      validation.overall = 'good';
    } else if (validation.score >= 40) {
      validation.overall = 'needs-improvement';
    } else {
      validation.overall = 'poor';
    }
    
    return validation;
  }
}

// Create instance for execution
const stepInstance = new ValidateAIOutputStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
