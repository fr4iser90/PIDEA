/**
 * Analysis Output Service Module
 * 
 * This module provides services for generating and managing analysis output reports.
 * It has been refactored from the original AnalysisOutputService.js to improve maintainability.
 */

const FileSystemService = require('./file-system-service');
const ReportGenerator = require('./report-generator');
const MarkdownFormatter = require('./markdown-formatter');
const PackageExtractor = require('./package-extractor');
const SecurityAggregator = require('./security-aggregator');
const UTILS = require('./utils');
const CONSTANTS = require('./constants');

module.exports = {
    FileSystemService,
    ReportGenerator,
    MarkdownFormatter,
    PackageExtractor,
    SecurityAggregator,
    UTILS,
    CONSTANTS
}; 