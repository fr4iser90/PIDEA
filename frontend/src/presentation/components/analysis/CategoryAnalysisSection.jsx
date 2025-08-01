import React, { useState } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import CategoryOverview from './CategoryOverview';
import CategoryIssues from './CategoryIssues';
import CategoryRecommendations from './CategoryRecommendations';
import CategoryMetrics from './CategoryMetrics';
import CategoryCharts from './CategoryCharts';
import '@/css/components/analysis/category-analysis-section.css';

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
      return analysis.data.summary || analysis.data;
    }
    
    return analysis.data[dataKey] || null;
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