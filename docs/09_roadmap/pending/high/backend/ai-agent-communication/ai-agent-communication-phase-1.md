# AI Agent Communication - Phase 1: Core Communication Framework

## Phase Overview
- **Phase**: 1
- **Title**: Core Communication Framework
- **Estimated Time**: 8 hours
- **Status**: ❌ Not Started (0%)
- **Last Updated**: 2025-10-03T19:31:24.000Z

## Phase Tasks

### Task 1: Create AgentCommunicationService
- **Location**: `backend/domain/services/agents/AgentCommunicationService.js`
- **Required Functionality**: Core agent communication protocol
- **Dependencies**: EventBus, MessageQueue
- **Estimated Effort**: 4 hours
- **Status**: ❌ Not Started

### Task 2: Implement AgentCoordinator
- **Location**: `backend/domain/services/agents/AgentCoordinator.js`
- **Required Functionality**: Agent coordination and orchestration
- **Dependencies**: AgentCommunicationService, WorkflowOrchestrationService
- **Estimated Effort**: 4 hours
- **Status**: ❌ Not Started

## Implementation Details

### AgentCommunicationService.js
```javascript
class AgentCommunicationService {
  constructor(eventBus, messageQueue) {
    this.eventBus = eventBus;
    this.messageQueue = messageQueue;
    this.agents = new Map();
    this.messageHandlers = new Map();
  }

  async registerAgent(agent) {
    this.agents.set(agent.id, agent);
    await this.eventBus.emit('agent.registered', { agentId: agent.id });
  }

  async sendMessage(fromAgentId, toAgentId, message) {
    const messageData = {
      id: uuid(),
      from: fromAgentId,
      to: toAgentId,
      content: message.content,
      type: message.type,
      timestamp: new Date().toISOString(),
      metadata: message.metadata || {}
    };

    await this.messageQueue.enqueue(messageData);
    await this.eventBus.emit('agent.message.sent', messageData);
  }

  async broadcastMessage(fromAgentId, message) {
    const messageData = {
      id: uuid(),
      from: fromAgentId,
      to: 'broadcast',
      content: message.content,
      type: message.type,
      timestamp: new Date().toISOString(),
      metadata: message.metadata || {}
    };

    for (const [agentId, agent] of this.agents) {
      if (agentId !== fromAgentId) {
        await this.sendMessage(fromAgentId, agentId, message);
      }
    }
  }
}
```

### AgentCoordinator.js
```javascript
class AgentCoordinator {
  constructor(communicationService, workflowOrchestrationService) {
    this.communicationService = communicationService;
    this.workflowOrchestrationService = workflowOrchestrationService;
    this.coordinationTasks = new Map();
  }

  async coordinateWorkflow(workflowId, agents) {
    const coordinationTask = {
      id: workflowId,
      agents: agents,
      status: 'pending',
      steps: [],
      currentStep: 0
    };

    this.coordinationTasks.set(workflowId, coordinationTask);
    await this.startCoordination(workflowId);
  }

  async startCoordination(workflowId) {
    const task = this.coordinationTasks.get(workflowId);
    if (!task) return;

    task.status = 'running';
    
    await this.communicationService.broadcastMessage('coordinator', {
      type: 'workflow.start',
      content: {
        workflowId: workflowId,
        agents: task.agents,
        steps: task.steps
      }
    });

    await this.executeCoordinationSteps(workflowId);
  }
}
```

## Dependencies Status
- **EventBus**: ✅ Available (`backend/infrastructure/messaging/EventBus.js`)
- **MessageQueue**: ❌ Not Implemented (needs to be created)
- **WorkflowOrchestrationService**: ✅ Available (`backend/domain/services/workflow/WorkflowOrchestrationService.js`)

## Success Criteria
- [ ] Agents can register and discover each other
- [ ] Message passing works reliably
- [ ] Basic coordination protocols work properly
- [ ] Unit tests pass with 90%+ coverage

## Blockers
- MessageQueue dependency not implemented
- No agents directory structure exists
- No agent-related infrastructure in place
