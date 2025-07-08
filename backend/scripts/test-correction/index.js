#!/usr/bin/env node

require('module-alias/register');

const path = require('path');
const { program } = require('commander');
const AutoFixTests = require('./auto-fix-tests');
const CoverageImprover = require('./coverage-improver');
const AutoRefactorCommand = require('./auto-refactor-command');

// Set up command line interface
program
  .name('test-correction')
  .description('Automated test correction and coverage improvement system')
  .version('1.0.0');

// Auto-fix tests command
program
  .command('auto-fix')
  .description('Automatically fix failing, legacy, and complex tests')
  .option('-w, --watch', 'Watch mode - continuously monitor and fix tests')
  .option('-l, --legacy', 'Focus on legacy tests only')
  .option('-c, --complex', 'Focus on complex tests only')
  .option('-d, --dry-run', 'Dry run mode - show what would be fixed without making changes')
  .option('-m, --max-concurrent <number>', 'Maximum concurrent fixes', '5')
  .option('-r, --retry-attempts <number>', 'Number of retry attempts', '3')
  .option('-t, --coverage-target <number>', 'Coverage target percentage', '90')
  .action(async (options) => {
    const autoFix = new AutoFixTests({
      watch: options.watch,
      legacy: options.legacy,
      complex: options.complex,
      dryRun: options.dryRun,
      maxConcurrent: parseInt(options.maxConcurrent),
      retryAttempts: parseInt(options.retryAttempts),
      coverageTarget: parseInt(options.coverageTarget)
    });
    
    await autoFix.run();
  });

// Coverage improvement command
program
  .command('coverage-improve')
  .description('Improve test coverage by generating missing tests')
  .option('-t, --target <number>', 'Target coverage percentage', '90')
  .option('-m, --min-coverage <number>', 'Minimum coverage threshold', '80')
  .option('-d, --dry-run', 'Dry run mode - show what would be generated')
  .option('-f, --focus <areas>', 'Focus on specific areas (comma-separated)')
  .action(async (options) => {
    const coverageImprover = new CoverageImprover({
      targetCoverage: parseInt(options.target),
      minCoverage: parseInt(options.minCoverage),
      dryRun: options.dryRun,
      focusAreas: options.focus ? options.focus.split(',') : undefined
    });
    
    await coverageImprover.run();
  });

// Refactor command
program
  .command('refactor')
  .description('Refactor tests for better maintainability and performance')
  .option('-c, --complex', 'Focus on complex tests only')
  .option('-l, --legacy', 'Focus on legacy tests only')
  .option('-s, --slow', 'Focus on slow tests only')
  .option('-a, --all', 'Refactor all test types')
  .option('-d, --dry-run', 'Dry run mode - show what would be refactored')
  .option('-m, --max-concurrent <number>', 'Maximum concurrent refactoring', '3')
  .action(async (options) => {
    const refactorCommand = new AutoRefactorCommand({
      complex: options.complex,
      legacy: options.legacy,
      slow: options.slow,
      all: options.all,
      dryRun: options.dryRun,
      maxConcurrent: parseInt(options.maxConcurrent)
    });
    
    await refactorCommand.execute();
  });

// Status command
program
  .command('status')
  .description('Show current test correction status')
  .action(async () => {
    const autoFix = new AutoFixTests();
    await autoFix.showStatus();
  });

// Report command
program
  .command('report')
  .description('Generate detailed test correction report')
  .option('-f, --format <format>', 'Report format (markdown, json, html)', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    const autoFix = new AutoFixTests();
    await autoFix.generateReport(null, null, {
      format: options.format,
      outputFile: options.output
    });
  });

// Parse command line arguments
program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 