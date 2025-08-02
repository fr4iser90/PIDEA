# Category Analysis Data Fix – Phase 1: Data Mapping Analysis

## Overview
Analyze existing database analysis types and create mapping between old analysis types and new categories. Identify data structure differences and create the CategoryDataMapper service.

## Objectives
- [ ] Analyze existing database analysis types and their structure
- [ ] Create mapping between old analysis types and new categories
- [ ] Identify data structure differences between old and new systems
- [ ] Create CategoryDataMapper service for data transformation
- [ ] Document mapping rules and data transformation logic

## Deliverables
- File: `backend/domain/services/CategoryDataMapper.js` - Data mapping service
- File: `backend/tests/unit/CategoryDataMapper.test.js` - Unit tests for data mapping
- Documentation: Data mapping rules and transformation logic
- Analysis: Database analysis type structure report

## Dependencies
- Requires: Existing analysis infrastructure and database schema
- Blocks: Phase 2 (Backend Data Fix)

## Estimated Time
1 hour

## Success Criteria
- [ ] CategoryDataMapper service created with proper mapping logic
- [ ] Unit tests written and passing
- [ ] Data mapping rules documented
- [ ] Analysis type structure analysis completed
- [ ] Mapping between old and new categories established

## Technical Details

### Analysis Type Mapping
The system needs to map between old analysis types and new category endpoints:

```javascript
const categoryMapping = {
  'security-analysis': 'security',
  'performance-analysis': 'performance', 
  'architecture-analysis': 'architecture',
  'code-quality-analysis': 'code-quality',
  'dependencies-analysis': 'dependencies',
  'manifest-analysis': 'manifest',
  'tech-stack-analysis': 'tech-stack'
};
```

### Data Structure Analysis
- Current database stores analysis results in JSON format
- Category endpoints expect specific data structures (recommendations, issues, metrics, summary, results)
- Need to extract and transform data from existing analysis results

### CategoryDataMapper Service
- Map analysis types to categories
- Extract category-specific data from analysis results
- Transform data structures for frontend consumption
- Handle missing or invalid data gracefully
- Support both old and new data formats 