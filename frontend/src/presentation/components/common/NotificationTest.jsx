import React from 'react';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';

const NotificationTest = () => {
  const { showError, showWarning, showSuccess, showInfo, clearAllNotifications } = useNotificationStore();

  const handleTestError = () => {
    showError('This is a test error message', 'Test Error');
  };

  const handleTestWarning = () => {
    showWarning('This is a test warning message', 'Test Warning');
  };

  const handleTestSuccess = () => {
    showSuccess('This is a test success message', 'Test Success');
  };

  const handleTestInfo = () => {
    showInfo('This is a test info message', 'Test Info');
  };

  const handleTestPersistent = () => {
    showError('This is a persistent error that requires manual dismissal', 'Persistent Error', true);
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  return (
    <div style={{ padding: '20px', background: '#1a202c', color: 'white', borderRadius: '8px', margin: '10px' }}>
      <h3>Notification System Test</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleTestError} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
          Test Error
        </button>
        <button onClick={handleTestWarning} style={{ background: '#d69e2e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
          Test Warning
        </button>
        <button onClick={handleTestSuccess} style={{ background: '#38a169', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
          Test Success
        </button>
        <button onClick={handleTestInfo} style={{ background: '#3182ce', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
          Test Info
        </button>
        <button onClick={handleTestPersistent} style={{ background: '#805ad5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
          Test Persistent
        </button>
        <button onClick={handleClearAll} style={{ background: '#4a5568', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
          Clear All
        </button>
      </div>
    </div>
  );
};

export default NotificationTest; 