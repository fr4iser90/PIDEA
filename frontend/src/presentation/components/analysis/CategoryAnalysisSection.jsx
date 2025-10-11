import React, { useState } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import CategoryOverview from './CategoryOverview';
import CategoryIssues from './CategoryIssues';
import CategoryRecommendations from './CategoryRecommendations';
import CategoryMetrics from './CategoryMetrics';
import CategoryCharts from './CategoryCharts';
import '@/scss/components/_category-analysis-section.scss';;

const CategoryAnalysisSection = ({ 
  category, 
  expanded, 
  onToggle, 
  onAnalysisSelect, 
  loading 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { key, name, icon, description, analysis } = category;
  
  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: '📋',
      component: CategoryOverview,
      dataKey: 'summary'
    },
    {
      id: 'issues',
      name: 'Issues',
      icon: '⚠️',
      component: CategoryIssues,
      dataKey: 'issues'
    },
    {
      id: 'recommendations',
      name: 'Recommendations',
      icon: '💡',
      component: CategoryRecommendations,
      dataKey: 'recommendations'
    },
    {
      id: 'metrics',
      name: 'Metrics',
      icon: '📊',
      component: CategoryMetrics,
      dataKey: 'metrics'
    },
    {
      id: 'charts',
      name: 'Charts',
      icon: '📈',
      component: CategoryCharts,
      dataKey: 'results'
    }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    logger.info(`Switched to ${tabId} tab for ${key} category`);
  };

  const getCategoryData = (dataKey) => {
    if (!analysis.data) return null;
    
    if (dataKey === 'summary') {
      // For summary tab, return all data so CategoryOverview can access issues and recommendations
      // Backend returns: { success: true, data: { issues: [...], recommendations: [...], summary: {...} } }
      return {
        summary: analysis.data.summary?.data?.summary || analysis.data.summary?.summary || analysis.data.summary || analysis.data,
        issues: analysis.data.issues?.data?.issues || analysis.data.issues?.issues || analysis.data.issues,
        recommendations: analysis.data.recommendations?.data?.recommendations || analysis.data.recommendations?.recommendations || analysis.data.recommendations,
        tasks: analysis.data.tasks?.data?.tasks || analysis.data.tasks?.tasks || analysis.data.tasks,
        documentation: analysis.data.documentation?.data?.documentation || analysis.data.documentation?.documentation || analysis.data.documentation,
        metrics: analysis.data.metrics?.data?.metrics || analysis.data.metrics?.metrics || analysis.data.metrics,
        results: analysis.data.results?.data?.results || analysis.data.results?.results || analysis.data.results
      };
    }
    
    // For other tabs, extract the data from the endpoint response structure
    const endpointData = analysis.data[dataKey];
    if (endpointData && typeof endpointData === 'object') {
      // Backend returns: { success: true, data: { issues: [...] } }
      if (endpointData.data && endpointData.data[dataKey]) {
        return endpointData.data[dataKey];
      }
      // If the endpoint data has the key (e.g., { issues: [...] }), extract it
      if (endpointData[dataKey]) {
        return endpointData[dataKey];
      }
      // Otherwise return the data as is
      return endpointData;
    }
    
    return endpointData || null;
  };

  const getActiveTabData = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;
    
    return getCategoryData(activeTabConfig.dataKey);
  };

  const renderTabContent = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;
    
    const TabComponent = activeTabConfig.component;
    const data = getActiveTabData();
    
    return (
      <TabComponent
        data={data}
        category={key}
        categoryName={name}
        loading={loading}
        onAnalysisSelect={onAnalysisSelect}
      />
    );
  };

  return (
    <div className={`category-analysis-section ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* Category Header */}
      <div className="category-header" onClick={onToggle}>
        <div className="category-info">
          <span className="category-icon">{icon}</span>
          <div className="category-details">
            <h3 className="category-name">{name}</h3>
            <p className="category-description">{description}</p>
          </div>
        </div>
        <div className="category-status">
          {analysis.hasData && (
            <span className="data-indicator" title="Data available">
              ✅
            </span>
          )}
          <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Category Content */}
      {expanded && (
        <div className="category-content">
          {/* Tab Navigation */}
          <div className="category-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
                disabled={loading}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-name">{tab.name}</span>
                {getCategoryData(tab.dataKey) && (
                  <span className="tab-indicator" title="Data available">
                    •
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {loading ? (
              <div className="tab-loading">
                <div className="loading-spinner"></div>
                <p>Loading {activeTab} data...</p>
              </div>
            ) : (
              renderTabContent()
            )}
          </div>

          {/* Category Footer */}
          <div className="category-footer">
            <div className="category-meta">
              {analysis.lastUpdate && (
                <span className="last-update">
                  Last updated: {new Date(analysis.lastUpdate).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryAnalysisSection; 