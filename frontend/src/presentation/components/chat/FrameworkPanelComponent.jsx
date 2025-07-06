// FrameworkPanelComponent.js
// Hierarchical framework panel with templates and prompts

import React, { useState, useEffect } from 'react';
import '@css/panel/framework-panel.css';
import { apiCall } from '@infrastructure/repositories/APIChatRepository.jsx';

// No fallback structure - always load from API

function FrameworkPanelComponent({ onFrameworkClick, onToggle }) {
  const [frameworkData, setFrameworkData] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set(['templates', 'prompts']));
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadFrameworkStructure() {
      try {
        console.log('🔍 [FrameworkPanelComponent] Loading framework structure...');
        const data = await apiCall('/api/framework/structure');
        console.log('✅ [FrameworkPanelComponent] Framework structure loaded:', data);
        
        if (data && data.frameworkStructure) {
          setFrameworkData(data.frameworkStructure);
        } else {
          throw new Error('Invalid framework structure data');
        }
      } catch (error) {
        console.error('❌ [FrameworkPanelComponent] Failed to load framework structure:', error);
        setFrameworkData(null);
      }
    }
    loadFrameworkStructure();
  }, []);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };
  const toggleItem = (itemId) => toggleCategory(itemId);
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      if (onToggle) {
        const item = findItem(itemId, frameworkData?.categories);
        onToggle({ id: itemId, name: item?.name, file: item?.file, active: next.has(itemId) });
      }
      return next;
    });
  };
  const useItem = (itemId) => {
    const item = findItem(itemId, frameworkData?.categories);
    if (item && onFrameworkClick) onFrameworkClick(item);
  };
  const expandAll = () => {
    const all = new Set();
    frameworkData?.categories?.forEach(cat => {
      all.add(cat.id);
      cat.items?.forEach(item => {
        all.add(item.id);
        item.items?.forEach(sub => all.add(sub.id));
      });
    });
    setExpandedCategories(all);
  };
  const collapseAll = () => setExpandedCategories(new Set());
  const addCustomFramework = () => {
    const fname = prompt('Framework-Dateiname (.md):');
    if (fname && fname.endsWith('.md')) {
      setSelectedItems(prev => new Set(prev).add(fname));
      if (onToggle) onToggle({ name: fname, active: true });
    }
  };
  const filterItems = (str) => setSearchTerm(str);

  function findItem(itemId, cats) {
    for (const cat of cats || []) {
      for (const item of cat.items || []) {
        if (item.id === itemId) return item;
        if (item.items) {
          for (const sub of item.items) {
            if (sub.id === itemId) return sub;
          }
        }
      }
    }
    return null;
  }

  function matchesSearch(name, desc) {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (name?.toLowerCase().includes(s) || desc?.toLowerCase().includes(s));
  }

  function renderCategories(categories, level = 0) {
    return categories.filter(cat => matchesSearch(cat.name, cat.description)).map(category => {
      const isExpanded = expandedCategories.has(category.id);
      const hasChildren = category.items && category.items.length > 0;
      return (
        <li className="framework-category" data-category-id={category.id} data-level={level} key={category.id}>
          <div className={`framework-category-header${isExpanded ? ' expanded' : ''}`} data-category-id={category.id} onClick={() => toggleCategory(category.id)}>
            <div className={`category-toggle ${hasChildren ? 'has-children' : 'no-children'}`}>{hasChildren ? (isExpanded ? '▼' : '▶') : '•'}</div>
            <div className="category-icon">{category.icon || '📁'}</div>
            <div className="category-content">
              <div className="category-name">{category.name}</div>
              <div className="category-description">{category.description}</div>
            </div>
          </div>
          {hasChildren && isExpanded && (
            <ul className="framework-subcategories expanded" data-category-id={category.id}>
              {renderSubcategories(category.items, level + 1)}
            </ul>
          )}
        </li>
      );
    });
  }
  function renderSubcategories(items, level = 1) {
    return items.filter(item => matchesSearch(item.name, item.description)).map(item => {
      const isExpanded = expandedCategories.has(item.id);
      const hasChildren = item.items && item.items.length > 0;
      const isTemplate = item.file && item.file.includes('templates/');
      const isPrompt = item.file && item.file.includes('prompts/');
      const isSelected = selectedItems.has(item.id);
      return (
        <li className="framework-item" data-item-id={item.id} data-level={level} key={item.id}>
          <div className={`framework-item-header${isExpanded ? ' expanded' : ''}${isSelected ? ' selected' : ''}`} data-item-id={item.id} onClick={() => hasChildren ? toggleItem(item.id) : toggleItemSelection(item.id)}>
            <div className={`item-toggle ${hasChildren ? 'has-children' : 'no-children'}`}>{hasChildren ? (isExpanded ? '▼' : '▶') : '•'}</div>
            <div className="item-icon">{isTemplate ? '📋' : isPrompt ? '💡' : '📄'}</div>
            <div className="item-content">
              <div className="item-name">{item.name}</div>
              <div className="item-description">{item.description}</div>
            </div>
            <div className="item-actions">
              <button className="btn-use-item" data-item-id={item.id} title="Use this template/prompt" onClick={e => { e.stopPropagation(); useItem(item.id); }}><span>▶</span></button>
            </div>
          </div>
          {hasChildren && isExpanded && (
            <ul className="framework-subitems expanded" data-item-id={item.id}>
              {renderSubcategories(item.items, level + 1)}
            </ul>
          )}
        </li>
      );
    });
  }

  if (!frameworkData) return <div className="framework-panel error">❌ Fehler beim Laden der Framework-Struktur! Bitte prüfe die Konsole für Details.</div>;
  return (
    <div className="framework-panel">
      <div className="framework-panel-header">
        <div className="framework-header-content">
          <h3>{frameworkData.name}</h3>
          <p className="framework-description">{frameworkData.description}</p>
        </div>
        <div className="framework-header-actions">
          <button id="expandAllBtn" className="btn-expand-all" title="Expand All" onClick={expandAll}><span>📂</span></button>
          <button id="collapseAllBtn" className="btn-collapse-all" title="Collapse All" onClick={collapseAll}><span>📁</span></button>
        </div>
      </div>
      <div className="framework-search">
        <input type="text" id="frameworkSearch" placeholder="Search frameworks..." className="search-input" value={searchTerm} onChange={e => filterItems(e.target.value)} />
        <div className="search-icon">🔍</div>
      </div>
      <div className="framework-tree-container">
        <ul className="framework-tree" id="frameworkTree">
          {renderCategories(frameworkData.categories)}
        </ul>
      </div>
      <div className="framework-footer">
        <button id="addFrameworkBtn" className="btn-add-framework" onClick={addCustomFramework}><span>+</span><span>Add Custom</span></button>
      </div>
    </div>
  );
}

export default FrameworkPanelComponent; 