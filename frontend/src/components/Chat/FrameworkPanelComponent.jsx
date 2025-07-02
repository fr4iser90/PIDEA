import React, { useEffect, useState } from 'react';

const FrameworkPanelComponent = ({ eventBus }) => {
  const [frameworkData, setFrameworkData] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  useEffect(() => {
    fetch('/api/framework/structure')
      .then(res => res.json())
      .then(data => setFrameworkData(data))
      .catch(() => setFrameworkData(null));
  }, []);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) newSet.delete(categoryId);
      else newSet.add(categoryId);
      return newSet;
    });
  };

  const expandAll = () => {
    if (!frameworkData) return;
    const all = new Set();
    frameworkData.frameworkStructure.categories.forEach(cat => {
      all.add(cat.id);
      if (cat.items) cat.items.forEach(item => all.add(item.id));
    });
    setExpandedCategories(all);
  };

  const collapseAll = () => setExpandedCategories(new Set());

  const filterItems = (searchTerm) => {
    // Placeholder for search logic
  };

  const renderItems = (items, level = 1) => {
    return items.map(item => {
      const isExpanded = expandedCategories.has(item.id);
      const hasChildren = item.items && item.items.length > 0;
      return (
        <li className="framework-item" data-item-id={item.id} data-level={level} key={item.id}>
          <div className={`framework-item-header${isExpanded ? ' expanded' : ''}`} data-item-id={item.id} onClick={() => hasChildren ? toggleCategory(item.id) : null}>
            <div className={`item-toggle${hasChildren ? ' has-children' : ' no-children'}`}>{hasChildren ? (isExpanded ? '▼' : '▶') : '•'}</div>
            <div className="item-icon">📄</div>
            <div className="item-content">
              <div className="item-name">{item.name}</div>
              <div className="item-description">{item.description}</div>
            </div>
            <div className="item-actions">
              <button className="btn-use-item" data-item-id={item.id} title="Use this template/prompt">▶</button>
            </div>
          </div>
          {hasChildren && (
            <ul className={`framework-subitems${isExpanded ? ' expanded' : ' collapsed'}`} data-item-id={item.id}>
              {renderItems(item.items, level + 1)}
            </ul>
          )}
        </li>
      );
    });
  };

  const renderCategories = (categories, level = 0) => {
    return categories.map(category => {
      const isExpanded = expandedCategories.has(category.id);
      const hasChildren = category.items && category.items.length > 0;
      return (
        <li className="framework-category" data-category-id={category.id} data-level={level} key={category.id}>
          <div className={`framework-category-header${isExpanded ? ' expanded' : ''}`} data-category-id={category.id} onClick={() => hasChildren ? toggleCategory(category.id) : null}>
            <div className={`category-toggle${hasChildren ? ' has-children' : ' no-children'}`}>{hasChildren ? (isExpanded ? '▼' : '▶') : '•'}</div>
            <div className="category-icon">📁</div>
            <div className="category-content">
              <div className="category-name">{category.name}</div>
              <div className="category-description">{category.description}</div>
            </div>
          </div>
          {hasChildren && (
            <ul className={`framework-subcategories${isExpanded ? ' expanded' : ' collapsed'}`} data-category-id={category.id}>
              {renderItems(category.items, level + 1)}
            </ul>
          )}
        </li>
      );
    });
  };

  if (!frameworkData) return null;

  return (
    <div className="framework-panel">
      <div className="framework-panel-header">
        <div className="framework-header-content">
          <h3>{frameworkData.frameworkStructure.name}</h3>
          <p className="framework-description">{frameworkData.frameworkStructure.description}</p>
        </div>
        <div className="framework-header-actions">
          <button id="expandAllBtn" className="btn-expand-all" title="Expand All" onClick={expandAll}><span>📂</span></button>
          <button id="collapseAllBtn" className="btn-collapse-all" title="Collapse All" onClick={collapseAll}><span>📁</span></button>
        </div>
      </div>
      <div className="framework-search">
        <input type="text" id="frameworkSearch" placeholder="Search frameworks..." className="search-input" onChange={e => filterItems(e.target.value)} />
        <div className="search-icon">🔍</div>
      </div>
      <div className="framework-tree-container">
        <ul className="framework-tree" id="frameworkTree">
          {renderCategories(frameworkData.frameworkStructure.categories)}
        </ul>
      </div>
      <div className="framework-footer">
        <button id="addFrameworkBtn" className="btn-add-framework"><span>+</span><span>Add Custom</span></button>
      </div>
    </div>
  );
};

export default FrameworkPanelComponent; 