import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * IDESwitchOptimizationStore - Centralized frontend optimization state
 * Provides progress tracking, performance metrics, and optimization settings
 */
const useIDESwitchOptimizationStore = create(
  persist(
    (set, get) => ({
      // Progress tracking
      switchProgress: 0,
      switchStatus: 'idle', // 'idle', 'switching', 'success', 'error'
      switchMessage: '',
      currentPort: null,
      
      // Performance metrics
      switchTimes: [],
      averageSwitchTime: 0,
      totalSwitches: 0,
      successfulSwitches: 0,
      
      // Optimization settings
      optimisticUpdates: true,
      showProgress: true,
      cacheEnabled: true,
      
      // Actions
      startSwitch: (port) => {
        set({ 
          switchProgress: 0, 
          switchStatus: 'switching',
          switchMessage: `Switching to IDE on port ${port}...`,
          currentPort: port
        });
      },
      
      updateProgress: (progress, message) => {
        set({ 
          switchProgress: Math.min(progress, 100),
          switchMessage: message
        });
      },
      
      completeSwitch: (success, duration) => {
        set({ 
          switchProgress: 100,
          switchStatus: success ? 'success' : 'error',
          switchMessage: success ? 'Switch completed successfully' : 'Switch failed'
        });
        
        // Track performance
        if (success) {
          get().trackSwitchTime(duration);
        }
        
        // Reset after delay
        setTimeout(() => {
          set({ 
            switchStatus: 'idle',
            switchProgress: 0,
            switchMessage: ''
          });
        }, 2000);
      },
      
      trackSwitchTime: (duration) => {
        const { switchTimes, totalSwitches, successfulSwitches } = get();
        
        const newSwitchTimes = [...switchTimes, duration];
        if (newSwitchTimes.length > 100) {
          newSwitchTimes.shift(); // Keep only last 100
        }
        
        const average = newSwitchTimes.reduce((a, b) => a + b, 0) / newSwitchTimes.length;
        
        set({
          switchTimes: newSwitchTimes,
          averageSwitchTime: average,
          totalSwitches: totalSwitches + 1,
          successfulSwitches: successfulSwitches + 1
        });
      },
      
      setOptimizationSettings: (settings) => {
        set(settings);
      },
      
      getPerformanceStats: () => {
        const { switchTimes, averageSwitchTime, totalSwitches, successfulSwitches } = get();
        
        if (switchTimes.length === 0) {
          return {
            totalSwitches: 0,
            successfulSwitches: 0,
            averageTime: 0,
            minTime: 0,
            maxTime: 0,
            successRate: 0
          };
        }
        
        const sorted = [...switchTimes].sort((a, b) => a - b);
        
        return {
          totalSwitches,
          successfulSwitches,
          averageTime: averageSwitchTime,
          minTime: sorted[0],
          maxTime: sorted[sorted.length - 1],
          successRate: totalSwitches > 0 ? (successfulSwitches / totalSwitches) * 100 : 0
        };
      },
      
      resetStats: () => {
        set({
          switchTimes: [],
          averageSwitchTime: 0,
          totalSwitches: 0,
          successfulSwitches: 0
        });
      }
    }),
    {
      name: 'ide-switch-optimization',
      partialize: (state) => ({
        switchTimes: state.switchTimes,
        averageSwitchTime: state.averageSwitchTime,
        totalSwitches: state.totalSwitches,
        successfulSwitches: state.successfulSwitches,
        optimisticUpdates: state.optimisticUpdates,
        showProgress: state.showProgress,
        cacheEnabled: state.cacheEnabled
      })
    }
  )
);

export default useIDESwitchOptimizationStore; 