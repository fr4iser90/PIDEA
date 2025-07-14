import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import '@/css/components/analysis/analysis-filters.css';

const AnalysisFilters = ({ filters, onFilterChange, projectId }) => {
  const [availableTypes, setAvailableTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const apiRepository = new APIChatRepository();

  useEffect(() => {
    loadAvailableTypes();
  }, [projectId]);

  const loadAvailableTypes = async () => {
    try {
      setLoading(true);
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const response = await apiRepository.getAnalysisHistory(currentProjectId);
      
      if (response.success && response.data) {
        const types = [...new Set(response.data.map(item => item.type).filter(Boolean))];
        setAvailableTypes(types);
      }
    } catch (err) {
      logger.error('Failed to load analysis types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dateRange) => {
    onFilterChange({ dateRange });
  };

  const handleTypeChange = (analysisType) => {
    onFilterChange({ analysisType });
  };

  const handleClearFilters = () => {
    onFilterChange({
      dateRange: 'all',
      analysisType: 'all'
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange !== 'all') count++;
    if (filters.analysisType !== 'all') count++;
    return count;
  };

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'year', label: 'Last Year' }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...availableTypes.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }))
  ];

  return (
    <div className="analysis-filters">
      <div className="filters-header">
        <div className="filters-title">
          <h4>🔍 Filters</h4>
          {getActiveFiltersCount() > 0 && (
            <span className="active-filters-count">
              {getActiveFiltersCount()} active
            </span>
          )}
        </div>
        <div className="filters-controls">
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-toggle-filters"
            title={expanded ? 'Collapse filters' : 'Expand filters'}
          >
            {expanded ? '▼' : '▶'}
          </button>
          {getActiveFiltersCount() > 0 && (
            <button
              onClick={handleClearFilters}
              className="btn-clear-filters"
              title="Clear all filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="filters-content">
          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <div className="filter-options">
              {dateRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleDateRangeChange(option.value)}
                  className={`filter-option ${filters.dateRange === option.value ? 'active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Analysis Type</label>
            <div className="filter-options">
              {loading ? (
                <div className="loading-types">
                  <div className="loading-spinner"></div>
                  <span>Loading types...</span>
                </div>
              ) : (
                typeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleTypeChange(option.value)}
                    className={`filter-option ${filters.analysisType === option.value ? 'active' : ''}`}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="filter-summary">
            <div className="summary-item">
              <span className="summary-label">Date Range:</span>
              <span className="summary-value">
                {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label || 'All Time'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Type:</span>
              <span className="summary-value">
                {typeOptions.find(opt => opt.value === filters.analysisType)?.label || 'All Types'}
              </span>
            </div>
          </div>
        </div>
      )}

      {!expanded && getActiveFiltersCount() > 0 && (
        <div className="filters-preview">
          <span className="preview-text">
            {filters.dateRange !== 'all' && (
              <span className="preview-item">
                {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}
              </span>
            )}
            {filters.analysisType !== 'all' && (
              <span className="preview-item">
                {typeOptions.find(opt => opt.value === filters.analysisType)?.label}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalysisFilters; 