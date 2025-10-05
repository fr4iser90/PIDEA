import React from 'react';

/**
 * TestStatusBadge - Test status indicator component
 * 
 * Provides visual status indication for test runner state
 * following existing component patterns.
 */
const TestStatusBadge = ({ status }) => {
  const getStatusInfo = (status) => {
    if (!status) {
      return {
        text: 'Unknown',
        color: 'bg-gray-500',
        icon: '❓'
      };
    }

    if (status.isRunning) {
      return {
        text: 'Running',
        color: 'bg-blue-500',
        icon: '🔄'
      };
    }

    if (status.activeTestCount > 0) {
      return {
        text: `${status.activeTestCount} Active`,
        color: 'bg-yellow-500',
        icon: '⏳'
      };
    }

    if (status.totalResults > 0) {
      return {
        text: `${status.totalResults} Completed`,
        color: 'bg-green-500',
        icon: '✅'
      };
    }

    return {
      text: 'Ready',
      color: 'bg-gray-500',
      icon: '⚪'
    };
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${statusInfo.color}`}>
      <span className="mr-2">{statusInfo.icon}</span>
      <span>{statusInfo.text}</span>
    </div>
  );
};

export default TestStatusBadge;
