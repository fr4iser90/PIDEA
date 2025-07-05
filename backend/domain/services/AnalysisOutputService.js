const fs = require('fs').promises;
const path = require('path');

class AnalysisOutputService {
    constructor() {
        this.outputBasePath = path.join(process.cwd(), '..', 'output');
        this.analysisPath = path.join(this.outputBasePath, 'analysis');
        this.projectsPath = path.join(this.analysisPath, 'projects');
        this.ensureDirectories();
    }

    async ensureDirectories() {
        const dirs = [this.outputBasePath, this.analysisPath, this.projectsPath];
        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
            }
        }
    }

    async saveAnalysisResult(projectId, analysisType, data) {
        const projectDir = path.join(this.projectsPath, projectId);
        await fs.mkdir(projectDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${analysisType}-${timestamp}.json`;
        const filepath = path.join(projectDir, filename);

        const result = {
            projectId,
            analysisType,
            timestamp: new Date().toISOString(),
            data
        };

        await fs.writeFile(filepath, JSON.stringify(result, null, 2));
        return { filepath, filename, result };
    }

    async generateMarkdownReport(projectId, analysisResults) {
        const projectDir = path.join(this.projectsPath, projectId);
        await fs.mkdir(projectDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `analysis-report-${timestamp}.md`;
        const filepath = path.join(projectDir, filename);

        let markdown = `# Project Analysis Report\n\n`;
        markdown += `**Project ID:** ${projectId}\n`;
        markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

        for (const [analysisType, result] of Object.entries(analysisResults)) {
            markdown += `## ${this.formatAnalysisType(analysisType)}\n\n`;
            
            if (result.data) {
                markdown += this.formatAnalysisData(analysisType, result.data);
            }
            
            markdown += `\n---\n\n`;
        }

        await fs.writeFile(filepath, markdown);
        return { filepath, filename };
    }

    formatAnalysisType(type) {
        return type.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
    }

    formatAnalysisData(type, data) {
        switch (type) {
            case 'codeQuality':
                return this.formatCodeQualityData(data);
            case 'security':
                return this.formatSecurityData(data);
            case 'performance':
                return this.formatPerformanceData(data);
            case 'architecture':
                return this.formatArchitectureData(data);
            case 'projectStructure':
                return this.formatProjectStructureData(data);
            default:
                return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
        }
    }

    formatCodeQualityData(data) {
        let md = '';
        
        if (data.overallScore !== undefined) {
            md += `**Overall Quality Score:** ${data.overallScore}/100\n\n`;
        }

        if (data.metrics) {
            md += '### Quality Metrics\n\n';
            md += '| Metric | Score | Status |\n';
            md += '|--------|-------|--------|\n';
            
            Object.entries(data.metrics).forEach(([metric, value]) => {
                const status = value >= 80 ? '🟢 Good' : value >= 60 ? '🟡 Warning' : '🔴 Poor';
                md += `| ${metric} | ${value}/100 | ${status} |\n`;
            });
            md += '\n';
        }

        if (data.issues && data.issues.length > 0) {
            md += '### Issues Found\n\n';
            data.issues.forEach(issue => {
                md += `- **${issue.type}:** ${issue.message}\n`;
                if (issue.file) md += `  - File: \`${issue.file}\`\n`;
                if (issue.line) md += `  - Line: ${issue.line}\n`;
                md += '\n';
            });
        }

        if (data.recommendations && data.recommendations.length > 0) {
            md += '### Recommendations\n\n';
            data.recommendations.forEach(rec => {
                md += `- ${rec}\n`;
            });
            md += '\n';
        }

        return md;
    }

    formatSecurityData(data) {
        let md = '';
        
        if (data.vulnerabilities && data.vulnerabilities.length > 0) {
            md += '### Security Vulnerabilities\n\n';
            md += '| Severity | Type | Description | File |\n';
            md += '|----------|------|-------------|------|\n';
            
            data.vulnerabilities.forEach(vuln => {
                const severity = vuln.severity === 'high' ? '🔴' : vuln.severity === 'medium' ? '🟡' : '🟢';
                md += `| ${severity} ${vuln.severity} | ${vuln.type} | ${vuln.description} | \`${vuln.file || 'N/A'}\` |\n`;
            });
            md += '\n';
        }

        if (data.securityScore !== undefined) {
            md += `**Security Score:** ${data.securityScore}/100\n\n`;
        }

        if (data.recommendations && data.recommendations.length > 0) {
            md += '### Security Recommendations\n\n';
            data.recommendations.forEach(rec => {
                md += `- ${rec}\n`;
            });
            md += '\n';
        }

        return md;
    }

    formatPerformanceData(data) {
        let md = '';
        
        if (data.metrics) {
            md += '### Performance Metrics\n\n';
            md += '| Metric | Value | Status |\n';
            md += '|--------|-------|--------|\n';
            
            Object.entries(data.metrics).forEach(([metric, value]) => {
                let status = '🟢 Good';
                if (metric.includes('time') && value > 1000) status = '🔴 Slow';
                else if (metric.includes('size') && value > 1000000) status = '🟡 Large';
                
                md += `| ${metric} | ${value} | ${status} |\n`;
            });
            md += '\n';
        }

        if (data.bottlenecks && data.bottlenecks.length > 0) {
            md += '### Performance Bottlenecks\n\n';
            data.bottlenecks.forEach(bottleneck => {
                md += `- **${bottleneck.type}:** ${bottleneck.description}\n`;
                if (bottleneck.impact) md += `  - Impact: ${bottleneck.impact}\n`;
                md += '\n';
            });
        }

        return md;
    }

    formatArchitectureData(data) {
        let md = '';
        
        if (data.patterns && data.patterns.length > 0) {
            md += '### Architectural Patterns\n\n';
            data.patterns.forEach(pattern => {
                md += `- **${pattern.name}:** ${pattern.description}\n`;
                if (pattern.files) {
                    md += `  - Files: ${pattern.files.join(', ')}\n`;
                }
                md += '\n';
            });
        }

        if (data.couplingScore !== undefined) {
            md += `**Coupling Score:** ${data.couplingScore}/100 (Lower is better)\n\n`;
        }

        if (data.cohesionScore !== undefined) {
            md += `**Cohesion Score:** ${data.cohesionScore}/100 (Higher is better)\n\n`;
        }

        if (data.recommendations && data.recommendations.length > 0) {
            md += '### Architectural Recommendations\n\n';
            data.recommendations.forEach(rec => {
                md += `- ${rec}\n`;
            });
            md += '\n';
        }

        return md;
    }

    formatProjectStructureData(data) {
        let md = '';
        
        if (data.structure) {
            md += '### Project Structure\n\n';
            md += '```\n';
            md += this.formatTree(data.structure);
            md += '\n```\n\n';
        }

        if (data.statistics) {
            md += '### Project Statistics\n\n';
            md += '| Metric | Value |\n';
            md += '|--------|-------|\n';
            
            Object.entries(data.statistics).forEach(([metric, value]) => {
                md += `| ${metric} | ${value} |\n`;
            });
            md += '\n';
        }

        if (data.dependencies) {
            md += '### Dependencies\n\n';
            md += '#### Production Dependencies\n';
            data.dependencies.production?.forEach(dep => {
                md += `- \`${dep.name}@${dep.version}\`\n`;
            });
            md += '\n#### Development Dependencies\n';
            data.dependencies.development?.forEach(dep => {
                md += `- \`${dep.name}@${dep.version}\`\n`;
            });
            md += '\n';
        }

        return md;
    }

    formatTree(structure, indent = '') {
        let result = '';
        for (const [name, children] of Object.entries(structure)) {
            result += `${indent}${name}\n`;
            if (children && typeof children === 'object') {
                result += this.formatTree(children, indent + '  ');
            }
        }
        return result;
    }

    async getAnalysisHistory(projectId) {
        const projectDir = path.join(this.projectsPath, projectId);
        try {
            const files = await fs.readdir(projectDir);
            const analysisFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.md'));
            
            const history = [];
            for (const file of analysisFiles) {
                const filepath = path.join(projectDir, file);
                const stats = await fs.stat(filepath);
                
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(filepath, 'utf8');
                    const data = JSON.parse(content);
                    history.push({
                        type: 'analysis',
                        filename: file,
                        filepath,
                        timestamp: data.timestamp,
                        analysisType: data.analysisType,
                        size: stats.size
                    });
                } else if (file.endsWith('.md')) {
                    history.push({
                        type: 'report',
                        filename: file,
                        filepath,
                        timestamp: stats.mtime.toISOString(),
                        size: stats.size
                    });
                }
            }
            
            return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            return [];
        }
    }

    async getAnalysisFile(projectId, filename) {
        const filepath = path.join(this.projectsPath, projectId, filename);
        try {
            const content = await fs.readFile(filepath, 'utf8');
            if (filename.endsWith('.json')) {
                return JSON.parse(content);
            }
            return content;
        } catch (error) {
            throw new Error(`File not found: ${filename}`);
        }
    }
}

module.exports = AnalysisOutputService; 