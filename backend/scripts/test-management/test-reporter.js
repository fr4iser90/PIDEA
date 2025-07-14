
#!/usr/bin/env node
require('module-alias/register');

/**
 * Test Reporter
 * Generates comprehensive test reports and analytics
 */

const fs = require('fs');
const path = require('path');
const TestManagementService = require('@services/TestManagementService');

/**
 * Strip ANSI color codes from text
 * @param {string} text - Text with ANSI codes
 * @returns {string} - Clean text without ANSI codes
 */
function stripAnsiCodes(text) {
  if (!text) return text;
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

async function loadTestDataFromFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.tests || data.testResults || null;
  } catch (e) {
    return null;
  }
}

async function loadJestResults() {
  const jestResultsPath = path.join(process.cwd(), 'jest-results.json');
  if (!fs.existsSync(jestResultsPath)) return null;
  
  try {
    const data = JSON.parse(fs.readFileSync(jestResultsPath, 'utf8'));
    return data;
  } catch (e) {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'markdown';
  const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'test-report.md';
  const dataFile = path.join(__dirname, '../../test-data.json');
  const fullOutput = args.includes('--full-output');

  let testData = await loadTestDataFromFile(dataFile);
  let tms;

  if (testData && Array.isArray(testData)) {
    // Wenn Testdaten aus Datei geladen wurden, erstelle einen Dummy-Repo
    const TestMetadata = require('@entities/TestMetadata');
    const TestMetadataRepository = require('@repositories/TestMetadataRepository');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
    const repo = new TestMetadataRepository();
    for (const t of testData) {
      try {
        repo.save(TestMetadata.fromJSON(t));
      } catch {}
    }
    tms = new TestManagementService(repo);
  } else {
    // Fallback: In-Memory
    tms = new TestManagementService();
  }

  if (args[0] === 'export') {
    logger.debug('📦 Scanning and registering all test files...');
    await tms.scanAndRegisterTests(path.join(__dirname, '../../tests'));
    logger.debug('📦 Exporting test metadata...');
    await tms.exportTestMetadata(dataFile);
    logger.debug(`✅ Test metadata exported to: ${dataFile}`);
    return;
  }

  if (args[0] === 'report') {
    logger.debug('📊 Generating test report...');
    const stats = await tms.getTestStatistics();
    const allTests = await tms.testMetadataRepository.findAll();
    
    let md = '# Test Management Report\n\n';
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    md += '## 📊 Summary\n\n';
    md += '| Metric | Value |\n|--------|-------|\n';
    md += `| Total Tests | ${allTests.length} |\n`;
    md += `| Passing | ${stats.passing || 0} |\n`;
    md += `| Failing | ${stats.failing || 0} |\n`;
    md += `| Skipped | ${stats.skipped || 0} |\n`;
    md += `| Legacy | ${stats.legacyCount || 0} |\n`;
    md += `| Average Health Score | ${stats.averageHealthScore || 0}% |\n`;
    md += '\n## 📈 Analytics\n\n';
    md += '### Performance\n';
    md += `- Slow Tests (>3s): ${stats.slowTests || 0}\n`;
    md += `- Fast Tests (<500ms): ${stats.fastTests || 0}\n`;
    md += `- Average Duration: ${stats.averageDuration || 0}ms\n\n`;
    md += '### Reliability\n';
    md += `- Flaky Tests: ${stats.flakyTests || 0}\n`;
    md += `- Stable Tests: ${stats.stableTests || 0}\n`;
    md += `- Average Success Rate: ${stats.averageSuccessRate || 0}%\n\n`;
    md += '### Quality\n';
    md += `- Legacy Tests: ${stats.legacyCount || 0}\n`;
    md += `- Complex Tests: ${stats.complexityDistribution ? (stats.complexityDistribution.high || 0) : 0}\n`;
    md += `- Need Maintenance: ${stats.maintenanceCount || 0}\n\n`;

    // Failing Tests Section
    const failingTests = allTests.filter(test => test.isFailing());
    if (failingTests.length > 0) {
      md += '## ❌ Failing Tests (Immediate Action Required)\n\n';
      md += '| File | Test Name | Last Error | Health Score |\n|------|-----------|------------|--------------|\n';
      failingTests.slice(0, 20).forEach(test => {
        const lastError = test.getMetadata('lastError') || 'Unknown error';
        const cleanError = stripAnsiCodes(lastError);
        const shortError = cleanError.length > 50 ? cleanError.substring(0, 50) + '...' : cleanError;
        md += `| \`${test.fileName}\` | \`${test.testName}\` | \`${shortError}\` | ${test.getHealthScore()}% |\n`;
      });
      if (failingTests.length > 20) {
        md += `\n*... and ${failingTests.length - 20} more failing tests*\n`;
      }
      md += '\n';
    }

    // Legacy Tests Section - Fixed filter
    const legacyTests = allTests.filter(test => test.isLegacy || test.legacyScore > 70);
    if (legacyTests.length > 0) {
      md += '## 🗑️ Legacy Tests (Consider Removal)\n\n';
      md += '| File | Test Name | Legacy Score | Reason |\n|------|-----------|--------------|--------|\n';
      legacyTests.slice(0, 15).forEach(test => {
        const reasons = [];
        if (test.legacyScore > 80) reasons.push('High legacy score');
        if (test.hasTag('deprecated')) reasons.push('Deprecated');
        if (test.hasTag('outdated')) reasons.push('Outdated');
        if (test.isLegacy) reasons.push('Marked as legacy');
        const reason = reasons.length > 0 ? reasons.join(', ') : 'Legacy patterns detected';
        md += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.legacyScore} | ${reason} |\n`;
      });
      if (legacyTests.length > 15) {
        md += `\n*... and ${legacyTests.length - 15} more legacy tests*\n`;
      }
      md += '\n';
    }

    // Tests Needing Maintenance
    const maintenanceTests = allTests.filter(test => test.needsMaintenance() && test.maintenanceScore < 50);
    if (maintenanceTests.length > 0) {
      md += '## 🔧 Tests Needing Maintenance\n\n';
      md += '| File | Test Name | Maintenance Score | Issues |\n|------|-----------|-------------------|--------|\n';
      maintenanceTests.slice(0, 15).forEach(test => {
        const issues = [];
        if (test.maintenanceScore < 30) issues.push('No documentation');
        if (test.maintenanceScore < 40) issues.push('No error handling');
        if (test.hasTag('needs-maintenance')) issues.push('Maintenance required');
        const issueList = issues.length > 0 ? issues.join(', ') : 'Low maintenance score';
        md += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.maintenanceScore} | ${issueList} |\n`;
      });
      if (maintenanceTests.length > 15) {
        md += `\n*... and ${maintenanceTests.length - 15} more tests needing maintenance*\n`;
      }
      md += '\n';
    }

    // Complex Tests
    const complexTests = allTests.filter(test => test.isHighComplexity() && test.complexityScore > 80);
    if (complexTests.length > 0) {
      md += '## 🧩 Complex Tests (Consider Refactoring)\n\n';
      md += '| File | Test Name | Complexity Score | Recommendation |\n|------|-----------|------------------|----------------|\n';
      complexTests.slice(0, 10).forEach(test => {
        let recommendation = 'Consider breaking into smaller tests';
        if (test.complexityScore > 90) recommendation = 'High priority: Refactor into multiple tests';
        md += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.complexityScore} | ${recommendation} |\n`;
      });
      if (complexTests.length > 10) {
        md += `\n*... and ${complexTests.length - 10} more complex tests*\n`;
      }
      md += '\n';
    }

    // Action Items Summary
    md += '## 🎯 Action Items Summary\n\n';
    md += '### High Priority\n';
    if (failingTests.length > 0) {
      md += `- **Fix ${failingTests.length} failing tests** - These are blocking your test suite\n`;
    }
    if (legacyTests.length > 0) {
      md += `- **Review ${legacyTests.length} legacy tests** - Consider removal or modernization\n`;
    }
    
    md += '\n### Medium Priority\n';
    if (maintenanceTests.length > 0) {
      md += `- **Maintain ${maintenanceTests.length} tests** - Add documentation and error handling\n`;
    }
    if (complexTests.length > 0) {
      md += `- **Refactor ${complexTests.length} complex tests** - Break into smaller, focused tests\n`;
    }
    
    md += '\n### Low Priority\n';
    const slowTests = allTests.filter(test => test.averageDuration > 3000);
    if (slowTests.length > 0) {
      md += `- **Optimize ${slowTests.length} slow tests** - Improve performance\n`;
    }
    
    const flakyTests = allTests.filter(test => test.isFailing() && test.executionCount > 5 && test.failureCount > 2);
    if (flakyTests.length > 0) {
      md += `- **Investigate ${flakyTests.length} flaky tests** - Fix intermittent failures\n`;
    }

    fs.writeFileSync(path.join(process.cwd(), output), md, 'utf8');
    logger.info(`📄 Report saved to: ${output}`);

    // Generate full output for task generation
    if (fullOutput) {
      const fullOutputPath = path.join(process.cwd(), 'test-analysis-full.json');
      const fullAnalysis = {
        generatedAt: new Date().toISOString(),
        summary: stats,
        failingTests: failingTests.map(test => ({
          filePath: test.filePath,
          fileName: test.fileName,
          testName: test.testName,
          lastError: stripAnsiCodes(test.getMetadata('lastError') || 'Unknown error'),
          healthScore: test.getHealthScore(),
          status: test.status,
          executionCount: test.executionCount,
          failureCount: test.failureCount,
          averageDuration: test.averageDuration,
          tags: test.tags,
          metadata: test.metadata
        })),
        legacyTests: legacyTests.map(test => ({
          filePath: test.filePath,
          fileName: test.fileName,
          testName: test.testName,
          legacyScore: test.legacyScore,
          isLegacy: test.isLegacy,
          healthScore: test.getHealthScore(),
          tags: test.tags,
          reason: test.isLegacy ? 'Marked as legacy' : 'High legacy score'
        })),
        maintenanceTests: maintenanceTests.map(test => ({
          filePath: test.filePath,
          fileName: test.fileName,
          testName: test.testName,
          maintenanceScore: test.maintenanceScore,
          healthScore: test.getHealthScore(),
          tags: test.tags,
          issues: test.maintenanceScore < 30 ? ['No documentation'] : ['Low maintenance score']
        })),
        complexTests: complexTests.map(test => ({
          filePath: test.filePath,
          fileName: test.fileName,
          testName: test.testName,
          complexityScore: test.complexityScore,
          healthScore: test.getHealthScore(),
          tags: test.tags,
          recommendation: test.complexityScore > 90 ? 'High priority: Refactor into multiple tests' : 'Consider breaking into smaller tests'
        })),
        actionItems: {
          highPriority: [
            ...(failingTests.length > 0 ? [`Fix ${failingTests.length} failing tests`] : []),
            ...(legacyTests.length > 0 ? [`Review ${legacyTests.length} legacy tests`] : [])
          ],
          mediumPriority: [
            ...(maintenanceTests.length > 0 ? [`Maintain ${maintenanceTests.length} tests`] : []),
            ...(complexTests.length > 0 ? [`Refactor ${complexTests.length} complex tests`] : [])
          ],
          lowPriority: [
            ...(slowTests.length > 0 ? [`Optimize ${slowTests.length} slow tests`] : []),
            ...(flakyTests.length > 0 ? [`Investigate ${flakyTests.length} flaky tests`] : [])
          ]
        }
      };
      
      fs.writeFileSync(fullOutputPath, JSON.stringify(fullAnalysis, null, 2), 'utf8');
      logger.info(`📊 Full analysis saved to: ${fullOutputPath}`);

      // Generate comprehensive Markdown report
      const fullMdPath = path.join(process.cwd(), 'test-report-full.md');
      let fullMd = '# Complete Test Management Report\n\n';
      fullMd += `**Generated:** ${new Date().toLocaleString()}\n\n`;
      fullMd += `**Total Tests Analyzed:** ${allTests.length}\n\n`;
      
      // Summary Statistics
      fullMd += '## 📊 Complete Summary\n\n';
      fullMd += '| Metric | Value |\n|--------|-------|\n';
      fullMd += `| Total Tests | ${allTests.length} |\n`;
      fullMd += `| Passing | ${stats.passing || 0} |\n`;
      fullMd += `| Failing | ${stats.failing || 0} |\n`;
      fullMd += `| Skipped | ${stats.skipped || 0} |\n`;
      fullMd += `| Legacy | ${stats.legacyCount || 0} |\n`;
      fullMd += `| Average Health Score | ${stats.averageHealthScore || 0}% |\n`;
      fullMd += `| Average Complexity Score | ${stats.averageComplexityScore || 0} |\n`;
      fullMd += `| Average Maintenance Score | ${stats.averageMaintenanceScore || 0} |\n\n`;

      // Fallback: recalculate averages if 0
      let avgComplexity = stats.averageComplexityScore;
      let avgMaintenance = stats.averageMaintenanceScore;
      if (!avgComplexity || avgComplexity === 0) {
        const sum = allTests.reduce((acc, t) => acc + (t.complexityScore || 0), 0);
        avgComplexity = allTests.length ? Math.round(sum / allTests.length) : 0;
      }
      if (!avgMaintenance || avgMaintenance === 0) {
        const sum = allTests.reduce((acc, t) => acc + (t.maintenanceScore || 0), 0);
        avgMaintenance = allTests.length ? Math.round(sum / allTests.length) : 0;
      }

      // Health Distribution
      if (stats.healthDistribution) {
        fullMd += '### Health Distribution\n\n';
        fullMd += '| Health Level | Count |\n|--------------|-------|\n';
        fullMd += `| Excellent (90-100%) | ${stats.healthDistribution.excellent || 0} |\n`;
        fullMd += `| Good (70-89%) | ${stats.healthDistribution.good || 0} |\n`;
        fullMd += `| Fair (50-69%) | ${stats.healthDistribution.fair || 0} |\n`;
        fullMd += `| Poor (30-49%) | ${stats.healthDistribution.poor || 0} |\n`;
        fullMd += `| Critical (0-29%) | ${stats.healthDistribution.critical || 0} |\n\n`;
      }

      // All Failing Tests (Complete List)
      if (failingTests.length > 0) {
        fullMd += '## ❌ All Failing Tests (Complete List)\n\n';
        fullMd += '| File | Test Name | Last Error | Health Score | Execution Count | Failure Count |\n|------|-----------|------------|--------------|----------------|---------------|\n';
        failingTests.forEach(test => {
          const lastError = test.getMetadata('lastError') || 'Unknown error';
          const cleanError = stripAnsiCodes(lastError);
          const shortError = cleanError.length > 80 ? cleanError.substring(0, 80) + '...' : cleanError;
          md += `| \`${test.fileName}\` | \`${test.testName}\` | \`${shortError}\` | ${test.getHealthScore()}% | ${test.executionCount} | ${test.failureCount} |\n`;
        });
        fullMd += '\n';
      }

      // All Legacy Tests (Complete List)
      if (legacyTests.length > 0) {
        fullMd += '## 🗑️ All Legacy Tests (Complete List)\n\n';
        fullMd += '| File | Test Name | Legacy Score | Is Legacy | Health Score | Tags |\n|------|-----------|--------------|-----------|--------------|------|\n';
        legacyTests.forEach(test => {
          const tagList = test.tags.join(', ');
          fullMd += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.legacyScore} | ${test.isLegacy ? 'Yes' : 'No'} | ${test.getHealthScore()}% | ${tagList} |\n`;
        });
        fullMd += '\n';
      }

      // All Maintenance Tests (Complete List)
      if (maintenanceTests.length > 0) {
        fullMd += '## 🔧 All Tests Needing Maintenance (Complete List)\n\n';
        fullMd += '| File | Test Name | Maintenance Score | Health Score | Tags |\n|------|-----------|-------------------|--------------|------|\n';
        maintenanceTests.forEach(test => {
          const tagList = test.tags.join(', ');
          fullMd += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.maintenanceScore} | ${test.getHealthScore()}% | ${tagList} |\n`;
        });
        fullMd += '\n';
      }

      // All Complex Tests (Complete List)
      if (complexTests.length > 0) {
        fullMd += '## 🧩 All Complex Tests (Complete List)\n\n';
        fullMd += '| File | Test Name | Complexity Score | Health Score | Tags |\n|------|-----------|------------------|--------------|------|\n';
        complexTests.forEach(test => {
          const tagList = test.tags.join(', ');
          fullMd += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.complexityScore} | ${test.getHealthScore()}% | ${tagList} |\n`;
        });
        fullMd += '\n';
      }

      // Slow Tests
      if (slowTests.length > 0) {
        fullMd += '## ⏱️ Slow Tests (>3s)\n\n';
        fullMd += '| File | Test Name | Average Duration | Health Score |\n|------|-----------|------------------|--------------|\n';
        slowTests.forEach(test => {
          fullMd += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.averageDuration}ms | ${test.getHealthScore()}% |\n`;
        });
        fullMd += '\n';
      }

      // Flaky Tests
      if (flakyTests.length > 0) {
        fullMd += '## 🔄 Flaky Tests\n\n';
        fullMd += '| File | Test Name | Execution Count | Failure Count | Success Rate |\n|------|-----------|----------------|---------------|--------------|\n';
        flakyTests.forEach(test => {
          const successRate = test.executionCount > 0 ? ((test.executionCount - test.failureCount) / test.executionCount * 100).toFixed(1) : 0;
          fullMd += `| \`${test.fileName}\` | \`${test.testName}\` | ${test.executionCount} | ${test.failureCount} | ${successRate}% |\n`;
        });
        fullMd += '\n';
      }

      // Detailed Action Items
      fullMd += '## 🎯 Detailed Action Items\n\n';
      
      fullMd += '### High Priority Actions\n\n';
      if (failingTests.length > 0) {
        fullMd += `#### Fix ${failingTests.length} Failing Tests\n\n`;
        fullMd += 'These tests are blocking your test suite and need immediate attention:\n\n';
        failingTests.slice(0, 10).forEach((test, index) => {
          const lastError = test.getMetadata('lastError') || 'Unknown error';
          const cleanError = stripAnsiCodes(lastError);
          fullMd += `${index + 1}. **${test.fileName}** - \`${test.testName}\`\n`;
          fullMd += `   - Error: \`${cleanError}\`\n`;
          fullMd += `   - Health Score: ${test.getHealthScore()}%\n`;
          fullMd += `   - File: \`${test.filePath}\`\n\n`;
        });
        if (failingTests.length > 10) {
          fullMd += `*... and ${failingTests.length - 10} more failing tests*\n\n`;
        }
      }

      if (legacyTests.length > 0) {
        fullMd += `#### Review ${legacyTests.length} Legacy Tests\n\n`;
        fullMd += 'These tests should be considered for removal or modernization:\n\n';
        legacyTests.slice(0, 10).forEach((test, index) => {
          fullMd += `${index + 1}. **${test.fileName}** - \`${test.testName}\`\n`;
          fullMd += `   - Legacy Score: ${test.legacyScore}\n`;
          fullMd += `   - Health Score: ${test.getHealthScore()}%\n`;
          fullMd += `   - File: \`${test.filePath}\`\n\n`;
        });
        if (legacyTests.length > 10) {
          fullMd += `*... and ${legacyTests.length - 10} more legacy tests*\n\n`;
        }
      }

      fullMd += '### Medium Priority Actions\n\n';
      if (maintenanceTests.length > 0) {
        fullMd += `#### Maintain ${maintenanceTests.length} Tests\n\n`;
        fullMd += 'These tests need documentation and error handling improvements:\n\n';
        maintenanceTests.slice(0, 5).forEach((test, index) => {
          fullMd += `${index + 1}. **${test.fileName}** - \`${test.testName}\`\n`;
          fullMd += `   - Maintenance Score: ${test.maintenanceScore}\n`;
          fullMd += `   - Health Score: ${test.getHealthScore()}%\n`;
          fullMd += `   - File: \`${test.filePath}\`\n\n`;
        });
        if (maintenanceTests.length > 5) {
          fullMd += `*... and ${maintenanceTests.length - 5} more tests needing maintenance*\n\n`;
        }
      }

      if (complexTests.length > 0) {
        fullMd += `#### Refactor ${complexTests.length} Complex Tests\n\n`;
        fullMd += 'These tests should be broken into smaller, focused tests:\n\n';
        complexTests.slice(0, 5).forEach((test, index) => {
          fullMd += `${index + 1}. **${test.fileName}** - \`${test.testName}\`\n`;
          fullMd += `   - Complexity Score: ${test.complexityScore}\n`;
          fullMd += `   - Health Score: ${test.getHealthScore()}%\n`;
          fullMd += `   - File: \`${test.filePath}\`\n\n`;
        });
        if (complexTests.length > 5) {
          fullMd += `*... and ${complexTests.length - 5} more complex tests*\n\n`;
        }
      }

      fullMd += '### Low Priority Actions\n\n';
      if (slowTests.length > 0) {
        fullMd += `#### Optimize ${slowTests.length} Slow Tests\n\n`;
        fullMd += 'These tests take longer than 3 seconds and could be optimized:\n\n';
        slowTests.slice(0, 5).forEach((test, index) => {
          fullMd += `${index + 1}. **${test.fileName}** - \`${test.testName}\`\n`;
          fullMd += `   - Average Duration: ${test.averageDuration}ms\n`;
          fullMd += `   - Health Score: ${test.getHealthScore()}%\n`;
          fullMd += `   - File: \`${test.filePath}\`\n\n`;
        });
        if (slowTests.length > 5) {
          fullMd += `*... and ${slowTests.length - 5} more slow tests*\n\n`;
        }
      }

      // Recommendations
      if (stats.recommendations && stats.recommendations.length > 0) {
        fullMd += '## 💡 System Recommendations\n\n';
        stats.recommendations.forEach((rec, index) => {
          fullMd += `${index + 1}. **[${rec.type.toUpperCase()}]** ${rec.message}\n`;
          if (rec.affectedTests && rec.affectedTests.length > 0) {
            fullMd += `   - Affected files: ${rec.affectedTests.slice(0, 3).join(', ')}`;
            if (rec.affectedTests.length > 3) {
              fullMd += ` and ${rec.affectedTests.length - 3} more`;
            }
            fullMd += '\n';
          }
          fullMd += '\n';
        });
      }

      fs.writeFileSync(fullMdPath, fullMd, 'utf8');
      logger.info(`📄 Full Markdown report saved to: ${fullMdPath}`);
    }

    logger.info('✅ Report generated successfully!');
    return;
  }

  // ... andere Kommandos ...
}

main(); 