#!/usr/bin/env node

/**
 * Export Analysis Data to Markdown Files
 * 
 * This script exports all analysis records from the database to individual markdown files
 * for testing and review purposes. Each analysis gets its own file with structured content.
 * 
 * Usage:
 *   node scripts/export-analysis-to-markdown.js [options]
 * 
 * Options:
 *   --project-id <id>     Export only analyses for specific project
 *   --type <type>         Export only specific analysis type
 *   --output-dir <path>   Output directory (default: output/analysis-exports)
 *   --format <format>     Output format: 'detailed' or 'summary' (default: detailed)
 *   --limit <number>      Limit number of exports (default: all)
 */

const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  projectId: null,
  type: null,
  outputDir: 'output/analysis-exports',
  format: 'detailed',
  limit: null
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--project-id':
      options.projectId = args[++i];
      break;
    case '--type':
      options.type = args[++i];
      break;
    case '--output-dir':
      options.outputDir = args[++i];
      break;
    case '--format':
      options.format = args[++i];
      break;
    case '--limit':
      options.limit = parseInt(args[++i]);
      break;
    case '--help':
      console.log(`
Export Analysis Data to Markdown Files

Usage: node scripts/export-analysis-to-markdown.js [options]

Options:
  --project-id <id>     Export only analyses for specific project
  --type <type>         Export only specific analysis type
  --output-dir <path>   Output directory (default: output/analysis-exports)
  --format <format>     Output format: 'detailed' or 'summary' (default: detailed)
  --limit <number>      Limit number of exports (default: all)
  --create-sample       Create sample analysis data for testing
  --help                Show this help message

Examples:
  node scripts/export-analysis-to-markdown.js
  node scripts/export-analysis-to-markdown.js --project-id PIDEA --type security
  node scripts/export-analysis-to-markdown.js --output-dir ./my-exports --limit 10
  node scripts/export-analysis-to-markdown.js --create-sample --limit 5
      `);
      process.exit(0);
    case '--create-sample':
      options.createSample = true;
      break;
  }
}

class AnalysisExporter {
  constructor() {
    this.outputDir = options.outputDir;
    this.format = options.format;
    this.limit = options.limit;
  }

