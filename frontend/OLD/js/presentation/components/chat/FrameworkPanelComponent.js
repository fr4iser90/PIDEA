// FrameworkPanelComponent.js
// Hierarchical framework panel with templates and prompts

export default class FrameworkPanelComponent {
  constructor(containerId, onFrameworkClick, onToggle, frameworks) {
    this.container = document.getElementById(containerId);
    this.onFrameworkClick = onFrameworkClick;
    this.onToggle = onToggle;
    this.frameworkData = null;
    this.selectedItems = new Set();
    this.expandedCategories = new Set(['templates', 'prompts']);
    this.init();
  }

  async init() {
    await this.loadFrameworkStructure();
    this.render();
    this.bindEvents();
  }

  async loadFrameworkStructure() {
    try {
      const response = await fetch('/api/framework/structure');
      this.frameworkData = await response.json();
    } catch (error) {
      // Fallback to static structure if API not available
      this.frameworkData = {
        frameworkStructure: {
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
        }
      };
    }
  }

  render() {
    if (!this.frameworkData) return;

    this.container.innerHTML = `
      <div class="framework-panel">
        <div class="framework-panel-header">
          <div class="framework-header-content">
            <h3>${this.frameworkData.frameworkStructure.name}</h3>
            <p class="framework-description">${this.frameworkData.frameworkStructure.description}</p>
          </div>
          <div class="framework-header-actions">
            <button id="expandAllBtn" class="btn-expand-all" title="Expand All">
              <span>📂</span>
            </button>
            <button id="collapseAllBtn" class="btn-collapse-all" title="Collapse All">
              <span>📁</span>
            </button>
          </div>
        </div>
        
        <div class="framework-search">
          <input type="text" id="frameworkSearch" placeholder="Search frameworks..." class="search-input">
          <div class="search-icon">🔍</div>
        </div>
        
        <div class="framework-tree-container">
          <ul class="framework-tree" id="frameworkTree">
            ${this.renderCategories(this.frameworkData.frameworkStructure.categories)}
          </ul>
        </div>
        
        <div class="framework-footer">
          <button id="addFrameworkBtn" class="btn-add-framework">
            <span>+</span>
            <span>Add Custom</span>
          </button>
        </div>
      </div>
    `;
  }

  renderCategories(categories, level = 0) {
    return categories.map(category => {
      const isExpanded = this.expandedCategories.has(category.id);
      const hasChildren = category.items && category.items.length > 0;
      
      return `
        <li class="framework-category" data-category-id="${category.id}" data-level="${level}">
          <div class="framework-category-header ${isExpanded ? 'expanded' : ''}" data-category-id="${category.id}">
            <div class="category-toggle ${hasChildren ? 'has-children' : 'no-children'}">
              ${hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
            </div>
            <div class="category-icon">${category.icon || '📁'}</div>
            <div class="category-content">
              <div class="category-name">${category.name}</div>
              <div class="category-description">${category.description}</div>
            </div>
          </div>
          
          ${hasChildren ? `
            <ul class="framework-subcategories ${isExpanded ? 'expanded' : 'collapsed'}" data-category-id="${category.id}">
              ${this.renderSubcategories(category.items, level + 1)}
            </ul>
          ` : ''}
        </li>
      `;
    }).join('');
  }

  renderSubcategories(items, level = 1) {
    return items.map(item => {
      const isExpanded = this.expandedCategories.has(item.id);
      const hasChildren = item.items && item.items.length > 0;
      const isTemplate = item.file && item.file.includes('templates/');
      const isPrompt = item.file && item.file.includes('prompts/');
      const isSelected = this.selectedItems.has(item.id);
      
      return `
        <li class="framework-item" data-item-id="${item.id}" data-level="${level}">
          <div class="framework-item-header${isExpanded ? ' expanded' : ''}${isSelected ? ' selected' : ''}" data-item-id="${item.id}">
            <div class="item-toggle ${hasChildren ? 'has-children' : 'no-children'}">
              ${hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
            </div>
            <div class="item-icon">
              ${isTemplate ? '📋' : isPrompt ? '💡' : '📄'}
            </div>
            <div class="item-content">
              <div class="item-name">${item.name}</div>
              <div class="item-description">${item.description}</div>
            </div>
            <div class="item-actions">
              <button class="btn-use-item" data-item-id="${item.id}" title="Use this template/prompt">
                <span>▶</span>
              </button>
            </div>
          </div>
          
          ${hasChildren ? `
            <ul class="framework-subitems ${isExpanded ? 'expanded' : 'collapsed'}" data-item-id="${item.id}">
              ${this.renderSubcategories(item.items, level + 1)}
            </ul>
          ` : ''}
        </li>
      `;
    }).join('');
  }

