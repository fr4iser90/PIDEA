/**
 * VibeCoder Services Index - Exports all service modules
 */

const AnalysisService = require('./analysis-service');
const SecurityService = require('./security-service');
const RecommendationService = require('./recommendation-service');
const MetricsService = require('./metrics-service');
const ExecutionService = require('./execution-service');
const ValidationService = require('./validation-service');
const ReportService = require('./report-service');
const OutputService = require('./output-service');

module.exports = {
    AnalysisService,
    SecurityService,
    RecommendationService,
    MetricsService,
    ExecutionService,
    ValidationService,
    ReportService,
    OutputService
}; 