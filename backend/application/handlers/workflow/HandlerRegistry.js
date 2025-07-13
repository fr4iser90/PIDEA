const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

// HandlerRegistry - zentrale Registry für Workflow-Handler
// 
// Diese Klasse stellt eine zentrale Registry für die Verwaltung von Workflow-Handlern bereit,
// einschließlich der Registrierung, Suche, Lebenszyklusverwaltung und Metadatenverfolgung.
// Sie folgt dem Registry-Muster für die Handlerverwaltung.
class HandlerRegistry {
  /**
   * Erstelle eine neue Handler-Registry
   * @param {Object} options - Registry-Optionen
   */
  constructor(options = {}) {
    this.handlers = new Map();
    this.handlerTypes = new Map();
    this.handlerMetadata = new Map();
    this.handlerStatistics = new Map();
    this.options = {
      enableStatistics: options.enableStatistics !== false,
      maxHandlers: options.maxHandlers || 1000,
      enableValidation: options.enableValidation !== false,
      ...options
    };
  }

  /**
   * Registriere einen Handler
   * @param {string} type - Handler-Typ
   * @param {IHandler} handler - Handler-Instanz
   * @param {Object} metadata - Handler-Metadaten
   * @returns {boolean} True, wenn die Registrierung erfolgreich war
   */
  registerHandler(type, handler, metadata = {}) {
    try {
      // Validiere Eingaben
      if (!type || typeof type !== 'string') {
        throw new Error('Handler-Typ muss ein nicht-leerer String sein');
      }

      if (!handler) {
        throw new Error('Handler-Instanz ist erforderlich');
      }

      // Prüfe Registrierungskapazität
      if (this.handlers.size >= this.options.maxHandlers) {
        throw new Error(`Registrierungskapazität überschritten (max: ${this.options.maxHandlers})`);
      }

      // Validiere Handler, falls aktiviert
      if (this.options.enableValidation) {
        this.validateHandlerForRegistration(handler);
      }

      // Registriere Handler
      this.handlers.set(type, handler);
      this.handlerTypes.set(type, handler.constructor.name);
      
      // Speichere Metadaten
      const fullMetadata = {
        ...handler.getMetadata(),
        ...metadata,
        registeredAt: new Date(),
        type,
        className: handler.constructor.name
      };
      this.handlerMetadata.set(type, fullMetadata);

      // Initialisiere Statistiken
      if (this.options.enableStatistics) {
        this.handlerStatistics.set(type, {
          executions: 0,
          successes: 0,
          failures: 0,
          totalDuration: 0,
          lastExecuted: null,
          averageDuration: 0
        });
      }

      return true;

    } catch (error) {
      logger.error('Handler-Registrierung fehlgeschlagen:', error.message);
      return false;
    }
  }

  /**
   * Hole Handler nach Typ
   * @param {string} type - Handler-Typ
   * @returns {IHandler|null} Handler-Instanz
   */
  getHandler(type) {
    return this.handlers.get(type) || null;
  }

  /**
   * Prüfe, ob Handler existiert
   * @param {string} type - Handler-Typ
   * @returns {boolean} True, wenn Handler existiert
   */
  hasHandler(type) {
    return this.handlers.has(type);
  }

  /**
   * Hole Handler-Metadaten
   * @param {string} type - Handler-Typ
   * @returns {Object|null} Handler-Metadaten
   */
  getHandlerMetadata(type) {
    return this.handlerMetadata.get(type) || null;
  }

  /**
   * Hole Handler-Anzahl
   * @returns {number} Anzahl der registrierten Handler
   */
  getHandlerCount() {
    return this.handlers.size;
  }

  /**
   * Hole Handler-Typen
   * @returns {Array<string>} Handler-Typen
   */
  getHandlerTypes() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Liste alle Handler
   * @returns {Array<Object>} Handler-Informationen
   */
  listHandlers() {
    const handlers = [];
    
    for (const [type, handler] of this.handlers) {
      const metadata = this.handlerMetadata.get(type);
      const statistics = this.handlerStatistics.get(type);
      
      handlers.push({
        type,
        name: metadata?.name || handler.constructor.name,
        description: metadata?.description || '',
        version: metadata?.version || '1.0.0',
        registeredAt: metadata?.registeredAt,
        statistics: statistics || null
      });
    }
    
    return handlers;
  }

  /**
   * Entferne Handler
   * @param {string} type - Handler-Typ
   * @returns {boolean} True, wenn Handler entfernt wurde
   */
  unregisterHandler(type) {
    const wasRegistered = this.handlers.has(type);
    
    if (wasRegistered) {
      this.handlers.delete(type);
      this.handlerTypes.delete(type);
      this.handlerMetadata.delete(type);
      this.handlerStatistics.delete(type);
    }
    
    return wasRegistered;
  }

  /**
   * Leere alle Handler
   */
  clearHandlers() {
    this.handlers.clear();
    this.handlerTypes.clear();
    this.handlerMetadata.clear();
    this.handlerStatistics.clear();
  }

