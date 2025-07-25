/**
 * IDE Store
 * Dedicated state management for IDE port management with persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/infrastructure/logging/Logger';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import useAuthStore from './AuthStore.jsx';

const useIDEStore = create(
  persist(
    (set, get) => ({
      // State
      activePort: null,
      portPreferences: [],
      availableIDEs: [],
      isLoading: false,
      error: null,
      lastUpdate: null,
      retryCount: 0,
      maxRetries: 3,

      // Actions
      setActivePort: async (port) => {
        try {
          set({ isLoading: true, error: null });
          logger.info('Setting active port:', port);

          // Validate port
          const isValid = await get().validatePort(port);
          if (!isValid) {
            throw new Error(`Port ${port} is not valid`);
          }

          // Update state
          set({ activePort: port });

          // Update preferences
          const { portPreferences } = get();
          const existingPreference = portPreferences.find(p => p.port === port);
          
          if (existingPreference) {
            existingPreference.usageCount = (existingPreference.usageCount || 0) + 1;
            existingPreference.lastUsed = new Date().toISOString();
            existingPreference.weight = Math.min(existingPreference.weight + 10, 100);
          } else {
            portPreferences.push({
              port,
              weight: 100,
              usageCount: 1,
              lastUsed: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }

          set({ portPreferences: [...portPreferences] });
          logger.info('Active port set successfully:', port);
        } catch (error) {
          logger.error('Error setting active port:', error);
          set({ error: error.message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      loadActivePort: async () => {
        try {
          const { isLoading } = get();
          if (isLoading) {
            logger.info('Port load already in progress, skipping');
            return get().activePort;
          }
          
          set({ isLoading: true, error: null });
          logger.info('Loading active port...');

          // Strategy 1: Try previously active port
          const { activePort, portPreferences } = get();
          if (activePort) {
            const isValid = await get().validatePort(activePort);
            if (isValid) {
              logger.info('Using previously active port:', activePort);
              set({ isLoading: false });
              return activePort;
            }
          }

          // Strategy 2: Try preferred ports
          const sortedPreferences = [...portPreferences]
            .sort((a, b) => b.weight - a.weight)
            .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));

          for (const preference of sortedPreferences) {
            const isValid = await get().validatePort(preference.port);
            if (isValid) {
              logger.info('Using preferred port:', preference.port);
              set({ activePort: preference.port, isLoading: false });
              return preference.port;
            }
          }

          // Strategy 3: Load from API and use first available
          await get().loadAvailableIDEs();
          const { availableIDEs } = get();
          
          if (availableIDEs.length > 0) {
            const firstIDE = availableIDEs[0];
            logger.info('Using first available port:', firstIDE.port);
            set({ activePort: firstIDE.port, isLoading: false });
            return firstIDE.port;
          }

          logger.warn('No active port could be loaded');
          set({ isLoading: false });
          return null;
        } catch (error) {
          logger.error('Error loading active port:', error);
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      loadAvailableIDEs: async () => {
        try {
          const { isLoading } = get();
          if (isLoading) {
            logger.info('IDE load already in progress, skipping');
            return get().availableIDEs;
          }
          
          // Check if user is authenticated before making API call
          const { isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) {
            logger.info('User not authenticated, skipping IDE load');
            set({ isLoading: false });
            return [];
          }
          
          set({ isLoading: true, error: null });
          logger.info('Loading available IDEs...');

          const result = await apiCall('/api/ide/available');
          if (result.success) {
            // Handle both response formats: result.data.ides (new) and result.data (old)
            const ides = result.data.ides || result.data || [];
            logger.info('API Response:', { 
              hasData: !!result.data, 
              dataType: typeof result.data, 
              isArray: Array.isArray(result.data),
              idesLength: ides.length,
              firstIDE: ides[0]
            });
            
            set({ 
              availableIDEs: ides,
              lastUpdate: new Date().toISOString(),
              retryCount: 0,
              isLoading: false
            });
            logger.info('Loaded', ides.length, 'IDEs');
            
            // Auto-set active port if none is set and we have IDEs
            const { activePort } = get();
            if (!activePort && ides.length > 0) {
              const firstIDE = ides[0];
              logger.info('Auto-setting active port to:', firstIDE.port);
              set({ activePort: firstIDE.port });
            }
            
            return ides;
          } else {
            throw new Error(result.error || 'Failed to load IDEs');
          }
        } catch (error) {
          logger.error('Error loading available IDEs:', error);
          set({ error: error.message, isLoading: false });
          
          // Don't retry automatically - only on manual refresh
          // This prevents infinite loops
          return [];
        }
      },

      validatePort: async (port) => {
        try {
          logger.info('Validating port:', port);
          
          // Check if port is in valid range
          if (!get().isValidPortRange(port)) {
            logger.info('Port not in valid range:', port);
            return false;
          }

          // Check if IDE is available
          const { availableIDEs } = get();
          const ide = availableIDEs.find(ide => ide.port === port);
          
          if (!ide) {
            logger.info('IDE not found for port:', port);
            return false;
          }

          // Check if IDE is running
          if (ide.status !== 'running' && ide.status !== 'active') {
            logger.info('IDE not running on port:', port);
            return false;
          }

          // Check if IDE has workspace path
          if (!ide.workspacePath) {
            logger.info('IDE has no workspace path:', port);
            return false;
          }

          logger.info('Port validation successful:', port);
          return true;
        } catch (error) {
          logger.error('Error validating port:', port, error);
          return false;
        }
      },

      isValidPortRange: (port) => {
        // Cursor: 9222-9231
        if (port >= 9222 && port <= 9231) return true;
        // VSCode: 9232-9241
        if (port >= 9232 && port <= 9241) return true;
        // Windsurf: 9242-9251
        if (port >= 9242 && port <= 9251) return true;
        
        return false;
      },

      handlePortFailure: async (port, reason = 'unknown') => {
        try {
          logger.info('Handling port failure:', port, reason);
          
          // Remove failed port from preferences
          const { portPreferences } = get();
          const updatedPreferences = portPreferences.filter(p => p.port !== port);
          set({ portPreferences: updatedPreferences });
          
          // If this was the active port, select a new one
          const { activePort } = get();
          if (activePort === port) {
            logger.info('Active port failed, selecting new port');
            const newPort = await get().loadActivePort();
            return newPort;
          }
          
          return null;
        } catch (error) {
          logger.error('Error handling port failure:', error);
          return null;
        }
      },

      switchIDE: async (port, reason = 'manual') => {
        try {
          set({ isLoading: true, error: null });
          logger.info('Switching to IDE:', port, reason);

          const result = await apiCall(`/api/ide/switch/${port}`, {
            method: 'POST'
          });

          if (result.success) {
            await get().setActivePort(port);
            await get().loadAvailableIDEs(); // Refresh IDE list
            
            logger.info('Successfully switched to IDE:', port);
            return true;
          } else {
            throw new Error(result.error || 'Failed to switch IDE');
          }
        } catch (error) {
          logger.error('Error switching IDE:', error);
          set({ error: error.message });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      refresh: async () => {
        try {
          logger.info('Refreshing...');
          
          // Reload available IDEs
          await get().loadAvailableIDEs();
          
          // Re-validate current active port
          const { activePort } = get();
          if (activePort) {
            const isValid = await get().validatePort(activePort);
            if (!isValid) {
              logger.info('Current active port invalid, selecting new one');
              await get().loadActivePort();
            }
          } else {
            // No active port, select one
            await get().loadActivePort();
          }
          
          logger.info('Refresh complete');
        } catch (error) {
          logger.error('Error refreshing:', error);
          set({ error: error.message });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          activePort: null,
          portPreferences: [],
          availableIDEs: [],
          isLoading: false,
          error: null,
          lastUpdate: null,
          retryCount: 0
        });
      },

      // Custom port management methods
      setCustomPort: async (port) => {
        try {
          // Use existing validatePort method for validation
          const isValid = await get().validatePort(port);
          if (isValid) {
            set({ customPort: port });
            // Use existing persistence system
            const { portPreferences } = get();
            const existingPreference = portPreferences.find(p => p.port === port);
            if (!existingPreference) {
              portPreferences.push({
                port,
                weight: 100,
                usageCount: 1,
                lastUsed: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                isCustom: true
              });
              set({ portPreferences: [...portPreferences] });
            }
            return { success: true };
          } else {
            return { success: false, error: 'Invalid port' };
          }
        } catch (error) {
          logger.error('Failed to set custom port:', error);
          return { success: false, error: 'Failed to set port' };
        }
      },

      getCustomPort: () => {
        return get().customPort;
      },

      validateCustomPort: async (port) => {
        // Use existing validatePort method
        return await get().validatePort(port);
      },

      clearCustomPort: () => {
        set({ customPort: null });
        return { success: true };
      },

      // Project command methods (optional - can use existing terminal services)
      getProjectCommands: async (projectId) => {
        // Use existing APIChatRepository patterns
        return apiCall(`/api/projects/${projectId}/commands`);
      },

      executeProjectCommand: async (projectId, commandType) => {
        // Use existing terminal execution services
        return apiCall(`/api/projects/${projectId}/execute-command`, {
          method: 'POST',
          body: JSON.stringify({ commandType })
        });
      }
    }),
    {
      name: 'ide-storage',
      partialize: (state) => ({
        activePort: state.activePort,
        portPreferences: state.portPreferences
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          logger.info('State rehydrated:', {
            activePort: state.activePort,
            preferencesCount: state.portPreferences.length
          });
        }
      }
    }
  )
);

export default useIDEStore; 