const { BaseStep } = require('@/domain/steps/BaseStep');
const { ProjectRepository } = require('@/domain/repositories/ProjectRepository');
const { TerminalService } = require('@/domain/services/TerminalService');
const logger = require('@/infrastructure/logging/logger');

class ProjectBuildStep extends BaseStep {
  constructor() {
    super({
      name: 'ProjectBuildStep',
      description: 'Build project using configured build command',
      category: 'testing',
      settings: {
        includeCleanBuild: false,
        includeProductionBuild: true,
        includeBuildAnalysis: true,
        includeSizeCheck: true,
        timeout: 180000
      }
    });
  }

  async execute(context) {
    try {
      const { projectId, workspacePath } = context;
      
      logger.info(`🔨 Building project ${projectId}`);
      
      // 1. Get project configuration from database
      const projectRepo = new ProjectRepository();
      const project = await projectRepo.findById(projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // 2. Get build command from project config
      const buildCommand = project.build_command || 'npm run build';
      const packageManager = project.package_manager || 'npm';
      
      logger.info(`📦 Using package manager: ${packageManager}`);
      logger.info(`🔨 Build command: ${buildCommand}`);
      
      // 3. Clean build if enabled
      if (this.settings.includeCleanBuild) {
        logger.info('🧹 Performing clean build...');
        await this.performCleanBuild(workspacePath, packageManager);
      }
      
      // 4. Build enhanced command based on settings
      const enhancedCommand = this.buildEnhancedCommand(buildCommand);
      logger.info(`🔧 Enhanced command: ${enhancedCommand}`);
      
      // 5. Run build
      const terminalService = new TerminalService();
      const result = await terminalService.executeCommand(enhancedCommand, {
        cwd: workspacePath,
        timeout: this.settings.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          CI: 'true'
        }
      });
      
      // 6. Analyze build results
      const buildAnalysis = await this.analyzeBuildResults(workspacePath, result);
      
      if (result.success) {
        logger.info('✅ Build completed successfully');
        
        return {
          success: true,
          message: 'Build completed successfully',
          data: {
            status: 'success',
            command: enhancedCommand,
            output: result.output,
            buildAnalysis: buildAnalysis
          }
        };
      } else {
        logger.warn('⚠️ Build failed or had issues');
        
        return {
          success: false,
          message: 'Build failed or had issues',
          error: result.error,
          data: {
            status: 'failed',
            command: enhancedCommand,
            output: result.output,
            buildAnalysis: buildAnalysis
          }
        };
      }
      
    } catch (error) {
      logger.error('❌ Failed to build project:', error);
      
      return {
        success: false,
        message: 'Failed to build project',
        error: error.message,
        data: {
          status: 'error',
          command: context.buildCommand || 'npm run build'
        }
      };
    }
  }

  async performCleanBuild(workspacePath, packageManager) {
    try {
      const terminalService = new TerminalService();
      
      // Clean common build directories
      const cleanCommands = [
        'rm -rf dist',
        'rm -rf build',
        'rm -rf .next',
        'rm -rf out',
        'rm -rf node_modules/.cache'
      ];
      
      for (const command of cleanCommands) {
        try {
          await terminalService.executeCommand(command, {
            cwd: workspacePath,
            timeout: 30000
          });
        } catch (error) {
          // Directory might not exist, that's okay
          logger.debug(`Clean command failed (expected): ${command}`);
        }
      }
      
      logger.info('🧹 Clean build preparation completed');
      
    } catch (error) {
      logger.warn('⚠️ Clean build preparation failed:', error.message);
    }
  }

  buildEnhancedCommand(baseCommand) {
    let command = baseCommand;
    
    // Add production flag if enabled
    if (this.settings.includeProductionBuild) {
      if (command.includes('npm run build')) {
        command = command.replace('npm run build', 'npm run build --production');
      } else if (command.includes('yarn build')) {
        command = command.replace('yarn build', 'yarn build --production');
      } else if (command.includes('pnpm build')) {
        command = command.replace('pnpm build', 'pnpm build --production');
      }
    }
    
    return command;
  }

  async analyzeBuildResults(workspacePath, result) {
    const analysis = {
      buildSize: null,
      buildTime: null,
      buildOutput: null,
      warnings: [],
      errors: []
    };
    
    try {
      // Calculate build size
      if (this.settings.includeSizeCheck) {
        analysis.buildSize = await this.calculateBuildSize(workspacePath);
      }
      
      // Parse build output for warnings and errors
      if (result.output) {
        const lines = result.output.split('\n');
        
        for (const line of lines) {
          if (line.includes('WARNING') || line.includes('Warning')) {
            analysis.warnings.push(line.trim());
          }
          if (line.includes('ERROR') || line.includes('Error')) {
            analysis.errors.push(line.trim());
          }
        }
      }
      
      // Estimate build time from output
      const timeMatch = result.output?.match(/Time:\s+(\d+(?:\.\d+)?)s/);
      if (timeMatch) {
        analysis.buildTime = parseFloat(timeMatch[1]);
      }
      
      // Determine build output directory
      analysis.buildOutput = await this.findBuildOutput(workspacePath);
      
    } catch (error) {
      logger.warn('⚠️ Build analysis failed:', error.message);
    }
    
    return analysis;
  }

  async calculateBuildSize(workspacePath) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Common build output directories
      const buildDirs = ['dist', 'build', '.next', 'out'];
      
      for (const dir of buildDirs) {
        const buildPath = path.join(workspacePath, dir);
        
        try {
          const stats = await fs.stat(buildPath);
          if (stats.isDirectory()) {
            const size = await this.calculateDirectorySize(buildPath);
            return {
              directory: dir,
              size: size,
              sizeFormatted: this.formatBytes(size)
            };
          }
        } catch (error) {
          // Directory doesn't exist, continue
        }
      }
      
      return null;
      
    } catch (error) {
      logger.warn('⚠️ Build size calculation failed:', error.message);
      return null;
    }
  }

  async calculateDirectorySize(dirPath) {
    const fs = require('fs').promises;
    const path = require('path');
    
    let totalSize = 0;
    
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        totalSize += await this.calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async findBuildOutput(workspacePath) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Common build output directories
      const buildDirs = ['dist', 'build', '.next', 'out'];
      
      for (const dir of buildDirs) {
        const buildPath = path.join(workspacePath, dir);
        
        try {
          const stats = await fs.stat(buildPath);
          if (stats.isDirectory()) {
            return {
              directory: dir,
              path: buildPath,
              exists: true
            };
          }
        } catch (error) {
          // Directory doesn't exist
        }
      }
      
      return {
        directory: null,
        path: null,
        exists: false
      };
      
    } catch (error) {
      logger.warn('⚠️ Build output detection failed:', error.message);
      return {
        directory: null,
        path: null,
        exists: false
      };
    }
  }
}

module.exports = ProjectBuildStep; 