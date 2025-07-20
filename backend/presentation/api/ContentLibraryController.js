const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('ContentLibraryController');


class ContentLibraryController {
  constructor(dependencies = {}) {
    this.contentLibraryApplicationService = dependencies.contentLibraryApplicationService;
    if (!this.contentLibraryApplicationService) {
      throw new Error('ContentLibraryController requires contentLibraryApplicationService dependency');
    }
  }

  // ===== FRAMEWORK-ENDPUNKTE =====

  // GET /api/frameworks - Liste aller Frameworks
  async getFrameworks(req, res) {
    try {
      const { techstack } = req.query;
      const userId = req.user?.id;
      
      const result = await this.contentLibraryApplicationService.getFrameworks(techstack, userId);
      
      res.json({
        success: result.success,
        data: result.data
      });

      // Filter nach Techstack falls angegeben
      if (techstack) {
        frameworkList = frameworkList.filter(fw => 
          fw.id.toLowerCase().includes(techstack.toLowerCase())
        );
      }
      
      res.json({
        success: true,
        data: frameworkList
      });
    } catch (error) {
      logger.error('Error loading frameworks:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load frameworks',
        message: error.message 
      });
    }
  }

  // GET /api/frameworks/:frameworkId/prompts - Framework-spezifische Prompts
  async getFrameworkPrompts(req, res) {
    try {
      const { frameworkId } = req.params;
      const { category } = req.query;
      const frameworkPath = path.join(this.contentLibraryPath, 'frameworks', frameworkId, 'prompts');
      
      const prompts = await this.scanDirectoryForPrompts(frameworkPath);
      
      // Filter nach Kategorie falls angegeben
      let filteredPrompts = prompts;
      if (category) {
        filteredPrompts = prompts.filter(p => 
          p.category.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      res.json({
        success: true,
        data: {
          frameworkId,
          prompts: filteredPrompts
        }
      });
    } catch (error) {
      logger.error('Error loading framework prompts:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load framework prompts',
        message: error.message 
      });
    }
  }

  // GET /api/frameworks/:frameworkId/templates - Framework-spezifische Templates
  async getFrameworkTemplates(req, res) {
    try {
      const { frameworkId } = req.params;
      const { category } = req.query;
      const templatesPath = path.join(this.contentLibraryPath, 'frameworks', frameworkId, 'templates');
      
      const templates = await this.scanDirectoryForTemplates(templatesPath);
      
      // Filter nach Kategorie falls angegeben
      let filteredTemplates = templates;
      if (category) {
        filteredTemplates = templates.filter(t => 
          t.category.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      res.json({
        success: true,
        data: {
          frameworkId,
          templates: filteredTemplates
        }
      });
    } catch (error) {
      logger.error('Error loading framework templates:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load framework templates',
        message: error.message 
      });
    }
  }

  // ===== GENERISCHE PROMPT-ENDPUNKTE =====

  // GET /api/prompts - Alle generischen Prompts
  async getPrompts(req, res) {
    try {
      const { category } = req.query;
      const promptsPath = path.join(this.contentLibraryPath, 'prompts');
      const prompts = await this.scanDirectoryForPrompts(promptsPath);
      
      // Filter nach Kategorie falls angegeben
      let filteredPrompts = prompts;
      if (category) {
        filteredPrompts = prompts.filter(p => 
          p.category.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      res.json({
        success: true,
        data: filteredPrompts
      });
    } catch (error) {
      logger.error('Error loading prompts:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load prompts',
        message: error.message 
      });
    }
  }

  // GET /api/prompts/:category - Prompts einer bestimmten Kategorie
  async getPromptsByCategory(req, res) {
    try {
      const { category } = req.params;
      const promptsPath = path.join(this.contentLibraryPath, 'prompts', category);
      
      const prompts = await this.scanDirectoryForPrompts(promptsPath);
      
      res.json({
        success: true,
        data: {
          category,
          prompts
        }
      });
    } catch (error) {
      logger.error('Error loading prompts by category:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load prompts by category',
        message: error.message 
      });
    }
  }

  // GET /api/prompts/:category/:filename - Einzelne Prompt-Datei (mit Kategorie)
  async getPromptFile(req, res) {
    try {
      const { category, filename } = req.params;
      const filePath = path.join(this.contentLibraryPath, 'prompts', category, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ success: true, category, filename, content });
    } catch (error) {
      res.status(404).json({ success: false, error: 'Prompt file not found', message: error.message });
    }
  }

  // GET /api/prompts/:category/:subcategory/:filename - Einzelne Prompt-Datei (mit Subkategorie)
  async getPromptFileWithSubcategory(req, res) {
    try {
      const { category, subcategory, filename } = req.params;
      const filePath = path.join(this.contentLibraryPath, 'prompts', category, subcategory, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ success: true, category, subcategory, filename, content });
    } catch (error) {
      res.status(404).json({ success: false, error: 'Prompt file not found', message: error.message });
    }
  }

  // ===== TEMPLATE-ENDPUNKTE =====

  // GET /api/templates - Alle generischen Templates
  async getTemplates(req, res) {
    try {
      const { category } = req.query;
      const templatesPath = path.join(this.contentLibraryPath, 'templates');
      const templates = await this.scanDirectoryForTemplates(templatesPath);
      
      // Filter nach Kategorie falls angegeben
      let filteredTemplates = templates;
      if (category) {
        filteredTemplates = templates.filter(t => 
          t.category.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      res.json({
        success: true,
        data: filteredTemplates
      });
    } catch (error) {
      logger.error('Error loading templates:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load templates',
        message: error.message 
      });
    }
  }

  // GET /api/templates/:category - Templates einer bestimmten Kategorie
  async getTemplatesByCategory(req, res) {
    try {
      const { category } = req.params;
      const templatesPath = path.join(this.contentLibraryPath, 'templates', category);
      
      const templates = await this.scanDirectoryForTemplates(templatesPath);
      
      res.json({
        success: true,
        data: {
          category,
          templates
        }
      });
    } catch (error) {
      logger.error('Error loading templates by category:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load templates by category',
        message: error.message 
      });
    }
  }

  // GET /api/templates/:category/:filename - Einzelne Template-Datei
  async getTemplateFile(req, res) {
    try {
      const { category, filename } = req.params;
      const filePath = path.join(this.contentLibraryPath, 'templates', category, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ success: true, category, filename, content });
    } catch (error) {
      res.status(404).json({ success: false, error: 'Template file not found', message: error.message });
    }
  }

  // ===== DATEI-LADEN-ENDPUNKTE =====

  // GET /api/content/* - Lade eine spezifische Datei
  async getFile(req, res) {
    try {
      const filePath = req.params[0]; // Express wildcard parameter
      const fullPath = path.join(this.contentLibraryPath, filePath);
      
      // Sicherheitscheck: Verhindere Directory Traversal
      const normalizedPath = path.normalize(fullPath);
      if (!normalizedPath.startsWith(this.contentLibraryPath)) {
        return res.status(403).json({ 
          success: false,
          error: 'Access denied' 
        });
      }
      
      const content = await fs.readFile(fullPath, 'utf8');
      const relativePath = path.relative(this.contentLibraryPath, fullPath);
      
      res.json({
        success: true,
        data: {
          id: path.basename(filePath, '.md'),
          name: path.basename(filePath, '.md').replace(/([A-Z])/g, ' $1').trim(),
          content: content,
          file: relativePath,
          type: relativePath.includes('templates/') ? 'template' : 'prompt'
        }
      });
    } catch (error) {
      logger.error('Error loading file:', error);
      res.status(404).json({ 
        success: false,
        error: 'File not found',
        message: error.message 
      });
    }
  }

  // ===== HILFSMETHODEN =====

  // Scanne Verzeichnis für Prompts
  async scanDirectoryForPrompts(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const prompts = [];

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Rekursiv Unterordner scannen
          const subPrompts = await this.scanDirectoryForPrompts(fullPath);
          prompts.push(...subPrompts);
        } else if (item.isFile() && item.name.endsWith('.md')) {
          // Prompt-Datei gefunden
          const relativePath = path.relative(this.contentLibraryPath, fullPath);
          const category = path.dirname(relativePath).split(path.sep).pop();
          
          prompts.push({
            id: path.basename(item.name, '.md'),
            name: path.basename(item.name, '.md').replace(/([A-Z])/g, ' $1').trim(),
            category: category,
            file: relativePath,
            type: 'prompt'
          });
        }
      }

      return prompts;
    } catch (error) {
      // Verzeichnis existiert nicht
      return [];
    }
  }

  // Scanne Verzeichnis für Templates
  async scanDirectoryForTemplates(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const templates = [];

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Rekursiv Unterordner scannen
          const subTemplates = await this.scanDirectoryForTemplates(fullPath);
          templates.push(...subTemplates);
        } else if (item.isFile() && item.name.endsWith('.md')) {
          // Template-Datei gefunden
          const relativePath = path.relative(this.contentLibraryPath, fullPath);
          const category = path.dirname(relativePath).split(path.sep).pop();
          
          templates.push({
            id: path.basename(item.name, '.md'),
            name: path.basename(item.name, '.md').replace(/([A-Z])/g, ' $1').trim(),
            category: category,
            file: relativePath,
            type: 'template'
          });
        }
      }

      return templates;
    } catch (error) {
      // Verzeichnis existiert nicht
      return [];
    }
  }

  // GET /api/frameworks/:frameworkId/prompts/:filename - Einzelne Framework-Prompt-Datei
  async getFrameworkPromptFile(req, res) {
    try {
      const { frameworkId, filename } = req.params;
      const filePath = path.join(this.contentLibraryPath, 'frameworks', frameworkId, 'prompts', filename);
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ success: true, frameworkId, filename, content });
    } catch (error) {
      res.status(404).json({ success: false, error: 'Framework prompt file not found', message: error.message });
    }
  }

  // GET /api/frameworks/:frameworkId/templates/:filename - Einzelne Framework-Template-Datei
  async getFrameworkTemplateFile(req, res) {
    try {
      const { frameworkId, filename } = req.params;
      const filePath = path.join(this.contentLibraryPath, 'frameworks', frameworkId, 'templates', filename);
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ success: true, frameworkId, filename, content });
    } catch (error) {
      res.status(404).json({ success: false, error: 'Framework template file not found', message: error.message });
    }
  }
}

module.exports = ContentLibraryController; 