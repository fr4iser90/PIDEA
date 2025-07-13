const { logger } = require('@infrastructure/logging/Logger');

class TerminalUrlExtractor {
  constructor() {}

  extractUserAppUrl(terminalOutput) {
    // Simplified URL extraction - focus on most common patterns
    if (!terminalOutput || terminalOutput.length === 0) {
      logger.log('[TerminalUrlExtractor] No terminal output to analyze');
      return null;
    }
    
    // Log preview of terminal output
    const lines = terminalOutput.split('\n');
    const previewLines = lines.length > 10 ? lines.slice(-10) : lines;
    logger.log('[TerminalUrlExtractor] TerminalOutput (Preview):\n' + previewLines.join('\n'));
    
    // Most common dev server patterns (simplified)
    const patterns = [
      /Local:\s*(http:\/\/localhost:\d+)/i,
      /Server running on\s*(http:\/\/localhost:\d+)/i,
      /(http:\/\/localhost:\d+)/i,
      /localhost:\d+/i,
      /Server running at\s*(http:\/\/localhost:\d+)/i,
      /Development server running at\s*(http:\/\/localhost:\d+)/i,
      /Ready in\s*\d+ms\s*-\s*(http:\/\/localhost:\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = terminalOutput.match(pattern);
      if (match) {
        let url = match[1] || match[0];
        // Ensure URL has protocol
        if (!url.startsWith('http')) {
          url = 'http://' + url;
        }
        logger.log('[TerminalUrlExtractor] URL pattern matched:', pattern, '->', url);
        return url;
      }
    }
    
    // Generic URL pattern as fallback
    const genericUrlRegex = /(https?:\/\/[a-zA-Z0-9\[\]\.\-]+:\d+[^\s]*)/g;
    const matches = terminalOutput.match(genericUrlRegex);
    if (matches && matches.length > 0) {
      const url = matches[0];
      logger.log('[TerminalUrlExtractor] Generic URL pattern matched ->', url);
      return url;
    }
    
    logger.log('[TerminalUrlExtractor] No URL patterns matched in terminal output');
    return null;
  }
}

module.exports = TerminalUrlExtractor;
