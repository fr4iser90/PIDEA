import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

function TemplatesPanelComponent({ onTemplateClick, onTemplateUse }) {
  const [templates, setTemplates] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('generic'); // 'generic' or 'frameworks'
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadGenericTemplates();
    loadFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFramework && activeTab === 'frameworks') {
      loadFrameworkTemplates(selectedFramework);
    }
  }, [selectedFramework, activeTab]);

  const loadGenericTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/templates');
      if (response.success) {
        setTemplates(response.data || []);
      }
    } catch (error) {
      logger.error('Failed to load generic templates:', error);
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
      logger.error('Failed to load frameworks:', error);
    }
  };

  const loadFrameworkTemplates = async (frameworkId) => {
    try {
      setLoading(true);
      const url = selectedCategory !== 'all' 
        ? `/api/frameworks/${frameworkId}/templates?category=${selectedCategory}`
        : `/api/frameworks/${frameworkId}/templates`;
      
      const response = await apiCall(url);
      if (response.success) {
        setTemplates(response.data.templates || []);
      }
    } catch (error) {
      logger.error('Failed to load framework templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = async (template) => {
    try {
      const response = await apiCall(`/api/content/${template.file}`);
      if (response.success && onTemplateClick) {
        onTemplateClick({
          ...template,
          content: response.data.content
        });
      }
    } catch (error) {
      logger.error('Failed to load template content:', error);
    }
  };

  const handleTemplateUse = async (template) => {
    try {
      const response = await apiCall(`/api/content/${template.file}`);
      if (response.success && onTemplateUse) {
        onTemplateUse({
          ...template,
          content: response.data.content
        });
      }
    } catch (error) {
      logger.error('Failed to load template content:', error);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];

  return (
    <div className="templates-tab space-y-4 p-3">
      <div className="panel-header flex items-center justify-between mb-4">
        <div className="panel-title text-lg font-semibold text-white">Templates</div>
        <input
          type="text"
          className="search-input bg-gray-800 text-white rounded px-2 py-1"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="templates-panel grid gap-3">
        {templates.map(template => (
          <div
            key={template.path}
            className={`panel-block template-card cursor-pointer transition-colors flex flex-col
              ${selectedTemplate === template.path ? 'ring-2 ring-blue-500 border-blue-500 bg-gray-700' : ''}
            `}
            aria-selected={selectedTemplate === template.path}
            onClick={() => setSelectedTemplate(template.path)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-white text-base mb-1">{template.name}</div>
              <span className="category-badge template">Template</span>
            </div>
            <div className="text-xs text-gray-400 mb-1">{template.category}</div>
            <div className="text-xs text-gray-500 font-mono">{template.path}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TemplatesPanelComponent; 