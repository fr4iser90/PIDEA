import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';
import '@/css/components/test/test-runner.css';

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
        const config = {
          ...response.data,
          browsers: Array.isArray(response.data.browsers) ? response.data.browsers : ['chromium'], // Ensure browsers is always an array
          login: response.data.login || {
            required: false,
            username: '',
            password: ''
          }
        };
        setConfigForm(config);
        console.log('Configuration loaded from database:', config);
      } else {
        console.log('No configuration found in database, using defaults');
      }
    } catch (error) {
      console.error('Failed to load configuration from database:', error);
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
        // Update parent component with new config
        onConfigUpdate(configForm);
        setShowConfigForm(false);
        setConfigMessage('Configuration saved successfully!');
        console.log('Configuration saved successfully');
      } else {
        setConfigMessage('Failed to save configuration: ' + (response.error || 'Unknown error'));
        console.error('Failed to save configuration:', response.error);
      }
    } catch (error) {
      setConfigMessage('Error saving configuration: ' + error.message);
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

  return (
    <div className="test-configuration bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Test Configuration</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowConfigForm(!showConfigForm)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            {showConfigForm ? 'Hide Config' : 'Edit Config'}
          </button>
          <button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            {showProjectForm ? 'Hide Test Form' : 'Create New Test'}
          </button>
        </div>
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
        <h4 className="text-md font-medium text-gray-800 mb-3">Available Tests</h4>
        
        {testProjects.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            <div className="mb-2">🔍 No tests found in project</div>
            <div className="text-sm">Check if Playwright tests exist in your project directory</div>
            <div className="text-xs mt-1">Expected location: <code className="bg-gray-100 px-1 rounded">tests/playwright/tests/</code></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleTestSelect(project)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selected?.id === project.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <h5 className="font-medium text-gray-800">{project.name}</h5>
                <p className="text-sm text-gray-600 mt-1">{project.path}</p>
                <div className="text-xs text-gray-500 mt-2">
                  Directory: {project.directory}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Configuration Summary */}
      {testConfig && (
        <div className="config-summary mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-md font-medium text-gray-800 mb-2">Current Configuration</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Base URL:</span> {testConfig?.baseURL || 'Not set'}</div>
            <div><span className="font-medium">Timeout:</span> {testConfig?.timeout || 'Not set'}ms</div>
            <div><span className="font-medium">Retries:</span> {testConfig?.retries || 'Not set'}</div>
            <div><span className="font-medium">Browsers:</span> {(testConfig?.browsers || ['chromium']).join(', ')}</div>
            <div><span className="font-medium">Headless:</span> {testConfig?.headless ? 'Yes' : 'No'}</div>
            <div><span className="font-medium">Login Required:</span> {testConfig?.login?.required ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestConfiguration;
