// FrameworkPanelComponent.js
// Hierarchical framework panel with templates and prompts

import React, { useState, useEffect } from 'react';
import '@css/panel/framework-panel.css';

const FALLBACK_STRUCTURE = {
          name: "AI Framework",
          description: "Comprehensive AI prompt and template framework",
          categories: [
            {
              id: "templates",
              name: "📋 Templates",
              description: "Form-based templates for specific use cases",
              icon: "📋",
              items: [
                {
                  id: "education",
                  name: "🎓 Education",
                  description: "School and teaching templates",
                  items: [
                    {
                      id: "assignment-generator",
                      name: "Assignment Generator",
                      description: "Create comprehensive assignments with learning objectives",
                      file: "templates/school/assignment-generator.md"
                    },
                    {
                      id: "lesson-planner",
                      name: "Lesson Planner",
                      description: "Design detailed lesson plans with activities",
                      file: "templates/school/lesson-planner.md"
                    },
                    {
                      id: "quiz-generator",
                      name: "Quiz Generator",
                      description: "Generate quizzes with various question types",
                      file: "templates/school/quiz-generator.md"
                    }
                  ]
                },
                {
                  id: "healthcare",
                  name: "🏥 Healthcare",
                  description: "Nursing and medical templates",
                  items: [
                    {
                      id: "patient-assessment",
                      name: "Patient Assessment",
                      description: "Comprehensive patient assessment with vital signs",
                      file: "templates/nursing/patient-assessment.md"
                    },
                    {
                      id: "medication-management",
                      name: "Medication Management",
                      description: "Medication protocols with drug interactions",
                      file: "templates/nursing/medication-management.md"
                    },
                    {
                      id: "care-plan-generator",
                      name: "Care Plan Generator",
                      description: "Nursing care plans with interventions",
                      file: "templates/nursing/care-plan-generator.md"
                    }
                  ]
                },
                {
                  id: "gamedev",
                  name: "🎮 Game Development",
                  description: "Game design and development templates",
                  items: [
                    {
                      id: "mechanics-designer",
                      name: "Mechanics Designer",
                      description: "Game mechanics design with balance",
                      file: "templates/game/mechanics-designer.md"
                    },
                    {
                      id: "level-designer",
                      name: "Level Designer",
                      description: "Level design with gameplay elements",
                      file: "templates/game/level-designer.md"
                    }
                  ]
                },
                {
                  id: "webdev",
                  name: "🌐 Web Development",
                  description: "Web development and API templates",
                  items: [
                    {
                      id: "component-generator",
                      name: "Component Generator",
                      description: "React/Vue component generation",
                      file: "templates/web/component-generator.md"
                    },
                    {
                      id: "api-endpoint-generator",
                      name: "API Endpoint Generator",
                      description: "REST API endpoint design",
                      file: "templates/web/api-endpoint-generator.md"
                    }
                  ]
                }
              ]
            },
            {
              id: "prompts",
              name: "💡 Prompts",
              description: "Specialized prompt collections by domain",
              icon: "💡",
              items: [
                {
                  id: "general",
                  name: "🔧 General",
                  description: "General development prompts",
                  items: [
                    {
                      id: "code-style",
                      name: "Code Style",
                      description: "Code style and formatting guidelines",
                      file: "prompts/general/code-style.md"
                    },
                    {
                      id: "accessibility",
                      name: "Accessibility",
                      description: "Web accessibility guidelines",
                      file: "prompts/general/accessibility.md"
                    },
                    {
                      id: "code-review",
                      name: "Code Review",
                      description: "Code review best practices",
                      file: "prompts/general/code-review.md"
                    },
                    {
                      id: "test-generator",
                      name: "Test Generator",
                      description: "Automated test generation",
                      file: "prompts/general/test-generator.md"
                    }
                  ]
                },
                {
                  id: "domains",
                  name: "🎯 Domains",
                  description: "Domain-specific prompts",
                  items: [
                    {
                      id: "web-apps",
                      name: "Web Applications",
                      description: "Web app development prompts",
                      file: "prompts/domains/web-apps/"
                    },
                    {
                      id: "mobile-apps",
                      name: "Mobile Applications",
                      description: "Mobile app development prompts",
                      file: "prompts/domains/android-apps/"
                    },
                    {
                      id: "extensions",
                      name: "Extensions",
                      description: "Browser and IDE extensions",
                      file: "prompts/domains/extensions/"
                    }
                  ]
                },
                {
                  id: "patterns",
                  name: "🏗️ Patterns",
                  description: "Design and architectural patterns",
                  items: [
                    {
                      id: "architectural",
                      name: "Architectural Patterns",
                      description: "MVC, DDD, and other architectural patterns",
                      file: "prompts/patterns/architectural/"
                    },
                    {
                      id: "design",
                      name: "Design Patterns",
                      description: "Singleton, Observer, Factory patterns",
                      file: "prompts/patterns/design/"
                    }
                  ]
                },
                {
                  id: "techstacks",
                  name: "⚙️ Tech Stacks",
                  description: "Technology stack guides",
                  items: [
                    {
                      id: "web-stacks",
                      name: "Web Stacks",
                      description: "React, Vue, and web frameworks",
                      file: "prompts/techstacks/web/"
                    },
                    {
                      id: "mobile-stacks",
                      name: "Mobile Stacks",
                      description: "Android and iOS development",
                      file: "prompts/techstacks/mobile/"
                    }
                  ]
                },
                {
                  id: "devops",
                  name: "🚀 DevOps",
                  description: "DevOps and deployment prompts",
                  items: [
                    {
                      id: "ci-cd",
                      name: "CI/CD",
                      description: "Continuous integration and deployment",
                      file: "prompts/devops/ci-cd/"
                    },
                    {
                      id: "deployment",
                      name: "Deployment",
                      description: "Docker, cloud deployment",
                      file: "prompts/devops/deployment/"
                    }
                  ]
                },
                {
                  id: "security",
                  name: "🔒 Security",
                  description: "Security and authentication",
                  items: [
                    {
                      id: "authentication",
                      name: "Authentication",
                      description: "JWT, OAuth, and auth systems",
                      file: "prompts/security/authentication/"
                    }
                  ]
                },
                {
                  id: "database",
                  name: "🗄️ Database",
                  description: "Database design and optimization",
                  items: [
                    {
                      id: "sql",
                      name: "SQL",
                      description: "PostgreSQL, MySQL, and SQL databases",
                      file: "prompts/database/sql/"
                    }
                  ]
                },
                {
                  id: "testing",
                  name: "🧪 Testing",
                  description: "Testing strategies and frameworks",
                  items: [
                    {
                      id: "unit-testing",
                      name: "Unit Testing",
                      description: "Jest, testing libraries",
                      file: "prompts/testing/unit-testing/"
                    }
                  ]
                },
                {
                  id: "performance",
                  name: "⚡ Performance",
                  description: "Performance optimization",
                  items: [
                    {
                      id: "optimization",
                      name: "Optimization",
                      description: "Caching, optimization strategies",
                      file: "prompts/performance/optimization/"
                    }
                  ]
                },
                {
                  id: "ai-ml",
                  name: "🤖 AI/ML",
                  description: "Artificial intelligence and machine learning",
                  items: [
                    {
                      id: "integration",
                      name: "Integration",
                      description: "LLM integration and AI tools",
                      file: "prompts/ai-ml/integration/"
                    }
                  ]
                }
              ]
            }
          ]
};

function FrameworkPanelComponent({ onFrameworkClick, onToggle }) {
  const [frameworkData, setFrameworkData] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set(['templates', 'prompts']));
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadFrameworkStructure() {
      try {
        const response = await fetch('/api/framework/structure');
        const data = await response.json();
        setFrameworkData(data.frameworkStructure);
      } catch (error) {
        setFrameworkData(FALLBACK_STRUCTURE);
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

  if (!frameworkData) return <div className="framework-panel loading">Loading...</div>;
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