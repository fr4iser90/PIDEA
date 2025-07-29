# Analysis Export Script

This script exports analysis data from your database to individual markdown files for testing and review purposes.

## Quick Start

```bash
# Export all analyses
node scripts/export-analysis-to-markdown.js

# Export only PIDEA project analyses
node scripts/export-analysis-to-markdown.js --project-id PIDEA

# Export only security analyses
node scripts/export-analysis-to-markdown.js --type security

# Export with custom output directory
node scripts/export-analysis-to-markdown.js --output-dir ./my-analysis-exports

# Export only last 5 analyses
node scripts/export-analysis-to-markdown.js --limit 5

# Export summary format (less detailed)
node scripts/export-analysis-to-markdown.js --format summary
```

## Options

- `--project-id <id>` - Export only analyses for specific project
- `--type <type>` - Export only specific analysis type (security, performance, architecture, etc.)
- `--output-dir <path>` - Output directory (default: `output/analysis-exports`)
- `--format <format>` - Output format: `detailed` or `summary` (default: `detailed`)
- `--limit <number>` - Limit number of exports (default: all)
- `--help` - Show help message

## Output Structure

The script creates:

1. **Individual Analysis Files**: Each analysis gets its own markdown file with structured content
2. **Summary Report**: `EXPORT_SUMMARY.md` with overview and statistics
3. **Organized Directory**: All files in the specified output directory

## File Naming Convention

Files are named: `YYYY-MM-DD_HH-MM-SS_analysis-type_short-id.md`

Example: `2024-12-28_12-05-23_security_6ba38d4.md`

## File Content Structure

Each analysis file contains:

### Overview Section
- Analysis ID, Project ID, Type, Status
- Progress, Creation/Update dates
- Export timestamp

### Performance Metrics
- Execution time, Memory usage
- Files/Lines processed
- Overall score

### Issues Summary
- Critical issues count
- Warnings count
- Recommendations count

### Timeline
- Start/Completion times
- Duration calculation

### Configuration & Metadata
- Analysis configuration (JSON)
- Metadata (JSON)

### Detailed Content (if format=detailed)
- Error information (if any)
- Full analysis results (JSON)
- Retry information
- Raw data dump

## Database Support

The script supports both:
- **SQLite**: Automatically detects `backend/database/pidea-dev.db`
- **PostgreSQL**: Uses `DATABASE_URL` environment variable

## Examples

### Export Recent Security Analyses
```bash
node scripts/export-analysis-to-markdown.js \
  --project-id PIDEA \
  --type security \
  --limit 10 \
  --output-dir ./security-reviews
```

### Export All Performance Data
```bash
node scripts/export-analysis-to-markdown.js \
  --type performance \
  --format detailed \
  --output-dir ./performance-analysis
```

### Quick Summary Export
```bash
node scripts/export-analysis-to-markdown.js \
  --format summary \
  --limit 20 \
  --output-dir ./quick-review
```

## Troubleshooting

### Database Connection Issues
- Ensure your database file exists at `backend/database/pidea-dev.db`
- For PostgreSQL, set `DATABASE_URL` environment variable
- Check database permissions

### No Analyses Found
- Verify analysis table exists in database
- Check if analyses have been run for your project
- Try without filters first: `node scripts/export-analysis-to-markdown.js`

### Permission Issues
- Ensure script is executable: `chmod +x scripts/export-analysis-to-markdown.js`
- Check write permissions for output directory

## Integration with Analysis Workflow

This script complements your analysis workflow by:

1. **Testing**: Review analysis results in readable format
2. **Debugging**: Examine individual analysis data
3. **Documentation**: Create analysis reports for stakeholders
4. **Comparison**: Compare different analysis runs
5. **Archiving**: Store analysis results for future reference

## Next Steps

After exporting, you can:

1. **Review**: Open markdown files in your preferred editor
2. **Compare**: Use diff tools to compare different analyses
3. **Share**: Send specific analysis files to team members
4. **Archive**: Store exports for historical reference
5. **Import**: Use the data to create custom reports or dashboards 