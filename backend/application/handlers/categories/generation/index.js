/**
 * Script Generation Handler Module
 * Exports all refactored components for script generation
 */

const GenerateScriptHandler = require('./GenerateScriptHandler');
const ScriptGenerationValidator = require('./validation/ScriptGenerationValidator');
const ProjectAnalysisService = require('./services/ProjectAnalysisService');
const ScriptGenerationService = require('./services/ScriptGenerationService');
const ScriptProcessingService = require('./services/ScriptProcessingService');
const TaskManagementService = require('./services/TaskManagementService');
const EventPublishingService = require('./services/EventPublishingService');
const ScriptGenerationConstants = require('./constants/ScriptGenerationConstants');

module.exports = {
    GenerateScriptHandler,
    ScriptGenerationValidator,
    ProjectAnalysisService,
    ScriptGenerationService,
    ScriptProcessingService,
    TaskManagementService,
    EventPublishingService,
    ScriptGenerationConstants
}; 