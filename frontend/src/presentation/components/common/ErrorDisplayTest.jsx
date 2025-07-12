import React, { useState } from 'react';
import { useErrorDisplay } from '@/infrastructure/hooks/useErrorDisplay.js';
import { ERROR_TYPES, ERROR_CODES } from '@/infrastructure/utils/ErrorCategorizer.js';

const ErrorDisplayTest = () => {
  const { errors, addError, clearErrors, ErrorDisplay } = useErrorDisplay({
    autoDismiss: false,
    showNotifications: true,
    maxErrors: 5
  });

  const [selectedErrorType, setSelectedErrorType] = useState('auth');

  const createTestError = (type) => {
    const errorMap = {
      auth: {
        message: 'Authentication token has expired',
        code: ERROR_CODES.AUTH_EXPIRED,
        title: 'Authentication Error',
        stack: 'Error: Token expired\n    at AuthService.validateToken (auth.js:25)\n    at App.jsx:42'
      },
      network: {
        message: 'Failed to fetch data from server',
        code: ERROR_CODES.NETWORK_TIMEOUT,
        title: 'Network Error',
        stack: 'TypeError: Failed to fetch\n    at fetch (index.js:15)\n    at APIChatRepository.jsx:67'
      },
      validation: {
        message: 'Please provide a valid email address',
        code: ERROR_CODES.VALIDATION_FORMAT,
        title: 'Validation Error',
        stack: 'ValidationError: Invalid email format\n    at validateEmail (validation.js:12)\n    at LoginComponent.jsx:23'
      },
      server: {
        message: 'Internal server error occurred',
        code: ERROR_CODES.SERVER_ERROR,
        title: 'Server Error',
        stack: 'Error: 500 Internal Server Error\n    at ServerHandler.process (server.js:89)\n    at API.jsx:156'
      },
      client: {
        message: 'An unexpected error occurred in the application',
        code: 'CLIENT_ERROR',
        title: 'Client Error',
        stack: 'TypeError: Cannot read property \'data\' of undefined\n    at Component.render (Component.jsx:34)\n    at React.js:45'
      }
    };

    return errorMap[type] || errorMap.auth;
  };

  const handleAddError = () => {
    const testError = createTestError(selectedErrorType);
    addError(testError);
  };

  const handleAddMultipleErrors = () => {
    Object.keys(ERROR_TYPES).forEach(type => {
      const testError = createTestError(ERROR_TYPES[type]);
      addError(testError);
    });
  };

  return (
    <div style={{ padding: '20px', background: '#1a202c', color: 'white', borderRadius: '8px', margin: '10px' }}>
      <h3>Error Display System Test</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <label>Error Type:</label>
          <select 
            value={selectedErrorType} 
            onChange={(e) => setSelectedErrorType(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', background: '#2d3748', color: 'white', border: '1px solid #4a5568' }}
          >
            <option value="auth">Authentication</option>
            <option value="network">Network</option>
            <option value="validation">Validation</option>
            <option value="server">Server</option>
            <option value="client">Client</option>
          </select>
          <button 
            onClick={handleAddError}
            style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Error
          </button>
          <button 
            onClick={handleAddMultipleErrors}
            style={{ background: '#d69e2e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add All Types
          </button>
          <button 
            onClick={clearErrors}
            style={{ background: '#4a5568', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Clear All
          </button>
        </div>
        
        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
          Active Errors: {errors.length} | Max Errors: 5
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Error Displays:</h4>
        {errors.length === 0 ? (
          <div style={{ color: '#a0aec0', fontStyle: 'italic' }}>
            No errors to display. Add some errors using the buttons above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {errors.map((error, index) => (
              <div key={error.id} style={{ border: '1px solid #4a5568', borderRadius: '4px', padding: '10px' }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '5px' }}>
                  Error #{index + 1} - Type: {error.category} - ID: {error.id.toString().slice(-6)}
                </div>
                <ErrorDisplay 
                  error={error} 
                  showDetails={index === 0} // Show details for first error
                  className={index === 0 ? '' : 'compact'}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#a0aec0' }}>
        <h4>Test Features:</h4>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Click the + button to expand error details</li>
          <li>Click the × button to dismiss individual errors</li>
          <li>Errors auto-dismiss after 5 seconds (disabled in test)</li>
          <li>Notifications are shown for each error</li>
          <li>Maximum 5 errors can be displayed</li>
          <li>Different error types have different colors and icons</li>
        </ul>
      </div>
    </div>
  );
};

export default ErrorDisplayTest; 