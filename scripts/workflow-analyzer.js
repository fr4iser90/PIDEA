#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WorkflowAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.outputDir = path.join(this.projectRoot, 'output', 'workflow-analysis');
    this.analysisResults = {
      commands: [],
      handlers: [],
      services: [],
      controllers: [],
      components: [],
      workflows: [],
      architecture: {}
    };
    
    // Color schemes for different diagram types
    this.colors = {
      command: '#FF6B6B',
      handler: '#4ECDC4',
      service: '#45B7D1',
      controller: '#96CEB4',
      component: '#FFEAA7',
      entity: '#DDA0DD',
      repository: '#98D8C8',
      infrastructure: '#F7DC6F',
      presentation: '#BB8FCE',
      domain: '#85C1E9',
      application: '#F8C471'
    };
  }

  async analyze() {
    console.log('🚀 Starting PIDEA Workflow Analysis...\n');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Analyze different layers
    await this.analyzeCommands();
    await this.analyzeHandlers();
    await this.analyzeServices();
    await this.analyzeControllers();
    await this.analyzeComponents();
    await this.analyzeWorkflows();
    await this.analyzeArchitecture();

    // Generate diagrams
    await this.generateDiagrams();
    
    // Generate HTML report
    await this.generateHTMLReport();
    
    console.log('✅ Analysis complete! Check the output directory for results.');
  }

  async analyzeCommands() {
    console.log('📋 Analyzing Commands...');
    const commandsDir = path.join(this.projectRoot, 'backend', 'application', 'commands');
    
    if (fs.existsSync(commandsDir)) {
      const commandFiles = this.getFilesRecursively(commandsDir, '.js');
      
      for (const file of commandFiles) {
        const relativePath = path.relative(this.projectRoot, file);
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract command class name
        const classNameMatch = content.match(/class\s+(\w+Command)/);
        const className = classNameMatch ? classNameMatch[1] : path.basename(file, '.js');
        
        // Extract dependencies
        const dependencies = this.extractDependencies(content);
        
        this.analysisResults.commands.push({
          name: className,
          file: relativePath,
          dependencies,
          type: this.categorizeCommand(className)
        });
      }
    }
  }

  async analyzeHandlers() {
    console.log('🎯 Analyzing Handlers...');
    const handlersDir = path.join(this.projectRoot, 'backend', 'application', 'handlers');
    
    if (fs.existsSync(handlersDir)) {
      const handlerFiles = this.getFilesRecursively(handlersDir, '.js');
      
      for (const file of handlerFiles) {
        const relativePath = path.relative(this.projectRoot, file);
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract handler class name
        const classNameMatch = content.match(/class\s+(\w+Handler)/);
        const className = classNameMatch ? classNameMatch[1] : path.basename(file, '.js');
        
        // Extract dependencies
        const dependencies = this.extractDependencies(content);
        
        this.analysisResults.handlers.push({
          name: className,
          file: relativePath,
          dependencies,
          type: this.categorizeHandler(className)
        });
      }
    }
  }

  async analyzeServices() {
    console.log('⚙️  Analyzing Services...');
    const servicesDir = path.join(this.projectRoot, 'backend', 'domain', 'services');
    
    if (fs.existsSync(servicesDir)) {
      const serviceFiles = this.getFilesRecursively(servicesDir, '.js');
      
      for (const file of serviceFiles) {
        const relativePath = path.relative(this.projectRoot, file);
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract service class name
        const classNameMatch = content.match(/class\s+(\w+Service)/);
        const className = classNameMatch ? classNameMatch[1] : path.basename(file, '.js');
        
        // Extract dependencies
        const dependencies = this.extractDependencies(content);
        
        this.analysisResults.services.push({
          name: className,
          file: relativePath,
          dependencies,
          type: this.categorizeService(className)
        });
      }
    }
  }

  async analyzeControllers() {
    console.log('🎮 Analyzing Controllers...');
    const controllersDir = path.join(this.projectRoot, 'backend', 'presentation', 'api');
    
    if (fs.existsSync(controllersDir)) {
      const controllerFiles = this.getFilesRecursively(controllersDir, '.js');
      
      for (const file of controllerFiles) {
        const relativePath = path.relative(this.projectRoot, file);
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract controller class name
        const classNameMatch = content.match(/class\s+(\w+Controller)/);
        const className = classNameMatch ? classNameMatch[1] : path.basename(file, '.js');
        
        // Extract routes
        const routes = this.extractRoutes(content);
        
        this.analysisResults.controllers.push({
          name: className,
          file: relativePath,
          routes,
          type: 'api'
        });
      }
    }
  }

  async analyzeComponents() {
    console.log('🧩 Analyzing Frontend Components...');
    const componentsDir = path.join(this.projectRoot, 'frontend', 'src', 'presentation', 'components');
    
    if (fs.existsSync(componentsDir)) {
      const componentFiles = this.getFilesRecursively(componentsDir, '.jsx');
      
      for (const file of componentFiles) {
        const relativePath = path.relative(this.projectRoot, file);
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract component name
        const componentName = path.basename(file, '.jsx');
        
        // Extract props and state
        const props = this.extractProps(content);
        const state = this.extractState(content);
        
        this.analysisResults.components.push({
          name: componentName,
          file: relativePath,
          props,
          state,
          type: this.categorizeComponent(componentName)
        });
      }
    }
  }

  async analyzeWorkflows() {
    console.log('🔄 Analyzing Workflows...');
    
    // Define main workflows based on command-handler relationships
    const workflows = [
      {
        name: 'Task Creation Workflow',
        description: 'Complete flow from task creation to execution',
        steps: [
          'CreateTaskCommand',
          'CreateTaskHandler',
          'TaskService',
          'TaskValidationService',
          'TaskExecutionService'
        ]
      },
      {
        name: 'Chat Message Workflow',
        description: 'Message processing and AI integration',
        steps: [
          'SendMessageCommand',
          'SendMessageHandler',
          'ChatRepository',
          'AIService',
          'ChatController'
        ]
      },
      {
        name: 'Code Analysis Workflow',
        description: 'Architecture and code quality analysis',
        steps: [
          'AnalyzeArchitectureCommand',
          'AnalyzeArchitectureHandler',
          'ArchitectureService',
          'ProjectAnalyzer',
          'AnalysisController'
        ]
      },
      {
        name: 'Auto-Finish Workflow',
        description: 'Automated task completion system',
        steps: [
          'ProcessTodoListCommand',
          'ProcessTodoListHandler',
          'AutoFinishSystem',
          'TaskMonitoringService',
          'TaskOptimizationService'
        ]
      },
      {
        name: 'IDE Integration Workflow',
        description: 'IDE mirroring and workspace detection',
        steps: [
          'IDEMirrorController',
          'IDEMirrorService',
          'vscodeIDEService',
          'CursorIDEService',
          'WebSocketManager'
        ]
      }
    ];
    
    this.analysisResults.workflows = workflows;
  }

  async analyzeArchitecture() {
    console.log('🏗️  Analyzing Architecture...');
    
    this.analysisResults.architecture = {
      layers: {
        presentation: {
          description: 'API Controllers, WebSocket, Frontend Components',
          components: this.analysisResults.controllers.map(c => c.name).concat(
            this.analysisResults.components.map(c => c.name)
          )
        },
        application: {
          description: 'Commands, Handlers, Queries',
          components: this.analysisResults.commands.map(c => c.name).concat(
            this.analysisResults.handlers.map(h => h.name)
          )
        },
        domain: {
          description: 'Services, Entities, Value Objects',
          components: this.analysisResults.services.map(s => s.name)
        },
        infrastructure: {
          description: 'Repositories, External Services, Database',
          components: ['DatabaseConnection', 'AIService', 'BrowserManager', 'IDEManager']
        }
      },
      patterns: [
        'Command Query Responsibility Segregation (CQRS)',
        'Domain-Driven Design (DDD)',
        'Clean Architecture',
        'Event-Driven Architecture',
        'Service-Oriented Architecture'
      ]
    };
  }

  async generateDiagrams() {
    console.log('📊 Generating Mermaid Diagrams...');
    
    // Generate different types of diagrams
    await this.generateArchitectureDiagram();
    await this.generateWorkflowDiagrams();
    await this.generateComponentDiagram();
    await this.generateServiceDiagram();
    await this.generateDataFlowDiagram();
  }

  async generateArchitectureDiagram() {
    const diagram = `graph TB
    subgraph "Presentation Layer"
        A[Frontend Components] --> B[API Controllers]
        B --> C[WebSocket Manager]
    end
    
    subgraph "Application Layer"
        D[Commands] --> E[Handlers]
        E --> F[Queries]
    end
    
    subgraph "Domain Layer"
        G[Domain Services] --> H[Entities]
        H --> I[Value Objects]
    end
    
    subgraph "Infrastructure Layer"
        J[Repositories] --> K[External Services]
        K --> L[Database]
    end
    
    A -.-> D
    B --> D
    E --> G
    G --> J
    J --> L
    
    style A fill:${this.colors.component}
    style B fill:${this.colors.controller}
    style C fill:${this.colors.controller}
    style D fill:${this.colors.command}
    style E fill:${this.colors.handler}
    style F fill:${this.colors.handler}
    style G fill:${this.colors.service}
    style H fill:${this.colors.entity}
    style I fill:${this.colors.entity}
    style J fill:${this.colors.repository}
    style K fill:${this.colors.infrastructure}
    style L fill:${this.colors.infrastructure}`;

    fs.writeFileSync(path.join(this.outputDir, 'architecture-diagram.md'), diagram);
  }

  async generateWorkflowDiagrams() {
    for (const workflow of this.analysisResults.workflows) {
      const steps = workflow.steps.map((step, index) => 
        `${String.fromCharCode(65 + index)}[${step}]`
      ).join(' --> ');
      
      const diagram = `graph LR
    ${steps}
    
    style A fill:${this.colors.command}
    style B fill:${this.colors.handler}
    style C fill:${this.colors.service}
    style D fill:${this.colors.service}
    style E fill:${this.colors.service}`;

      const filename = workflow.name.toLowerCase().replace(/\s+/g, '-') + '-workflow.md';
      fs.writeFileSync(path.join(this.outputDir, filename), diagram);
    }
  }

  async generateComponentDiagram() {
    const components = this.analysisResults.components.map(comp => 
      `${comp.name.replace(/[^a-zA-Z0-9]/g, '')}[${comp.name}]`
    ).join('\n    ');
    
    const diagram = `graph TB
    subgraph "Frontend Components"
        ${components}
    end
    
    ${this.analysisResults.components.map(comp => 
      `style ${comp.name.replace(/[^a-zA-Z0-9]/g, '')} fill:${this.colors.component}`
    ).join('\n    ')}`;

    fs.writeFileSync(path.join(this.outputDir, 'component-diagram.md'), diagram);
  }

  async generateServiceDiagram() {
    const services = this.analysisResults.services.map(service => 
      `${service.name.replace(/[^a-zA-Z0-9]/g, '')}[${service.name}]`
    ).join('\n    ');
    
    const diagram = `graph TB
    subgraph "Domain Services"
        ${services}
    end
    
    ${this.analysisResults.services.map(service => 
      `style ${service.name.replace(/[^a-zA-Z0-9]/g, '')} fill:${this.colors.service}`
    ).join('\n    ')}`;

    fs.writeFileSync(path.join(this.outputDir, 'service-diagram.md'), diagram);
  }

  async generateDataFlowDiagram() {
    const diagram = `graph TB
    subgraph "User Input"
        A[User Action] --> B[Frontend Component]
    end
    
    subgraph "API Layer"
        B --> C[API Controller]
        C --> D[Command]
    end
    
    subgraph "Processing"
        D --> E[Handler]
        E --> F[Domain Service]
        F --> G[Repository]
    end
    
    subgraph "Response"
        G --> H[Response]
        H --> I[Frontend Update]
    end
    
    style A fill:${this.colors.component}
    style B fill:${this.colors.component}
    style C fill:${this.colors.controller}
    style D fill:${this.colors.command}
    style E fill:${this.colors.handler}
    style F fill:${this.colors.service}
    style G fill:${this.colors.repository}
    style H fill:${this.colors.service}
    style I fill:${this.colors.component}`;

    fs.writeFileSync(path.join(this.outputDir, 'data-flow-diagram.md'), diagram);
  }

  async generateHTMLReport() {
    console.log('📄 Generating HTML Report...');
    
    const html = this.generateHTMLContent();
    fs.writeFileSync(path.join(this.outputDir, 'workflow-analysis.html'), html);
  }

  generateHTMLContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIDEA Workflow Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .stat-label {
            font-size: 1.1rem;
            color: #666;
        }
        
        .section {
            background: white;
            margin-bottom: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .section-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .section-content {
            padding: 30px;
        }
        
        .diagram-container {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            border: 2px solid #e9ecef;
        }
        
        .mermaid {
            text-align: center;
        }
        
        .workflow-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .workflow-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            border-left: 4px solid #667eea;
        }
        
        .workflow-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .workflow-description {
            color: #666;
            margin-bottom: 15px;
        }
        
        .workflow-steps {
            list-style: none;
        }
        
        .workflow-steps li {
            padding: 5px 0;
            color: #555;
        }
        
        .workflow-steps li:before {
            content: "→ ";
            color: #667eea;
            font-weight: bold;
        }
        
        .component-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
        }
        
        .component-item {
            background: #f8f9fa;
            padding: 10px 15px;
            border-radius: 8px;
            border-left: 3px solid #667eea;
            font-size: 0.9rem;
        }
        
        .tabs {
            display: flex;
            border-bottom: 2px solid #e9ecef;
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 15px 25px;
            background: #f8f9fa;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .tab.active {
            background: #667eea;
            color: white;
        }
        
        .tab:hover {
            background: #5a6fd8;
            color: white;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 PIDEA Workflow Analysis</h1>
            <p>Comprehensive analysis of the PIDEA codebase architecture and workflows</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${this.analysisResults.commands.length}</div>
                <div class="stat-label">Commands</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.analysisResults.handlers.length}</div>
                <div class="stat-label">Handlers</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.analysisResults.services.length}</div>
                <div class="stat-label">Services</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.analysisResults.controllers.length}</div>
                <div class="stat-label">Controllers</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.analysisResults.components.length}</div>
                <div class="stat-label">Components</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.analysisResults.workflows.length}</div>
                <div class="stat-label">Workflows</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">🏗️ Architecture Overview</div>
            <div class="section-content">
                <div class="diagram-container">
                    <div class="mermaid">
                        ${fs.readFileSync(path.join(this.outputDir, 'architecture-diagram.md'), 'utf8')}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">🔄 Workflows</div>
            <div class="section-content">
                <div class="workflow-grid">
                    ${this.analysisResults.workflows.map(workflow => `
                        <div class="workflow-card">
                            <div class="workflow-title">${workflow.name}</div>
                            <div class="workflow-description">${workflow.description}</div>
                            <ul class="workflow-steps">
                                ${workflow.steps.map(step => `<li>${step}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">📊 Detailed Analysis</div>
            <div class="section-content">
                <div class="tabs">
                    <button class="tab active" onclick="showTab('commands')">Commands</button>
                    <button class="tab" onclick="showTab('handlers')">Handlers</button>
                    <button class="tab" onclick="showTab('services')">Services</button>
                    <button class="tab" onclick="showTab('components')">Components</button>
                </div>
                
                <div id="commands" class="tab-content active">
                    <div class="component-list">
                        ${this.analysisResults.commands.map(cmd => `
                            <div class="component-item">${cmd.name}</div>
                        `).join('')}
                    </div>
                </div>
                
                <div id="handlers" class="tab-content">
                    <div class="component-list">
                        ${this.analysisResults.handlers.map(handler => `
                            <div class="component-item">${handler.name}</div>
                        `).join('')}
                    </div>
                </div>
                
                <div id="services" class="tab-content">
                    <div class="component-list">
                        ${this.analysisResults.services.map(service => `
                            <div class="component-item">${service.name}</div>
                        `).join('')}
                    </div>
                </div>
                
                <div id="components" class="tab-content">
                    <div class="component-list">
                        ${this.analysisResults.components.map(comp => `
                            <div class="component-item">${comp.name}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">📈 Data Flow</div>
            <div class="section-content">
                <div class="diagram-container">
                    <div class="mermaid">
                        ${fs.readFileSync(path.join(this.outputDir, 'data-flow-diagram.md'), 'utf8')}
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'default',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            }
        });
        
        function showTab(tabName) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Remove active class from all tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }
    </script>
</body>
</html>`;
  }

  // Helper methods
  getFilesRecursively(dir, extension) {
    const files = [];
    
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...this.getFilesRecursively(fullPath, extension));
        } else if (item.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  extractDependencies(content) {
    const dependencies = [];
    const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g);
    
    if (requireMatches) {
      for (const match of requireMatches) {
        const dep = match.match(/require\(['"]([^'"]+)['"]\)/)[1];
        if (dep.startsWith('./') || dep.startsWith('../')) {
          dependencies.push(dep);
        }
      }
    }
    
    return dependencies;
  }

  extractRoutes(content) {
    const routes = [];
    const routeMatches = content.match(/\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g);
    
    if (routeMatches) {
      for (const match of routeMatches) {
        const route = match.match(/\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
        routes.push(`${route[1].toUpperCase()} ${route[2]}`);
      }
    }
    
    return routes;
  }

  extractProps(content) {
    const props = [];
    const propMatches = content.match(/props\.(\w+)/g);
    
    if (propMatches) {
      for (const match of propMatches) {
        const prop = match.replace('props.', '');
        if (!props.includes(prop)) {
          props.push(prop);
        }
      }
    }
    
    return props;
  }

  extractState(content) {
    const state = [];
    const stateMatches = content.match(/useState\(/g);
    
    if (stateMatches) {
      state.push('React State');
    }
    
    return state;
  }

  categorizeCommand(className) {
    if (className.includes('Analyze')) return 'analysis';
    if (className.includes('Generate')) return 'generation';
    if (className.includes('Refactor')) return 'refactoring';
    if (className.includes('VibeCoder')) return 'vibecoder';
    return 'general';
  }

  categorizeHandler(className) {
    if (className.includes('Analyze')) return 'analysis';
    if (className.includes('Generate')) return 'generation';
    if (className.includes('Refactor')) return 'refactoring';
    if (className.includes('VibeCoder')) return 'vibecoder';
    return 'general';
  }

  categorizeService(className) {
    if (className.includes('Task')) return 'task';
    if (className.includes('Auth')) return 'auth';
    if (className.includes('Analysis')) return 'analysis';
    if (className.includes('Security')) return 'security';
    if (className.includes('Performance')) return 'performance';
    return 'general';
  }

  categorizeComponent(className) {
    if (className.includes('Chat')) return 'chat';
    if (className.includes('Task')) return 'task';
    if (className.includes('Auth')) return 'auth';
    if (className.includes('Sidebar')) return 'navigation';
    return 'general';
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new WorkflowAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = WorkflowAnalyzer; 