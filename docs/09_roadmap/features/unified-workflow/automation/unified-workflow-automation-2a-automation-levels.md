# Unified Workflow Automation 2A: Automation Level System

## 1. Project Overview
- **Feature/Component Name**: Automation Level System
- **Priority**: High
- **Estimated Time**: 80 hours (2 weeks)
- **Dependencies**: Foundation 1A (Core Interfaces & Context), Foundation 1B (Builder Pattern & Common Steps)
- **Related Issues**: Manual workflow execution, inconsistent automation levels, limited user control

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript ES6+, Domain-Driven Design, AI confidence scoring
- **Architecture Pattern**: DDD with automation level management
- **Database Changes**: Add automation preferences table
- **API Changes**: New automation preferences endpoints
- **Frontend Changes**: None (backend system)
- **Backend Changes**: Automation level system and user preferences

## 3. Implementation Files

#### Files to Create:
- [ ] `backend/domain/workflows/automation/AutomationLevel.js` - Automation level enumeration
- [ ] `backend/domain/workflows/automation/AutomationManager.js` - Automation level management
- [ ] `backend/domain/workflows/automation/ConfidenceCalculator.js` - AI confidence calculation
- [ ] `backend/domain/workflows/automation/UserPreferenceManager.js` - User preference management
- [ ] `backend/domain/workflows/automation/ProjectAutomationSettings.js` - Project-level settings
- [ ] `backend/domain/workflows/automation/AutomationRule.js` - Automation rules
- [ ] `backend/domain/workflows/automation/AutomationRuleEngine.js` - Rule engine
- [ ] `backend/domain/workflows/automation/AutomationContext.js` - Automation context
- [ ] `backend/domain/workflows/automation/AutomationResult.js` - Automation result
- [ ] `backend/domain/workflows/automation/AutomationStrategy.js` - Automation strategy
- [ ] `backend/domain/workflows/automation/AutomationStrategyFactory.js` - Strategy factory
- [ ] `backend/domain/workflows/automation/AutomationMetrics.js` - Automation metrics
- [ ] `backend/domain/workflows/automation/AutomationAudit.js` - Automation audit
- [ ] `backend/domain/workflows/automation/exceptions/AutomationException.js` - Automation exceptions
- [ ] `backend/domain/workflows/automation/index.js` - Module exports

#### Files to Modify:
- [ ] `backend/domain/services/auto-finish/AutoFinishSystem.js` - Integrate with automation levels
- [ ] `backend/domain/services/WorkflowOrchestrationService.js` - Use automation manager
- [ ] `backend/domain/entities/Task.js` - Add automation level metadata
- [ ] `backend/domain/entities/TaskExecution.js` - Add automation level tracking
- [ ] `backend/infrastructure/database/migrations/001_create_automation_preferences.sql` - Database migration

## 4. Implementation Phases

#### Phase 1: Core Automation System (30 hours)
- [ ] Create AutomationLevel enumeration with 5 levels (manual, assisted, semi_auto, full_auto, adaptive)
- [ ] Implement AutomationManager with confidence-based automation
- [ ] Create ConfidenceCalculator with AI confidence scoring algorithms
- [ ] Implement UserPreferenceManager with preference persistence
- [ ] Create ProjectAutomationSettings with project-level configuration

#### Phase 2: Rule Engine & Strategy (30 hours)
- [ ] Implement AutomationRule with configurable automation rules
- [ ] Create AutomationRuleEngine with rule processing logic
- [ ] Implement AutomationStrategy with different automation strategies
- [ ] Create AutomationStrategyFactory with strategy creation
- [ ] Add AutomationContext with automation execution context

#### Phase 3: Integration & Database (20 hours)
- [ ] Create database migration for automation preferences
- [ ] Integrate automation levels with AutoFinishSystem
- [ ] Update WorkflowOrchestrationService to use automation manager
- [ ] Add automation level tracking to Task and TaskExecution entities
- [ ] Create automation metrics and audit system

## 5. Automation Level System Design

