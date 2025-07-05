/**
 * Utility Templates Module
 */
const { TEMPLATE_CATEGORIES } = require('./constants');

class UtilityTemplates {
    /**
     * Get utility script templates
     * @returns {Object} Utility templates
     */
    static getTemplates() {
        return {
            logAnalyzer: {
                name: 'Log Analyzer Script',
                description: 'Analyze application logs',
                category: TEMPLATE_CATEGORIES.UTILITY,
                template: `#!/bin/bash
# Log Analyzer Script
echo "Analyzing logs..."

# Set variables
LOG_DIR="{{LOG_DIR}}"
LOG_PATTERN="{{LOG_PATTERN}}"
OUTPUT_FILE="{{OUTPUT_FILE}}"

# Default values
if [ -z "$LOG_DIR" ]; then
    LOG_DIR="./logs"
fi

if [ -z "$LOG_PATTERN" ]; then
    LOG_PATTERN="*.log"
fi

if [ -z "$OUTPUT_FILE" ]; then
    OUTPUT_FILE="log-analysis.txt"
fi

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo "Error: Log directory not found: $LOG_DIR"
    exit 1
fi

# Create analysis report
echo "Log Analysis Report" > "$OUTPUT_FILE"
echo "===================" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Total log files
echo "Total log files:" >> "$OUTPUT_FILE"
find "$LOG_DIR" -name "$LOG_PATTERN" -type f | wc -l >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Most common error messages
echo "Most Common Error Messages:" >> "$OUTPUT_FILE"
echo "---------------------------" >> "$OUTPUT_FILE"
find "$LOG_DIR" -name "$LOG_PATTERN" -exec grep -i "error" {} \; | sort | uniq -c | sort -nr | head -10 >> "$OUTPUT_FILE"

echo "Log analysis completed!"
echo "Report saved to: $OUTPUT_FILE"`,
                variables: {
                    LOG_DIR: './logs',
                    LOG_PATTERN: '*.log',
                    OUTPUT_FILE: 'log-analysis.txt'
                },
                outputs: ['log-analysis-report']
            },

            fileCleaner: {
                name: 'File Cleaner Script',
                description: 'Clean up temporary and unnecessary files',
                category: TEMPLATE_CATEGORIES.UTILITY,
                template: `#!/bin/bash
# File Cleaner Script
echo "Cleaning up files..."

# Set variables
CLEAN_PATTERNS="{{CLEAN_PATTERNS}}"
DRY_RUN="{{DRY_RUN}}"

# Default patterns
if [ -z "$CLEAN_PATTERNS" ]; then
    CLEAN_PATTERNS="*.tmp,*.temp,*.log,*.cache,.DS_Store,Thumbs.db"
fi

if [ -z "$DRY_RUN" ]; then
    DRY_RUN="false"
fi

# Convert patterns to array
IFS=',' read -ra patterns <<< "$CLEAN_PATTERNS"

echo "Cleaning patterns: \${patterns[@]}"

# Clean files
for pattern in "\${patterns[@]}"; do
    echo "Cleaning pattern: $pattern"
    
    if [ "$DRY_RUN" = "true" ]; then
        # Dry run - just show what would be deleted
        find . -name "$pattern" -type f -print
    else
        # Actually delete files
        deleted_count=$(find . -name "$pattern" -type f -delete -print | wc -l)
        echo "Deleted $deleted_count files matching pattern: $pattern"
    fi
done

echo "File cleanup completed!"`,
                variables: {
                    CLEAN_PATTERNS: '*.tmp,*.temp,*.log,*.cache,.DS_Store,Thumbs.db',
                    DRY_RUN: 'false'
                },
                outputs: ['cleanup-report']
            }
        };
    }
}

module.exports = UtilityTemplates; 