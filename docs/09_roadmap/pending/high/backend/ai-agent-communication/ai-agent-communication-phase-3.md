# AI Agent Communication - Phase 3: Message Protocols

## Phase Overview
- **Phase**: 3
- **Title**: Message Protocols
- **Estimated Time**: 6 hours
- **Status**: ❌ Not Started (0%)
- **Last Updated**: 2025-10-03T19:31:24.000Z

## Phase Tasks

### Task 1: Create Message Protocols
- **Location**: `backend/domain/services/agents/protocols/`
- **Required Functionality**: Standardized message formats
- **Dependencies**: MessageValidator, ProtocolManager
- **Estimated Effort**: 3 hours
- **Status**: ❌ Not Started

### Task 2: Implement Agent Handlers
- **Location**: `backend/application/handlers/categories/agents/`
- **Required Functionality**: Agent message handling
- **Dependencies**: AgentCommunicationService, EventBus
- **Estimated Effort**: 3 hours
- **Status**: ❌ Not Started

## Implementation Details

### MessageProtocol.js
```javascript
class MessageProtocol {
  constructor() {
    this.messageTypes = new Map();
    this.validators = new Map();
  }

  registerMessageType(type, schema) {
    this.messageTypes.set(type, schema);
    this.validators.set(type, this.createValidator(schema));
  }

  validateMessage(message) {
    const validator = this.validators.get(message.type);
    if (!validator) {
      throw new Error(`Unknown message type: ${message.type}`);
    }

    return validator(message);
  }

  createValidator(schema) {
    return (message) => {
      const errors = [];
      
      for (const [field, rules] of Object.entries(schema)) {
        if (rules.required && !message[field]) {
          errors.push(`${field} is required`);
        }
        
        if (message[field] && rules.type && typeof message[field] !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };
  }
}
```

### CoordinationProtocol.js
```javascript
class CoordinationProtocol extends MessageProtocol {
  constructor() {
    super();
    this.setupCoordinationMessages();
  }

  setupCoordinationMessages() {
    this.registerMessageType('workflow.start', {
      workflowId: { required: true, type: 'string' },
      agents: { required: true, type: 'object' },
      steps: { required: true, type: 'object' }
    });

    this.registerMessageType('workflow.step', {
      workflowId: { required: true, type: 'string' },
      stepIndex: { required: true, type: 'number' },
      step: { required: true, type: 'object' }
    });

    this.registerMessageType('workflow.completed', {
      workflowId: { required: true, type: 'string' }
    });
  }
}
```

### AgentMessageHandler.js
```javascript
class AgentMessageHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.agentCommunicationService = dependencies.agentCommunicationService;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || new ServiceLogger('AgentMessageHandler');
  }

  async handle(command) {
    try {
      const { fromAgentId, toAgentId, message } = command;

      // Validate message format
      const validation = this.validateMessage(message);
      if (!validation.isValid) {
        throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
      }

      // Send message through communication service
      const result = await this.agentCommunicationService.sendMessage(
        fromAgentId, 
        toAgentId, 
        message
      );

      // Publish event
      await this.eventBus.emit('agent.message.handled', {
        fromAgentId,
        toAgentId,
        messageId: result.id,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        messageId: result.id,
        timestamp: result.timestamp
      };

    } catch (error) {
      this.logger.error('Failed to handle agent message:', error);
      throw error;
    }
  }
}
```

## Dependencies Status
- **MessageValidator**: ❌ Not Implemented (needs to be created)
- **ProtocolManager**: ❌ Not Implemented (needs to be created)
- **AgentCommunicationService**: ❌ Not Implemented (depends on Phase 1)
- **EventBus**: ✅ Available (`backend/infrastructure/messaging/EventBus.js`)

## Success Criteria
- [ ] Standardized message formats work properly
- [ ] Message validation is reliable
- [ ] Agent handlers process messages correctly
- [ ] Integration tests pass with 90%+ coverage

## Blockers
- MessageValidator dependency not implemented
- ProtocolManager dependency not implemented
- AgentCommunicationService depends on Phase 1 completion
- No agents directory structure exists