#### AutomationLevel Enumeration
```javascript
/**
 * Automation level enumeration
 */
class AutomationLevel {
  static MANUAL = 'manual';
  static ASSISTED = 'assisted';
  static SEMI_AUTO = 'semi_auto';
  static FULL_AUTO = 'full_auto';
  static ADAPTIVE = 'adaptive';

  static getAll() {
    return [
      AutomationLevel.MANUAL,
      AutomationLevel.ASSISTED,
      AutomationLevel.SEMI_AUTO,
      AutomationLevel.FULL_AUTO,
      AutomationLevel.ADAPTIVE
    ];
  }

  static getDescription(level) {
    const descriptions = {
      [AutomationLevel.MANUAL]: 'Full human control with no automation',
      [AutomationLevel.ASSISTED]: 'AI assistance with human confirmation',
      [AutomationLevel.SEMI_AUTO]: 'AI execution with human oversight',
      [AutomationLevel.FULL_AUTO]: 'Complete automation with minimal human intervention',
      [AutomationLevel.ADAPTIVE]: 'Dynamic automation level based on context'
    };
    return descriptions[level] || 'Unknown automation level';
  }

  static requiresConfirmation(level) {
    return [AutomationLevel.ASSISTED, AutomationLevel.SEMI_AUTO].includes(level);
  }

  static requiresHumanReview(level) {
    return [AutomationLevel.MANUAL, AutomationLevel.ASSISTED].includes(level);
  }

  static isFullyAutomated(level) {
    return [AutomationLevel.FULL_AUTO, AutomationLevel.ADAPTIVE].includes(level);
  }

  static getConfidenceThreshold(level) {
    const thresholds = {
      [AutomationLevel.MANUAL]: 0.0,
      [AutomationLevel.ASSISTED]: 0.6,
      [AutomationLevel.SEMI_AUTO]: 0.7,
      [AutomationLevel.FULL_AUTO]: 0.8,
      [AutomationLevel.ADAPTIVE]: 0.75
    };
    return thresholds[level] || 0.5;
  }
}
```

#### AutomationManager Implementation
```javascript
/**
 * Automation level management
 */
class AutomationManager {
  constructor(options = {}) {
    this.defaultLevel = options.defaultLevel || AutomationLevel.SEMI_AUTO;
    this.confidenceThreshold = options.confidenceThreshold || 0.8;
    this.userPreferences = new Map();
    this.projectSettings = new Map();
    this.confidenceCalculator = new ConfidenceCalculator();
    this.ruleEngine = new AutomationRuleEngine();
  }

  /**
   * Determine automation level for task
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {AutomationLevel} Determined automation level
   */
  async determineAutomationLevel(task, context) {
    // Check user preferences first
    const userLevel = await this.getUserPreference(context.userId);
    if (userLevel) {
      return userLevel;
    }

    // Check project settings
    const projectLevel = await this.getProjectSetting(task.projectId);
    if (projectLevel) {
      return projectLevel;
    }

    // Check task type requirements
    const taskLevel = this.getTaskTypeLevel(task.type);
    if (taskLevel) {
      return taskLevel;
    }

    // Check AI confidence for adaptive automation
    const confidence = await this.calculateConfidence(task, context);
    if (confidence >= this.confidenceThreshold) {
      return AutomationLevel.FULL_AUTO;
    }

    // Apply automation rules
    const ruleLevel = await this.ruleEngine.evaluateRules(task, context);
    if (ruleLevel) {
      return ruleLevel;
    }

    return this.defaultLevel;
  }

  /**
   * Calculate AI confidence for task
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Confidence score (0-1)
   */
  async calculateConfidence(task, context) {
    return await this.confidenceCalculator.calculate(task, context);
  }

  /**
   * Set user automation preference
   * @param {string} userId - User ID
   * @param {AutomationLevel} level - Preferred automation level
   */
  async setUserPreference(userId, level) {
    this.userPreferences.set(userId, level);
    // Persist to database
    await this.saveUserPreference(userId, level);
  }

  /**
   * Get user automation preference
   * @param {string} userId - User ID
   * @returns {Promise<AutomationLevel|null>} User preference
   */
  async getUserPreference(userId) {
    // Check memory first
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId);
    }
    
    // Load from database
    const preference = await this.loadUserPreference(userId);
    if (preference) {
      this.userPreferences.set(userId, preference);
    }
    
    return preference;
  }

  /**
   * Set project automation setting
   * @param {string} projectId - Project ID
   * @param {AutomationLevel} level - Project automation level
   */
  async setProjectSetting(projectId, level) {
    this.projectSettings.set(projectId, level);
    // Persist to database
    await this.saveProjectSetting(projectId, level);
  }

  /**
   * Get project automation setting
   * @param {string} projectId - Project ID
   * @returns {Promise<AutomationLevel|null>} Project setting
   */
  async getProjectSetting(projectId) {
    // Check memory first
    if (this.projectSettings.has(projectId)) {
      return this.projectSettings.get(projectId);
    }
    
    // Load from database
    const setting = await this.loadProjectSetting(projectId);
    if (setting) {
      this.projectSettings.set(projectId, setting);
    }
    
    return setting;
  }

  /**
   * Get automation level for task type
   * @param {TaskType} taskType - Task type
   * @returns {AutomationLevel|null} Task type level
   */
  getTaskTypeLevel(taskType) {
    const typeLevels = {
      'refactor': AutomationLevel.SEMI_AUTO,
      'analysis': AutomationLevel.FULL_AUTO,
      'testing': AutomationLevel.SEMI_AUTO,
      'documentation': AutomationLevel.FULL_AUTO,
      'deployment': AutomationLevel.MANUAL,
      'security': AutomationLevel.ASSISTED
    };
    
    return typeLevels[taskType.value] || null;
  }
}
```

