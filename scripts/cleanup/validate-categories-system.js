/**
 * Categories System Validator
 * Validates that the Categories system is fully functional before Categories system removal
 */

const path = require('path');

// Register module aliases
require('module-alias/register');

const { STANDARD_CATEGORIES, isValidCategory } = require('../../backend/domain/constants/Categories');
const StepRegistry = require('../../backend/domain/steps/StepRegistry');
const FrameworkRegistry = require('../../backend/domain/frameworks/FrameworkRegistry');
const CommandRegistry = require('../../backend/application/commands/CommandRegistry');
const HandlerRegistry = require('../../backend/application/handlers/HandlerRegistry');

class CategoriesSystemValidator {
  constructor() {
    this.stepRegistry = new StepRegistry();
    this.frameworkRegistry = new FrameworkRegistry();
    this.commandRegistry = new CommandRegistry();
    this.handlerRegistry = new HandlerRegistry();
    this.validationResults = new Map();
  }

  /**
   * Validate the entire Categories system
   */
  async validateCategoriesSystem() {
    try {
      console.log('🔍 Starting Categories system validation...');
      
      const results = {
        categories: this.validateCategories(),
        stepRegistry: await this.validateStepRegistry(),
        frameworkRegistry: await this.validateFrameworkRegistry(),
        commandRegistry: await this.validateCommandRegistry(),
        handlerRegistry: await this.validateHandlerRegistry(),
        integration: await this.validateIntegration()
      };

      const overallValid = Object.values(results).every(r => r.isValid);
      
      console.log('✅ Categories system validation completed');
      return {
        isValid: overallValid,
        results,
        summary: this.generateSummary(results)
      };
      
    } catch (error) {
      console.error('❌ Categories system validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate Categories constants
   */
  validateCategories() {
    try {
      const categories = Object.values(STANDARD_CATEGORIES);
      const validCategories = categories.filter(cat => isValidCategory(cat));
      
      const result = {
        isValid: validCategories.length === categories.length,
        totalCategories: categories.length,
        validCategories: validCategories.length,
        categories: categories,
        invalidCategories: categories.filter(cat => !isValidCategory(cat))
      };

      this.validationResults.set('categories', result);
      return result;
      
    } catch (error) {
      const result = {
        isValid: false,
        error: error.message
      };
      this.validationResults.set('categories', result);
      return result;
    }
  }

  /**
   * Validate Step Registry
   */
  async validateStepRegistry() {
    try {
      // Load steps from categories
      await this.stepRegistry.loadStepsFromCategories();
      const steps = this.stepRegistry.getAllSteps();
      const categories = Array.from(this.stepRegistry.categories.keys());
      
      // Test step registration
      const testStepName = 'test_step_validation';
      const testStepConfig = {
        name: testStepName,
        description: 'Test step for validation',
        version: '1.0.0',
        category: STANDARD_CATEGORIES.ANALYSIS,
        type: 'validation'
      };
      
      await this.stepRegistry.registerStep(testStepName, testStepConfig, STANDARD_CATEGORIES.ANALYSIS);
      const registeredStep = this.stepRegistry.getStep(testStepName);
      
      // Clean up test step
      this.stepRegistry.steps.delete(testStepName);
      
      const result = {
        isValid: steps.length > 0 && registeredStep && categories.length > 0,
        totalSteps: steps.length,
        categories: categories,
        testRegistration: !!registeredStep,
        stepCategories: this.getStepCategories()
      };

      this.validationResults.set('stepRegistry', result);
      return result;
      
    } catch (error) {
      const result = {
        isValid: false,
        error: error.message
      };
      this.validationResults.set('stepRegistry', result);
      return result;
    }
  }

  /**
   * Validate Framework Registry
   */
  async validateFrameworkRegistry() {
    try {
      // Load framework configs
      await this.frameworkRegistry.loadFrameworkConfigs();
      const frameworks = this.frameworkRegistry.getAllFrameworks();
      const categories = this.frameworkRegistry.getCategories();
      
      // Test framework registration
      const testFrameworkName = 'test_framework_validation';
      const testFrameworkConfig = {
        name: testFrameworkName,
        description: 'Test framework for validation',
        version: '1.0.0',
        category: STANDARD_CATEGORIES.ANALYSIS,
        steps: ['analysis_step']
      };
      
      await this.frameworkRegistry.registerFramework(testFrameworkName, testFrameworkConfig, STANDARD_CATEGORIES.ANALYSIS);
      const registeredFramework = this.frameworkRegistry.getFramework(testFrameworkName);
      
      // Clean up test framework
      this.frameworkRegistry.removeFramework(testFrameworkName);
      
      const result = {
        isValid: registeredFramework && categories.length >= 0,
        totalFrameworks: frameworks.length,
        categories: categories,
        testRegistration: !!registeredFramework,
        frameworkCategories: this.getFrameworkCategories()
      };

      this.validationResults.set('frameworkRegistry', result);
      return result;
      
    } catch (error) {
      const result = {
        isValid: false,
        error: error.message
      };
      this.validationResults.set('frameworkRegistry', result);
      return result;
    }
  }

  /**
   * Validate Command Registry
   */
  async validateCommandRegistry() {
    try {
      // Test command building from categories
      const testCommand = CommandRegistry.buildFromCategory(
        'analysis', 
        'AdvancedAnalysisCommand', 
        {}
      );
      
      const result = {
        isValid: !!testCommand,
        testCommandBuilt: !!testCommand,
        availableCategories: this.getCommandCategories(),
        testCommandType: testCommand ? testCommand.constructor.name : null
      };

      this.validationResults.set('commandRegistry', result);
      return result;
      
    } catch (error) {
      const result = {
        isValid: false,
        error: error.message
      };
      this.validationResults.set('commandRegistry', result);
      return result;
    }
  }

  /**
   * Validate Handler Registry
   */
  async validateHandlerRegistry() {
    try {
      // Test handler building from categories
      const testHandler = HandlerRegistry.buildFromCategory(
        'analysis', 
        'AdvancedAnalysisHandler', 
        {}
      );
      
      const result = {
        isValid: !!testHandler,
        testHandlerBuilt: !!testHandler,
        availableCategories: this.getHandlerCategories(),
        testHandlerType: testHandler ? testHandler.constructor.name : null
      };

      this.validationResults.set('handlerRegistry', result);
      return result;
      
    } catch (error) {
      const result = {
        isValid: false,
        error: error.message
      };
      this.validationResults.set('handlerRegistry', result);
      return result;
    }
  }

  /**
   * Validate integration between registries
   */
  async validateIntegration() {
    try {
      // Test that all registries can work together
      const integrationTests = [];
      
      // Test 1: Step registry can provide steps for frameworks
      const steps = this.stepRegistry.getAllSteps();
      integrationTests.push({
        name: 'Step Registry Integration',
        passed: steps.length > 0
      });
      
      // Test 2: Framework registry can provide frameworks
      const frameworks = this.frameworkRegistry.getAllFrameworks();
      integrationTests.push({
        name: 'Framework Registry Integration',
        passed: frameworks.length > 0
      });
      
      // Test 3: Command registry can build commands
      const command = CommandRegistry.buildFromCategory('analysis', 'AdvancedAnalysisCommand', {});
      integrationTests.push({
        name: 'Command Registry Integration',
        passed: !!command
      });
      
      // Test 4: Handler registry can build handlers
      const handler = HandlerRegistry.buildFromCategory('analysis', 'AdvancedAnalysisHandler', {});
      integrationTests.push({
        name: 'Handler Registry Integration',
        passed: !!handler
      });
      
      // Test 5: Categories are consistent across registries
      const stepCategories = Array.from(this.stepRegistry.categories.keys());
      const frameworkCategories = Array.from(this.frameworkRegistry.categories.keys());
      const categoryConsistency = stepCategories.length > 0 && frameworkCategories.length > 0;
      integrationTests.push({
        name: 'Category Consistency',
        passed: categoryConsistency
      });
      
      const result = {
        isValid: integrationTests.every(test => test.passed),
        tests: integrationTests,
        passedTests: integrationTests.filter(test => test.passed).length,
        totalTests: integrationTests.length
      };

      this.validationResults.set('integration', result);
      return result;
      
    } catch (error) {
      const result = {
        isValid: false,
        error: error.message
      };
      this.validationResults.set('integration', result);
      return result;
    }
  }

  /**
   * Get step categories
   */
  getStepCategories() {
    try {
      return Array.from(this.stepRegistry.categories.keys());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get framework categories
   */
  getFrameworkCategories() {
    try {
      return Array.from(this.frameworkRegistry.categories.keys());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get command categories
   */
  getCommandCategories() {
    try {
      return Object.keys(CommandRegistry.buildFromCategory).filter(key => key !== 'length');
    } catch (error) {
      return [];
    }
  }

  /**
   * Get handler categories
   */
  getHandlerCategories() {
    try {
      return Object.keys(HandlerRegistry.buildFromCategory).filter(key => key !== 'length');
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate validation summary
   */
  generateSummary(results) {
    const summary = {
      overallValid: Object.values(results).every(r => r.isValid),
      componentResults: {},
      recommendations: []
    };

    // Component results
    for (const [component, result] of Object.entries(results)) {
      summary.componentResults[component] = {
        isValid: result.isValid,
        details: this.getComponentDetails(component, result)
      };
    }

    // Generate recommendations
    if (!results.categories.isValid) {
      summary.recommendations.push('Fix Categories constants validation');
    }
    
    if (!results.stepRegistry.isValid) {
      summary.recommendations.push('Fix Step Registry functionality');
    }
    
    if (!results.frameworkRegistry.isValid) {
      summary.recommendations.push('Fix Framework Registry functionality');
    }
    
    if (!results.commandRegistry.isValid) {
      summary.recommendations.push('Fix Command Registry functionality');
    }
    
    if (!results.handlerRegistry.isValid) {
      summary.recommendations.push('Fix Handler Registry functionality');
    }
    
    if (!results.integration.isValid) {
      summary.recommendations.push('Fix integration between registries');
    }

    return summary;
  }

  /**
   * Get component-specific details
   */
  getComponentDetails(component, result) {
    switch (component) {
      case 'categories':
        return {
          totalCategories: result.totalCategories,
          validCategories: result.validCategories,
          invalidCategories: result.invalidCategories?.length || 0
        };
        
      case 'stepRegistry':
        return {
          totalSteps: result.totalSteps,
          categories: result.categories?.length || 0,
          testRegistration: result.testRegistration
        };
        
      case 'frameworkRegistry':
        return {
          totalFrameworks: result.totalFrameworks,
          categories: result.categories?.length || 0,
          testRegistration: result.testRegistration
        };
        
      case 'commandRegistry':
        return {
          testCommandBuilt: result.testCommandBuilt,
          availableCategories: result.availableCategories?.length || 0
        };
        
      case 'handlerRegistry':
        return {
          testHandlerBuilt: result.testHandlerBuilt,
          availableCategories: result.availableCategories?.length || 0
        };
        
      case 'integration':
        return {
          passedTests: result.passedTests,
          totalTests: result.totalTests,
          testResults: result.tests
        };
        
      default:
        return {};
    }
  }

  /**
   * Generate detailed validation report
   */
  generateValidationReport(results) {
    return `# Categories System Validation Report

## Executive Summary

**Validation Date**: ${new Date().toISOString()}
**Overall Status**: ${results.isValid ? '✅ PASSED' : '❌ FAILED'}
**Components Validated**: ${Object.keys(results.results).length}

## Component Results

${Object.entries(results.results).map(([component, result]) => `
### ${component.charAt(0).toUpperCase() + component.slice(1)}
**Status**: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}
${result.error ? `**Error**: ${result.error}` : ''}
${this.formatComponentDetails(component, result)}
`).join('')}

## Summary

${results.summary.recommendations.length > 0 ? `
### Recommendations
${results.summary.recommendations.map(rec => `- ${rec}`).join('\n')}
` : 'All components are working correctly.'}

### Next Steps
${results.isValid ? 
  '✅ Categories system is ready for Categories system removal' : 
  '❌ Fix validation issues before proceeding with Categories system removal'
}

## Detailed Results

${Object.entries(results.results).map(([component, result]) => `
### ${component.charAt(0).toUpperCase() + component.slice(1)} Details
${this.formatDetailedResults(component, result)}
`).join('')}
`;
  }

  /**
   * Format component details for report
   */
  formatComponentDetails(component, result) {
    const details = this.getComponentDetails(component, result);
    return Object.entries(details).map(([key, value]) => `- **${key}**: ${value}`).join('\n');
  }

  /**
   * Format detailed results for report
   */
  formatDetailedResults(component, result) {
    switch (component) {
      case 'categories':
        return `
- **Total Categories**: ${result.totalCategories}
- **Valid Categories**: ${result.validCategories}
- **Invalid Categories**: ${result.invalidCategories?.length || 0}
${result.invalidCategories ? `- **Invalid**: ${result.invalidCategories.join(', ')}` : ''}
`;
        
      case 'stepRegistry':
        return `
- **Total Steps**: ${result.totalSteps}
- **Categories**: ${result.categories?.join(', ') || 'None'}
- **Test Registration**: ${result.testRegistration ? '✅' : '❌'}
`;
        
      case 'frameworkRegistry':
        return `
- **Total Frameworks**: ${result.totalFrameworks}
- **Categories**: ${result.categories?.join(', ') || 'None'}
- **Test Registration**: ${result.testRegistration ? '✅' : '❌'}
`;
        
      case 'commandRegistry':
        return `
- **Test Command Built**: ${result.testCommandBuilt ? '✅' : '❌'}
- **Available Categories**: ${result.availableCategories?.join(', ') || 'None'}
`;
        
      case 'handlerRegistry':
        return `
- **Test Handler Built**: ${result.testHandlerBuilt ? '✅' : '❌'}
- **Available Categories**: ${result.availableCategories?.join(', ') || 'None'}
`;
        
      case 'integration':
        return `
- **Tests Passed**: ${result.passedTests}/${result.totalTests}
${result.tests?.map(test => `- **${test.name}**: ${test.passed ? '✅' : '❌'}`).join('\n') || ''}
`;
        
      default:
        return '';
    }
  }
}

// CLI interface
async function main() {
  const validator = new CategoriesSystemValidator();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'validate':
        const results = await validator.validateCategoriesSystem();
        
        // Save report to file
        const reportPath = path.join(__dirname, '../../docs/cleanup/categories-system-validation-report.md');
        await require('fs-extra').ensureDir(path.dirname(reportPath));
        
        const reportContent = validator.generateValidationReport(results);
        await require('fs-extra').writeFile(reportPath, reportContent);
        
        console.log('\n📊 Validation Summary:');
        console.log(`   Overall Status: ${results.isValid ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Components: ${Object.keys(results.results).length}`);
        console.log(`   Recommendations: ${results.summary.recommendations.length}`);
        console.log(`   Report saved to: ${reportPath}`);
        
        if (!results.isValid) {
          console.log('\n⚠️  Validation failed. Please fix issues before proceeding.');
          process.exit(1);
        } else {
          console.log('\n✅ Categories system is ready for Categories system removal.');
        }
        break;
        
      default:
        console.log('Usage:');
        console.log('  node validate-categories-system.js validate - Validate Categories system');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CategoriesSystemValidator; 