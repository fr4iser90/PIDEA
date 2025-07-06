const CONSTANTS = require('./constants');

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format analysis type for display
 * @param {string} type - Analysis type
 * @returns {string} Formatted analysis type
 */
function formatAnalysisType(type) {
    return type.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
}

/**
 * Format tree structure for display
 * @param {Object} structure - Tree structure object
 * @param {string} indent - Indentation string
 * @returns {string} Formatted tree string
 */
function formatTree(structure, indent = '') {
    let result = '';
    for (const [name, children] of Object.entries(structure)) {
        result += `${indent}${name}\n`;
        if (children && typeof children === 'object') {
            result += formatTree(children, indent + '  ');
        }
    }
    return result;
}

/**
 * Count critical vulnerabilities
 * @param {Array} vulnerabilities - Vulnerabilities array
 * @returns {number} Count of critical vulnerabilities
 */
function countCriticalVulnerabilities(vulnerabilities) {
    return vulnerabilities.filter(v => v.severity === CONSTANTS.VULNERABILITY_SEVERITIES.CRITICAL).length;
}

/**
 * Count high vulnerabilities
 * @param {Array} vulnerabilities - Vulnerabilities array
 * @returns {number} Count of high vulnerabilities
 */
function countHighVulnerabilities(vulnerabilities) {
    return vulnerabilities.filter(v => v.severity === CONSTANTS.VULNERABILITY_SEVERITIES.HIGH).length;
}

/**
 * Count medium vulnerabilities
 * @param {Array} vulnerabilities - Vulnerabilities array
 * @returns {number} Count of medium vulnerabilities
 */
function countMediumVulnerabilities(vulnerabilities) {
    return vulnerabilities.filter(v => v.severity === CONSTANTS.VULNERABILITY_SEVERITIES.MEDIUM).length;
}

/**
 * Count low vulnerabilities
 * @param {Array} vulnerabilities - Vulnerabilities array
 * @returns {number} Count of low vulnerabilities
 */
function countLowVulnerabilities(vulnerabilities) {
    return vulnerabilities.filter(v => v.severity === CONSTANTS.VULNERABILITY_SEVERITIES.LOW).length;
}

/**
 * Calculate average coupling
 * @param {Object} coupling - Coupling object
 * @returns {number} Average coupling value
 */
function calculateAverageCoupling(coupling) {
    if (!coupling || Object.keys(coupling).length === 0) return 0;
    
    const values = Object.values(coupling).filter(v => typeof v === 'number');
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate average cohesion
 * @param {Object} cohesion - Cohesion object
 * @returns {number} Average cohesion value
 */
function calculateAverageCohesion(cohesion) {
    if (!cohesion || Object.keys(cohesion).length === 0) return 0;
    
    const values = Object.values(cohesion).filter(v => typeof v === 'number');
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate complexity score
 * @param {Object} architecture - Architecture object
 * @returns {number} Complexity score
 */
function calculateComplexityScore(architecture) {
    let score = 0;
    
    if (architecture.patterns) score += architecture.patterns.length * 10;
    if (architecture.layers) score += architecture.layers.length * 5;
    if (architecture.modules) score += architecture.modules.length * 3;
    if (architecture.antiPatterns) score += architecture.antiPatterns.length * 15;
    
    return score;
}

module.exports = {
    formatFileSize,
    formatAnalysisType,
    formatTree,
    countCriticalVulnerabilities,
    countHighVulnerabilities,
    countMediumVulnerabilities,
    countLowVulnerabilities,
    calculateAverageCoupling,
    calculateAverageCohesion,
    calculateComplexityScore
}; 