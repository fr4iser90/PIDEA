# Pattern Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: class PatternAnalysisStep {
  constructor() {
    this.name = 'PatternAnalysisStep';
    this.description = 'Analyzes code patterns and design patterns';
    this.category = 'analysis';
    this.subcategory = 'architecture';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = PatternAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing PatternAnalysisStep...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🎯 Starting pattern analysis for: ${projectPath}`);

      // Execute pattern analysis
      const patternAnalysis = await this.analyzeCodePatterns(projectPath, {
        includeCreational: context.includeCreational !== false,
        includeStructural: context.includeStructural !== false,
        includeBehavioral: context.includeBehavioral !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(patternAnalysis);

      // Generate issues if requested
      if (context.includeIssues !== false) {
        cleanResult.issues = this.generateIssues(cleanResult);
      }

      // Generate recommendations if requested
      if (context.includeRecommendations !== false) {
        cleanResult.recommendations = this.generateRecommendations(cleanResult);
      }

      // Generate tasks if requested
      if (context.generateTasks !== false) {
        cleanResult.tasks = await this.generateTasks(cleanResult, context);
      }

      // Generate documentation if requested
      if (context.includeDocumentation !== false) {
        cleanResult.documentation = await this.createDocumentation(cleanResult, projectPath, context);
      }

      logger.info(`✅ Pattern analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "PatternAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Pattern analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "PatternAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze code patterns for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Pattern analysis result
   */
  async analyzeCodePatterns(projectPath, options = {}) {
    try {
      const patterns = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      // ANALYZE ALL FILES - NO LIMITS!
      for (const file of jsFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const filePatterns = this.detectCodePatterns(content, file);
          patterns.push(...filePatterns);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Remove duplicates and aggregate
      const uniquePatterns = this.aggregatePatterns(patterns);

      // Categorize patterns
      const categorizedPatterns = this.categorizePatterns(uniquePatterns);

      // Calculate pattern score
      const patternScore = this.calculatePatternScore({
        patterns: uniquePatterns.length,
        categories: Object.keys(categorizedPatterns).length,
        files: jsFiles.length
      });

      return {
        patterns: uniquePatterns,
        categorized: categorizedPatterns,
        metrics: {
          totalFiles: jsFiles.length,
          patternsDetected: uniquePatterns.length,
          categoriesFound: Object.keys(categorizedPatterns).length
        },
        score: patternScore,
        level: this.getPatternLevel(patternScore)
      };
    } catch (error) {
      logger.error(`Code pattern analysis failed: ${error.message}`);
      return { 
        patterns: [], 
        categorized: {},
        metrics: {},
        score: 0,
        level: 'unknown'
      };
    }
  }

  /**
   * Detect code patterns
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Array} Detected patterns
   */
  detectCodePatterns(content, filePath) {
    const patterns = [];

    // ARCHITECTURAL PATTERNS (like OLD version)
    if (this.hasMVCStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'MVC Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Model-View-Controller architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasLayeredArchitecture(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Layered Architecture',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Multi-layer architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasMicroservicesStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Microservices',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Microservices architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasMonorepoStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Monorepo',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Monorepo structure detected',
        category: 'architectural'
      });
    }

    // Creational Patterns
    if (content.includes('getInstance') || content.includes('instance')) {
      patterns.push({
        type: 'creational',
        name: 'Singleton Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Singleton pattern usage detected',
        category: 'creational'
      });
    }

    if (content.includes('create') && content.includes('factory')) {
      patterns.push({
        type: 'creational',
        name: 'Factory Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Factory pattern usage detected',
        category: 'creational'
      });
    }

    if (content.includes('new') && content.includes('Builder')) {
      patterns.push({
        type: 'creational',
        name: 'Builder Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Builder pattern usage detected',
        category: 'creational'
      });
    }

    // Structural Patterns
    if (content.includes('extends') || content.includes('class') && content.includes('implements')) {
      patterns.push({
        type: 'structural',
        name: 'Inheritance Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Inheritance pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('composition') || content.includes('compose')) {
      patterns.push({
        type: 'structural',
        name: 'Composition Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Composition pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('adapter') || content.includes('adapt')) {
      patterns.push({
        type: 'structural',
        name: 'Adapter Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Adapter pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('decorator') || content.includes('decorate')) {
      patterns.push({
        type: 'structural',
        name: 'Decorator Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Decorator pattern usage detected',
        category: 'structural'
      });
    }

    // Behavioral Patterns
    if (content.includes('addEventListener') || content.includes('on(') || content.includes('emit(')) {
      patterns.push({
        type: 'behavioral',
        name: 'Observer Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Observer pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('strategy') || (content.includes('function') && content.includes('switch'))) {
      patterns.push({
        type: 'behavioral',
        name: 'Strategy Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Strategy pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('command') || content.includes('execute')) {
      patterns.push({
        type: 'behavioral',
        name: 'Command Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Command pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('state') && content.includes('transition')) {
      patterns.push({
        type: 'behavioral',
        name: 'State Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'State pattern usage detected',
        category: 'behavioral'
      });
    }

    // Repository Pattern
    if (content.includes('repository') || content.includes('findBy') || content.includes('save(')) {
      patterns.push({
        type: 'structural',
        name: 'Repository Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Repository pattern usage detected',
        category: 'structural'
      });
    }

    // Dependency Injection
    if (content.includes('inject') || content.includes('dependency') || content.includes('DI')) {
      patterns.push({
        type: 'structural',
        name: 'Dependency Injection',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Dependency injection pattern usage detected',
        category: 'structural'
      });
    }

    // Module Pattern
    if (content.includes('module.exports') || content.includes('export default')) {
      patterns.push({
        type: 'structural',
        name: 'Module Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Module pattern usage detected',
        category: 'structural'
      });
    }

    return patterns;
  }

  /**
   * Check for MVC structure (like OLD version)
   */
  hasMVCStructure(content, filePath) {
    const hasModels = content.includes('model') || content.includes('entity') || content.includes('Model');
    const hasViews = content.includes('view') || content.includes('component') || content.includes('View');
    const hasControllers = content.includes('controller') || content.includes('handler') || content.includes('Controller');
    
    return hasModels && hasViews && hasControllers;
  }

  /**
   * Check for layered architecture (like OLD version)
   */
  hasLayeredArchitecture(content, filePath) {
    const layerIndicators = ['presentation', 'business', 'data', 'infrastructure', 'domain'];
    const layerCount = layerIndicators.filter(indicator => 
      content.includes(indicator)
    ).length;
    
    return layerCount >= 3;
  }

  /**
   * Check for microservices structure (like OLD version)
   */
  hasMicroservicesStructure(content, filePath) {
    const hasServices = content.includes('service') || content.includes('Service');
    const hasIndependentConfigs = content.includes('config') || content.includes('Config');
    const hasMultipleServices = (content.match(/service/gi) || []).length > 2;
    
    return hasServices && hasIndependentConfigs && hasMultipleServices;
  }

  /**
   * Check for monorepo structure (like OLD version)
   */
  hasMonorepoStructure(content, filePath) {
    const hasPackages = content.includes('packages') || content.includes('apps');
    const hasMultipleApps = (content.match(/app/gi) || []).length > 1;
    const hasWorkspace = content.includes('workspace') || content.includes('lerna');
    
    return hasPackages || hasMultipleApps || hasWorkspace;
  }

  /**
   * Aggregate patterns to remove duplicates
   * @param {Array} patterns - Raw patterns
   * @returns {Array} Unique patterns
   */
  aggregatePatterns(patterns) {
    const patternMap = new Map();
    
    patterns.forEach(pattern => {
      const key = pattern.name;
      if (patternMap.has(key)) {
        const existing = patternMap.get(key);
        existing.files = existing.files || [];
        existing.files.push(pattern.file);
        existing.confidence = existing.confidence === 'high' ? 'high' : pattern.confidence;
        existing.count = (existing.count || 1) + 1;
      } else {
        patternMap.set(key, {
          ...pattern,
          files: pattern.file ? [pattern.file] : [],
          count: 1
        });
      }
    });

    return Array.from(patternMap.values());
  }

  /**
   * Categorize patterns by type
   * @param {Array} patterns - Patterns to categorize
   * @returns {Object} Categorized patterns
   */
  categorizePatterns(patterns) {
    const categorized = {
      creational: [],
      structural: [],
      behavioral: [],
      architectural: []
    };

    patterns.forEach(pattern => {
      if (categorized[pattern.category]) {
        categorized[pattern.category].push(pattern);
      } else {
        categorized.architectural.push(pattern);
      }
    });

    return categorized;
  }

  /**
   * Calculate pattern score
   * @param {Object} data - Analysis data
   * @returns {number} Pattern score (0-100)
   */
  calculatePatternScore(data) {
    const { patterns, categories, files } = data;
    
    // Base score starts at 50
    let score = 50;

    // Reward for pattern diversity (up to +30 points)
    const patternBonus = Math.min(patterns * 3, 30);
    score += patternBonus;

    // Reward for category diversity (up to +20 points)
    const categoryBonus = Math.min(categories * 5, 20);
    score += categoryBonus;

    // Bonus for pattern density (up to +10 points)
    if (files > 0 && patterns / files > 0.1) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get pattern level
   * @param {number} score - Pattern score
   * @returns {string} Pattern level
   */
  getPatternLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Get JavaScript files from project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} JavaScript files
   */
  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      /\.(js|jsx|ts|tsx)$/i.test(file) && 
      !file.includes('node_modules') &&  // SKIP node_modules (correct!)
      !file.includes('.git')             // SKIP .git (correct!)
    );
  }

  /**
   * Get all files from directory recursively
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} All files
   */
  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // SKIP node_modules and .git (correct!)
          if (!item.startsWith('.') && item !== 'node_modules' && item !== '.git') {
            files.push(...await this.getAllFiles(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Clean and format result
   * @param {Object} result - Analysis result
   * @returns {Object} Cleaned result
   */
  cleanResult(result) {
    return {
      ...result,
      timestamp: new Date().toISOString(),
      step: PatternAnalysisStep,
      category: 'architecture',
      subcategory: 'pattern'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for pattern analysis');
    }
  }

  /**
   * Calculate analysis coverage
   * @param {Array} files - Analyzed files
   * @param {string} projectPath - Project path
   * @returns {number} Coverage percentage
   */
  calculateCoverage(files, projectPath) {
    // This is a simplified coverage calculation
    return Math.min((files.length / 100) * 100, 100);
  }

  /**
   * Calculate analysis confidence
   * @param {Object} result - Analysis result
   * @returns {number} Confidence percentage
   */
  calculateConfidence(result) {
    const { patterns, categorized, metrics } = result;
    
    if (!patterns || !categorized || !metrics) return 0;
    
    // Higher confidence with more patterns
    const patternConfidence = Math.min(patterns.length * 5, 60);
    
    // Additional confidence for category diversity
    const categoryConfidence = Math.min(Object.keys(categorized).length * 10, 40);
    
    return Math.min(patternConfidence + categoryConfidence, 100);
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low pattern score
    if (result.score < 70) {
      issues.push({
        type: 'low-pattern-score',
        title: 'Low Pattern Analysis Score',
        description: `Pattern analysis score of ${result.score}% indicates poor pattern implementation`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Improve pattern implementation and follow design pattern best practices'
      });
    }

    // Check for missing design patterns
    if (result.patterns && result.patterns.length < 3) {
      issues.push({
        type: 'insufficient-patterns',
        title: 'Insufficient Design Patterns',
        description: `Only ${result.patterns.length} design patterns detected, insufficient for good architecture`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Implement more design patterns to improve code organization and maintainability'
      });
    }

    // Check for anti-patterns
    if (result.patterns && result.patterns.some(pattern => pattern.type === 'anti-pattern')) {
      issues.push({
        type: 'anti-patterns-detected',
        title: 'Anti-Patterns Detected',
        description: 'Anti-patterns found in the codebase',
        severity: 'high',
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Refactor code to remove anti-patterns and improve code quality'
      });
    }

    // Check for missing architectural patterns
    const hasArchitecturalPatterns = result.patterns && result.patterns.some(pattern => 
      pattern.category === 'architectural' || pattern.type === 'architectural'
    );
    if (!hasArchitecturalPatterns) {
      issues.push({
        type: 'missing-architectural-patterns',
        title: 'Missing Architectural Patterns',
        description: 'No architectural patterns detected in the codebase',
        severity: 'high',
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Implement architectural patterns (MVC, DDD, CQRS, etc.) for better organization'
      });
    }

    return issues;
  }

  /**
   * Generate recommendations from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Recommendations array
   */
  generateRecommendations(result) {
    const recommendations = [];
    
    // Check for low analysis score
    if (result.score < 80) {
      recommendations.push({
        type: 'improve-score',
        title: 'Improve Analysis Score',
        description: `Current score of ${result.score}% can be improved`,
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Implement best practices to improve analysis score',
        impact: 'Better code quality and maintainability'
      });
    }

    // Check for missing patterns
    if (result.patterns && result.patterns.length < 3) {
      recommendations.push({
        type: 'add-patterns',
        title: 'Add More Design Patterns',
        description: 'Consider implementing additional design patterns',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Research and implement appropriate design patterns',
        impact: 'Improved code organization and maintainability'
      });
    }

    // Check for security improvements
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      recommendations.push({
        type: 'security-improvements',
        title: 'Address Security Vulnerabilities',
        description: `${result.vulnerabilities.length} vulnerabilities found`,
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Review and fix identified security vulnerabilities',
        impact: 'Enhanced security posture'
      });
    }

    // Check for performance improvements
    if (result.metrics && result.metrics.performanceScore < 80) {
      recommendations.push({
        type: 'performance-improvements',
        title: 'Improve Performance',
        description: 'Performance analysis indicates room for improvement',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Optimize code for better performance',
        impact: 'Faster execution and better user experience'
      });
    }

    return recommendations;
  }
  /**
   * Generate tasks from analysis results
   * @param {Object} result - Analysis result
   * @param {Object} context - Execution context
   * @returns {Array} Tasks array
   */
  async generateTasks(result, context) {
    const tasks = [];
    const projectId = context.projectId || 'default-project';
    
    // Create main improvement task
    const mainTask = {
      id: `pattern-analysis-step-improvement-${Date.now()}`,
      title: `Improve ${PatternAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${PatternAnalysisStep} analysis`,
      type: 'improvement',
      category: 'architecture',
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: 'PatternAnalysisStep',
        score: result.score || 0,
        issues: result.issues ? result.issues.length : 0,
        recommendations: result.recommendations ? result.recommendations.length : 0
      },
      estimatedHours: 4,
      phase: 'improvement',
      stage: 'planning'
    };
    
    tasks.push(mainTask);
    
    // Create subtasks for critical issues
    if (result.issues && result.issues.some(issue => issue.severity === 'critical')) {
      const criticalTask = {
        id: `pattern-analysis-step-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${PatternAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'PatternAnalysisStep',
          issues: result.issues.filter(issue => issue.severity === 'critical')
        },
        estimatedHours: 4,
        phase: 'critical-fixes',
        stage: 'implementation'
      };
      tasks.push(criticalTask);
    }
    
    // Create subtasks for high priority issues
    if (result.issues && result.issues.some(issue => issue.severity === 'high')) {
      const highTask = {
        id: `pattern-analysis-step-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${PatternAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'PatternAnalysisStep',
          issues: result.issues.filter(issue => issue.severity === 'high')
        },
        estimatedHours: 3,
        phase: 'high-fixes',
        stage: 'implementation'
      };
      tasks.push(highTask);
    }
    
    return tasks;
  }

  /**
   * Calculate estimated hours for tasks
   * @param {Object} result - Analysis result
   * @returns {number} Estimated hours
   */
  calculateEstimatedHours(result) {
    let totalHours = 2; // Base hours for improvement
    
    if (result.issues) {
      result.issues.forEach(issue => {
        switch (issue.severity) {
          case 'critical':
            totalHours += 2;
            break;
          case 'high':
            totalHours += 1.5;
            break;
          case 'medium':
            totalHours += 1;
            break;
          case 'low':
            totalHours += 0.5;
            break;
        }
      });
    }
    
    if (result.recommendations) {
      totalHours += result.recommendations.length * 0.5;
    }
    
    return Math.round(totalHours * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Create documentation from analysis results
   * @param {Object} result - Analysis result
   * @param {string} projectPath - Project path
   * @param {Object} context - Execution context
   * @returns {Array} Documentation array
   */
  async createDocumentation(result, projectPath, context) {
    const docs = [];
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'architecture', 'pattern-analysis-step');
    
    // Ensure directory exists
    try {
      await fs.mkdir(docsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
    
    
    // Create implementation file
    const implementationDoc = await this.createImplementationDoc(result, docsDir);
    docs.push(implementationDoc);
    
    // Create analysis report
    const analysisReport = await this.createAnalysisReport(result, docsDir);
    docs.push(analysisReport);
    
    return docs;
  }

  /**
   * Create implementation documentation
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Implementation document
   */
  async createImplementationDoc(result, docsDir) {
    const docPath = path.join(docsDir, 'pattern-analysis-implementation.md');
    
    const content = `# Pattern Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${PatternAnalysisStep}
- **Category**: architecture
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.score || 0}%
- **Level**: ${result.level || 'unknown'}

## 📊 Analysis Results
- **Total Patterns Detected**: ${result.metrics?.patternsDetected || 0}
- **Categories Found**: ${result.metrics?.categoriesFound || 0}
- **Files Analyzed**: ${result.metrics?.totalFiles || 0}

## 🎯 Key Findings
${result.patterns ? result.patterns.map(pattern => `- **${pattern.name}**: ${pattern.description}`).join('\n') : '- No patterns detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Pattern Analysis Implementation',
      path: docPath,
      category: 'architecture',
      source: PatternAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'pattern-analysis-report.md');
    
    const content = `# Pattern Analysis Report

## 📊 Executive Summary
Pattern analysis completed with a score of ${result.score || 0}% (${result.level || 'unknown'} level).

## 🔍 Detailed Analysis
${result.categorized ? Object.entries(result.categorized).map(([category, patterns]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Patterns
${patterns.map(pattern => `- ${pattern.name}: ${pattern.description}`).join('\n')}
`).join('\n') : 'No categorized patterns found'}

## 📈 Metrics
- **Pattern Coverage**: ${result.metrics?.patternsDetected || 0} patterns detected
- **Category Diversity**: ${result.metrics?.categoriesFound || 0} categories found
- **File Coverage**: ${result.metrics?.totalFiles || 0} files analyzed

## 🎯 Next Steps
Based on the analysis, consider implementing additional design patterns to improve code quality and maintainability.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Pattern Analysis Report',
      path: docPath,
      category: 'architecture',
      source: PatternAnalysisStep
    };
  }
}
- **Category**: architecture
- **Analysis Date**: 2025-09-20T19:59:00.118Z
- **Score**: 100%
- **Level**: excellent

## 📊 Analysis Results
- **Total Patterns Detected**: 18
- **Categories Found**: 4
- **Files Analyzed**: 1192

## 🎯 Key Findings
- **Layered Architecture**: Multi-layer architecture detected
- **Microservices**: Microservices architecture detected
- **Monorepo**: Monorepo structure detected
- **Singleton Pattern**: Singleton pattern usage detected
- **Observer Pattern**: Observer pattern usage detected
- **Command Pattern**: Command pattern usage detected
- **Repository Pattern**: Repository pattern usage detected
- **Dependency Injection**: Dependency injection pattern usage detected
- **Module Pattern**: Module pattern usage detected
- **Builder Pattern**: Builder pattern usage detected
- **Strategy Pattern**: Strategy pattern usage detected
- **Factory Pattern**: Factory pattern usage detected
- **Inheritance Pattern**: Inheritance pattern usage detected
- **Composition Pattern**: Composition pattern usage detected
- **MVC Pattern**: Model-View-Controller architecture detected
- **Adapter Pattern**: Adapter pattern usage detected
- **State Pattern**: State pattern usage detected
- **Decorator Pattern**: Decorator pattern usage detected

## 📝 Recommendations


## 🔧 Implementation Tasks
- **Improve class PatternAnalysisStep {
  constructor() {
    this.name = 'PatternAnalysisStep';
    this.description = 'Analyzes code patterns and design patterns';
    this.category = 'analysis';
    this.subcategory = 'architecture';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = PatternAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing PatternAnalysisStep...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🎯 Starting pattern analysis for: ${projectPath}`);

      // Execute pattern analysis
      const patternAnalysis = await this.analyzeCodePatterns(projectPath, {
        includeCreational: context.includeCreational !== false,
        includeStructural: context.includeStructural !== false,
        includeBehavioral: context.includeBehavioral !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(patternAnalysis);

      // Generate issues if requested
      if (context.includeIssues !== false) {
        cleanResult.issues = this.generateIssues(cleanResult);
      }

      // Generate recommendations if requested
      if (context.includeRecommendations !== false) {
        cleanResult.recommendations = this.generateRecommendations(cleanResult);
      }

      // Generate tasks if requested
      if (context.generateTasks !== false) {
        cleanResult.tasks = await this.generateTasks(cleanResult, context);
      }

      // Generate documentation if requested
      if (context.includeDocumentation !== false) {
        cleanResult.documentation = await this.createDocumentation(cleanResult, projectPath, context);
      }

      logger.info(`✅ Pattern analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "PatternAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Pattern analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "PatternAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze code patterns for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Pattern analysis result
   */
  async analyzeCodePatterns(projectPath, options = {}) {
    try {
      const patterns = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      // ANALYZE ALL FILES - NO LIMITS!
      for (const file of jsFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const filePatterns = this.detectCodePatterns(content, file);
          patterns.push(...filePatterns);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Remove duplicates and aggregate
      const uniquePatterns = this.aggregatePatterns(patterns);

      // Categorize patterns
      const categorizedPatterns = this.categorizePatterns(uniquePatterns);

      // Calculate pattern score
      const patternScore = this.calculatePatternScore({
        patterns: uniquePatterns.length,
        categories: Object.keys(categorizedPatterns).length,
        files: jsFiles.length
      });

      return {
        patterns: uniquePatterns,
        categorized: categorizedPatterns,
        metrics: {
          totalFiles: jsFiles.length,
          patternsDetected: uniquePatterns.length,
          categoriesFound: Object.keys(categorizedPatterns).length
        },
        score: patternScore,
        level: this.getPatternLevel(patternScore)
      };
    } catch (error) {
      logger.error(`Code pattern analysis failed: ${error.message}`);
      return { 
        patterns: [], 
        categorized: {},
        metrics: {},
        score: 0,
        level: 'unknown'
      };
    }
  }

  /**
   * Detect code patterns
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Array} Detected patterns
   */
  detectCodePatterns(content, filePath) {
    const patterns = [];

    // ARCHITECTURAL PATTERNS (like OLD version)
    if (this.hasMVCStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'MVC Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Model-View-Controller architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasLayeredArchitecture(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Layered Architecture',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Multi-layer architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasMicroservicesStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Microservices',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Microservices architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasMonorepoStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Monorepo',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Monorepo structure detected',
        category: 'architectural'
      });
    }

    // Creational Patterns
    if (content.includes('getInstance') || content.includes('instance')) {
      patterns.push({
        type: 'creational',
        name: 'Singleton Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Singleton pattern usage detected',
        category: 'creational'
      });
    }

    if (content.includes('create') && content.includes('factory')) {
      patterns.push({
        type: 'creational',
        name: 'Factory Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Factory pattern usage detected',
        category: 'creational'
      });
    }

    if (content.includes('new') && content.includes('Builder')) {
      patterns.push({
        type: 'creational',
        name: 'Builder Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Builder pattern usage detected',
        category: 'creational'
      });
    }

    // Structural Patterns
    if (content.includes('extends') || content.includes('class') && content.includes('implements')) {
      patterns.push({
        type: 'structural',
        name: 'Inheritance Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Inheritance pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('composition') || content.includes('compose')) {
      patterns.push({
        type: 'structural',
        name: 'Composition Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Composition pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('adapter') || content.includes('adapt')) {
      patterns.push({
        type: 'structural',
        name: 'Adapter Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Adapter pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('decorator') || content.includes('decorate')) {
      patterns.push({
        type: 'structural',
        name: 'Decorator Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Decorator pattern usage detected',
        category: 'structural'
      });
    }

    // Behavioral Patterns
    if (content.includes('addEventListener') || content.includes('on(') || content.includes('emit(')) {
      patterns.push({
        type: 'behavioral',
        name: 'Observer Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Observer pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('strategy') || (content.includes('function') && content.includes('switch'))) {
      patterns.push({
        type: 'behavioral',
        name: 'Strategy Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Strategy pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('command') || content.includes('execute')) {
      patterns.push({
        type: 'behavioral',
        name: 'Command Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Command pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('state') && content.includes('transition')) {
      patterns.push({
        type: 'behavioral',
        name: 'State Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'State pattern usage detected',
        category: 'behavioral'
      });
    }

    // Repository Pattern
    if (content.includes('repository') || content.includes('findBy') || content.includes('save(')) {
      patterns.push({
        type: 'structural',
        name: 'Repository Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Repository pattern usage detected',
        category: 'structural'
      });
    }

    // Dependency Injection
    if (content.includes('inject') || content.includes('dependency') || content.includes('DI')) {
      patterns.push({
        type: 'structural',
        name: 'Dependency Injection',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Dependency injection pattern usage detected',
        category: 'structural'
      });
    }

    // Module Pattern
    if (content.includes('module.exports') || content.includes('export default')) {
      patterns.push({
        type: 'structural',
        name: 'Module Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Module pattern usage detected',
        category: 'structural'
      });
    }

    return patterns;
  }

  /**
   * Check for MVC structure (like OLD version)
   */
  hasMVCStructure(content, filePath) {
    const hasModels = content.includes('model') || content.includes('entity') || content.includes('Model');
    const hasViews = content.includes('view') || content.includes('component') || content.includes('View');
    const hasControllers = content.includes('controller') || content.includes('handler') || content.includes('Controller');
    
    return hasModels && hasViews && hasControllers;
  }

  /**
   * Check for layered architecture (like OLD version)
   */
  hasLayeredArchitecture(content, filePath) {
    const layerIndicators = ['presentation', 'business', 'data', 'infrastructure', 'domain'];
    const layerCount = layerIndicators.filter(indicator => 
      content.includes(indicator)
    ).length;
    
    return layerCount >= 3;
  }

  /**
   * Check for microservices structure (like OLD version)
   */
  hasMicroservicesStructure(content, filePath) {
    const hasServices = content.includes('service') || content.includes('Service');
    const hasIndependentConfigs = content.includes('config') || content.includes('Config');
    const hasMultipleServices = (content.match(/service/gi) || []).length > 2;
    
    return hasServices && hasIndependentConfigs && hasMultipleServices;
  }

  /**
   * Check for monorepo structure (like OLD version)
   */
  hasMonorepoStructure(content, filePath) {
    const hasPackages = content.includes('packages') || content.includes('apps');
    const hasMultipleApps = (content.match(/app/gi) || []).length > 1;
    const hasWorkspace = content.includes('workspace') || content.includes('lerna');
    
    return hasPackages || hasMultipleApps || hasWorkspace;
  }

  /**
   * Aggregate patterns to remove duplicates
   * @param {Array} patterns - Raw patterns
   * @returns {Array} Unique patterns
   */
  aggregatePatterns(patterns) {
    const patternMap = new Map();
    
    patterns.forEach(pattern => {
      const key = pattern.name;
      if (patternMap.has(key)) {
        const existing = patternMap.get(key);
        existing.files = existing.files || [];
        existing.files.push(pattern.file);
        existing.confidence = existing.confidence === 'high' ? 'high' : pattern.confidence;
        existing.count = (existing.count || 1) + 1;
      } else {
        patternMap.set(key, {
          ...pattern,
          files: pattern.file ? [pattern.file] : [],
          count: 1
        });
      }
    });

    return Array.from(patternMap.values());
  }

  /**
   * Categorize patterns by type
   * @param {Array} patterns - Patterns to categorize
   * @returns {Object} Categorized patterns
   */
  categorizePatterns(patterns) {
    const categorized = {
      creational: [],
      structural: [],
      behavioral: [],
      architectural: []
    };

    patterns.forEach(pattern => {
      if (categorized[pattern.category]) {
        categorized[pattern.category].push(pattern);
      } else {
        categorized.architectural.push(pattern);
      }
    });

    return categorized;
  }

  /**
   * Calculate pattern score
   * @param {Object} data - Analysis data
   * @returns {number} Pattern score (0-100)
   */
  calculatePatternScore(data) {
    const { patterns, categories, files } = data;
    
    // Base score starts at 50
    let score = 50;

    // Reward for pattern diversity (up to +30 points)
    const patternBonus = Math.min(patterns * 3, 30);
    score += patternBonus;

    // Reward for category diversity (up to +20 points)
    const categoryBonus = Math.min(categories * 5, 20);
    score += categoryBonus;

    // Bonus for pattern density (up to +10 points)
    if (files > 0 && patterns / files > 0.1) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get pattern level
   * @param {number} score - Pattern score
   * @returns {string} Pattern level
   */
  getPatternLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Get JavaScript files from project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} JavaScript files
   */
  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      /\.(js|jsx|ts|tsx)$/i.test(file) && 
      !file.includes('node_modules') &&  // SKIP node_modules (correct!)
      !file.includes('.git')             // SKIP .git (correct!)
    );
  }

  /**
   * Get all files from directory recursively
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} All files
   */
  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // SKIP node_modules and .git (correct!)
          if (!item.startsWith('.') && item !== 'node_modules' && item !== '.git') {
            files.push(...await this.getAllFiles(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Clean and format result
   * @param {Object} result - Analysis result
   * @returns {Object} Cleaned result
   */
  cleanResult(result) {
    return {
      ...result,
      timestamp: new Date().toISOString(),
      step: PatternAnalysisStep,
      category: 'architecture',
      subcategory: 'pattern'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for pattern analysis');
    }
  }

  /**
   * Calculate analysis coverage
   * @param {Array} files - Analyzed files
   * @param {string} projectPath - Project path
   * @returns {number} Coverage percentage
   */
  calculateCoverage(files, projectPath) {
    // This is a simplified coverage calculation
    return Math.min((files.length / 100) * 100, 100);
  }

  /**
   * Calculate analysis confidence
   * @param {Object} result - Analysis result
   * @returns {number} Confidence percentage
   */
  calculateConfidence(result) {
    const { patterns, categorized, metrics } = result;
    
    if (!patterns || !categorized || !metrics) return 0;
    
    // Higher confidence with more patterns
    const patternConfidence = Math.min(patterns.length * 5, 60);
    
    // Additional confidence for category diversity
    const categoryConfidence = Math.min(Object.keys(categorized).length * 10, 40);
    
    return Math.min(patternConfidence + categoryConfidence, 100);
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low pattern score
    if (result.score < 70) {
      issues.push({
        type: 'low-pattern-score',
        title: 'Low Pattern Analysis Score',
        description: `Pattern analysis score of ${result.score}% indicates poor pattern implementation`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Improve pattern implementation and follow design pattern best practices'
      });
    }

    // Check for missing design patterns
    if (result.patterns && result.patterns.length < 3) {
      issues.push({
        type: 'insufficient-patterns',
        title: 'Insufficient Design Patterns',
        description: `Only ${result.patterns.length} design patterns detected, insufficient for good architecture`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Implement more design patterns to improve code organization and maintainability'
      });
    }

    // Check for anti-patterns
    if (result.patterns && result.patterns.some(pattern => pattern.type === 'anti-pattern')) {
      issues.push({
        type: 'anti-patterns-detected',
        title: 'Anti-Patterns Detected',
        description: 'Anti-patterns found in the codebase',
        severity: 'high',
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Refactor code to remove anti-patterns and improve code quality'
      });
    }

    // Check for missing architectural patterns
    const hasArchitecturalPatterns = result.patterns && result.patterns.some(pattern => 
      pattern.category === 'architectural' || pattern.type === 'architectural'
    );
    if (!hasArchitecturalPatterns) {
      issues.push({
        type: 'missing-architectural-patterns',
        title: 'Missing Architectural Patterns',
        description: 'No architectural patterns detected in the codebase',
        severity: 'high',
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Implement architectural patterns (MVC, DDD, CQRS, etc.) for better organization'
      });
    }

    return issues;
  }

  /**
   * Generate recommendations from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Recommendations array
   */
  generateRecommendations(result) {
    const recommendations = [];
    
    // Check for low analysis score
    if (result.score < 80) {
      recommendations.push({
        type: 'improve-score',
        title: 'Improve Analysis Score',
        description: `Current score of ${result.score}% can be improved`,
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Implement best practices to improve analysis score',
        impact: 'Better code quality and maintainability'
      });
    }

    // Check for missing patterns
    if (result.patterns && result.patterns.length < 3) {
      recommendations.push({
        type: 'add-patterns',
        title: 'Add More Design Patterns',
        description: 'Consider implementing additional design patterns',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Research and implement appropriate design patterns',
        impact: 'Improved code organization and maintainability'
      });
    }

    // Check for security improvements
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      recommendations.push({
        type: 'security-improvements',
        title: 'Address Security Vulnerabilities',
        description: `${result.vulnerabilities.length} vulnerabilities found`,
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Review and fix identified security vulnerabilities',
        impact: 'Enhanced security posture'
      });
    }

    // Check for performance improvements
    if (result.metrics && result.metrics.performanceScore < 80) {
      recommendations.push({
        type: 'performance-improvements',
        title: 'Improve Performance',
        description: 'Performance analysis indicates room for improvement',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Optimize code for better performance',
        impact: 'Faster execution and better user experience'
      });
    }

    return recommendations;
  }
  /**
   * Generate tasks from analysis results
   * @param {Object} result - Analysis result
   * @param {Object} context - Execution context
   * @returns {Array} Tasks array
   */
  async generateTasks(result, context) {
    const tasks = [];
    const projectId = context.projectId || 'default-project';
    
    // Create main improvement task
    const mainTask = {
      id: `pattern-analysis-step-improvement-${Date.now()}`,
      title: `Improve ${PatternAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${PatternAnalysisStep} analysis`,
      type: 'improvement',
      category: 'architecture',
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: 'PatternAnalysisStep',
        score: result.score || 0,
        issues: result.issues ? result.issues.length : 0,
        recommendations: result.recommendations ? result.recommendations.length : 0
      },
      estimatedHours: 4,
      phase: 'improvement',
      stage: 'planning'
    };
    
    tasks.push(mainTask);
    
    // Create subtasks for critical issues
    if (result.issues && result.issues.some(issue => issue.severity === 'critical')) {
      const criticalTask = {
        id: `pattern-analysis-step-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${PatternAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'PatternAnalysisStep',
          issues: result.issues.filter(issue => issue.severity === 'critical')
        },
        estimatedHours: 4,
        phase: 'critical-fixes',
        stage: 'implementation'
      };
      tasks.push(criticalTask);
    }
    
    // Create subtasks for high priority issues
    if (result.issues && result.issues.some(issue => issue.severity === 'high')) {
      const highTask = {
        id: `pattern-analysis-step-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${PatternAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'PatternAnalysisStep',
          issues: result.issues.filter(issue => issue.severity === 'high')
        },
        estimatedHours: 3,
        phase: 'high-fixes',
        stage: 'implementation'
      };
      tasks.push(highTask);
    }
    
    return tasks;
  }

  /**
   * Calculate estimated hours for tasks
   * @param {Object} result - Analysis result
   * @returns {number} Estimated hours
   */
  calculateEstimatedHours(result) {
    let totalHours = 2; // Base hours for improvement
    
    if (result.issues) {
      result.issues.forEach(issue => {
        switch (issue.severity) {
          case 'critical':
            totalHours += 2;
            break;
          case 'high':
            totalHours += 1.5;
            break;
          case 'medium':
            totalHours += 1;
            break;
          case 'low':
            totalHours += 0.5;
            break;
        }
      });
    }
    
    if (result.recommendations) {
      totalHours += result.recommendations.length * 0.5;
    }
    
    return Math.round(totalHours * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Create documentation from analysis results
   * @param {Object} result - Analysis result
   * @param {string} projectPath - Project path
   * @param {Object} context - Execution context
   * @returns {Array} Documentation array
   */
  async createDocumentation(result, projectPath, context) {
    const docs = [];
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'architecture', 'pattern-analysis-step');
    
    // Ensure directory exists
    try {
      await fs.mkdir(docsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
    
    
    // Create implementation file
    const implementationDoc = await this.createImplementationDoc(result, docsDir);
    docs.push(implementationDoc);
    
    // Create analysis report
    const analysisReport = await this.createAnalysisReport(result, docsDir);
    docs.push(analysisReport);
    
    return docs;
  }

  /**
   * Create implementation documentation
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Implementation document
   */
  async createImplementationDoc(result, docsDir) {
    const docPath = path.join(docsDir, 'pattern-analysis-implementation.md');
    
    const content = `# Pattern Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${PatternAnalysisStep}
- **Category**: architecture
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.score || 0}%
- **Level**: ${result.level || 'unknown'}

## 📊 Analysis Results
- **Total Patterns Detected**: ${result.metrics?.patternsDetected || 0}
- **Categories Found**: ${result.metrics?.categoriesFound || 0}
- **Files Analyzed**: ${result.metrics?.totalFiles || 0}

## 🎯 Key Findings
${result.patterns ? result.patterns.map(pattern => `- **${pattern.name}**: ${pattern.description}`).join('\n') : '- No patterns detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Pattern Analysis Implementation',
      path: docPath,
      category: 'architecture',
      source: PatternAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'pattern-analysis-report.md');
    
    const content = `# Pattern Analysis Report

## 📊 Executive Summary
Pattern analysis completed with a score of ${result.score || 0}% (${result.level || 'unknown'} level).

## 🔍 Detailed Analysis
${result.categorized ? Object.entries(result.categorized).map(([category, patterns]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Patterns
${patterns.map(pattern => `- ${pattern.name}: ${pattern.description}`).join('\n')}
`).join('\n') : 'No categorized patterns found'}

## 📈 Metrics
- **Pattern Coverage**: ${result.metrics?.patternsDetected || 0} patterns detected
- **Category Diversity**: ${result.metrics?.categoriesFound || 0} categories found
- **File Coverage**: ${result.metrics?.totalFiles || 0} files analyzed

## 🎯 Next Steps
Based on the analysis, consider implementing additional design patterns to improve code quality and maintainability.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Pattern Analysis Report',
      path: docPath,
      category: 'architecture',
      source: PatternAnalysisStep
    };
  }
} Results**: Address issues and implement recommendations from class PatternAnalysisStep {
  constructor() {
    this.name = 'PatternAnalysisStep';
    this.description = 'Analyzes code patterns and design patterns';
    this.category = 'analysis';
    this.subcategory = 'architecture';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = PatternAnalysisStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`⚡ Executing PatternAnalysisStep...`);
      
      // Validate context
      this.validateContext(context);

      const projectPath = context.projectPath;
      
      logger.info(`🎯 Starting pattern analysis for: ${projectPath}`);

      // Execute pattern analysis
      const patternAnalysis = await this.analyzeCodePatterns(projectPath, {
        includeCreational: context.includeCreational !== false,
        includeStructural: context.includeStructural !== false,
        includeBehavioral: context.includeBehavioral !== false
      });

      // Clean and format result
      const cleanResult = this.cleanResult(patternAnalysis);

      // Generate issues if requested
      if (context.includeIssues !== false) {
        cleanResult.issues = this.generateIssues(cleanResult);
      }

      // Generate recommendations if requested
      if (context.includeRecommendations !== false) {
        cleanResult.recommendations = this.generateRecommendations(cleanResult);
      }

      // Generate tasks if requested
      if (context.generateTasks !== false) {
        cleanResult.tasks = await this.generateTasks(cleanResult, context);
      }

      // Generate documentation if requested
      if (context.includeDocumentation !== false) {
        cleanResult.documentation = await this.createDocumentation(cleanResult, projectPath, context);
      }

      logger.info(`✅ Pattern analysis completed successfully`);

      return {
        success: true,
        result: cleanResult,
        metadata: {
          stepName: "PatternAnalysisStep",
          projectPath,
          timestamp: new Date()
        }
      };

    } catch (error) {
      logger.error(`❌ Pattern analysis failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stepName: "PatternAnalysisStep",
          projectPath: context.projectPath,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Analyze code patterns for a project
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Pattern analysis result
   */
  async analyzeCodePatterns(projectPath, options = {}) {
    try {
      const patterns = [];
      const jsFiles = await this.getJavaScriptFiles(projectPath);

      // ANALYZE ALL FILES - NO LIMITS!
      for (const file of jsFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const filePatterns = this.detectCodePatterns(content, file);
          patterns.push(...filePatterns);
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Remove duplicates and aggregate
      const uniquePatterns = this.aggregatePatterns(patterns);

      // Categorize patterns
      const categorizedPatterns = this.categorizePatterns(uniquePatterns);

      // Calculate pattern score
      const patternScore = this.calculatePatternScore({
        patterns: uniquePatterns.length,
        categories: Object.keys(categorizedPatterns).length,
        files: jsFiles.length
      });

      return {
        patterns: uniquePatterns,
        categorized: categorizedPatterns,
        metrics: {
          totalFiles: jsFiles.length,
          patternsDetected: uniquePatterns.length,
          categoriesFound: Object.keys(categorizedPatterns).length
        },
        score: patternScore,
        level: this.getPatternLevel(patternScore)
      };
    } catch (error) {
      logger.error(`Code pattern analysis failed: ${error.message}`);
      return { 
        patterns: [], 
        categorized: {},
        metrics: {},
        score: 0,
        level: 'unknown'
      };
    }
  }

  /**
   * Detect code patterns
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Array} Detected patterns
   */
  detectCodePatterns(content, filePath) {
    const patterns = [];

    // ARCHITECTURAL PATTERNS (like OLD version)
    if (this.hasMVCStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'MVC Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Model-View-Controller architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasLayeredArchitecture(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Layered Architecture',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Multi-layer architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasMicroservicesStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Microservices',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Microservices architecture detected',
        category: 'architectural'
      });
    }

    if (this.hasMonorepoStructure(content, filePath)) {
      patterns.push({
        type: 'architectural',
        name: 'Monorepo',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Monorepo structure detected',
        category: 'architectural'
      });
    }

    // Creational Patterns
    if (content.includes('getInstance') || content.includes('instance')) {
      patterns.push({
        type: 'creational',
        name: 'Singleton Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Singleton pattern usage detected',
        category: 'creational'
      });
    }

    if (content.includes('create') && content.includes('factory')) {
      patterns.push({
        type: 'creational',
        name: 'Factory Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Factory pattern usage detected',
        category: 'creational'
      });
    }

    if (content.includes('new') && content.includes('Builder')) {
      patterns.push({
        type: 'creational',
        name: 'Builder Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Builder pattern usage detected',
        category: 'creational'
      });
    }

    // Structural Patterns
    if (content.includes('extends') || content.includes('class') && content.includes('implements')) {
      patterns.push({
        type: 'structural',
        name: 'Inheritance Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Inheritance pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('composition') || content.includes('compose')) {
      patterns.push({
        type: 'structural',
        name: 'Composition Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Composition pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('adapter') || content.includes('adapt')) {
      patterns.push({
        type: 'structural',
        name: 'Adapter Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Adapter pattern usage detected',
        category: 'structural'
      });
    }

    if (content.includes('decorator') || content.includes('decorate')) {
      patterns.push({
        type: 'structural',
        name: 'Decorator Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Decorator pattern usage detected',
        category: 'structural'
      });
    }

    // Behavioral Patterns
    if (content.includes('addEventListener') || content.includes('on(') || content.includes('emit(')) {
      patterns.push({
        type: 'behavioral',
        name: 'Observer Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Observer pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('strategy') || (content.includes('function') && content.includes('switch'))) {
      patterns.push({
        type: 'behavioral',
        name: 'Strategy Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Strategy pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('command') || content.includes('execute')) {
      patterns.push({
        type: 'behavioral',
        name: 'Command Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Command pattern usage detected',
        category: 'behavioral'
      });
    }

    if (content.includes('state') && content.includes('transition')) {
      patterns.push({
        type: 'behavioral',
        name: 'State Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'State pattern usage detected',
        category: 'behavioral'
      });
    }

    // Repository Pattern
    if (content.includes('repository') || content.includes('findBy') || content.includes('save(')) {
      patterns.push({
        type: 'structural',
        name: 'Repository Pattern',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Repository pattern usage detected',
        category: 'structural'
      });
    }

    // Dependency Injection
    if (content.includes('inject') || content.includes('dependency') || content.includes('DI')) {
      patterns.push({
        type: 'structural',
        name: 'Dependency Injection',
        confidence: 'medium',
        file: path.relative(process.cwd(), filePath),
        description: 'Dependency injection pattern usage detected',
        category: 'structural'
      });
    }

    // Module Pattern
    if (content.includes('module.exports') || content.includes('export default')) {
      patterns.push({
        type: 'structural',
        name: 'Module Pattern',
        confidence: 'high',
        file: path.relative(process.cwd(), filePath),
        description: 'Module pattern usage detected',
        category: 'structural'
      });
    }

    return patterns;
  }

  /**
   * Check for MVC structure (like OLD version)
   */
  hasMVCStructure(content, filePath) {
    const hasModels = content.includes('model') || content.includes('entity') || content.includes('Model');
    const hasViews = content.includes('view') || content.includes('component') || content.includes('View');
    const hasControllers = content.includes('controller') || content.includes('handler') || content.includes('Controller');
    
    return hasModels && hasViews && hasControllers;
  }

  /**
   * Check for layered architecture (like OLD version)
   */
  hasLayeredArchitecture(content, filePath) {
    const layerIndicators = ['presentation', 'business', 'data', 'infrastructure', 'domain'];
    const layerCount = layerIndicators.filter(indicator => 
      content.includes(indicator)
    ).length;
    
    return layerCount >= 3;
  }

  /**
   * Check for microservices structure (like OLD version)
   */
  hasMicroservicesStructure(content, filePath) {
    const hasServices = content.includes('service') || content.includes('Service');
    const hasIndependentConfigs = content.includes('config') || content.includes('Config');
    const hasMultipleServices = (content.match(/service/gi) || []).length > 2;
    
    return hasServices && hasIndependentConfigs && hasMultipleServices;
  }

  /**
   * Check for monorepo structure (like OLD version)
   */
  hasMonorepoStructure(content, filePath) {
    const hasPackages = content.includes('packages') || content.includes('apps');
    const hasMultipleApps = (content.match(/app/gi) || []).length > 1;
    const hasWorkspace = content.includes('workspace') || content.includes('lerna');
    
    return hasPackages || hasMultipleApps || hasWorkspace;
  }

  /**
   * Aggregate patterns to remove duplicates
   * @param {Array} patterns - Raw patterns
   * @returns {Array} Unique patterns
   */
  aggregatePatterns(patterns) {
    const patternMap = new Map();
    
    patterns.forEach(pattern => {
      const key = pattern.name;
      if (patternMap.has(key)) {
        const existing = patternMap.get(key);
        existing.files = existing.files || [];
        existing.files.push(pattern.file);
        existing.confidence = existing.confidence === 'high' ? 'high' : pattern.confidence;
        existing.count = (existing.count || 1) + 1;
      } else {
        patternMap.set(key, {
          ...pattern,
          files: pattern.file ? [pattern.file] : [],
          count: 1
        });
      }
    });

    return Array.from(patternMap.values());
  }

  /**
   * Categorize patterns by type
   * @param {Array} patterns - Patterns to categorize
   * @returns {Object} Categorized patterns
   */
  categorizePatterns(patterns) {
    const categorized = {
      creational: [],
      structural: [],
      behavioral: [],
      architectural: []
    };

    patterns.forEach(pattern => {
      if (categorized[pattern.category]) {
        categorized[pattern.category].push(pattern);
      } else {
        categorized.architectural.push(pattern);
      }
    });

    return categorized;
  }

  /**
   * Calculate pattern score
   * @param {Object} data - Analysis data
   * @returns {number} Pattern score (0-100)
   */
  calculatePatternScore(data) {
    const { patterns, categories, files } = data;
    
    // Base score starts at 50
    let score = 50;

    // Reward for pattern diversity (up to +30 points)
    const patternBonus = Math.min(patterns * 3, 30);
    score += patternBonus;

    // Reward for category diversity (up to +20 points)
    const categoryBonus = Math.min(categories * 5, 20);
    score += categoryBonus;

    // Bonus for pattern density (up to +10 points)
    if (files > 0 && patterns / files > 0.1) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get pattern level
   * @param {number} score - Pattern score
   * @returns {string} Pattern level
   */
  getPatternLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Get JavaScript files from project
   * @param {string} projectPath - Project path
   * @returns {Promise<Array>} JavaScript files
   */
  async getJavaScriptFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => 
      /\.(js|jsx|ts|tsx)$/i.test(file) && 
      !file.includes('node_modules') &&  // SKIP node_modules (correct!)
      !file.includes('.git')             // SKIP .git (correct!)
    );
  }

  /**
   * Get all files from directory recursively
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} All files
   */
  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // SKIP node_modules and .git (correct!)
          if (!item.startsWith('.') && item !== 'node_modules' && item !== '.git') {
            files.push(...await this.getAllFiles(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Clean and format result
   * @param {Object} result - Analysis result
   * @returns {Object} Cleaned result
   */
  cleanResult(result) {
    return {
      ...result,
      timestamp: new Date().toISOString(),
      step: PatternAnalysisStep,
      category: 'architecture',
      subcategory: 'pattern'
    };
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath) {
      throw new Error('Project path is required for pattern analysis');
    }
  }

  /**
   * Calculate analysis coverage
   * @param {Array} files - Analyzed files
   * @param {string} projectPath - Project path
   * @returns {number} Coverage percentage
   */
  calculateCoverage(files, projectPath) {
    // This is a simplified coverage calculation
    return Math.min((files.length / 100) * 100, 100);
  }

  /**
   * Calculate analysis confidence
   * @param {Object} result - Analysis result
   * @returns {number} Confidence percentage
   */
  calculateConfidence(result) {
    const { patterns, categorized, metrics } = result;
    
    if (!patterns || !categorized || !metrics) return 0;
    
    // Higher confidence with more patterns
    const patternConfidence = Math.min(patterns.length * 5, 60);
    
    // Additional confidence for category diversity
    const categoryConfidence = Math.min(Object.keys(categorized).length * 10, 40);
    
    return Math.min(patternConfidence + categoryConfidence, 100);
  }

  /**
   * Generate issues from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Issues array
   */
  generateIssues(result) {
    const issues = [];
    
    // Check for low pattern score
    if (result.score < 70) {
      issues.push({
        type: 'low-pattern-score',
        title: 'Low Pattern Analysis Score',
        description: `Pattern analysis score of ${result.score}% indicates poor pattern implementation`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Improve pattern implementation and follow design pattern best practices'
      });
    }

    // Check for missing design patterns
    if (result.patterns && result.patterns.length < 3) {
      issues.push({
        type: 'insufficient-patterns',
        title: 'Insufficient Design Patterns',
        description: `Only ${result.patterns.length} design patterns detected, insufficient for good architecture`,
        severity: 'medium',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Implement more design patterns to improve code organization and maintainability'
      });
    }

    // Check for anti-patterns
    if (result.patterns && result.patterns.some(pattern => pattern.type === 'anti-pattern')) {
      issues.push({
        type: 'anti-patterns-detected',
        title: 'Anti-Patterns Detected',
        description: 'Anti-patterns found in the codebase',
        severity: 'high',
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Refactor code to remove anti-patterns and improve code quality'
      });
    }

    // Check for missing architectural patterns
    const hasArchitecturalPatterns = result.patterns && result.patterns.some(pattern => 
      pattern.category === 'architectural' || pattern.type === 'architectural'
    );
    if (!hasArchitecturalPatterns) {
      issues.push({
        type: 'missing-architectural-patterns',
        title: 'Missing Architectural Patterns',
        description: 'No architectural patterns detected in the codebase',
        severity: 'high',
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        location: 'pattern-analysis',
        suggestion: 'Implement architectural patterns (MVC, DDD, CQRS, etc.) for better organization'
      });
    }

    return issues;
  }

  /**
   * Generate recommendations from analysis results
   * @param {Object} result - Analysis result
   * @returns {Array} Recommendations array
   */
  generateRecommendations(result) {
    const recommendations = [];
    
    // Check for low analysis score
    if (result.score < 80) {
      recommendations.push({
        type: 'improve-score',
        title: 'Improve Analysis Score',
        description: `Current score of ${result.score}% can be improved`,
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Implement best practices to improve analysis score',
        impact: 'Better code quality and maintainability'
      });
    }

    // Check for missing patterns
    if (result.patterns && result.patterns.length < 3) {
      recommendations.push({
        type: 'add-patterns',
        title: 'Add More Design Patterns',
        description: 'Consider implementing additional design patterns',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Research and implement appropriate design patterns',
        impact: 'Improved code organization and maintainability'
      });
    }

    // Check for security improvements
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      recommendations.push({
        type: 'security-improvements',
        title: 'Address Security Vulnerabilities',
        description: `${result.vulnerabilities.length} vulnerabilities found`,
        priority: 'high',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Review and fix identified security vulnerabilities',
        impact: 'Enhanced security posture'
      });
    }

    // Check for performance improvements
    if (result.metrics && result.metrics.performanceScore < 80) {
      recommendations.push({
        type: 'performance-improvements',
        title: 'Improve Performance',
        description: 'Performance analysis indicates room for improvement',
        priority: 'medium',
        category: 'architecture',
        source: 'PatternAnalysisStep',
        action: 'Optimize code for better performance',
        impact: 'Faster execution and better user experience'
      });
    }

    return recommendations;
  }
  /**
   * Generate tasks from analysis results
   * @param {Object} result - Analysis result
   * @param {Object} context - Execution context
   * @returns {Array} Tasks array
   */
  async generateTasks(result, context) {
    const tasks = [];
    const projectId = context.projectId || 'default-project';
    
    // Create main improvement task
    const mainTask = {
      id: `pattern-analysis-step-improvement-${Date.now()}`,
      title: `Improve ${PatternAnalysisStep} Results`,
      description: `Address issues and implement recommendations from ${PatternAnalysisStep} analysis`,
      type: 'improvement',
      category: 'architecture',
      priority: 'medium',
      status: 'pending',
      projectId: projectId,
      metadata: {
        source: 'PatternAnalysisStep',
        score: result.score || 0,
        issues: result.issues ? result.issues.length : 0,
        recommendations: result.recommendations ? result.recommendations.length : 0
      },
      estimatedHours: 4,
      phase: 'improvement',
      stage: 'planning'
    };
    
    tasks.push(mainTask);
    
    // Create subtasks for critical issues
    if (result.issues && result.issues.some(issue => issue.severity === 'critical')) {
      const criticalTask = {
        id: `pattern-analysis-step-critical-${Date.now()}`,
        title: `Fix Critical Issues from ${PatternAnalysisStep}`,
        description: 'Address critical issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'critical',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'PatternAnalysisStep',
          issues: result.issues.filter(issue => issue.severity === 'critical')
        },
        estimatedHours: 4,
        phase: 'critical-fixes',
        stage: 'implementation'
      };
      tasks.push(criticalTask);
    }
    
    // Create subtasks for high priority issues
    if (result.issues && result.issues.some(issue => issue.severity === 'high')) {
      const highTask = {
        id: `pattern-analysis-step-high-${Date.now()}`,
        title: `Fix High Priority Issues from ${PatternAnalysisStep}`,
        description: 'Address high priority issues identified in analysis',
        type: 'fix',
        category: 'architecture',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        parentTaskId: mainTask.id,
        metadata: {
          source: 'PatternAnalysisStep',
          issues: result.issues.filter(issue => issue.severity === 'high')
        },
        estimatedHours: 3,
        phase: 'high-fixes',
        stage: 'implementation'
      };
      tasks.push(highTask);
    }
    
    return tasks;
  }

  /**
   * Calculate estimated hours for tasks
   * @param {Object} result - Analysis result
   * @returns {number} Estimated hours
   */
  calculateEstimatedHours(result) {
    let totalHours = 2; // Base hours for improvement
    
    if (result.issues) {
      result.issues.forEach(issue => {
        switch (issue.severity) {
          case 'critical':
            totalHours += 2;
            break;
          case 'high':
            totalHours += 1.5;
            break;
          case 'medium':
            totalHours += 1;
            break;
          case 'low':
            totalHours += 0.5;
            break;
        }
      });
    }
    
    if (result.recommendations) {
      totalHours += result.recommendations.length * 0.5;
    }
    
    return Math.round(totalHours * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Create documentation from analysis results
   * @param {Object} result - Analysis result
   * @param {string} projectPath - Project path
   * @param {Object} context - Execution context
   * @returns {Array} Documentation array
   */
  async createDocumentation(result, projectPath, context) {
    const docs = [];
    const docsDir = path.join(projectPath, 'docs', 'analysis', 'architecture', 'pattern-analysis-step');
    
    // Ensure directory exists
    try {
      await fs.mkdir(docsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
    
    
    // Create implementation file
    const implementationDoc = await this.createImplementationDoc(result, docsDir);
    docs.push(implementationDoc);
    
    // Create analysis report
    const analysisReport = await this.createAnalysisReport(result, docsDir);
    docs.push(analysisReport);
    
    return docs;
  }

  /**
   * Create implementation documentation
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Implementation document
   */
  async createImplementationDoc(result, docsDir) {
    const docPath = path.join(docsDir, 'pattern-analysis-implementation.md');
    
    const content = `# Pattern Analysis Implementation

## 📋 Analysis Overview
- **Step Name**: ${PatternAnalysisStep}
- **Category**: architecture
- **Analysis Date**: ${new Date().toISOString()}
- **Score**: ${result.score || 0}%
- **Level**: ${result.level || 'unknown'}

## 📊 Analysis Results
- **Total Patterns Detected**: ${result.metrics?.patternsDetected || 0}
- **Categories Found**: ${result.metrics?.categoriesFound || 0}
- **Files Analyzed**: ${result.metrics?.totalFiles || 0}

## 🎯 Key Findings
${result.patterns ? result.patterns.map(pattern => `- **${pattern.name}**: ${pattern.description}`).join('\n') : '- No patterns detected'}

## 📝 Recommendations
${result.recommendations ? result.recommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n') : '- No recommendations'}

## 🔧 Implementation Tasks
${result.tasks ? result.tasks.map(task => `- **${task.title}**: ${task.description} (${task.estimatedHours}h)`).join('\n') : '- No tasks generated'}
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'implementation',
      title: 'Pattern Analysis Implementation',
      path: docPath,
      category: 'architecture',
      source: PatternAnalysisStep
    };
  }

  /**
   * Create analysis report
   * @param {Object} result - Analysis result
   * @param {string} docsDir - Documentation directory
   * @returns {Object} Analysis report
   */
  async createAnalysisReport(result, docsDir) {
    const docPath = path.join(docsDir, 'pattern-analysis-report.md');
    
    const content = `# Pattern Analysis Report

## 📊 Executive Summary
Pattern analysis completed with a score of ${result.score || 0}% (${result.level || 'unknown'} level).

## 🔍 Detailed Analysis
${result.categorized ? Object.entries(result.categorized).map(([category, patterns]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Patterns
${patterns.map(pattern => `- ${pattern.name}: ${pattern.description}`).join('\n')}
`).join('\n') : 'No categorized patterns found'}

## 📈 Metrics
- **Pattern Coverage**: ${result.metrics?.patternsDetected || 0} patterns detected
- **Category Diversity**: ${result.metrics?.categoriesFound || 0} categories found
- **File Coverage**: ${result.metrics?.totalFiles || 0} files analyzed

## 🎯 Next Steps
Based on the analysis, consider implementing additional design patterns to improve code quality and maintainability.
`;

    await fs.writeFile(docPath, content, 'utf8');
    
    return {
      type: 'report',
      title: 'Pattern Analysis Report',
      path: docPath,
      category: 'architecture',
      source: PatternAnalysisStep
    };
  }
} analysis (4h)
