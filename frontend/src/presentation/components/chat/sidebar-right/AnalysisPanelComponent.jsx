import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '../../../../infrastructure/repositories/APIChatRepository';

const AnalysisPanelComponent = ({ projectId = null }) => {
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [analysisContent, setAnalysisContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('history');

  const apiRepository = new APIChatRepository();

  useEffect(() => {
    loadAnalysisHistory();
  }, [projectId]);

  const loadAnalysisHistory = async () => {
    try {
      setLoading(true);
      const response = await apiRepository.getAnalysisHistory(projectId);
      if (response.success) {
        setAnalysisHistory(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      setError('Failed to load analysis history');
      logger.error('Analysis history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisFile = async (filename) => {
    try {
      setLoading(true);
      const response = await apiRepository.getAnalysisFile(projectId, filename);
      if (response.success) {
        setAnalysisContent(response.data);
        setSelectedAnalysis(filename);
      }
    } catch (err) {
      setError('Failed to load analysis file');
      logger.error('Analysis file error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const response = await apiRepository.generateAnalysisReport(projectId);
      if (response.success) {
        await loadAnalysisHistory(); // Refresh to show new report
      }
    } catch (err) {
      setError('Failed to generate report');
      logger.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderAnalysisContent = () => {
    if (!analysisContent) return <div className="text-gray-500">Select an analysis to view content</div>;

    if (typeof analysisContent === 'string') {
      // Markdown content
      return (
        <div className="bg-white p-4 rounded border">
          <pre className="whitespace-pre-wrap text-sm">{analysisContent}</pre>
        </div>
      );
    } else {
      // JSON content
      return (
        <div className="bg-white p-4 rounded border">
          <pre className="text-sm overflow-auto">{JSON.stringify(analysisContent, null, 2)}</pre>
        </div>
      );
    }
  };

  const renderAnalysisHistory = () => {
    if (loading) return <div className="text-center py-4">Loading...</div>;
    if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

    if (!Array.isArray(analysisHistory)) {
      logger.warn('Analysis history is not an array:', analysisHistory);
      return <div className="text-center py-4 text-red-500">Invalid data format</div>;
    }

    if (analysisHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">📊</div>
          <div>No analysis files found</div>
          <div className="text-sm mt-2">Run an analysis to see results here</div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {analysisHistory.map((analysis, index) => (
          <div
            key={index}
            className={`p-3 rounded border cursor-pointer transition-colors ${
              selectedAnalysis === analysis.filename
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => loadAnalysisFile(analysis.filename)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`text-lg ${
                  analysis.type === 'analysis' ? '📈' : '📄'
                }`}></div>
                <div>
                  <div className="font-medium text-sm">
                    {analysis.type === 'analysis' 
                      ? `${analysis.analysisType} Analysis`
                      : 'Analysis Report'
                    }
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(analysis.timestamp)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {formatFileSize(analysis.size)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="sidebar-right__analysis-panel">
      {/* Header */}
      <div className="sidebar-right__analysis-header">
        <div className="sidebar-right__analysis-header-content">
          <h3>Analysis Results</h3>
          <button
            onClick={generateReport}
            disabled={loading}
            className="sidebar-right__generate-report-btn"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'content'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Content
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'history' ? (
          <div className="p-4 overflow-y-auto h-full">
            {renderAnalysisHistory()}
          </div>
        ) : (
          <div className="p-4 overflow-y-auto h-full">
            {renderAnalysisContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanelComponent; 