#### ConfidenceCalculator Implementation
```javascript
/**
 * AI confidence calculation
 */
class ConfidenceCalculator {
  constructor() {
    this.factors = {
      taskComplexity: 0.3,
      historicalSuccess: 0.25,
      codeQuality: 0.2,
      userExperience: 0.15,
      systemHealth: 0.1
    };
  }

  /**
   * Calculate confidence for task
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Confidence score (0-1)
   */
  async calculate(task, context) {
    const scores = {};

    // Calculate task complexity score
    scores.taskComplexity = await this.calculateTaskComplexity(task, context);
    
    // Calculate historical success score
    scores.historicalSuccess = await this.calculateHistoricalSuccess(task, context);
    
    // Calculate code quality score
    scores.codeQuality = await this.calculateCodeQuality(task, context);
    
    // Calculate user experience score
    scores.userExperience = await this.calculateUserExperience(task, context);
    
    // Calculate system health score
    scores.systemHealth = await this.calculateSystemHealth(task, context);

    // Weighted average
    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(this.factors)) {
      totalScore += scores[factor] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate task complexity score
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Complexity score (0-1)
   */
  async calculateTaskComplexity(task, context) {
    const complexityFactors = {
      fileCount: 0.3,
      codeLines: 0.2,
      dependencies: 0.2,
      taskType: 0.15,
      projectSize: 0.15
    };

    // Analyze task metadata
    const fileCount = task.metadata.fileCount || 1;
    const codeLines = task.metadata.codeLines || 100;
    const dependencies = task.metadata.dependencies || 0;
    const projectSize = context.get('projectSize') || 'medium';

    // Normalize scores
    const fileScore = Math.min(fileCount / 10, 1);
    const lineScore = Math.min(codeLines / 1000, 1);
    const depScore = Math.min(dependencies / 20, 1);
    const projectScore = this.getProjectSizeScore(projectSize);
    const typeScore = this.getTaskTypeComplexityScore(task.type.value);

    return (
      fileScore * complexityFactors.fileCount +
      lineScore * complexityFactors.codeLines +
      depScore * complexityFactors.dependencies +
      projectScore * complexityFactors.projectSize +
      typeScore * complexityFactors.taskType
    );
  }

  /**
   * Calculate historical success score
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Historical success score (0-1)
   */
  async calculateHistoricalSuccess(task, context) {
    const taskRepository = context.get('taskRepository');
    if (!taskRepository) {
      return 0.5; // Default score
    }

    // Get historical tasks of same type
    const historicalTasks = await taskRepository.findByType(task.type.value, {
      limit: 50,
      status: 'completed'
    });

    if (historicalTasks.length === 0) {
      return 0.5; // Default score for new task types
    }

    // Calculate success rate
    const successfulTasks = historicalTasks.filter(t => 
      t.metadata?.result?.success === true
    );

    return successfulTasks.length / historicalTasks.length;
  }

  /**
   * Calculate code quality score
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} Code quality score (0-1)
   */
  async calculateCodeQuality(task, context) {
    const analysisService = context.get('analysisService');
    if (!analysisService) {
      return 0.5; // Default score
    }

    try {
      const qualityMetrics = await analysisService.getCodeQualityMetrics(
        task.metadata.projectPath,
        task.metadata.filePath
      );

      return this.normalizeQualityMetrics(qualityMetrics);
    } catch (error) {
      return 0.5; // Default score on error
    }
  }

  /**
   * Calculate user experience score
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} User experience score (0-1)
   */
  async calculateUserExperience(task, context) {
    const userId = context.get('userId');
    const userRepository = context.get('userRepository');
    
    if (!userId || !userRepository) {
      return 0.5; // Default score
    }

    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return 0.5;
      }

      // Consider user's experience level and preferences
      const experienceLevel = user.metadata?.experienceLevel || 'intermediate';
      const automationPreference = user.metadata?.automationPreference || 'balanced';

      return this.calculateUserExperienceScore(experienceLevel, automationPreference);
    } catch (error) {
      return 0.5; // Default score on error
    }
  }

  /**
   * Calculate system health score
   * @param {Task} task - Task to analyze
   * @param {Object} context - Execution context
   * @returns {Promise<number>} System health score (0-1)
   */
  async calculateSystemHealth(task, context) {
    const systemHealthService = context.get('systemHealthService');
    if (!systemHealthService) {
      return 0.8; // Default healthy score
    }

    try {
      const healthMetrics = await systemHealthService.getHealthMetrics();
      return this.normalizeHealthMetrics(healthMetrics);
    } catch (error) {
      return 0.8; // Default healthy score on error
    }
  }

  // Helper methods for score calculation
  getProjectSizeScore(projectSize) {
    const scores = {
      'small': 0.9,
      'medium': 0.7,
      'large': 0.5,
      'enterprise': 0.3
    };
    return scores[projectSize] || 0.7;
  }

  getTaskTypeComplexityScore(taskType) {
    const scores = {
      'refactor': 0.6,
      'analysis': 0.8,
      'testing': 0.7,
      'documentation': 0.9,
      'deployment': 0.4,
      'security': 0.5
    };
    return scores[taskType] || 0.7;
  }

  normalizeQualityMetrics(metrics) {
    // Normalize various quality metrics to 0-1 scale
    const normalizedMetrics = {
      testCoverage: Math.min(metrics.testCoverage / 100, 1),
      codeComplexity: Math.max(1 - metrics.complexity / 10, 0),
      maintainability: Math.min(metrics.maintainability / 100, 1),
      securityScore: Math.min(metrics.securityScore / 100, 1)
    };

    return Object.values(normalizedMetrics).reduce((sum, score) => sum + score, 0) / Object.keys(normalizedMetrics).length;
  }

  calculateUserExperienceScore(experienceLevel, automationPreference) {
    const experienceScores = {
      'beginner': 0.3,
      'intermediate': 0.6,
      'advanced': 0.9,
      'expert': 1.0
    };

    const preferenceScores = {
      'manual': 0.2,
      'assisted': 0.4,
      'balanced': 0.6,
      'automated': 0.8,
      'full_auto': 1.0
    };

    const experienceScore = experienceScores[experienceLevel] || 0.6;
    const preferenceScore = preferenceScores[automationPreference] || 0.6;

    return (experienceScore + preferenceScore) / 2;
  }

  normalizeHealthMetrics(metrics) {
    // Normalize system health metrics to 0-1 scale
    const normalizedMetrics = {
      cpuUsage: Math.max(1 - metrics.cpuUsage / 100, 0),
      memoryUsage: Math.max(1 - metrics.memoryUsage / 100, 0),
      diskUsage: Math.max(1 - metrics.diskUsage / 100, 0),
      networkLatency: Math.max(1 - metrics.networkLatency / 1000, 0)
    };

    return Object.values(normalizedMetrics).reduce((sum, score) => sum + score, 0) / Object.keys(normalizedMetrics).length;
  }
}
```

