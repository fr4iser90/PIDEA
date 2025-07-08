import React, { useState, useEffect } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import DocumentationFrameworkModal from './frameworks/DocumentationFrameworkModal.jsx';

function FrameworksPanelComponent({ onFrameworkSelect, onNavigateToPrompts, onNavigateToTemplates }) {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [frameworkDetails, setFrameworkDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'prompts', 'templates'
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] = useState(false);

  useEffect(() => {
    loadFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFramework) {
      loadFrameworkDetails(selectedFramework);
    }
  }, [selectedFramework]);

  const loadFrameworks = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/frameworks');
      if (response.success) {
        setFrameworks(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load frameworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFrameworkDetails = async (frameworkId) => {
    try {
      setLoading(true);
      
      // Load both prompts and templates for the framework
      const [promptsResponse, templatesResponse] = await Promise.all([
        apiCall(`/api/frameworks/${frameworkId}/prompts`),
        apiCall(`/api/frameworks/${frameworkId}/templates`)
      ]);

      setFrameworkDetails({
        id: frameworkId,
        prompts: promptsResponse.success ? promptsResponse.data.prompts : [],
        templates: templatesResponse.success ? templatesResponse.data.templates : []
      });
    } catch (error) {
      console.error('Failed to load framework details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFrameworkSelect = (framework) => {
    // Special handling for workflow frameworks
    if (framework.id === 'documentation-framework') {
      setIsDocumentationModalOpen(true);
      return;
    }
    
    // Default handling for regular frameworks
    setSelectedFramework(framework.id);
    setActiveView('overview');
    if (onFrameworkSelect) {
      onFrameworkSelect(framework);
    }
  };

  const handleNavigateToPrompts = () => {
    setActiveView('prompts');
    if (onNavigateToPrompts) {
      onNavigateToPrompts(selectedFramework);
    }
  };

  const handleNavigateToTemplates = () => {
    setActiveView('templates');
    if (onNavigateToTemplates) {
      onNavigateToTemplates(selectedFramework);
    }
  };

  const handleBackToOverview = () => {
    setActiveView('overview');
  };

  const filteredFrameworks = frameworks.filter(framework => 
    framework.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    framework.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFrameworkIcon = (frameworkId) => {
    const icons = {
      'react-framework': '⚛️',
      'vue-framework': '💚',
      'angular-framework': '🅰️',
      'node-framework': '🟢',
      'python-framework': '🐍',
      'java-framework': '☕',
      'dotnet-framework': '🔷',
      'php-framework': '🐘',
      'ruby-framework': '💎',
      'go-framework': '🔵',
      'rust-framework': '🦀',
      'swift-framework': '🍎',
      'kotlin-framework': '🟠',
      'flutter-framework': '🦋',
      'ai-framework': '🤖',
      'web-apps-framework': '🌐',
      'mobile-framework': '📱',
      'desktop-framework': '🖥️',
      'game-framework': '🎮',
      'data-framework': '📊',
      'documentation-framework': '📚'
    };
    return icons[frameworkId] || '🧩';
  };

  const isWorkflowFramework = (frameworkId) => {
    const workflowFrameworks = ['documentation-framework'];
    return workflowFrameworks.includes(frameworkId);
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="panel-header flex items-center justify-between mb-4">
        <div className="panel-title text-lg font-semibold text-white">Frameworks</div>
        <input
          type="text"
          className="search-input bg-gray-800 text-white rounded px-2 py-1"
          placeholder="Search frameworks..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="frameworks-panel">
        {frameworks.map(fw => (
          <div
            key={fw.id}
            className={`framework-item flex items-center gap-2 p-2 rounded cursor-pointer transition-all duration-200 ${selectedFramework === fw.id ? 'ring-2 ring-blue-500' : ''} ${isWorkflowFramework(fw.id) ? 'workflow-framework' : ''}`}
            onClick={() => handleFrameworkSelect(fw)}
          >
            <span className="text-xl">{getFrameworkIcon(fw.id)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{fw.name}</span>
                {isWorkflowFramework(fw.id) && (
                  <span className="workflow-badge">Workflow</span>
                )}
              </div>
              <span className="text-gray-400 text-xs">{fw.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFrameworkDetails = () => {
    if (!selectedFramework || !frameworkDetails) {
      return (
        <div className="text-center py-8 text-gray-400">
          Select a framework to view details
        </div>
      );
    }

    const selectedFrameworkData = frameworks.find(f => f.id === selectedFramework);
    const promptsCount = frameworkDetails.prompts.length;
    const templatesCount = frameworkDetails.templates.length;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              className="text-gray-400 hover:text-white"
              onClick={handleBackToOverview}
            >
              ← Back
            </button>
            <div className="text-2xl">{getFrameworkIcon(selectedFramework)}</div>
            <h3 className="font-semibold text-white">{selectedFrameworkData?.name}</h3>
          </div>
        </div>

        {/* Framework Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-2xl font-bold text-blue-400">{promptsCount}</div>
            <div className="text-xs text-gray-400">Prompts</div>
          </div>
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-2xl font-bold text-green-400">{templatesCount}</div>
            <div className="text-xs text-gray-400">Templates</div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="space-y-2">
          <button 
            className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={handleNavigateToPrompts}
            disabled={promptsCount === 0}
          >
            💡 View Prompts ({promptsCount})
          </button>
          <button 
            className="w-full p-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            onClick={handleNavigateToTemplates}
            disabled={templatesCount === 0}
          >
            📋 View Templates ({templatesCount})
          </button>
        </div>

        {/* Recent Items */}
        {promptsCount > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-sm">Recent Prompts:</h4>
            <div className="space-y-1">
              {frameworkDetails.prompts.slice(0, 3).map((prompt) => (
                <div key={prompt.id} className="text-xs text-gray-400 p-2 bg-gray-800 rounded">
                  {prompt.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {templatesCount > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-sm">Recent Templates:</h4>
            <div className="space-y-1">
              {frameworkDetails.templates.slice(0, 3).map((template) => (
                <div key={template.id} className="text-xs text-gray-400 p-2 bg-gray-800 rounded">
                  {template.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="frameworks-tab space-y-4 p-3">
      <div className="panel-header flex items-center justify-between mb-4">
        <div className="panel-title text-lg font-semibold text-white">Frameworks</div>
        <input
          type="text"
          className="search-input bg-gray-800 text-white rounded px-2 py-1"
          placeholder="Search frameworks..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="frameworks-panel grid gap-3">
        {frameworks.map(fw => (
          <div
            key={fw.id}
            className={`panel-block framework-card flex items-center gap-3 cursor-pointer transition-colors
              ${selectedFramework === fw.id ? 'ring-2 ring-blue-500 border-blue-500 bg-gray-700' : ''}
              ${isWorkflowFramework(fw.id) ? 'workflow-framework' : ''}
            `}
            aria-selected={selectedFramework === fw.id}
            onClick={() => handleFrameworkSelect(fw)}
          >
            <span className="text-2xl mr-2">{getFrameworkIcon(fw.id)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-white text-base">{fw.name}</div>
                {isWorkflowFramework(fw.id) && (
                  <span className="workflow-badge">Workflow</span>
                )}
              </div>
              <span className="category-badge framework">Framework</span>
              <div className="text-xs text-gray-400">{fw.id}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Documentation Framework Modal */}
      <DocumentationFrameworkModal
        isOpen={isDocumentationModalOpen}
        onClose={() => setIsDocumentationModalOpen(false)}
        framework={{ id: 'documentation-framework', name: 'Documentation Framework' }}
      />
    </div>
  );
}

export default FrameworksPanelComponent; 