  /**
   * Get database connection
   */
  async getDatabaseConnection() {
    try {
      // Load environment variables from .env file
      require('dotenv').config();
      
      const databaseType = process.env.DATABASE_TYPE || 'sqlite';
      console.log(`🔍 Database type from .env: ${databaseType}`);
      
      if (databaseType === 'postgres' || databaseType === 'postgresql') {
        // PostgreSQL configuration from .env
        const pgConfig = {
          type: 'postgresql',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'pidea_dev',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres'
        };
        
        console.log('🐘 Using PostgreSQL configuration from .env');
        console.log(`   Host: ${pgConfig.host}:${pgConfig.port}`);
        console.log(`   Database: ${pgConfig.database}`);
        console.log(`   User: ${pgConfig.user}`);
        
        return pgConfig;
      } else {
        // SQLite configuration
        const dbPath = process.env.DATABASE_PATH || 'backend/database/pidea-dev.db';
        try {
          await fs.access(dbPath);
          console.log(`✅ Found SQLite database: ${dbPath}`);
          return { type: 'sqlite', path: dbPath };
        } catch (error) {
          console.log(`❌ SQLite database not found: ${dbPath}`);
        }
      }

      throw new Error('No database connection available');
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Query analysis data from database
   */
  async queryAnalysisData(dbConfig) {
    try {
      let query = '';
      let params = [];

      if (dbConfig.type === 'postgresql') {
        // PostgreSQL query
        console.log('🔍 Querying PostgreSQL database...');
        
        // Check if analysis table exists
        const checkQuery = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analysis')";
        const checkResult = execSync(`PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -t -c "${checkQuery}"`, { 
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 // 1MB buffer for simple check
        });
        const tableExists = checkResult.trim() === 't';
        
        if (tableExists) {
          // Use new unified analysis table
          query = `
            SELECT 
              id, project_id, analysis_type, status, progress,
              started_at, completed_at, error, result, metadata,
              config, timeout, retry_count, max_retries,
              memory_usage, execution_time, file_count, line_count,
              overall_score, critical_issues_count, warnings_count,
              recommendations_count, created_at, updated_at
            FROM analysis
            WHERE 1=1
          `;
        } else {
          // Fallback to old analysis_steps table
          console.log('ℹ️ Using legacy analysis_steps table (new analysis table not found)');
          query = `
            SELECT 
              id, project_id, analysis_type, status, progress,
              started_at, completed_at, error, result, metadata,
              config, timeout, retry_count, max_retries,
              memory_usage, execution_time, file_count, line_count,
              overall_score, critical_issues_count, warnings_count,
              recommendations_count, created_at, updated_at
            FROM analysis_steps
            WHERE 1=1
          `;
        }

        if (options.projectId) {
          query += ' AND project_id = ?';
          params.push(options.projectId);
        }

        if (options.type) {
          query += ' AND analysis_type = ?';
          params.push(options.type);
        }

        query += ' ORDER BY created_at DESC';

        if (this.limit) {
          query += ' LIMIT ?';
          params.push(this.limit);
        }

        // Execute PostgreSQL query using psql command line with increased buffer size
        // Replace parameter placeholders with actual values
        let finalQuery = query;
        if (options.projectId) {
          finalQuery = finalQuery.replace('?', `'${options.projectId}'`);
        }
        if (options.type) {
          finalQuery = finalQuery.replace('?', `'${options.type}'`);
        }
        if (this.limit) {
          finalQuery = finalQuery.replace('?', this.limit.toString());
        }
        
        // Use larger buffer size and stream output to avoid ENOBUFS
        const psqlCmd = `PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -t -A -F "|" -c "${finalQuery.replace(/\n/g, ' ')}"`;
        const result = execSync(psqlCmd, { 
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        return this.parsePostgreSQLResult(result);
      } else if (dbConfig.type === 'sqlite') {
        // SQLite query
        console.log('🔍 Querying SQLite database...');
        
        // First try the new unified analysis table
        let tableExists = false;
        try {
          const checkQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name='analysis'";
          const checkResult = execSync(`sqlite3 "${dbConfig.path}" "${checkQuery}"`, { encoding: 'utf8' });
          tableExists = checkResult.trim() === 'analysis';
        } catch (error) {
          // Table doesn't exist
        }

        if (tableExists) {
          // Use new unified analysis table
          query = `
            SELECT 
              id, project_id, analysis_type, status, progress,
              started_at, completed_at, error, result, metadata,
              config, timeout, retry_count, max_retries,
              memory_usage, execution_time, file_count, line_count,
              overall_score, critical_issues_count, warnings_count,
              recommendations_count, created_at, updated_at
            FROM analysis
            WHERE 1=1
          `;
        } else {
          // Fallback to old analysis_steps table
          console.log('ℹ️ Using legacy analysis_steps table (new analysis table not found)');
          query = `
            SELECT 
              id, project_id, analysis_type, status, progress,
              started_at, completed_at, error, result, metadata,
              config, timeout, retry_count, max_retries,
              memory_usage, execution_time, file_count, line_count,
              overall_score, critical_issues_count, warnings_count,
              recommendations_count, created_at, updated_at
            FROM analysis_steps
            WHERE 1=1
          `;
        }

        if (options.projectId) {
          query += ' AND project_id = ?';
          params.push(options.projectId);
        }

        if (options.type) {
          query += ' AND analysis_type = ?';
          params.push(options.type);
        }

        query += ' ORDER BY created_at DESC';

        if (this.limit) {
          query += ' LIMIT ?';
          params.push(this.limit);
        }

        // Execute SQLite query using sqlite3 command line
        // Replace parameter placeholders with actual values
        let finalQuery = query;
        if (options.projectId) {
          finalQuery = finalQuery.replace('?', `'${options.projectId}'`);
        }
        if (options.type) {
          finalQuery = finalQuery.replace('?', `'${options.type}'`);
        }
        if (this.limit) {
          finalQuery = finalQuery.replace('?', this.limit.toString());
        }
        
        const sqliteCmd = `sqlite3 "${dbConfig.path}" "${finalQuery.replace(/\n/g, ' ')}"`;
        const result = execSync(sqliteCmd, { encoding: 'utf8' });
        
        return this.parseSQLiteResult(result);
      } else if (dbConfig.type === 'postgresql') {
        // PostgreSQL query
        query = `
          SELECT 
            id, project_id, analysis_type, status, progress,
            started_at, completed_at, error, result, metadata,
            config, timeout, retry_count, max_retries,
            memory_usage, execution_time, file_count, line_count,
            overall_score, critical_issues_count, warnings_count,
            recommendations_count, created_at, updated_at
          FROM analysis
          WHERE 1=1
        `;

        if (options.projectId) {
          query += ' AND project_id = $1';
          params.push(options.projectId);
        }

        if (options.type) {
          query += ' AND analysis_type = $2';
          params.push(options.type);
        }

        query += ' ORDER BY created_at DESC';

        if (this.limit) {
          query += ' LIMIT $3';
          params.push(this.limit);
        }

        // Execute PostgreSQL query using psql
        const psqlCmd = `psql "${dbConfig.connectionString}" -c "${query}"`;
        const result = execSync(psqlCmd, { encoding: 'utf8' });
        
        return this.parsePostgreSQLResult(result);
      }
    } catch (error) {
      console.error('❌ Query error:', error.message);
      throw error;
    }
  }

  /**
   * Parse SQLite query result
   */
  parseSQLiteResult(result) {
    const lines = result.trim().split('\n');
    const analyses = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const values = line.split('|');
      if (values.length < 24) continue;

      const analysis = {
        id: values[0],
        project_id: values[1],
        analysis_type: values[2],
        status: values[3],
        progress: parseInt(values[4]) || 0,
        started_at: values[5],
        completed_at: values[6],
        error: this.parseJSON(values[7]),
        result: this.parseJSON(values[8]),
        metadata: this.parseJSON(values[9]),
        config: this.parseJSON(values[10]),
        timeout: parseInt(values[11]) || 300000,
        retry_count: parseInt(values[12]) || 0,
        max_retries: parseInt(values[13]) || 2,
        memory_usage: parseInt(values[14]) || null,
        execution_time: parseInt(values[15]) || null,
        file_count: parseInt(values[16]) || null,
        line_count: parseInt(values[17]) || null,
        overall_score: parseFloat(values[18]) || 0,
        critical_issues_count: parseInt(values[19]) || 0,
        warnings_count: parseInt(values[20]) || 0,
        recommendations_count: parseInt(values[21]) || 0,
        created_at: values[22],
        updated_at: values[23]
      };

      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Parse PostgreSQL query result
   */
  parsePostgreSQLResult(result) {
    const lines = result.trim().split('\n');
    const analyses = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const values = line.split('|').map(v => v.trim());
      
      if (values.length < 24) continue;

      const analysis = {
        id: values[0],
        project_id: values[1],
        analysis_type: values[2],
        status: values[3],
        progress: parseInt(values[4]) || 0,
        started_at: values[5],
        completed_at: values[6],
        error: this.parseJSON(values[7]),
        result: this.parseJSON(values[8]),
        metadata: this.parseJSON(values[9]),
        config: this.parseJSON(values[10]),
        timeout: parseInt(values[11]) || 300000,
        retry_count: parseInt(values[12]) || 0,
        max_retries: parseInt(values[13]) || 2,
        memory_usage: parseInt(values[14]) || null,
        execution_time: parseInt(values[15]) || null,
        file_count: parseInt(values[16]) || null,
        line_count: parseInt(values[17]) || null,
        overall_score: parseFloat(values[18]) || 0,
        critical_issues_count: parseInt(values[19]) || 0,
        warnings_count: parseInt(values[20]) || 0,
        recommendations_count: parseInt(values[21]) || 0,
        created_at: values[22],
        updated_at: values[23]
      };

      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Parse JSON string safely
   */
  parseJSON(jsonString) {
    if (!jsonString || jsonString === 'null' || jsonString === 'NULL') {
      return null;
    }
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return jsonString; // Return as string if not valid JSON
    }
  }

  /**
   * Create output directory
   */
  async createOutputDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`✅ Created output directory: ${this.outputDir}`);
    } catch (error) {
      console.error('❌ Failed to create output directory:', error.message);
      throw error;
    }
  }

  /**
   * Generate markdown content for analysis
   */
  generateMarkdownContent(analysis) {
    const timestamp = new Date().toISOString();
    const analysisDate = analysis.created_at ? new Date(analysis.created_at).toISOString() : 'Unknown';
    
    let content = `# Analysis Export: ${analysis.analysis_type}

## 📋 Analysis Overview
- **Analysis ID**: \`${analysis.id}\`
- **Project ID**: \`${analysis.project_id}\`
- **Analysis Type**: \`${analysis.analysis_type}\`
- **Status**: \`${analysis.status}\`
- **Progress**: ${analysis.progress}%
- **Created**: ${analysisDate}
- **Updated**: ${analysis.updated_at ? new Date(analysis.updated_at).toISOString() : 'Unknown'}
- **Export Date**: ${timestamp}

## 📊 Performance Metrics
- **Execution Time**: ${analysis.execution_time ? `${analysis.execution_time}ms` : 'N/A'}
- **Memory Usage**: ${analysis.memory_usage ? `${(analysis.memory_usage / 1024 / 1024).toFixed(2)}MB` : 'N/A'}
- **Files Processed**: ${analysis.file_count || 'N/A'}
- **Lines Processed**: ${analysis.line_count || 'N/A'}
- **Overall Score**: ${analysis.overall_score || 'N/A'}/100

## 🚨 Issues Summary
- **Critical Issues**: ${analysis.critical_issues_count || 0}
- **Warnings**: ${analysis.warnings_count || 0}
- **Recommendations**: ${analysis.recommendations_count || 0}

## ⏱️ Timeline
- **Started**: ${analysis.started_at || 'N/A'}
- **Completed**: ${analysis.completed_at || 'N/A'}
- **Duration**: ${this.calculateDuration(analysis.started_at, analysis.completed_at)}

## 🔧 Configuration
\`\`\`json
${JSON.stringify(analysis.config, null, 2)}
\`\`\`

## 📈 Metadata
\`\`\`json
${JSON.stringify(analysis.metadata, null, 2)}
\`\`\`

`;

    // Add detailed content if format is detailed
    if (this.format === 'detailed') {
      content += `
## 🚨 Error Information
${analysis.error ? `\`\`\`json
${JSON.stringify(analysis.error, null, 2)}
\`\`\`` : 'No errors recorded'}

## 📊 Analysis Results
${analysis.result ? `\`\`\`json
${JSON.stringify(analysis.result, null, 2)}
\`\`\`` : 'No results available'}

## 🔄 Retry Information
- **Retry Count**: ${analysis.retry_count || 0}
- **Max Retries**: ${analysis.max_retries || 2}
- **Timeout**: ${analysis.timeout || 300000}ms

## 📝 Raw Data
\`\`\`json
${JSON.stringify(analysis, null, 2)}
\`\`\`
`;
    }

    return content;
  }

  /**
   * Calculate duration between two timestamps
   */
  calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 'N/A';
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const duration = end - start;
      
      if (duration < 1000) return `${duration}ms`;
      if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
      return `${(duration / 60000).toFixed(2)}m`;
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Generate filename for analysis
   */
  generateFilename(analysis) {
    const date = analysis.created_at ? new Date(analysis.created_at).toISOString().split('T')[0] : 'unknown';
    const time = analysis.created_at ? new Date(analysis.created_at).toISOString().split('T')[1].split('.')[0].replace(/:/g, '-') : 'unknown';
    const safeType = analysis.analysis_type.replace(/[^a-zA-Z0-9]/g, '-');
    const shortId = analysis.id.substring(0, 8);
    
    return `${date}_${time}_${safeType}_${shortId}.md`;
  }

  /**
   * Export analysis to markdown file
   */
  async exportAnalysis(analysis) {
    try {
      const filename = this.generateFilename(analysis);
      const filepath = path.join(this.outputDir, filename);
      const content = this.generateMarkdownContent(analysis);
      
      await fs.writeFile(filepath, content, 'utf8');
      console.log(`✅ Exported: ${filename}`);
      
      return { filename, filepath, success: true };
    } catch (error) {
      console.error(`❌ Failed to export analysis ${analysis.id}:`, error.message);
      return { filename: null, filepath: null, success: false, error: error.message };
    }
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(analyses, exportResults) {
    const timestamp = new Date().toISOString();
    const successfulExports = exportResults.filter(r => r.success).length;
    const failedExports = exportResults.filter(r => !r.success).length;
    
    const summary = `# Analysis Export Summary

## 📊 Export Overview
- **Export Date**: ${timestamp}
- **Total Analyses**: ${analyses.length}
- **Successful Exports**: ${successfulExports}
- **Failed Exports**: ${failedExports}
- **Output Directory**: \`${this.outputDir}\`

## 🎯 Export Filters
- **Project ID**: ${options.projectId || 'All projects'}
- **Analysis Type**: ${options.type || 'All types'}
- **Format**: ${this.format}
- **Limit**: ${this.limit || 'No limit'}

## 📈 Analysis Types Distribution
${this.generateTypeDistribution(analyses)}

## 📅 Timeline Distribution
${this.generateTimelineDistribution(analyses)}

## ✅ Successfully Exported Files
${exportResults.filter(r => r.success).map(r => `- \`${r.filename}\``).join('\n')}

${failedExports > 0 ? `
## ❌ Failed Exports
${exportResults.filter(r => !r.success).map(r => `- ${r.error}`).join('\n')}
` : ''}

## 🔧 Export Configuration
\`\`\`json
${JSON.stringify(options, null, 2)}
\`\`\`

## 📝 Usage Instructions
1. Navigate to the output directory: \`cd ${this.outputDir}\`
2. Review individual analysis files
3. Use markdown viewer or editor to read the files
4. Each file contains complete analysis data in structured format

---
*Generated by Analysis Export Script*
`;

    const summaryPath = path.join(this.outputDir, 'EXPORT_SUMMARY.md');
    await fs.writeFile(summaryPath, summary, 'utf8');
    console.log(`✅ Generated summary: EXPORT_SUMMARY.md`);
  }

