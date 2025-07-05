/**
 * TaskProgressUI - Beautiful progress visualization and real-time monitoring
 */
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const ora = require('ora');
const Table = require('cli-table3');
const EventEmitter = require('events');

class TaskProgressUI extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            showProgressBars: true,
            showSpinners: true,
            showRealTimeUpdates: true,
            updateInterval: 1000,
            ...options
        };

        this.progressBars = new Map();
        this.spinners = new Map();
        this.tasks = new Map();
        this.executions = new Map();
        this.multiBar = null;
        
        this.setupProgressBars();
        this.setupEventListeners();
    }

    /**
     * Setup progress bar container
     */
    setupProgressBars() {
        if (this.options.showProgressBars) {
            this.multiBar = new cliProgress.MultiBar({
                clearOnComplete: false,
                hideCursor: true,
                format: ' {bar} | {percentage}% | {value}/{total} | {task} | {status}',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                stopOnComplete: false
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for task events
        this.on('task:created', (data) => this.handleTaskCreated(data));
        this.on('task:updated', (data) => this.handleTaskUpdated(data));
        this.on('task:deleted', (data) => this.handleTaskDeleted(data));
        
        // Listen for execution events
        this.on('execution:start', (data) => this.handleExecutionStart(data));
        this.on('execution:progress', (data) => this.handleExecutionProgress(data));
        this.on('execution:complete', (data) => this.handleExecutionComplete(data));
        this.on('execution:error', (data) => this.handleExecutionError(data));
        
        // Listen for AI events
        this.on('ai:request', (data) => this.handleAIRequest(data));
        this.on('ai:response', (data) => this.handleAIResponse(data));
        this.on('ai:error', (data) => this.handleAIError(data));
    }

    /**
     * Start monitoring session
     * @param {Object} session - Session information
     */
    startSession(session) {
        this.currentSession = session;
        
        console.log(chalk.blue.bold('\n🚀 VibeCoder Task Management Session Started'));
        console.log(chalk.gray(`Session ID: ${session.id}`));
        console.log(chalk.gray(`Project: ${session.projectName || 'Unknown'}`));
        console.log(chalk.gray(`Mode: ${session.mode || 'Standard'}`));
        console.log(chalk.gray('Real-time monitoring active...\n'));

        if (this.options.showRealTimeUpdates) {
            this.startRealTimeUpdates();
        }
    }

    /**
     * Stop monitoring session
     */
    stopSession() {
        if (this.multiBar) {
            this.multiBar.stop();
        }

        // Stop all spinners
        this.spinners.forEach(spinner => spinner.stop());
        this.spinners.clear();

        console.log(chalk.blue.bold('\n✅ Session Completed'));
        this.displaySessionSummary();
    }

    /**
     * Handle task created event
     * @param {Object} data - Task data
     */
    handleTaskCreated(data) {
        this.tasks.set(data.task.id, data.task);
        
        if (this.options.showSpinners) {
            const spinner = ora(`📋 Created task: ${data.task.title}`).start();
            this.spinners.set(`task-${data.task.id}`, spinner);
        }

        this.emit('ui:task:created', data);
    }

    /**
     * Handle task updated event
     * @param {Object} data - Task data
     */
    handleTaskUpdated(data) {
        this.tasks.set(data.task.id, data.task);
        
        const spinner = this.spinners.get(`task-${data.task.id}`);
        if (spinner) {
            spinner.text = `📋 Updated task: ${data.task.title} (${data.task.status})`;
        }

        this.emit('ui:task:updated', data);
    }

    /**
     * Handle task deleted event
     * @param {Object} data - Task data
     */
    handleTaskDeleted(data) {
        this.tasks.delete(data.taskId);
        
        const spinner = this.spinners.get(`task-${data.taskId}`);
        if (spinner) {
            spinner.stop();
            this.spinners.delete(`task-${data.taskId}`);
        }

        this.emit('ui:task:deleted', data);
    }

    /**
     * Handle execution start event
     * @param {Object} data - Execution data
     */
    handleExecutionStart(data) {
        this.executions.set(data.execution.id, data.execution);
        
        if (this.options.showProgressBars && this.multiBar) {
            const progressBar = this.multiBar.create(100, 0, {
                task: data.taskTitle,
                status: 'Starting...'
            });
            this.progressBars.set(data.execution.id, progressBar);
        } else if (this.options.showSpinners) {
            const spinner = ora(`▶️  Starting: ${data.taskTitle}`).start();
            this.spinners.set(`execution-${data.execution.id}`, spinner);
        }

        this.emit('ui:execution:start', data);
    }

    /**
     * Handle execution progress event
     * @param {Object} data - Progress data
     */
    handleExecutionProgress(data) {
        const execution = this.executions.get(data.executionId);
        if (execution) {
            execution.progress = data.progress;
            execution.currentStep = data.currentStep;
            execution.status = data.status;
        }

        if (this.options.showProgressBars) {
            const progressBar = this.progressBars.get(data.executionId);
            if (progressBar) {
                progressBar.update(data.progress, {
                    task: data.taskTitle,
                    status: data.currentStep
                });
            }
        } else if (this.options.showSpinners) {
            const spinner = this.spinners.get(`execution-${data.executionId}`);
            if (spinner) {
                spinner.text = `⏳ ${data.taskTitle}: ${data.currentStep} (${data.progress}%)`;
            }
        }

        this.emit('ui:execution:progress', data);
    }

    /**
     * Handle execution complete event
     * @param {Object} data - Completion data
     */
    handleExecutionComplete(data) {
        const execution = this.executions.get(data.executionId);
        if (execution) {
            execution.status = 'completed';
            execution.completedAt = new Date();
        }

        if (this.options.showProgressBars) {
            const progressBar = this.progressBars.get(data.executionId);
            if (progressBar) {
                progressBar.update(100, {
                    task: data.taskTitle,
                    status: 'Completed'
                });
                this.progressBars.delete(data.executionId);
            }
        } else if (this.options.showSpinners) {
            const spinner = this.spinners.get(`execution-${data.executionId}`);
            if (spinner) {
                spinner.succeed(`✅ Completed: ${data.taskTitle}`);
                this.spinners.delete(`execution-${data.executionId}`);
            }
        }

        this.emit('ui:execution:complete', data);
    }

    /**
     * Handle execution error event
     * @param {Object} data - Error data
     */
    handleExecutionError(data) {
        const execution = this.executions.get(data.executionId);
        if (execution) {
            execution.status = 'error';
            execution.error = data.error;
            execution.completedAt = new Date();
        }

        if (this.options.showProgressBars) {
            const progressBar = this.progressBars.get(data.executionId);
            if (progressBar) {
                progressBar.update(100, {
                    task: data.taskTitle,
                    status: 'Error'
                });
                this.progressBars.delete(data.executionId);
            }
        } else if (this.options.showSpinners) {
            const spinner = this.spinners.get(`execution-${data.executionId}`);
            if (spinner) {
                spinner.fail(`❌ Failed: ${data.taskTitle} - ${data.error}`);
                this.spinners.delete(`execution-${data.executionId}`);
            }
        }

        this.emit('ui:execution:error', data);
    }

    /**
     * Handle AI request event
     * @param {Object} data - AI request data
     */
    handleAIRequest(data) {
        if (this.options.showSpinners) {
            const spinner = ora(`🤖 AI request: ${data.description}`).start();
            this.spinners.set(`ai-${data.requestId}`, spinner);
        }

        this.emit('ui:ai:request', data);
    }

    /**
     * Handle AI response event
     * @param {Object} data - AI response data
     */
    handleAIResponse(data) {
        if (this.options.showSpinners) {
            const spinner = this.spinners.get(`ai-${data.requestId}`);
            if (spinner) {
                spinner.succeed(`✅ AI response: ${data.description}`);
                this.spinners.delete(`ai-${data.requestId}`);
            }
        }

        this.emit('ui:ai:response', data);
    }

    /**
     * Handle AI error event
     * @param {Object} data - AI error data
     */
    handleAIError(data) {
        if (this.options.showSpinners) {
            const spinner = this.spinners.get(`ai-${data.requestId}`);
            if (spinner) {
                spinner.fail(`❌ AI error: ${data.error}`);
                this.spinners.delete(`ai-${data.requestId}`);
            }
        }

        this.emit('ui:ai:error', data);
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateRealTimeDisplay();
        }, this.options.updateInterval);
    }

    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update real-time display
     */
    updateRealTimeDisplay() {
        if (!this.options.showRealTimeUpdates) {
            return;
        }

        const stats = this.getCurrentStats();
        this.displayRealTimeStats(stats);
    }

    /**
     * Get current statistics
     * @returns {Object} Current stats
     */
    getCurrentStats() {
        const tasks = Array.from(this.tasks.values());
        const executions = Array.from(this.executions.values());

        return {
            totalTasks: tasks.length,
            activeTasks: tasks.filter(t => t.status === 'active').length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            failedTasks: tasks.filter(t => t.status === 'error').length,
            totalExecutions: executions.length,
            activeExecutions: executions.filter(e => e.status === 'active').length,
            completedExecutions: executions.filter(e => e.status === 'completed').length,
            failedExecutions: executions.filter(e => e.status === 'error').length,
            avgProgress: executions.length > 0 
                ? executions.reduce((sum, e) => sum + (e.progress || 0), 0) / executions.length 
                : 0
        };
    }

    /**
     * Display real-time statistics
     * @param {Object} stats - Statistics to display
     */
    displayRealTimeStats(stats) {
        // Clear previous stats display
        process.stdout.write('\x1b[2K\x1b[1G');
        
        const progressBar = this.createMiniProgressBar(stats.avgProgress);
        console.log(chalk.gray(`📊 Tasks: ${stats.activeTasks}/${stats.totalTasks} | Executions: ${stats.activeExecutions}/${stats.totalExecutions} | Progress: ${progressBar} ${Math.round(stats.avgProgress)}%`));
    }

    /**
     * Create mini progress bar
     * @param {number} percentage - Progress percentage
     * @returns {string} Progress bar string
     */
    createMiniProgressBar(percentage) {
        const width = 20;
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        
        return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    }

    /**
     * Display session summary
     */
    displaySessionSummary() {
        const stats = this.getCurrentStats();
        
        console.log(chalk.blue.bold('\n📊 Session Summary:'));
        
        // Task summary
        console.log(chalk.blue('\n📋 Tasks:'));
        console.log(chalk.gray(`   Total: ${chalk.white(stats.totalTasks)}`));
        console.log(chalk.gray(`   Active: ${chalk.yellow(stats.activeTasks)}`));
        console.log(chalk.gray(`   Completed: ${chalk.green(stats.completedTasks)}`));
        console.log(chalk.gray(`   Failed: ${chalk.red(stats.failedTasks)}`));

        // Execution summary
        console.log(chalk.blue('\n▶️  Executions:'));
        console.log(chalk.gray(`   Total: ${chalk.white(stats.totalExecutions)}`));
        console.log(chalk.gray(`   Active: ${chalk.yellow(stats.activeExecutions)}`));
        console.log(chalk.gray(`   Completed: ${chalk.green(stats.completedExecutions)}`));
        console.log(chalk.gray(`   Failed: ${chalk.red(stats.failedExecutions)}`));

        // Success rate
        const successRate = stats.totalExecutions > 0 
            ? (stats.completedExecutions / stats.totalExecutions) * 100 
            : 0;
        console.log(chalk.blue('\n📈 Success Rate:'));
        console.log(chalk.gray(`   ${chalk.white(successRate.toFixed(1))}%`));

        // Display recent tasks
        this.displayRecentTasks();
    }

    /**
     * Display recent tasks
     */
    displayRecentTasks() {
        const tasks = Array.from(this.tasks.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        if (tasks.length > 0) {
            console.log(chalk.blue('\n📋 Recent Tasks:'));
            
            const table = new Table({
                head: ['Title', 'Type', 'Status', 'Created'],
                colWidths: [30, 15, 15, 20]
            });

            tasks.forEach(task => {
                const statusIcon = this.getStatusIcon(task.status);
                table.push([
                    task.title.substring(0, 28),
                    task.type,
                    `${statusIcon} ${task.status}`,
                    new Date(task.createdAt).toLocaleTimeString()
                ]);
            });

            console.log(table.toString());
        }
    }

    /**
     * Get status icon
     * @param {string} status - Task status
     * @returns {string} Status icon
     */
    getStatusIcon(status) {
        switch (status) {
            case 'active': return '🔄';
            case 'completed': return '✅';
            case 'error': return '❌';
            case 'pending': return '⏳';
            default: return '❓';
        }
    }

    /**
     * Show task details
     * @param {string} taskId - Task ID
     */
    showTaskDetails(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            console.log(chalk.red('Task not found'));
            return;
        }

        console.log(chalk.blue.bold('\n📋 Task Details:'));
        console.log(chalk.gray(`ID: ${chalk.white(task.id)}`));
        console.log(chalk.gray(`Title: ${chalk.white(task.title)}`));
        console.log(chalk.gray(`Description: ${chalk.white(task.description)}`));
        console.log(chalk.gray(`Type: ${chalk.white(task.type)}`));
        console.log(chalk.gray(`Status: ${chalk.white(task.status)}`));
        console.log(chalk.gray(`Priority: ${chalk.white(task.priority)}`));
        console.log(chalk.gray(`Created: ${chalk.white(new Date(task.createdAt).toLocaleString())}`));

        // Show related executions
        const executions = Array.from(this.executions.values())
            .filter(e => e.taskId === taskId);

        if (executions.length > 0) {
            console.log(chalk.blue('\n▶️  Executions:'));
            executions.forEach(execution => {
                const statusIcon = this.getStatusIcon(execution.status);
                console.log(chalk.gray(`   ${statusIcon} ${execution.id.substring(0, 8)} - ${execution.status}`));
            });
        }
    }

    /**
     * Show execution details
     * @param {string} executionId - Execution ID
     */
    showExecutionDetails(executionId) {
        const execution = this.executions.get(executionId);
        if (!execution) {
            console.log(chalk.red('Execution not found'));
            return;
        }

        console.log(chalk.blue.bold('\n▶️  Execution Details:'));
        console.log(chalk.gray(`ID: ${chalk.white(execution.id)}`));
        console.log(chalk.gray(`Task: ${chalk.white(execution.taskTitle)}`));
        console.log(chalk.gray(`Status: ${chalk.white(execution.status)}`));
        console.log(chalk.gray(`Progress: ${chalk.white(execution.progress || 0)}%`));
        console.log(chalk.gray(`Current Step: ${chalk.white(execution.currentStep || 'N/A')}`));
        console.log(chalk.gray(`Started: ${chalk.white(new Date(execution.startedAt).toLocaleString())}`));

        if (execution.completedAt) {
            console.log(chalk.gray(`Completed: ${chalk.white(new Date(execution.completedAt).toLocaleString())}`));
        }

        if (execution.error) {
            console.log(chalk.red(`Error: ${execution.error}`));
        }
    }

    /**
     * Show live dashboard
     */
    showLiveDashboard() {
        console.log(chalk.blue.bold('\n📊 Live Dashboard'));
        console.log(chalk.gray('Press Ctrl+C to exit\n'));

        const updateDashboard = () => {
            const stats = this.getCurrentStats();
            
            // Clear screen
            process.stdout.write('\x1b[2J\x1b[0f');
            
            console.log(chalk.blue.bold('📊 Live Dashboard'));
            console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`));

            // Tasks overview
            console.log(chalk.blue('📋 Tasks Overview:'));
            const taskProgressBar = this.createMiniProgressBar(
                stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0
            );
            console.log(chalk.gray(`   Progress: ${taskProgressBar} ${stats.completedTasks}/${stats.totalTasks}`));
            console.log(chalk.gray(`   Active: ${chalk.yellow(stats.activeTasks)} | Completed: ${chalk.green(stats.completedTasks)} | Failed: ${chalk.red(stats.failedTasks)}`));

            // Executions overview
            console.log(chalk.blue('\n▶️  Executions Overview:'));
            const executionProgressBar = this.createMiniProgressBar(stats.avgProgress);
            console.log(chalk.gray(`   Progress: ${executionProgressBar} ${Math.round(stats.avgProgress)}%`));
            console.log(chalk.gray(`   Active: ${chalk.yellow(stats.activeExecutions)} | Completed: ${chalk.green(stats.completedExecutions)} | Failed: ${chalk.red(stats.failedExecutions)}`));

            // Recent activity
            this.displayRecentActivity();
        };

        // Update dashboard every second
        const interval = setInterval(updateDashboard, 1000);
        updateDashboard();

        // Handle Ctrl+C
        process.on('SIGINT', () => {
            clearInterval(interval);
            console.log(chalk.blue('\n👋 Dashboard closed'));
            process.exit(0);
        });
    }

    /**
     * Display recent activity
     */
    displayRecentActivity() {
        const recentExecutions = Array.from(this.executions.values())
            .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
            .slice(0, 3);

        if (recentExecutions.length > 0) {
            console.log(chalk.blue('\n🕒 Recent Activity:'));
            recentExecutions.forEach(execution => {
                const statusIcon = this.getStatusIcon(execution.status);
                const timeAgo = this.getTimeAgo(execution.startedAt);
                console.log(chalk.gray(`   ${statusIcon} ${execution.taskTitle} - ${timeAgo}`));
            });
        }
    }

    /**
     * Get time ago string
     * @param {Date} date - Date to compare
     * @returns {string} Time ago string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return `${seconds}s ago`;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopRealTimeUpdates();
        
        if (this.multiBar) {
            this.multiBar.stop();
        }

        this.spinners.forEach(spinner => spinner.stop());
        this.spinners.clear();
        this.progressBars.clear();
        this.tasks.clear();
        this.executions.clear();
    }
}

module.exports = TaskProgressUI; 