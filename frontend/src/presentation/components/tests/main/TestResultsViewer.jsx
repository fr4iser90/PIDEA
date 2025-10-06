import React, { useState } from 'react';
import '@/css/components/test/test-runner.css';

/**
 * TestResultsViewer - Test results display component
 * 
 * Provides comprehensive test result visualization following existing
 * component patterns with detailed result analysis.
 */
const TestResultsViewer = ({ results, error, isRunning }) => {
  const [selectedResult, setSelectedResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const formatDuration = (duration) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌';
  };

  const getBrowserIcon = (browser) => {
    const icons = {
      chromium: '🌐',
      firefox: '🦊',
      webkit: '🍎'
    };
    return icons[browser] || '🌐';
  };

  if (isRunning) {
    return (
      <div className="test-results bg-white border rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-800">Running Tests...</h3>
            <p className="text-gray-600">Please wait while tests are executing</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="test-results bg-white border rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 text-xl mr-3">❌</div>
            <div>
              <h3 className="text-lg font-medium text-red-800">Test Execution Failed</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="test-results bg-white border rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🧪</div>
          <h3 className="text-lg font-medium text-gray-800">No Test Results</h3>
          <p className="text-gray-600">Run some tests to see results here</p>
        </div>
      </div>
    );
  }

  const latestResult = results && results.length > 0 ? results[results.length - 1] : null;
  
  if (!latestResult) {
    return (
      <div className="test-results bg-white border rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🧪</div>
          <h3 className="text-lg font-medium text-gray-800">No Test Results</h3>
          <p className="text-gray-600">Run some tests to see results here</p>
        </div>
      </div>
    );
  }
  
  // Handle Playwright JSON format
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let duration = 0;
  
  if (latestResult.stats) {
    // Playwright JSON format
    totalTests = latestResult.stats.expected || 0;
    failedTests = latestResult.stats.unexpected || 0;
    passedTests = totalTests - failedTests;
    duration = latestResult.stats.duration || 0;
  } else if (latestResult.results) {
    // Browser-specific format
    totalTests = Object.keys(latestResult.results).length;
    passedTests = Object.values(latestResult.results).filter(r => r && r.success).length;
    failedTests = totalTests - passedTests;
    duration = latestResult.duration || 0;
  }

  return (
    <div className="test-results bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Test Results</h3>
        <div className="text-sm text-gray-600">
          Last run: {latestResult.stats?.startTime ? new Date(latestResult.stats.startTime).toLocaleString() : 'Unknown'}
        </div>
      </div>

      {/* Results Overview */}
      <div className="results-overview mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{totalTests}</div>
            <div className="text-sm text-gray-600">Total Tests</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{passedTests}</div>
            <div className="text-sm text-green-600">Passed</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{failedTests}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{formatDuration(duration)}</div>
            <div className="text-sm text-blue-600">Duration</div>
          </div>
        </div>
      </div>

      {/* Results Tabs */}
      <div className="results-tabs mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detailed Results
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test History
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="space-y-4">
              {latestResult.results && Object.entries(latestResult.results).map(([browser, result]) => (
                <div key={browser} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getBrowserIcon(browser)}</span>
                      <span className="font-medium text-gray-800 capitalize">{browser}</span>
                      <span className={`text-sm ${getStatusColor(result.success)}`}>
                        {getStatusIcon(result.success)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDuration(result.duration)}
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                      <div className="text-sm text-red-800">{result.error}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="details-content">
            <div className="space-y-4">
              {latestResult.results && Object.entries(latestResult.results).map(([browser, result]) => (
                <div key={browser} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800 capitalize">{browser} Results</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${getStatusColor(result.success)}`}>
                        {result.success ? 'PASSED' : 'FAILED'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatDuration(result.duration)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`ml-2 ${getStatusColor(result.success)}`}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Duration:</span>
                      <span className="ml-2 text-gray-600">{formatDuration(result.duration)}</span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Timestamp:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {result.error && (
                      <div className="mt-3">
                        <span className="font-medium text-gray-700">Error:</span>
                        <div className="mt-1 bg-red-50 border border-red-200 rounded p-3">
                          <div className="text-sm text-red-800 font-mono">{result.error}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-content">
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${getStatusColor(result.success)}`}>
                        {getStatusIcon(result.success)}
                      </span>
                      <span className="font-medium text-gray-800">
                        Test Run #{results.length - index}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <span className="ml-1 text-gray-600">{formatDuration(result.duration)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tests:</span>
                      <span className="ml-1 text-gray-600">
                        {result.results ? Object.keys(result.results).length : 0}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Passed:</span>
                      <span className="ml-1 text-green-600">
                        {result.results ? Object.values(result.results).filter(r => r.success).length : 0}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Failed:</span>
                      <span className="ml-1 text-red-600">
                        {result.results ? Object.values(result.results).filter(r => !r.success).length : 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResultsViewer;
