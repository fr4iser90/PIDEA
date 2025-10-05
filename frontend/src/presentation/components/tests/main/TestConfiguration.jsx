import React, { useState } from 'react';
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
  testConfig, 
  testProjects, 
  onConfigUpdate, 
  onCreateProject 
}) => {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [configForm, setConfigForm] = useState(testConfig || getDefaultConfig());
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });

  function getDefaultConfig() {
    return {
      baseURL: 'http://localhost:3000',
      timeout: 30000,
      retries: 2,
      browsers: ['chromium'],
      headless: true,
      login: {
        required: false,
        selector: '',
        username: '',
        password: '',
        additionalFields: {}
      },
      tests: {
        directory: './tests',
        pattern: '**/*.test.js',
        exclude: ['**/node_modules/**']
      },
      screenshots: {
        enabled: true,
        path: './screenshots',
        onFailure: true
      },
      videos: {
        enabled: false,
        path: './videos',
        onFailure: true
      },
      reports: {
        enabled: true,
        path: './reports',
        format: 'html'
      }
    };
  }

  const handleConfigSubmit = (e) => {
    e.preventDefault();
    onConfigUpdate(configForm);
    setShowConfigForm(false);
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
      {showConfigForm && (
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
                </label>
                <select
                  multiple
                  value={configForm.browsers}
                  onChange={(e) => setConfigForm({...configForm, browsers: Array.from(e.target.selectedOptions, option => option.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit</option>
                </select>
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
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save Configuration
              </button>
            </div>
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
            <div><span className="font-medium">Base URL:</span> {testConfig.baseURL}</div>
            <div><span className="font-medium">Timeout:</span> {testConfig.timeout}ms</div>
            <div><span className="font-medium">Retries:</span> {testConfig.retries}</div>
            <div><span className="font-medium">Browsers:</span> {testConfig.browsers.join(', ')}</div>
            <div><span className="font-medium">Headless:</span> {testConfig.headless ? 'Yes' : 'No'}</div>
            <div><span className="font-medium">Login Required:</span> {testConfig.login.required ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestConfiguration;