  bindEvents() {
    // Category toggle events
    this.container.addEventListener('click', (e) => {
      const categoryHeader = e.target.closest('.framework-category-header');
      const itemHeader = e.target.closest('.framework-item-header');
      const useButton = e.target.closest('.btn-use-item');
      const expandAllBtn = e.target.closest('#expandAllBtn');
      const collapseAllBtn = e.target.closest('#collapseAllBtn');
      const addFrameworkBtn = e.target.closest('#addFrameworkBtn');

      if (categoryHeader) {
        this.toggleCategory(categoryHeader.dataset.categoryId);
      } else if (itemHeader) {
        const itemId = itemHeader.dataset.itemId;
        const item = this.findItem(itemId);
        if (item && item.file) {
          this.toggleItemSelection(itemId);
        } else if (item && item.items) {
          this.toggleItem(itemId);
        }
      } else if (useButton) {
        this.useItem(useButton.dataset.itemId);
      } else if (expandAllBtn) {
        this.expandAll();
      } else if (collapseAllBtn) {
        this.collapseAll();
      } else if (addFrameworkBtn) {
        this.addCustomFramework();
      }
    });

    // Search functionality
    const searchInput = this.container.querySelector('#frameworkSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterItems(e.target.value);
      });
    }
  }

  toggleCategory(categoryId) {
    const category = this.findCategory(categoryId);
    if (!category || !category.items) return;

    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }

    this.render();
  }

  toggleItem(itemId) {
    const item = this.findItem(itemId);
    if (!item || !item.items) return;

    if (this.expandedCategories.has(itemId)) {
      this.expandedCategories.delete(itemId);
    } else {
      this.expandedCategories.add(itemId);
    }

    this.render();
  }

  toggleItemSelection(itemId) {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
      console.log('[FrameworkPanel] Deaktiviert:', itemId);
    } else {
      this.selectedItems.add(itemId);
      console.log('[FrameworkPanel] Aktiviert:', itemId);
    }

    // Notify parent about selection change
    if (this.onToggle) {
      const item = this.findItem(itemId);
      if (item) {
        this.onToggle({ id: itemId, name: item.name, file: item.file, active: this.selectedItems.has(itemId) });
      }
    }

    this.render();
  }

  useItem(itemId) {
    const item = this.findItem(itemId);
    if (!item) return;

    // Notify parent about item usage
    if (this.onFrameworkClick) {
      this.onFrameworkClick(item);
    }
  }

  expandAll() {
    this.expandedCategories.clear();
    this.frameworkData.frameworkStructure.categories.forEach(category => {
      this.expandedCategories.add(category.id);
      if (category.items) {
        category.items.forEach(item => {
          this.expandedCategories.add(item.id);
          if (item.items) {
            item.items.forEach(subItem => {
              this.expandedCategories.add(subItem.id);
            });
          }
        });
      }
    });
    this.render();
  }

  collapseAll() {
    this.expandedCategories.clear();
    this.render();
  }

  filterItems(searchTerm) {
    const items = this.container.querySelectorAll('.framework-item, .framework-category');
    const searchLower = searchTerm.toLowerCase();

    items.forEach(item => {
      const name = item.querySelector('.item-name, .category-name')?.textContent || '';
      const description = item.querySelector('.item-description, .category-description')?.textContent || '';
      const matches = name.toLowerCase().includes(searchLower) || 
                     description.toLowerCase().includes(searchLower);
      
      item.style.display = matches ? 'block' : 'none';
    });
  }

  addCustomFramework() {
    const fname = prompt('Framework-Dateiname (.md):');
    if (fname && fname.endsWith('.md')) {
      // Add to selected items for backward compatibility
      this.selectedItems.add(fname);
      if (this.onToggle) {
        this.onToggle({ name: fname, active: true });
      }
    }
  }

  findCategory(categoryId) {
    return this.frameworkData.frameworkStructure.categories.find(cat => cat.id === categoryId);
  }

  findItem(itemId) {
    for (const category of this.frameworkData.frameworkStructure.categories) {
      if (category.items) {
        for (const item of category.items) {
          if (item.id === itemId) return item;
          if (item.items) {
            for (const subItem of item.items) {
              if (subItem.id === itemId) return subItem;
            }
          }
        }
      }
    }
    return null;
  }

  getActiveFrameworks() {
    // Convert selected items to the format expected by the old system
    return Array.from(this.selectedItems).map(itemId => {
      const item = this.findItem(itemId);
      return {
        name: item ? item.file : itemId,
        active: true
      };
    });
  }
} 