  /**
   * Aktualisiere Handler-Statistiken
   * @param {string} type - Handler-Typ
   * @param {Object} result - Ausführungsergebnis
   */
  updateStatistics(type, result) {
    if (!this.options.enableStatistics) {
      return;
    }

    const stats = this.handlerStatistics.get(type);
    if (!stats) {
      return;
    }

    stats.executions++;
    stats.lastExecuted = new Date();

    if (result.isSuccess()) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    if (result.getDuration) {
      const duration = result.getDuration();
      stats.totalDuration += duration;
      stats.averageDuration = stats.totalDuration / stats.executions;
    }
  }

  /**
   * Hole Handler-Statistiken
   * @param {string} type - Handler-Typ
   * @returns {Object|null} Handler-Statistiken
   */
  getHandlerStatistics(type) {
    return this.handlerStatistics.get(type) || null;
  }

  /**
   * Hole alle Statistiken
   * @returns {Object} Alle Handler-Statistiken
   */
  getAllStatistics() {
    const result = {};
    
    for (const [type, stats] of this.handlerStatistics) {
      result[type] = { ...stats };
    }
    
    return result;
  }

  /**
   * Finde Handler nach Kriterien
   * @param {Object} criteria - Suchkriterien
   * @param {string} criteria.name - Handler-Name-Muster
   * @param {string} criteria.type - Handler-Typ-Muster
   * @param {string} criteria.version - Handler-Version
   * @returns {Array<Object>} Übereinstimmende Handler
   */
  findHandlers(criteria = {}) {
    const matches = [];
    
    for (const [type, handler] of this.handlers) {
      const metadata = this.handlerMetadata.get(type);
      
      let matchesCriteria = true;
      
      if (criteria.name && metadata?.name) {
        matchesCriteria = matchesCriteria && metadata.name.includes(criteria.name);
      }
      
      if (criteria.type) {
        matchesCriteria = matchesCriteria && type.includes(criteria.type);
      }
      
      if (criteria.version && metadata?.version) {
        matchesCriteria = matchesCriteria && metadata.version === criteria.version;
      }
      
      if (matchesCriteria) {
        matches.push({
          type,
          handler,
          metadata
        });
      }
    }
    
    return matches;
  }

  /**
   * Hole Registry-Zusammenfassung
   * @returns {Object} Registry-Zusammenfassung
   */
  getSummary() {
    const totalExecutions = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.executions, 0);
    
    const totalSuccesses = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.successes, 0);
    
    const totalFailures = Array.from(this.handlerStatistics.values())
      .reduce((sum, stats) => sum + stats.failures, 0);
    
    return {
      totalHandlers: this.handlers.size,
      totalExecutions,
      totalSuccesses,
      totalFailures,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
      handlerTypes: this.getHandlerTypes(),
      statisticsEnabled: this.options.enableStatistics
    };
  }

  /**
   * Validiere Handler für die Registrierung
   * @param {IHandler} handler - Zu validierender Handler
   * @throws {Error} Wenn die Validierung fehlschlägt
   */
  validateHandlerForRegistration(handler) {
    const requiredMethods = [
      'execute',
      'getMetadata',
      'validate',
      'canHandle',
      'getDependencies',
      'getVersion',
      'getType'
    ];

    for (const method of requiredMethods) {
      if (typeof handler[method] !== 'function') {
        throw new Error(`Handler muss die ${method} Methode implementieren`);
      }
    }

    // Validiere Metadaten
    try {
      const metadata = handler.getMetadata();
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Handler muss ein gültiges Metadatenobjekt zurückgeben');
      }
    } catch (error) {
      throw new Error(`Handler-Metadatenvalidierung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Hole Registry-Optionen
   * @returns {Object} Registry-Optionen
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Setze Registry-Optionen
   * @param {Object} options - Neue Optionen
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Exportiere Registry-Zustand
   * @returns {Object} Registry-Zustand
   */
  exportState() {
    const state = {
      handlers: {},
      metadata: {},
      statistics: {},
      options: this.options
    };

    for (const [type, handler] of this.handlers) {
      state.handlers[type] = {
        className: handler.constructor.name,
        type: handler.getType(),
        version: handler.getVersion()
      };
    }

    for (const [type, metadata] of this.handlerMetadata) {
      state.metadata[type] = metadata;
    }

    for (const [type, stats] of this.handlerStatistics) {
      state.statistics[type] = stats;
    }

    return state;
  }

  /**
   * Importiere Registry-Zustand
   * @param {Object} state - Registry-Zustand
   * @returns {boolean} True, wenn der Import erfolgreich war
   */
  importState(state) {
    try {
      if (state.options) {
        this.options = { ...this.options, ...state.options };
      }

      // Hinweis: Dies ist eine grundlegende Import. In einer realen Implementierung
      // müssten Sie Handler-Instanzen aus dem Zustand neu erstellen.
      
      return true;
    } catch (error) {
      logger.error('Registry-Zustand import fehlgeschlagen:', error.message);
      return false;
    }
  }
}

module.exports = HandlerRegistry; 