## 6. Database Schema

#### Automation Preferences Table
```sql
-- Migration: 001_create_automation_preferences.sql
CREATE TABLE automation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  automation_level VARCHAR(20) NOT NULL CHECK (automation_level IN ('manual', 'assisted', 'semi_auto', 'full_auto', 'adaptive')),
  confidence_threshold DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX idx_automation_preferences_user_id ON automation_preferences(user_id);
CREATE INDEX idx_automation_preferences_project_id ON automation_preferences(project_id);
CREATE INDEX idx_automation_preferences_level ON automation_preferences(automation_level);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_automation_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_automation_preferences_updated_at
  BEFORE UPDATE ON automation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_preferences_updated_at();
```

## 7. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 95% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 8. Testing Strategy

#### Unit Tests: 15 test files (1 per implementation file)
- **Core System**: 5 test files for automation level system
- **Confidence**: 3 test files for confidence calculation
- **Preferences**: 3 test files for user preferences
- **Rules**: 2 test files for automation rules
- **Integration**: 2 test files for integration scenarios

#### Test Coverage Requirements:
- **Line Coverage**: 95% minimum
- **Branch Coverage**: 90% minimum
- **Function Coverage**: 100% minimum

## 9. Success Criteria

#### Technical Metrics:
- [ ] Automation level system fully functional
- [ ] Confidence calculation working accurately
- [ ] User preferences properly persisted
- [ ] Database migration executed successfully
- [ ] 95% test coverage achieved
- [ ] Zero breaking changes to existing APIs

