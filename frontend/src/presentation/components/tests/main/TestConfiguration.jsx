import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';
import WebSocketService from '@/infrastructure/services/WebSocketService.jsx';
import '@/scss/components/_test-runner.scss';;

/**
 * TestConfiguration - Test configuration and project management UI
 * 
 * Provides configuration management interface for Playwright tests
 * following existing component patterns.
 */
const TestConfiguration = ({ 
  onSelect, 
  selected, 
  workspacePath, 
  projectId,
  testConfig, 
  testProjects, 
  onConfigUpdate, 
  onCreateProject 
}) => {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [browserEnvironment, setBrowserEnvironment] = useState(null);
  const [loadingEnvironment, setLoadingEnvironment] = useState(true);
  const [configForm, setConfigForm] = useState(testConfig ? {
    ...testConfig,
    browsers: Array.isArray(testConfig.browsers) ? testConfig.browsers : ['chromium'], // Ensure browsers is always an array
    login: testConfig.login || {
      required: false,
      username: '',
      password: ''
    }
  } : null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const apiRepository = new APIChatRepository(); // ✅ API REPOSITORY VERWENDEN!

  // Load browser environment and configuration on component mount
  useEffect(() => {
    loadBrowserEnvironment();
  }, []);

  // Load configuration when projectId changes
  useEffect(() => {
    if (projectId) {
      loadConfigurationFromDatabase();
    }
  }, [projectId]);

  // Update configForm when testConfig changes (only if not already loaded from database)
  useEffect(() => {
    if (testConfig && !projectId) {
      // Only use testConfig as fallback when no projectId is available
      const config = {
        ...testConfig,
        browsers: Array.isArray(testConfig.browsers) ? testConfig.browsers : ['chromium'], // Ensure browsers is always an array
        login: testConfig.login || {
          required: false,
          username: '',
          password: ''
        }
      };
      setConfigForm(config);
    }
  }, [testConfig, projectId]);

  // Add event listeners for configuration save events
  useEffect(() => {
    if (!projectId) return;

    const setupWebSocket = async () => {
      try {
        await WebSocketService.connect();
        
        const handleConfigSaved = (data) => {
          if (data.projectId === projectId) {
            // Update UI state via WebSocket event
            setConfigMessage('Configuration saved successfully!');
            
            // Update testConfig in parent component so preview shows correct values
            if (onConfigUpdate && configForm) {
              onConfigUpdate(configForm);
            }
            
            // Show success notification via event system
            window.dispatchEvent(new CustomEvent('notification', {
              detail: {
                type: 'success',
                message: 'Test configuration saved!',
                duration: 3000
              }
            }));
            
            // Auto-collapse configuration card and exit edit mode AFTER notification
            setTimeout(() => {
              setIsEditingConfig(false);
              setIsConfigExpanded(false);
            }, 1000); // Wait 1 second to show notification first
            
            console.log('Configuration saved successfully via WebSocket event system');
          }
        };

        const handleConfigFailed = (data) => {
          if (data.projectId === projectId) {
            // Show error notification via event system
            window.dispatchEvent(new CustomEvent('notification', {
              detail: {
                type: 'error',
                message: data.error || 'Configuration save failed!',
                duration: 5000
              }
            }));
            
            console.error('Configuration save failed via WebSocket event system:', data.error);
          }
        };

        // Register WebSocket event listeners
        WebSocketService.on('playwright:config:saved', handleConfigSaved);
        WebSocketService.on('playwright:config:failed', handleConfigFailed);

        console.log('WebSocket event listeners registered for playwright config events');
        
        // Cleanup function
        return () => {
          WebSocketService.off('playwright:config:saved', handleConfigSaved);
          WebSocketService.off('playwright:config:failed', handleConfigFailed);
        };
      } catch (error) {
        console.error('Failed to setup WebSocket for config events:', error);
      }
    };

    setupWebSocket();
  }, [projectId]);

  const loadBrowserEnvironment = async () => {
    try {
      setLoadingEnvironment(true);
      const response = await apiRepository.getBrowserEnvironment();
      if (response.success) {
        setBrowserEnvironment(response.data);
        // Don't update configForm here - let it be loaded from database
      }
    } catch (error) {
      console.error('Failed to load browser environment:', error);
    } finally {
      setLoadingEnvironment(false);
    }
  };

  const loadConfigurationFromDatabase = async () => {
    try {
      const response = await apiRepository.getPlaywrightTestConfig(projectId);
      if (response.success && response.data) {
        const configData = response.data.config || response.data;
        const config = {
          ...configData,
          browsers: Array.isArray(configData.browsers) ? configData.browsers : ['chromium'], // Ensure browsers is always an array
          login: configData.login || {
            required: false,
            username: '',
            password: ''
          }
        };
        setConfigForm(config);
        console.log('Configuration loaded from database:', config);
      } else {
        console.log('No configuration found in database, using defaults');
        // Initialize with default values when no configuration is found
        const defaultConfig = {
          timeout: 30000,
          retries: 2,
          login: {
            required: false,
            username: '',
            password: ''
          }
        };
        setConfigForm(defaultConfig);
      }
    } catch (error) {
      console.error('Failed to load configuration from database:', error);
      // Initialize with default values on error
      const defaultConfig = {
        timeout: 30000,
        retries: 2,
        login: {
          required: false,
          username: '',
          password: ''
        }
      };
      setConfigForm(defaultConfig);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    if (!configForm || !configForm.login) {
      setConfigMessage('No configuration to save');
      return;
    }
    
    try {
      setSavingConfig(true);
      setConfigMessage('');
      
      // Save configuration to database via API
      const response = await apiRepository.updatePlaywrightTestConfig(projectId, configForm);
      if (response.success) {
        // Configuration save initiated - WebSocket events will handle notifications and UI updates
        console.log('Configuration save initiated successfully');
      } else {
        const errorMsg = 'Failed to save configuration: ' + (response.error || 'Unknown error');
        setConfigMessage(errorMsg);
        console.error('Failed to save configuration:', response.error);
      }
    } catch (error) {
      const errorMsg = 'Error saving configuration: ' + error.message;
      setConfigMessage(errorMsg);
      console.error('Error saving configuration:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleProjectSubmit = (e) => {
    e.preventDefault();
    onCreateProject(projectForm);
    setProjectForm({ name: '', description: '' });
    setShowProjectForm(false);
  };

  const handleTestSelect = (test) => {
    onSelect(test);
  };

  const isTestSelected = (test) => {
    return Array.isArray(selected) ? selected.some(t => t.id === test.id) : selected?.id === test.id;
  };

  return (
    <div className="test-runner__config-section">
      {/* Top Section with Configuration Cards */}
      <div className="test-runner__config-header">
        {/* Test Configuration Card */}
        <div className="test-runner__config-title-section">
          <h3 className="test-runner__config-title">Test Configuration</h3>
          <div className="test-runner__config-actions">
            <button
              onClick={() => setIsEditingConfig(!isEditingConfig)}
              className="test-runner__config-btn"
            >
              <span className="test-runner__button-icon">⚙️</span>
              <span>{isEditingConfig ? 'Cancel' : 'Edit Config'}</span>
            </button>
            <button
              onClick={() => setShowProjectForm(!showProjectForm)}
              className="test-runner__config-btn"
            >
              <span className="test-runner__button-icon">➕</span>
              <span>{showProjectForm ? 'Hide Test Form' : 'Create New Test'}</span>
            </button>
          </div>
        </div>

        {/* Current Configuration Card */}
        {testConfig && (
          <div className="config-card">
            <div 
              className="config-card-header"
              onClick={() => setIsConfigExpanded(!isConfigExpanded)}
              style={{ cursor: 'pointer' }}
            >
              <div className="config-card-icon">📋</div>
              <h4 className="config-card-title">Current Configuration</h4>
              <div className="config-toggle-icon">
                {isConfigExpanded ? '▼' : '▶'}
              </div>
            </div>
            {isConfigExpanded && (
              <div className="config-card-content">
                <div className="config-item">
                  <span className="config-label">Base URL:</span>
                  {isEditingConfig ? (
                    <input
                      type="text"
                      value={configForm?.baseURL || ''}
                      onChange={(e) => setConfigForm({...configForm, baseURL: e.target.value})}
                      className="config-input"
                      placeholder="http://localhost:4000"
                    />
                  ) : (
                    <span className="config-value">{testConfig?.baseURL || 'Not set'}</span>
                  )}
                </div>
                <div className="config-item">
                  <span className="config-label">Timeout:</span>
                  {isEditingConfig ? (
                    <input
                      type="number"
                      value={configForm?.timeout || ''}
                      onChange={(e) => setConfigForm({...configForm, timeout: parseInt(e.target.value) || 30000})}
                      className="config-input"
                      placeholder="30000"
                    />
                  ) : (
                    <span className="config-value">{testConfig?.timeout || 'Not set'}ms</span>
                  )}
                </div>
                <div className="config-item">
                  <span className="config-label">Retries:</span>
                  {isEditingConfig ? (
                    <input
                      type="number"
                      value={configForm?.retries || ''}
                      onChange={(e) => setConfigForm({...configForm, retries: parseInt(e.target.value) || 2})}
                      className="config-input"
                      placeholder="2"
                    />
                  ) : (
                    <span className="config-value">{testConfig?.retries || 'Not set'}</span>
                  )}
                </div>
                <div className="config-item">
                  <span className="config-label">Browsers:</span>
                  {isEditingConfig ? (
                    <select
                      value={configForm?.browsers?.[0] || 'chromium'}
                      onChange={(e) => setConfigForm({...configForm, browsers: [e.target.value]})}
                      className="config-select"
                    >
                      <option value="chromium">chromium</option>
                      <option value="firefox">firefox</option>
                      <option value="webkit">webkit</option>
                    </select>
                  ) : (
                    <span className="config-value">{(testConfig?.browsers || ['chromium']).join(', ')}</span>
                  )}
                </div>
                <div className="config-item">
                  <span className="config-label">Headless:</span>
                  {isEditingConfig ? (
                    <input
                      type="checkbox"
                      checked={configForm?.headless || false}
                      onChange={(e) => setConfigForm({...configForm, headless: e.target.checked})}
                      className="config-checkbox"
                    />
                  ) : (
                    <span className="config-value">{testConfig?.headless ? 'Yes' : 'No'}</span>
                  )}
                </div>
                <div className="config-item">
                  <span className="config-label">Login Required:</span>
                  {isEditingConfig ? (
                    <input
                      type="checkbox"
                      checked={configForm?.login?.required || false}
                      onChange={(e) => setConfigForm({...configForm, login: {...configForm.login, required: e.target.checked}})}
                      className="config-checkbox"
                    />
                  ) : (
                    <span className="config-value">{testConfig?.login?.required ? 'Yes' : 'No'}</span>
                  )}
                </div>
                
                {/* Login Credentials - only show when login is required */}
                {(isEditingConfig ? configForm?.login?.required : testConfig?.login?.required) && (
                  <div className="login-credentials">
                    <div className="config-item">
                      <span className="config-label">Username:</span>
                      {isEditingConfig ? (
                        <input
                          type="text"
                          value={configForm?.login?.username || ''}
                          onChange={(e) => setConfigForm({...configForm, login: {...configForm.login, username: e.target.value}})}
                          className="config-input"
                          placeholder="Enter username"
                        />
                      ) : (
                        <span className="config-value">{testConfig?.login?.username || 'Not set'}</span>
                      )}
                    </div>
                    <div className="config-item">
                      <span className="config-label">Password:</span>
                      {isEditingConfig ? (
                        <input
                          type="password"
                          value={configForm?.login?.password || ''}
                          onChange={(e) => setConfigForm({...configForm, login: {...configForm.login, password: e.target.value}})}
                          className="config-input"
                          placeholder="Enter password"
                        />
                      ) : (
                        <span className="config-value">{testConfig?.login?.password ? '••••••••' : 'Not set'}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {isEditingConfig && (
                  <div className="config-actions">
                    <button
                      onClick={handleConfigSubmit}
                      className="save-button"
                    >
                      <span className="button-icon">💾</span>
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingConfig(false);
                        setConfigForm(testConfig);
                      }}
                      className="cancel-button"
                    >
                      <span className="button-icon">❌</span>
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration Form */}
      {showConfigForm && !configForm && (
        <div className="config-form mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <p>No configuration available. Please wait for configuration to load from database.</p>
          </div>
        </div>
      )}
      
      {showConfigForm && configForm && configForm.login && (
        <div className="config-form mb-6 p-4 bg-gray-50 rounded-lg">
          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL
                </label>
                <input
                  type="url"
                  value={configForm.baseURL}
                  onChange={(e) => setConfigForm({...configForm, baseURL: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  value={configForm.timeout}
                  onChange={(e) => setConfigForm({...configForm, timeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retries
                </label>
                <input
                  type="number"
                  value={configForm.retries}
                  onChange={(e) => setConfigForm({...configForm, retries: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Browsers
                  {loadingEnvironment && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
                </label>
                <select
                  multiple
                  value={configForm.browsers}
                  onChange={(e) => setConfigForm({...configForm, browsers: Array.from(e.target.selectedOptions, option => option.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingEnvironment}
                >
                  {browserEnvironment && (
                    <>
                      {browserEnvironment.browsers.playwright?.map(browser => (
                        <option 
                          key={`playwright-${browser.name}`} 
                          value={browser.name} // Send actual browser name, not prefixed
                          disabled={!browser.available || !browser.compatible}
                        >
                          {browser.name} (Playwright) {!browser.available ? '- Not Available' : !browser.compatible ? '- Incompatible' : ''}
                        </option>
                      ))}
                      {browserEnvironment.browsers.system?.map(browser => (
                        <option 
                          key={`system-${browser.name}`} 
                          value={`system-${browser.name}`}
                          disabled={!browser.available}
                        >
                          {browser.name} (System) {!browser.available ? '- Not Available' : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                
                {/* NixOS Info - Only show if no Playwright browsers available */}
                {browserEnvironment?.isNixOS && (!browserEnvironment.browsers.playwright || browserEnvironment.browsers.playwright.length === 0) && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-2">
                        <h3 className="text-xs font-medium text-yellow-800">
                          NixOS: Playwright not available
                        </h3>
                        <div className="mt-1 text-xs text-yellow-700">
                          <p>Use system browsers or install Playwright with: <code className="bg-yellow-100 px-1 rounded">npx playwright install chromium</code></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Browser Environment Info - Only show if there are issues */}
                {browserEnvironment && (!browserEnvironment.browsers.playwright || browserEnvironment.browsers.playwright.length === 0) && (
                  <div className="mt-1 text-xs text-gray-500">
                    <p>Platform: {browserEnvironment.platform} • Playwright: Not available • System: {browserEnvironment.browsers.system?.length || 0} available</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={configForm.headless}
                  onChange={(e) => setConfigForm({...configForm, headless: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Headless mode</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={configForm.login.required}
                  onChange={(e) => setConfigForm({...configForm, login: {...configForm.login, required: e.target.checked}})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Login required</span>
              </label>
            </div>
            
            {configForm.login.required && (
              <div className="login-config p-4 bg-white rounded border">
                <h4 className="text-md font-medium text-gray-800 mb-3">Login Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username Field
                    </label>
                    <input
                      type="text"
                      value={configForm.login.username}
                      onChange={(e) => setConfigForm({...configForm, login: {...configForm.login, username: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password Field
                    </label>
                    <input
                      type="password"
                      value={configForm.login.password}
                      onChange={(e) => setConfigForm({...configForm, login: {...configForm.login, password: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowConfigForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                disabled={savingConfig}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={savingConfig}
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
            
            {/* Configuration Message */}
            {configMessage && (
              <div className={`mt-4 p-3 rounded ${
                configMessage.includes('successfully') 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {configMessage}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Project Creation Form */}
      {showProjectForm && (
        <div className="project-form mb-6 p-4 bg-gray-50 rounded-lg">
          <form onSubmit={handleProjectSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name
              </label>
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Create Test
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Test Projects List */}
      <div className="test-projects">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-800">Available Tests</h4>
          <div className="flex items-center space-x-3">
            {Array.isArray(selected) && selected.length > 0 && (
              <div className="text-sm text-blue-600 font-medium">
                {selected.length} test{selected.length !== 1 ? 's' : ''} selected
              </div>
            )}
            {testProjects.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    if (Array.isArray(selected) && selected.length === testProjects.length) {
                      // Deselect all
                      testProjects.forEach(test => onSelect(test));
                    } else {
                      // Select all
                      testProjects.forEach(test => {
                        if (!isTestSelected(test)) {
                          onSelect(test);
                        }
                      });
                    }
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  {Array.isArray(selected) && selected.length === testProjects.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {testProjects.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            <div className="mb-2">🔍 No tests found in project</div>
            <div className="text-sm">Check if Playwright tests exist in your project directory</div>
            <div className="text-xs mt-1">Expected location: <code className="bg-gray-100 px-1 rounded">tests/playwright/tests/</code></div>
          </div>
        ) : (
          <div className="grid">
            {testProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleTestSelect(project)}
                className={`test-project-card ${
                  isTestSelected(project) ? 'selected' : ''
                }`}
              >
                <div className="card-header">
                  <div className="card-icon">
                    {project.name === 'login' ? '🔐' : 
                     project.name === 'form-submission' ? '📝' : 
                     project.name === 'dashboard' ? '📊' : '🧪'}
                  </div>
                  <h5>{project.name}</h5>
                </div>
                
                <div className="card-content">
                  <p className="file-path" title={project.path}>
                    {project.path.split('/').slice(-2).join('/')}
                  </p>
                  <div className="directory-info" title={project.directory}>
                    {project.directory.split('/').slice(-2).join('/')}
                  </div>
                </div>
                
                <div className="card-footer">
                  <span className="test-type">Playwright Test</span>
                  <div className="status-indicator" title="Test Available"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default TestConfiguration;
