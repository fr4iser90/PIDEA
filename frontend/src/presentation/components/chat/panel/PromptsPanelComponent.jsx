import React, { useState, useEffect } from 'react';
import { apiCall } from '@infrastructure/repositories/APIChatRepository.jsx';

function PromptsPanelComponent({ onPromptClick, onQuickPrompt }) {
  const [prompts, setPrompts] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('generic'); // 'generic' or 'frameworks'
  const [selectedPrompt, setSelectedPrompt] = useState(null);

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

  return (
    <div className="content-library-panel space-y-4 p-3">
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
      <div className="prompts-panel grid gap-3">
        {prompts.map(prompt => (
          <div
            key={prompt.path}
            className={`prompt-item p-4 rounded-lg border shadow-sm cursor-pointer transition-all duration-200 bg-gray-800 hover:bg-gray-700 hover:shadow-md flex flex-col ${selectedPrompt === prompt.path ? 'ring-2 ring-blue-500 border-blue-500 bg-gray-700' : 'border-gray-700'}`}
            onClick={() => setSelectedPrompt(prompt.path)}
          >
            <div className="font-semibold text-white text-base mb-1">{prompt.name}</div>
            <div className="text-xs text-gray-400 mb-1">{prompt.category}</div>
            <div className="text-xs text-gray-500 font-mono">{prompt.path}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptsPanelComponent; 