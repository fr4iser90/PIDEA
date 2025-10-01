import { useEffect, useRef, useCallback } from 'react';
import refreshService from '@/infrastructure/services/RefreshService';
import { logger } from '@/infrastructure/logging/Logger';

/**
 * useRefreshService - React hook for integrating components with RefreshService
 * Provides easy integration with the event-driven refresh system
 */
export const useRefreshService = (componentType, component, options = {}) => {
  const componentRef = useRef(component);
  const isRegisteredRef = useRef(false);

  // Update component ref when component changes
  useEffect(() => {
    componentRef.current = component;
  }, [component]);

  /**
   * Register component with refresh service
   */
  const registerComponent = useCallback(async () => {
    if (isRegisteredRef.current || !componentRef.current) {
      return;
    }

    try {
      await refreshService.registerComponent(componentType, componentRef.current, options);
      isRegisteredRef.current = true;
      logger.info(`✅ Registered ${componentType} with RefreshService`);
    } catch (error) {
      logger.error(`❌ Failed to register ${componentType}:`, error);
    }
  }, [componentType, options]);

  /**
   * Unregister component from refresh service
   */
  const unregisterComponent = useCallback(() => {
    if (!isRegisteredRef.current) {
      return;
    }

    try {
      refreshService.unregisterComponent(componentType);
      isRegisteredRef.current = false;
      logger.info(`❌ Unregistered ${componentType} from RefreshService`);
    } catch (error) {
      logger.error(`❌ Failed to unregister ${componentType}:`, error);
    }
  }, [componentType]);

  /**
   * Force refresh component
   */
  const forceRefresh = useCallback(async () => {
    try {
      await refreshService.refreshComponent(componentType, true);
      logger.info(`🔄 Force refreshed ${componentType}`);
    } catch (error) {
      logger.error(`❌ Failed to force refresh ${componentType}:`, error);
    }
  }, [componentType]);

  /**
   * Get refresh statistics
   */
  const getStats = useCallback(() => {
    return refreshService.getStats();
  }, []);

  // Register component on mount
  useEffect(() => {
    registerComponent();

    // Cleanup on unmount
    return () => {
      unregisterComponent();
    };
  }, [registerComponent, unregisterComponent]);

  return {
    registerComponent,
    unregisterComponent,
    forceRefresh,
    getStats,
    isRegistered: isRegisteredRef.current
  };
};

/**
 * useRefreshServiceStats - Hook for monitoring refresh service statistics
 */
export const useRefreshServiceStats = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const updateStats = () => {
      const currentStats = refreshService.getStats();
      setStats(currentStats);
    };

    // Update stats immediately
    updateStats();

    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return stats;
};

/**
 * useRefreshServiceEvents - Hook for listening to refresh service events
 */
export const useRefreshServiceEvents = (eventType, callback) => {
  useEffect(() => {
    if (!eventType || !callback) {
      return;
    }

    refreshService.eventCoordinator.on(eventType, callback);

    return () => {
      refreshService.eventCoordinator.off(eventType, callback);
    };
  }, [eventType, callback]);
};

export default useRefreshService;
