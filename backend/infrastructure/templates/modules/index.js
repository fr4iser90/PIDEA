/**
 * Script Templates Modules Index
 */

const BuildTemplates = require('./buildTemplates');
const TestTemplates = require('./testTemplates');
const DeployTemplates = require('./deployTemplates');
const MaintenanceTemplates = require('./maintenanceTemplates');
const DevelopmentTemplates = require('./developmentTemplates');
const DatabaseTemplates = require('./databaseTemplates');
const SecurityTemplates = require('./securityTemplates');
const MonitoringTemplates = require('./monitoringTemplates');
const AutomationTemplates = require('./automationTemplates');
const UtilityTemplates = require('./utilityTemplates');

const TemplateValidator = require('./validation');
const TemplateGenerator = require('./generator');
const TemplateSearch = require('./search');
const { TEMPLATE_CATEGORIES } = require('./constants');

module.exports = {
    BuildTemplates,
    TestTemplates,
    DeployTemplates,
    MaintenanceTemplates,
    DevelopmentTemplates,
    DatabaseTemplates,
    SecurityTemplates,
    MonitoringTemplates,
    AutomationTemplates,
    UtilityTemplates,
    TemplateValidator,
    TemplateGenerator,
    TemplateSearch,
    TEMPLATE_CATEGORIES
}; 