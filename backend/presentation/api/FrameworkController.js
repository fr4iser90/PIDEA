const fs = require('fs').promises;
const path = require('path');

class FrameworkController {
  constructor() {
    this.frameworkPath = path.join(__dirname, '../../../framework');
  }

  async getFrameworkStructure(req, res) {
    try {
      const structurePath = path.join(this.frameworkPath, 'framework-structure.json');
      const structureData = await fs.readFile(structurePath, 'utf8');
      const structure = JSON.parse(structureData);
      
      res.json(structure);
    } catch (error) {
      console.error('Error loading framework structure:', error);
      res.status(500).json({ 
        error: 'Failed to load framework structure',
        message: error.message 
      });
    }
  }

  async getTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const templatePath = path.join(this.frameworkPath, 'templates', `${templateId}.md`);
      
      const templateContent = await fs.readFile(templatePath, 'utf8');
      res.json({ 
        id: templateId,
        content: templateContent,
        type: 'template'
      });
    } catch (error) {
      console.error('Error loading template:', error);
      res.status(404).json({ 
        error: 'Template not found',
        message: error.message 
      });
    }
  }

  async getPrompt(req, res) {
    try {
      const { promptId } = req.params;
      console.log('🔍 [FrameworkController] getPrompt called with promptId:', promptId);
      
      // Load framework structure to find the correct file path
      const structurePath = path.join(this.frameworkPath, 'framework-structure.json');
      const structureData = await fs.readFile(structurePath, 'utf8');
      const structure = JSON.parse(structureData);
      
      // Find the prompt in the framework structure
      const promptInfo = this.findPromptInStructure(structure.frameworkStructure, promptId);
      
      if (!promptInfo) {
        console.error('❌ [FrameworkController] Prompt not found in framework structure:', promptId);
        return res.status(404).json({ 
          error: 'Prompt not found',
          message: `Prompt '${promptId}' not found in framework structure`
        });
      }
      
      // Build the full path using the file path from structure
      const promptPath = path.join(this.frameworkPath, promptInfo.file);
      console.log('🔍 [FrameworkController] Resolved path:', promptPath);
      
      const promptContent = await fs.readFile(promptPath, 'utf8');
      console.log('✅ [FrameworkController] Successfully loaded prompt, length:', promptContent.length);
      
      res.json({ 
        id: promptId,
        content: promptContent,
        type: 'prompt',
        file: promptInfo.file
      });
    } catch (error) {
      console.error('❌ [FrameworkController] Error loading prompt:', error);
      res.status(404).json({ 
        error: 'Prompt not found',
        message: error.message 
      });
    }
  }

  findPromptInStructure(structure, promptId) {
    // Search through all categories and their items
    if (structure.categories) {
      for (const category of structure.categories) {
        if (category.items) {
          for (const item of category.items) {
            // Check if this item has sub-items (like task-management)
            if (item.items) {
              for (const subItem of item.items) {
                // Check both the direct ID and the combined ID (category-item)
                if ((subItem.id === promptId || `${item.id}-${subItem.id}` === promptId) && subItem.file) {
                  return subItem;
                }
              }
            } else {
              // Direct item (like code-only)
              if (item.id === promptId && item.file) {
                return item;
              }
            }
          }
        }
      }
    }
    return null;
  }

  async searchFrameworks(req, res) {
    try {
      const { query } = req.query;
      if (!query) {
        return res.json({ results: [] });
      }

      const structurePath = path.join(this.frameworkPath, 'framework-structure.json');
      const structureData = await fs.readFile(structurePath, 'utf8');
      const structure = JSON.parse(structureData);

      const results = this.searchInStructure(structure.frameworkStructure, query.toLowerCase());
      res.json({ results });
    } catch (error) {
      console.error('Error searching frameworks:', error);
      res.status(500).json({ 
        error: 'Failed to search frameworks',
        message: error.message 
      });
    }
  }

  searchInStructure(structure, query) {
    const results = [];

    const searchInItems = (items, path = '') => {
      if (!items) return;

      items.forEach(item => {
        const itemPath = path ? `${path} > ${item.name}` : item.name;
        
        // Search in name and description
        if (item.name.toLowerCase().includes(query) || 
            (item.description && item.description.toLowerCase().includes(query))) {
          results.push({
            id: item.id,
            name: item.name,
            description: item.description,
            path: itemPath,
            type: item.file ? (item.file.includes('templates/') ? 'template' : 'prompt') : 'category',
            file: item.file
          });
        }

        // Recursively search in sub-items
        if (item.items) {
          searchInItems(item.items, itemPath);
        }
      });
    };

    if (structure.categories) {
      structure.categories.forEach(category => {
        searchInItems(category.items, category.name);
      });
    }

    return results;
  }

  async getFrameworkStats(req, res) {
    try {
      const stats = {
        templates: await this.countFiles('templates'),
        prompts: await this.countFiles('prompts'),
        categories: await this.countCategories(),
        lastUpdated: new Date().toISOString()
      };

      res.json(stats);
    } catch (error) {
      console.error('Error getting framework stats:', error);
      res.status(500).json({ 
        error: 'Failed to get framework stats',
        message: error.message 
      });
    }
  }

  async countFiles(directory) {
    try {
      const dirPath = path.join(this.frameworkPath, directory);
      const files = await fs.readdir(dirPath, { recursive: true });
      return files.filter(file => file.endsWith('.md')).length;
    } catch (error) {
      return 0;
    }
  }

  async countCategories() {
    try {
      const structurePath = path.join(this.frameworkPath, 'framework-structure.json');
      const structureData = await fs.readFile(structurePath, 'utf8');
      const structure = JSON.parse(structureData);
      
      let count = 0;
      const countInStructure = (items) => {
        if (!items) return;
        count += items.length;
        items.forEach(item => {
          if (item.items) {
            countInStructure(item.items);
          }
        });
      };

      if (structure.frameworkStructure.categories) {
        countInStructure(structure.frameworkStructure.categories);
      }

      return count;
    } catch (error) {
      return 0;
    }
  }

  // Register routes
  registerRoutes(app) {
    app.get('/api/framework/structure', (req, res) => this.getFrameworkStructure(req, res));
    app.get('/api/framework/template/:templateId', (req, res) => this.getTemplate(req, res));
    app.get('/api/framework/prompt/:promptId', (req, res) => this.getPrompt(req, res));
    app.get('/api/framework/search', (req, res) => this.searchFrameworks(req, res));
    app.get('/api/framework/stats', (req, res) => this.getFrameworkStats(req, res));
  }
}

module.exports = FrameworkController; 