  /**
   * Generate type distribution
   */
  generateTypeDistribution(analyses) {
    const distribution = {};
    analyses.forEach(analysis => {
      distribution[analysis.analysis_type] = (distribution[analysis.analysis_type] || 0) + 1;
    });
    
    return Object.entries(distribution)
      .map(([type, count]) => `- **${type}**: ${count} analyses`)
      .join('\n');
  }

  /**
   * Generate timeline distribution
   */
  generateTimelineDistribution(analyses) {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let todayCount = 0, yesterdayCount = 0, thisWeekCount = 0, thisMonthCount = 0, olderCount = 0;
    
    analyses.forEach(analysis => {
      if (!analysis.created_at) return;
      
      const created = new Date(analysis.created_at);
      if (created.toDateString() === today.toDateString()) {
        todayCount++;
      } else if (created.toDateString() === yesterday.toDateString()) {
        yesterdayCount++;
      } else if (created > thisWeek) {
        thisWeekCount++;
      } else if (created > thisMonth) {
        thisMonthCount++;
      } else {
        olderCount++;
      }
    });
    
    return `- **Today**: ${todayCount} analyses
- **Yesterday**: ${yesterdayCount} analyses
- **This Week**: ${thisWeekCount} analyses
- **This Month**: ${thisMonthCount} analyses
- **Older**: ${olderCount} analyses`;
  }

