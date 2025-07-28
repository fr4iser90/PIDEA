# Timestamp Utility for Task Management

## Quick Reference
```bash
# Get current timestamp in ISO format (recommended)
date -u +"%Y-%m-%dT%H:%M:%S.000Z"

# Get current timestamp in readable format
date '+%Y-%m-%d %H:%M:%S %Z'

# Get current timestamp for status updates
date -u +"%Y-%m-%dT%H:%M:%S.000Z"
```

## Usage Pattern
```markdown
## Current Status - Last Updated: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
## Language Status - Last Updated: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
## Progress Tracking - Last Updated: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
```

## Workflow
1. **Execute**: Run `date -u +"%Y-%m-%dT%H:%M:%S.000Z"` in terminal
2. **Copy**: Use the exact output (e.g., `2024-01-15T14:30:25.000Z`)
3. **Replace**: Replace `[TIMESTAMP]` or `[RUN: command]` with the output
4. **Never**: Use AI-generated dates, always use system time

## Integration
Reference this file in prompts: `@timestamp-utility.md`

## Example
```bash
$ date -u +"%Y-%m-%dT%H:%M:%S.000Z"
2024-01-15T14:30:25.000Z

# Use in markdown:
## Current Status - Last Updated: 2024-01-15T14:30:25.000Z
``` 