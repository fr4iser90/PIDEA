# AI Agent Communication - Phase 2: Shared Context System

## Phase Overview
- **Phase**: 2
- **Title**: Shared Context System
- **Estimated Time**: 6 hours
- **Status**: ❌ Not Started (0%)
- **Last Updated**: 2025-10-03T19:31:24.000Z

## Phase Tasks

### Task 1: Create SharedContextService
- **Location**: `backend/domain/services/agents/SharedContextService.js`
- **Required Functionality**: Shared context management between agents
- **Dependencies**: ContextManager, StateManager
- **Estimated Effort**: 3 hours
- **Status**: ❌ Not Started

### Task 2: Implement Agent Registry
- **Location**: `backend/domain/services/agents/AgentRegistry.js`
- **Required Functionality**: Agent registration and discovery
- **Dependencies**: ServiceRegistry, AgentCommunicationService
- **Estimated Effort**: 3 hours
- **Status**: ❌ Not Started

## Implementation Details

### SharedContextService.js
```javascript
class SharedContextService {
  constructor(contextManager, stateManager) {
    this.contextManager = contextManager;
    this.stateManager = stateManager;
    this.sharedContexts = new Map();
  }

  async createSharedContext(contextId, initialData = {}) {
    const context = {
      id: contextId,
      data: initialData,
      agents: new Set(),
      lastUpdated: new Date().toISOString(),
      version: 1
    };

    this.sharedContexts.set(contextId, context);
    await this.contextManager.saveContext(context);
    
    return context;
  }

  async addAgentToContext(contextId, agentId) {
    const context = this.sharedContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    context.agents.add(agentId);
    context.lastUpdated = new Date().toISOString();
    
    await this.contextManager.saveContext(context);
    
    return context;
  }

  async updateContext(contextId, updates, agentId) {
    const context = this.sharedContexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    if (!context.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not authorized to update context ${contextId}`);
    }

    context.data = { ...context.data, ...updates };
    context.lastUpdated = new Date().toISOString();
    context.version += 1;

    this.sharedContexts.set(contextId, context);
    await this.contextManager.saveContext(context);

    await this.notifyContextUpdate(contextId, updates, agentId);
    
    return context;
  }
}
```

### AgentRegistry.js
```javascript
class AgentRegistry {
  constructor(serviceRegistry, communicationService) {
    this.serviceRegistry = serviceRegistry;
    this.communicationService = communicationService;
    this.registeredAgents = new Map();
    this.agentCapabilities = new Map();
  }

  async registerAgent(agent) {
    const agentInfo = {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      capabilities: agent.capabilities || [],
      status: 'active',
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    this.registeredAgents.set(agent.id, agentInfo);
    this.agentCapabilities.set(agent.id, agent.capabilities || []);

    await this.communicationService.registerAgent(agent);
    
    return agentInfo;
  }

  async discoverAgents(capability = null) {
    if (capability) {
      return Array.from(this.registeredAgents.values())
        .filter(agent => agent.capabilities.includes(capability));
    }
    
    return Array.from(this.registeredAgents.values());
  }

  async getAgentById(agentId) {
    return this.registeredAgents.get(agentId);
  }
}
```

## Dependencies Status
- **ContextManager**: ❌ Not Implemented (needs to be created)
- **StateManager**: ❌ Not Implemented (needs to be created)
- **ServiceRegistry**: ✅ Available (`backend/infrastructure/dependency-injection/ServiceRegistry.js`)
- **AgentCommunicationService**: ❌ Not Implemented (depends on Phase 1)

## Success Criteria
- [ ] Shared context is maintained correctly
- [ ] Agent registration and discovery works
- [ ] Context updates are propagated to all agents
- [ ] Unit tests pass with 90%+ coverage

## Blockers
- ContextManager dependency not implemented
- StateManager dependency not implemented
- AgentCommunicationService depends on Phase 1 completion
