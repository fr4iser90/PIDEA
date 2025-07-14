const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDESelectionController');
/**
 * IDE Selection Controller
 * Manages IDE selection state and provides selection-related API endpoints
 */
class IDESelectionController {
  constructor(dependencies = {}) {
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || console;
    this.serviceRegistry = dependencies.serviceRegistry;
    
    // Selection state
    this.currentSelection = null;
    this.selectionHistory = [];
    this.maxHistorySize = 10;
  }

  /**
   * Get current IDE selection
   * GET /api/ide/selection
   */
  async getCurrentSelection(req, res) {
    try {
      const activePort = this.ideManager.getActivePort();
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      
      let currentSelection = null;
      
      if (activePort) {
        const activeIDE = availableIDEs.find(ide => ide.port === activePort);
        if (activeIDE) {
          currentSelection = {
            port: activeIDE.port,
            status: activeIDE.status,
            workspacePath: activeIDE.workspacePath,
            ideType: activeIDE.ideType || 'cursor',
            selectedAt: this.currentSelection?.selectedAt || new Date().toISOString(),
            isActive: true
          };
        }
      }

      res.json({
        success: true,
        data: {
          current: currentSelection,
          history: this.selectionHistory.slice(-5), // Last 5 selections
          available: availableIDEs.length
        }
      });
    } catch (error) {
      this.logger.error('Error getting current selection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get current selection',
        details: error.message
      });
    }
  }

  /**
   * Set IDE selection
   * POST /api/ide/selection
   */
  async setSelection(req, res) {
    try {
      const { port, reason = 'manual' } = req.body;
      
      if (!port) {
        return res.status(400).json({
          success: false,
          error: 'Port is required'
        });
      }

      const portNumber = parseInt(port);
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const targetIDE = availableIDEs.find(ide => ide.port === portNumber);
      
      if (!targetIDE) {
        return res.status(404).json({
          success: false,
          error: `IDE on port ${port} not found`
        });
      }

      // Switch to the selected IDE
      const result = await this.ideManager.switchToIDE(portNumber);
      
      // Update selection state
      const previousSelection = this.currentSelection;
      this.currentSelection = {
        port: portNumber,
        status: targetIDE.status,
        workspacePath: targetIDE.workspacePath,
        ideType: targetIDE.ideType || 'cursor',
        selectedAt: new Date().toISOString(),
        reason: reason,
        isActive: true
      };

      // Add to history
      if (previousSelection) {
        this.selectionHistory.push({
          ...previousSelection,
          deselectedAt: new Date().toISOString(),
          reason: 'switched'
        });
        
        // Keep history size manageable
        if (this.selectionHistory.length > this.maxHistorySize) {
          this.selectionHistory = this.selectionHistory.slice(-this.maxHistorySize);
        }
      }

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideSelectionChanged', {
          port: portNumber,
          previousPort: previousSelection?.port,
          reason: reason,
          workspacePath: targetIDE.workspacePath
        });
      }

      res.json({
        success: true,
        data: {
          selection: this.currentSelection,
          result: result,
          history: this.selectionHistory.slice(-5)
        }
      });
    } catch (error) {
      this.logger.error('Error setting selection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set selection',
        details: error.message
      });
    }
  }

  /**
   * Get available IDEs for selection
   * GET /api/ide/available
   */
  async getAvailableIDEs(req, res) {
    try {
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const activePort = this.ideManager.getActivePort();
      
      // Enhance IDE data with selection information
      const enhancedIDEs = availableIDEs.map(ide => ({
        ...ide,
        isSelected: ide.port === activePort,
        canSelect: ide.status === 'running',
        selectionPriority: this.getSelectionPriority(ide)
      }));

      // Sort by selection priority (active first, then by port)
      enhancedIDEs.sort((a, b) => {
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;
        return a.port - b.port;
      });

      res.json({
        success: true,
        data: {
          ides: enhancedIDEs,
          activePort: activePort,
          total: enhancedIDEs.length,
          selectable: enhancedIDEs.filter(ide => ide.canSelect).length
        }
      });
    } catch (error) {
      this.logger.error('Error getting available IDEs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available IDEs',
        details: error.message
      });
    }
  }

  /**
   * Get selection history
   * GET /api/ide/selection/history
   */
  async getSelectionHistory(req, res) {
    try {
      const { limit = 10 } = req.query;
      const historyLimit = Math.min(parseInt(limit), 50); // Max 50 entries
      
      const history = this.selectionHistory
        .slice(-historyLimit)
        .reverse(); // Most recent first

      res.json({
        success: true,
        data: {
          history: history,
          total: this.selectionHistory.length,
          current: this.currentSelection
        }
      });
    } catch (error) {
      this.logger.error('Error getting selection history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get selection history',
        details: error.message
      });
    }
  }

  /**
   * Clear selection history
   * DELETE /api/ide/selection/history
   */
  async clearSelectionHistory(req, res) {
    try {
      const clearedCount = this.selectionHistory.length;
      this.selectionHistory = [];

      res.json({
        success: true,
        data: {
          message: `Cleared ${clearedCount} history entries`,
          clearedCount: clearedCount
        }
      });
    } catch (error) {
      this.logger.error('Error clearing selection history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear selection history',
        details: error.message
      });
    }
  }

  /**
   * Get selection statistics
   * GET /api/ide/selection/stats
   */
  async getSelectionStats(req, res) {
    try {
      const stats = this.calculateSelectionStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error('Error getting selection stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get selection stats',
        details: error.message
      });
    }
  }

  /**
   * Auto-select IDE based on criteria
   * POST /api/ide/selection/auto
   */
  async autoSelectIDE(req, res) {
    try {
      const { criteria = 'most_recent' } = req.body;
      
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const runningIDEs = availableIDEs.filter(ide => ide.status === 'running');
      
      if (runningIDEs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No running IDEs available for selection'
        });
      }

      let selectedIDE = null;

      switch (criteria) {
        case 'most_recent':
          // Select the most recently used IDE
          selectedIDE = this.selectMostRecentIDE(runningIDEs);
          break;
        case 'first_available':
          // Select the first available IDE
          selectedIDE = runningIDEs[0];
          break;
        case 'workspace_match':
          // Select IDE with matching workspace (if provided)
          const { workspacePath } = req.body;
          if (workspacePath) {
            selectedIDE = runningIDEs.find(ide => 
              ide.workspacePath === workspacePath
            );
          }
          if (!selectedIDE) {
            selectedIDE = runningIDEs[0]; // Fallback
          }
          break;
        default:
          selectedIDE = runningIDEs[0];
      }

      // Set the selection
      const result = await this.setSelectionInternal(selectedIDE.port, 'auto');

      res.json({
        success: true,
        data: {
          selection: result.selection,
          criteria: criteria,
          available: runningIDEs.length
        }
      });
    } catch (error) {
      this.logger.error('Error auto-selecting IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-select IDE',
        details: error.message
      });
    }
  }

  // Helper methods

  /**
   * Get selection priority for an IDE
   */
  getSelectionPriority(ide) {
    let priority = 0;
    
    // Active IDE gets highest priority
    if (ide.active) priority += 100;
    
    // Running IDEs get higher priority
    if (ide.status === 'running') priority += 50;
    
    // IDEs with workspace get higher priority
    if (ide.workspacePath) priority += 25;
    
    // Lower port numbers get slightly higher priority
    priority += (1000 - ide.port);
    
    return priority;
  }

  /**
   * Select most recent IDE from history
   */
  selectMostRecentIDE(availableIDEs) {
    // Find the most recently selected IDE that's still available
    for (let i = this.selectionHistory.length - 1; i >= 0; i--) {
      const historyEntry = this.selectionHistory[i];
      const matchingIDE = availableIDEs.find(ide => ide.port === historyEntry.port);
      if (matchingIDE) {
        return matchingIDE;
      }
    }
    
    // Fallback to first available
    return availableIDEs[0];
  }

  /**
   * Calculate selection statistics
   */
  calculateSelectionStats() {
    const stats = {
      totalSelections: this.selectionHistory.length,
      currentSelection: this.currentSelection,
      averageSelectionsPerDay: 0,
      mostUsedPorts: {},
      selectionReasons: {},
      recentActivity: []
    };

    if (this.selectionHistory.length > 0) {
      // Calculate most used ports
      this.selectionHistory.forEach(entry => {
        stats.mostUsedPorts[entry.port] = (stats.mostUsedPorts[entry.port] || 0) + 1;
      });

      // Calculate selection reasons
      this.selectionHistory.forEach(entry => {
        stats.selectionReasons[entry.reason] = (stats.selectionReasons[entry.reason] || 0) + 1;
      });

      // Get recent activity (last 10 selections)
      stats.recentActivity = this.selectionHistory.slice(-10).reverse();

      // Calculate average selections per day
      const firstSelection = new Date(this.selectionHistory[0].selectedAt);
      const lastSelection = new Date(this.selectionHistory[this.selectionHistory.length - 1].selectedAt);
      const daysDiff = (lastSelection - firstSelection) / (1000 * 60 * 60 * 24);
      stats.averageSelectionsPerDay = daysDiff > 0 ? (this.selectionHistory.length / daysDiff).toFixed(2) : 0;
    }

    return stats;
  }

  /**
   * Internal method to set selection
   */
  async setSelectionInternal(port, reason) {
    const result = await this.ideManager.switchToIDE(port);
    
    const previousSelection = this.currentSelection;
    this.currentSelection = {
      port: port,
      selectedAt: new Date().toISOString(),
      reason: reason,
      isActive: true
    };

    if (previousSelection) {
      this.selectionHistory.push({
        ...previousSelection,
        deselectedAt: new Date().toISOString(),
        reason: 'switched'
      });
      
      if (this.selectionHistory.length > this.maxHistorySize) {
        this.selectionHistory = this.selectionHistory.slice(-this.maxHistorySize);
      }
    }

    return {
      selection: this.currentSelection,
      result: result
    };
  }

  /**
   * Setup routes for this controller
   */
  setupRoutes(app) {
    // IDE selection routes
    app.get('/api/ide/selection', this.getCurrentSelection.bind(this));
    app.post('/api/ide/selection', this.setSelection.bind(this));
    app.get('/api/ide/available', this.getAvailableIDEs.bind(this));
    app.get('/api/ide/selection/history', this.getSelectionHistory.bind(this));
    app.delete('/api/ide/selection/history', this.clearSelectionHistory.bind(this));
    app.get('/api/ide/selection/stats', this.getSelectionStats.bind(this));
    app.post('/api/ide/selection/auto', this.autoSelectIDE.bind(this));
  }
}

module.exports = IDESelectionController; 