#### Integration Metrics:
- [ ] AutoFinishSystem successfully integrated with automation levels
- [ ] WorkflowOrchestrationService using automation manager
- [ ] Task and TaskExecution entities tracking automation levels
- [ ] All existing functionality preserved

## 10. Risk Assessment

#### High Risk:
- [ ] Confidence calculation accuracy - Mitigation: Comprehensive testing and validation
- [ ] Database migration complexity - Mitigation: Thorough migration testing

#### Medium Risk:
- [ ] Performance impact of confidence calculation - Mitigation: Caching and optimization
- [ ] User preference conflicts - Mitigation: Clear precedence rules

#### Low Risk:
- [ ] API endpoint design - Mitigation: Early API review
- [ ] Documentation completeness - Mitigation: Automated documentation generation

## 11. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/unified-workflow-automation-2a-automation-levels.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/unified-workflow-automation-2a",
  "confirmation_keywords": ["fertig", "done", "complete", "automation levels ready"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 1800
}
```

#### Success Indicators:
- [ ] All 15 new files created with proper JSDoc
- [ ] All 5 existing files modified correctly
- [ ] Database migration executed successfully
- [ ] Automation level system functional
- [ ] Confidence calculation working
- [ ] User preferences persisted
- [ ] All tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 12. References & Resources
- **Technical Documentation**: AI confidence scoring, Automation patterns, User preference management
- **API References**: Existing PIDEA patterns and conventions
- **Design Patterns**: Strategy pattern, Factory pattern, Observer pattern
- **Best Practices**: Automation best practices, User experience design
- **Similar Implementations**: Existing AutoFinishSystem patterns in PIDEA

---

## Database Task Creation Instructions

This subtask will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  'pidea-backend', -- From context
  'Unified Workflow Automation 2A: Automation Level System', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'backend', -- Derived from context
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/unified-workflow-automation-2a-automation-levels.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  80 -- From section 1 (total hours)
);
``` 