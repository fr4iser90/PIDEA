import React, { useState, useEffect } from 'react';
import { ApiService } from '@/infrastructure/services/ApiService';

/**
 * Build Status Component
 * Shows build status and progress
 */
const BuildStatusComponent = () => {
  const [buildStatus, setBuildStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchBuildStatus = async () => {
      try {
        const response = await ApiService.get('/api/dev/build-status');
        setBuildStatus(response);
      } catch (error) {
        console.warn('Could not fetch build status:', error.message);
      }
    };

    // Fetch immediately
    fetchBuildStatus();

    // Poll every 2 seconds when building, every 10 seconds when idle
    const interval = setInterval(() => {
      fetchBuildStatus();
    }, buildStatus?.isBuilding ? 2000 : 10000);

    return () => clearInterval(interval);
  }, [buildStatus?.isBuilding]);

  if (!buildStatus) return null;

  const getStatusColor = () => {
    if (buildStatus.hasError) return 'text-red-600';
    if (buildStatus.isBuilding) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (buildStatus.hasError) return '❌';
    if (buildStatus.isBuilding) return '🔨';
    return '✅';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`mb-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          buildStatus.hasError
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : buildStatus.isBuilding
            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        {getStatusIcon()} Build Status
      </button>

      {/* Status Panel */}
      {isVisible && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Build Status</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-700 w-20">Status:</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {getStatusIcon()} {buildStatus.status}
              </span>
            </div>

            {buildStatus.lastBuildReason && (
              <div className="flex items-center">
                <span className="font-medium text-gray-700 w-20">Reason:</span>
                <span className="text-gray-600">{buildStatus.lastBuildReason}</span>
              </div>
            )}

            <div className="flex items-center">
              <span className="font-medium text-gray-700 w-20">Last Build:</span>
              <span className="text-gray-600">{formatTime(buildStatus.lastBuildTime)}</span>
            </div>

            {buildStatus.buildQueue.length > 0 && (
              <div className="flex items-center">
                <span className="font-medium text-gray-700 w-20">Queue:</span>
                <span className="text-gray-600">{buildStatus.buildQueue.length} pending</span>
              </div>
            )}

            {buildStatus.lastError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <div className="font-medium text-red-800 text-xs">Last Error:</div>
                <div className="text-red-700 text-xs mt-1">{buildStatus.lastError.message}</div>
                <div className="text-red-600 text-xs mt-1">
                  {formatTime(buildStatus.lastError.timestamp)}
                </div>
              </div>
            )}

            {buildStatus.isBuilding && (
              <div className="mt-3">
                <div className="flex items-center text-yellow-700 text-xs">
                  <div className="animate-spin mr-2">⏳</div>
                  Building in progress...
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div>Watched: src/*, public/*, package.json, vite.config.js</div>
              <div>Ignored: node_modules, dist, .git, coverage, .cache</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildStatusComponent;
