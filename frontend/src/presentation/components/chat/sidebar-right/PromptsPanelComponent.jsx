import React, { useState, useEffect } from 'react';
import { apiCall } from '@infrastructure/repositories/APIChatRepository.jsx';
import PromptDetailsModal from '../modal/PromptDetailsModal.jsx';
import '@css/panel/prompt-panel.css';

function PromptsPanelComponent({ onPromptClick, onQuickPrompt }) {
  const [prompts, setPrompts] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('generic'); // 'generic' or 'frameworks'
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    loadGenericPrompts();
    loadFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFramework && activeTab === 'frameworks') {
      loadFrameworkPrompts(selectedFramework);
    }
  }, [selectedFramework, activeTab]);

  const loadGenericPrompts = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/prompts');
      if (response.success) {
        setPrompts(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load generic prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFrameworks = async () => {
    try {
      const response = await apiCall('/api/frameworks');
      if (response.success) {
        setFrameworks(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load frameworks:', error);
    }
  };

  const loadFrameworkPrompts = async (frameworkId) => {
    try {
      setLoading(true);
      const url = selectedCategory !== 'all' 
        ? `/api/frameworks/${frameworkId}/prompts?category=${selectedCategory}`
        : `/api/frameworks/${frameworkId}/prompts`;
      
      const response = await apiCall(url);
      if (response.success) {
        setPrompts(response.data.prompts || []);
      }
    } catch (error) {
      console.error('Failed to load framework prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = async (prompt) => {
    try {
      const response = await apiCall(`/api/content/${prompt.file}`);
      if (response.success && onPromptClick) {
        onPromptClick({
          ...prompt,
          content: response.data.content
        });
      }
    } catch (error) {
      console.error('Failed to load prompt content:', error);
    }
  };

  const handleQuickPrompt = (promptText) => {
    if (onQuickPrompt) {
      onQuickPrompt(promptText);
    }
  };

  const filteredPrompts = prompts.filter(prompt => 
    prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(prompts.map(p => p.category).filter(Boolean))];

  // Group prompts by category
  const promptsByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredPrompts.filter(p => p.category === category);
    return acc;
  }, {});

  // Card click handler: load content and insert into chat input
  const handlePromptCardClick = async (prompt) => {
    try {
      const response = await apiCall(`/api/content/${prompt.file}`);
      if (response.success && onQuickPrompt) {
        onQuickPrompt(response.data.content);
      }
    } catch (error) {
      console.error('Failed to load prompt content:', error);
    }
  };

  // View button handler: show prompt content in modal
  const handleViewPrompt = async (prompt) => {
    try {
      const response = await apiCall(`/api/content/${prompt.file}`);
      if (response.success) {
        setModalTitle(prompt.name);
        setModalContent(response.data.content);
        setModalOpen(true);
      }
    } catch (error) {
      setModalTitle(prompt.name);
      setModalContent('Failed to load prompt content.');
      setModalOpen(true);
    }
  };

  return (
    <div className="prompts-tab space-y-4 p-3">
      <PromptDetailsModal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} content={modalContent} />
      <div className="panel-header flex items-center justify-between mb-4">
        <div className="panel-title text-lg font-semibold text-white">Prompts</div>
        <input
          type="text"
          className="search-input bg-gray-800 text-white rounded px-2 py-1"
          placeholder="Search prompts..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="prompts-panel space-y-6">
        {categories.map(category => (
          <div key={category} className="prompt-category-block">
            <div className="font-semibold text-base text-blue-400 mb-2 capitalize">{category}</div>
            <div className="grid gap-3">
              {promptsByCategory[category].map(prompt => (
                <div
                  key={prompt.path}
                  className={`panel-block prompt-card cursor-pointer transition-colors flex flex-col`}
                  aria-selected={false}
                  onClick={() => handlePromptCardClick(prompt)}
                >
                  <div className="prompt-card-header">
                    <h4 className="prompt-card-title">{prompt.name}</h4>
                    <button
                      className="prompt-card-view-btn"
                      onClick={e => { e.stopPropagation(); handleViewPrompt(prompt); }}
                      title="View prompt content"
                    >
                      <span role="img" aria-label="view">👁️</span>
                    </button>
                  </div>
                  {/* Optionally, add a description or tags here in the future */}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptsPanelComponent; 