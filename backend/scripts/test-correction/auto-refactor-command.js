
#!/usr/bin/env node

require('module-alias/register');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const { program } = require('commander');
const AutoRefactorCommand = require('@categories/management/AutoRefactorCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

// Config
const AGENT_ENDPOINT = process.env.KI_AGENT_ENDPOINT || 'http://localhost:5001/api/agent/tasks';

program
  .name('auto-refactor-command')
  .description('Forward auto-refactor task to KI-Agent')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .option('-t, --type <type>', 'Refactor type (complex_tests|legacy_tests|slow_tests|all)', 'all')
  .option('-s, --scope <scope>', 'Scope (all|unit|integration|e2e)', 'all')
  .option('-c, --concurrent <number>', 'Max concurrent', '2')
  .option('-d, --dry-run', 'Dry run mode')
  .option('-u, --user <user>', 'Requested by', 'system')
  .option('--timeout <ms>', 'Timeout in ms', '3600000')
  .parse(process.argv);

(async () => {
  try {
    const opts = program.opts();
    const command = new AutoRefactorCommand({
      projectPath: opts.project,
      refactorType: opts.type,
      scope: opts.scope,
      maxConcurrent: parseInt(opts.concurrent, 10),
      dryRun: !!opts.dryRun,
      requestedBy: opts.user,
      timeout: parseInt(opts.timeout, 10)
    });

    // Wrap as task object
    const task = {
      type: 'auto-refactor',
      status: 'pending',
      payload: command.toJSON(),
      createdBy: opts.user,
      createdAt: new Date().toISOString()
    };

    logger.info('Forwarding auto-refactor task to KI-Agent', { endpoint: AGENT_ENDPOINT });
    const response = await axios.post(AGENT_ENDPOINT, task);
    logger.success('Task forwarded successfully', { taskId: response.data.taskId || null, status: response.status });
    logger.info('KI-Agent response:', response.data);
  } catch (error) {
    logger.error('Failed to forward auto-refactor task', { error: error.message });
    if (error.response) {
      logger.error('Agent response:', error.response.data);
    }
    process.exit(1);
  }
})(); 