  /**
   * Main export process
   */
  async run() {
    console.log('🚀 Starting Analysis Export...');
    console.log(`📁 Output Directory: ${this.outputDir}`);
    console.log(`📝 Format: ${this.format}`);
    if (this.limit) console.log(`🔢 Limit: ${this.limit}`);
    
    try {
      // Get database connection
      const dbConfig = await this.getDatabaseConnection();
      
      // Query analysis data
      console.log('🔍 Querying analysis data...');
      const analyses = await this.queryAnalysisData(dbConfig);
      console.log(`✅ Found ${analyses.length} analyses`);
      
      if (analyses.length === 0) {
        console.log('ℹ️ No analyses found matching criteria');
        return;
      }
      
      // Create output directory
      await this.createOutputDirectory();
      
      // Export each analysis
      console.log('📤 Exporting analyses...');
      const exportResults = [];
      
      for (const analysis of analyses) {
        const result = await this.exportAnalysis(analysis);
        exportResults.push(result);
      }
      
      // Generate summary report
      await this.generateSummaryReport(analyses, exportResults);
      
      console.log('\n🎉 Export completed successfully!');
      console.log(`📁 Check the output directory: ${this.outputDir}`);
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the exporter
if (require.main === module) {
  const exporter = new AnalysisExporter();
  exporter.run().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = AnalysisExporter; 