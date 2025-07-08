# PIDEA Workflow Analyzer

A comprehensive analysis tool that generates beautiful Mermaid diagrams and reports for the PIDEA codebase architecture and workflows.

## 🚀 Features

- **Automatic Codebase Analysis**: Scans commands, handlers, services, controllers, and components
- **Beautiful Mermaid Diagrams**: Generates colored, well-organized architecture diagrams
- **Interactive HTML Report**: Modern, responsive web interface with tabs and statistics
- **Workflow Mapping**: Identifies and documents key application workflows
- **Dependency Analysis**: Maps relationships between different components
- **Architecture Overview**: Provides clear visualization of the layered architecture

## 📊 Generated Diagrams

1. **Architecture Diagram**: Shows the layered architecture (Presentation → Application → Domain → Infrastructure)
2. **Workflow Diagrams**: Individual diagrams for each major workflow
3. **Component Diagram**: Frontend component relationships
4. **Service Diagram**: Domain service interactions
5. **Data Flow Diagram**: Request/response flow through the system

## 🎨 Color Scheme

- **Commands**: 🔴 Red (#FF6B6B)
- **Handlers**: 🔵 Blue (#4ECDC4)
- **Services**: 🔷 Dark Blue (#45B7D1)
- **Controllers**: 🟢 Green (#96CEB4)
- **Components**: 🟡 Yellow (#FFEAA7)
- **Entities**: 🟣 Purple (#DDA0DD)
- **Repositories**: 🟢 Light Green (#98D8C8)
- **Infrastructure**: 🟡 Light Yellow (#F7DC6F)

## 🛠️ Usage

### Quick Start

```bash
# Run the workflow analysis
npm run analyze:workflows

# Or run directly
node scripts/workflow-analyzer.js
```

### Output

The analysis generates files in the `output/workflow-analysis/` directory:

- `workflow-analysis.html` - Interactive HTML report
- `architecture-diagram.md` - Main architecture diagram
- `*-workflow.md` - Individual workflow diagrams
- `component-diagram.md` - Frontend component diagram
- `service-diagram.md` - Domain service diagram
- `data-flow-diagram.md` - Data flow diagram

## 📋 Analysis Coverage

### Backend Analysis
- **Commands**: All application commands in `backend/application/commands/`
- **Handlers**: All command handlers in `backend/application/handlers/`
- **Services**: All domain services in `backend/domain/services/`
- **Controllers**: All API controllers in `backend/presentation/api/`

### Frontend Analysis
- **Components**: All React components in `frontend/src/presentation/components/`
- **Props & State**: Component properties and state management
- **Dependencies**: Import relationships between components

### Workflow Analysis
- **Task Creation Workflow**: Complete task lifecycle
- **Chat Message Workflow**: Message processing and AI integration
- **Code Analysis Workflow**: Architecture and quality analysis
- **Auto-Finish Workflow**: Automated task completion
- **IDE Integration Workflow**: IDE mirroring and workspace detection

## 🏗️ Architecture Patterns Detected

- **Command Query Responsibility Segregation (CQRS)**
- **Domain-Driven Design (DDD)**
- **Clean Architecture**
- **Event-Driven Architecture**
- **Service-Oriented Architecture**

## 📈 Statistics

The analyzer provides comprehensive statistics:

- Total number of commands, handlers, services, controllers, and components
- Workflow complexity metrics
- Dependency relationship counts
- Architecture layer distribution

## 🎯 Use Cases

1. **Onboarding**: Help new developers understand the codebase structure
2. **Architecture Review**: Visualize and validate architectural decisions
3. **Documentation**: Generate up-to-date architecture documentation
4. **Refactoring**: Identify areas for improvement and optimization
5. **Planning**: Understand dependencies for feature development

## 🔧 Customization

### Adding New Workflows

Edit the `analyzeWorkflows()` method in `workflow-analyzer.js`:

```javascript
{
  name: 'New Workflow Name',
  description: 'Description of the workflow',
  steps: [
    'Command1',
    'Handler1',
    'Service1',
    'Service2'
  ]
}
```

### Modifying Colors

Update the `colors` object in the constructor:

```javascript
this.colors = {
  command: '#YOUR_COLOR',
  handler: '#YOUR_COLOR',
  // ... other colors
};
```

### Adding New Analysis Types

Extend the analyzer by adding new analysis methods:

```javascript
async analyzeNewType() {
  // Your analysis logic
  this.analysisResults.newType = results;
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure the script has execute permissions
   ```bash
   chmod +x scripts/workflow-analyzer.js
   ```

2. **Output Directory**: Ensure the output directory exists
   ```bash
   mkdir -p output/workflow-analysis
   ```

3. **Mermaid Rendering**: If diagrams don't render, check browser console for errors

### Debug Mode

Add debug logging by modifying the script:

```javascript
// Add at the top of the file
const DEBUG = process.env.DEBUG === 'true';

// Use throughout the code
if (DEBUG) console.log('Debug info:', data);
```

Run with debug:
```bash
DEBUG=true npm run analyze:workflows
```

## 📝 Contributing

When adding new features to PIDEA:

1. Run the workflow analyzer to understand the current architecture
2. Follow the established patterns for your new components
3. Update the analyzer if you add new architectural patterns
4. Regenerate diagrams to reflect your changes

## 🔗 Related Documentation

- [PIDEA Architecture Overview](../docs/02_architecture/overview.md)
- [Development Setup](../docs/06_development/setup.md)
- [API Documentation](../docs/08_reference/api/)

## 📄 License

This analyzer is part of the PIDEA project and follows the same MIT license. 