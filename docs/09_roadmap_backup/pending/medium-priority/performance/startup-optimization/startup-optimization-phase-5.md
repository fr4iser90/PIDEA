# Startup Performance Optimization – Phase 5: Frontend Integration

## Overview
Integrate startup optimization with the frontend by adding startup progress indicators, lazy data loading, and optimized API calls to provide a smooth user experience during system initialization.

## Objectives
- [ ] Add startup progress indicator component
- [ ] Implement lazy data loading for frontend
- [ ] Add startup status API endpoints
- [ ] Optimize frontend initialization
- [ ] Add real-time startup progress updates

## Deliverables
- File: `frontend/src/presentation/components/StartupProgress.jsx` - Startup progress indicator
- File: `frontend/src/application/services/StartupService.jsx` - Frontend startup service
- File: `backend/presentation/api/StartupController.js` - Startup status and control endpoints
- API: `/api/startup/status` - Startup status endpoint
- API: `/api/startup/progress` - Real-time progress updates
- Test: `tests/unit/StartupProgress.test.jsx` - Unit tests for frontend components

## Dependencies
- Requires: All previous phases (1-4) completion
- Blocks: None - final phase

## Estimated Time
1 hour

## Technical Implementation

### 1. StartupProgress Component
```jsx
import React, { useState, useEffect } from 'react';
import { useStartupService } from '../hooks/useStartupService';
import './StartupProgress.css';

const StartupProgress = ({ onComplete, onError }) => {
    const { 
        startupStatus, 
        progress, 
        isComplete, 
        error, 
        subscribeToProgress 
    } = useStartupService();
    
    const [currentStep, setCurrentStep] = useState('');
    const [stepProgress, setStepProgress] = useState(0);
    const [overallProgress, setOverallProgress] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeToProgress((update) => {
            setCurrentStep(update.currentStep);
            setStepProgress(update.stepProgress);
            setOverallProgress(update.overallProgress);
        });

        return unsubscribe;
    }, [subscribeToProgress]);

    useEffect(() => {
        if (isComplete && onComplete) {
            onComplete();
        }
    }, [isComplete, onComplete]);

    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    if (isComplete) {
        return null;
    }

    return (
        <div className="startup-progress-overlay">
            <div className="startup-progress-container">
                <div className="startup-progress-header">
                    <h2>System Starting Up</h2>
                    <p>Please wait while we optimize your experience...</p>
                </div>

                <div className="startup-progress-content">
                    <div className="progress-step">
                        <div className="step-label">
                            <span className="step-name">{currentStep}</span>
                            <span className="step-percentage">{stepProgress}%</span>
                        </div>
                        <div className="step-progress-bar">
                            <div 
                                className="step-progress-fill" 
                                style={{ width: `${stepProgress}%` }}
                            />
                        </div>
                    </div>

                    <div className="overall-progress">
                        <div className="overall-label">
                            <span>Overall Progress</span>
                            <span>{overallProgress}%</span>
                        </div>
                        <div className="overall-progress-bar">
                            <div 
                                className="overall-progress-fill" 
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>

                    <div className="startup-status">
                        <div className="status-item">
                            <span className="status-label">Services:</span>
                            <span className="status-value">{startupStatus.servicesLoaded}/{startupStatus.totalServices}</span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Cache Hit Rate:</span>
                            <span className="status-value">{startupStatus.cacheHitRate}%</span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Memory Usage:</span>
                            <span className="status-value">{startupStatus.memoryUsage}MB</span>
                        </div>
                    </div>

                    {error && (
                        <div className="startup-error">
                            <p>Startup Error: {error.message}</p>
                            <button onClick={() => window.location.reload()}>
                                Retry Startup
                            </button>
                        </div>
                    )}
                </div>

                <div className="startup-progress-footer">
                    <p>Optimizing for faster startup times...</p>
                </div>
            </div>
        </div>
    );
};

export default StartupProgress;
```

### 2. StartupService Hook
```jsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useApi } from './useApi';

export const useStartupService = () => {
    const [startupStatus, setStartupStatus] = useState({
        isInitializing: true,
        servicesLoaded: 0,
        totalServices: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        startupTime: 0
    });
    
    const [progress, setProgress] = useState({
        currentStep: 'Initializing...',
        stepProgress: 0,
        overallProgress: 0
    });
    
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState(null);
    const [subscribers, setSubscribers] = useState([]);

    const { api } = useApi();
    const { socket, isConnected } = useWebSocket();

    // Subscribe to progress updates
    const subscribeToProgress = useCallback((callback) => {
        setSubscribers(prev => [...prev, callback]);
        
        return () => {
            setSubscribers(prev => prev.filter(sub => sub !== callback));
        };
    }, []);

    // Notify subscribers
    const notifySubscribers = useCallback((update) => {
        subscribers.forEach(callback => callback(update));
    }, [subscribers]);

    // Initialize startup monitoring
    useEffect(() => {
        let mounted = true;
        let progressInterval;

        const initializeStartup = async () => {
            try {
                // Get initial startup status
                const status = await api.get('/api/startup/status');
                
                if (!mounted) return;
                
                setStartupStatus(status);
                
                // Subscribe to real-time updates
                if (socket && isConnected) {
                    socket.on('startup:progress', (update) => {
                        if (!mounted) return;
                        
                        setProgress(update);
                        notifySubscribers(update);
                        
                        if (update.overallProgress >= 100) {
                            setIsComplete(true);
                        }
                    });

                    socket.on('startup:status', (status) => {
                        if (!mounted) return;
                        setStartupStatus(status);
                    });

                    socket.on('startup:error', (error) => {
                        if (!mounted) return;
                        setError(error);
                    });

                    socket.on('startup:complete', () => {
                        if (!mounted) return;
                        setIsComplete(true);
                    });
                }

                // Start progress polling as fallback
                progressInterval = setInterval(async () => {
                    try {
                        const progressUpdate = await api.get('/api/startup/progress');
                        
                        if (!mounted) return;
                        
                        setProgress(progressUpdate);
                        notifySubscribers(progressUpdate);
                        
                        if (progressUpdate.overallProgress >= 100) {
                            setIsComplete(true);
                            clearInterval(progressInterval);
                        }
                    } catch (error) {
                        console.warn('Progress polling failed:', error);
                    }
                }, 1000);

            } catch (error) {
                if (!mounted) return;
                setError(error);
            }
        };

        initializeStartup();

        return () => {
            mounted = false;
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [api, socket, isConnected, notifySubscribers]);

    return {
        startupStatus,
        progress,
        isComplete,
        error,
        subscribeToProgress
    };
};
```

### 3. StartupController API
```javascript
const express = require('express');
const router = express.Router();
const StartupOptimizationService = require('@domain/services/StartupOptimizationService');
const ServiceRegistry = require('@infrastructure/dependency-injection/ServiceRegistry');

class StartupController {
    constructor() {
        this.startupService = null;
        this.serviceRegistry = null;
        this.router = router;
        this.setupRoutes();
    }

    async initialize() {
        try {
            this.serviceRegistry = new ServiceRegistry();
            this.startupService = new StartupOptimizationService();
            
            // Get services through DI
            const startupCache = this.serviceRegistry.getService('startupCache');
            const logger = this.serviceRegistry.getService('logger');
            
            this.startupService.initialize(startupCache, logger);
            
            console.log('StartupController initialized');
        } catch (error) {
            console.error('StartupController initialization failed:', error);
        }
    }

    setupRoutes() {
        // Get startup status
        this.router.get('/status', async (req, res) => {
            try {
                const status = await this.getStartupStatus();
                res.json(status);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get real-time progress
        this.router.get('/progress', async (req, res) => {
            try {
                const progress = await this.getStartupProgress();
                res.json(progress);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get cache status
        this.router.get('/cache/status', async (req, res) => {
            try {
                const cacheStatus = await this.getCacheStatus();
                res.json(cacheStatus);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Clear cache
        this.router.post('/cache/clear', async (req, res) => {
            try {
                const { type } = req.body;
                await this.clearCache(type);
                res.json({ success: true, message: 'Cache cleared' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get service loading status
        this.router.get('/services/status', async (req, res) => {
            try {
                const serviceStatus = await this.getServiceStatus();
                res.json(serviceStatus);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Manual service loading
        this.router.post('/services/load', async (req, res) => {
            try {
                const { serviceName } = req.body;
                await this.loadService(serviceName);
                res.json({ success: true, message: `Service ${serviceName} loaded` });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    async getStartupStatus() {
        if (!this.startupService) {
            throw new Error('StartupService not initialized');
        }

        const cacheStats = await this.startupService.getCacheStats();
        const serviceStatus = await this.getServiceStatus();
        
        return {
            isInitializing: !serviceStatus.isComplete,
            servicesLoaded: serviceStatus.loadedServices.length,
            totalServices: serviceStatus.totalServices,
            cacheHitRate: cacheStats.hitRate,
            memoryUsage: this.getMemoryUsage(),
            startupTime: this.getStartupTime(),
            cacheStats,
            serviceStatus
        };
    }

    async getStartupProgress() {
        if (!this.startupService) {
            throw new Error('StartupService not initialized');
        }

        const serviceStatus = await this.getServiceStatus();
        const progress = this.calculateProgress(serviceStatus);
        
        return {
            currentStep: this.getCurrentStep(serviceStatus),
            stepProgress: progress.stepProgress,
            overallProgress: progress.overallProgress,
            estimatedTimeRemaining: this.estimateTimeRemaining(progress.overallProgress)
        };
    }

    async getCacheStatus() {
        if (!this.startupService) {
            throw new Error('StartupService not initialized');
        }

        return await this.startupService.getCacheStats();
    }

    async clearCache(type = null) {
        if (!this.startupService) {
            throw new Error('StartupService not initialized');
        }

        await this.startupService.clearCache(type);
    }

    async getServiceStatus() {
        if (!this.serviceRegistry) {
            throw new Error('ServiceRegistry not initialized');
        }

        const lazyLoader = this.serviceRegistry.getLazyLoader();
        if (!lazyLoader) {
            return {
                isComplete: false,
                loadedServices: [],
                loadingServices: [],
                totalServices: 0
            };
        }

        return lazyLoader.getLoadingStatus();
    }

    async loadService(serviceName) {
        if (!this.serviceRegistry) {
            throw new Error('ServiceRegistry not initialized');
        }

        const lazyLoader = this.serviceRegistry.getLazyLoader();
        if (!lazyLoader) {
            throw new Error('LazyLoader not available');
        }

        await lazyLoader.loadService(serviceName);
    }

    calculateProgress(serviceStatus) {
        const totalServices = serviceStatus.totalServices;
        const loadedServices = serviceStatus.loadedServices.length;
        const loadingServices = serviceStatus.loadingServices.length;
        
        const overallProgress = totalServices > 0 ? (loadedServices / totalServices) * 100 : 0;
        const stepProgress = loadingServices > 0 ? 50 : (loadedServices > 0 ? 100 : 0);
        
        return {
            overallProgress: Math.min(overallProgress, 100),
            stepProgress: Math.min(stepProgress, 100)
        };
    }

    getCurrentStep(serviceStatus) {
        if (serviceStatus.loadingServices.length > 0) {
            return `Loading ${serviceStatus.loadingServices[0]}...`;
        }
        
        if (serviceStatus.loadedServices.length === serviceStatus.totalServices) {
            return 'Startup Complete';
        }
        
        return 'Initializing Services...';
    }

    getMemoryUsage() {
        const memUsage = process.memoryUsage();
        return Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    }

    getStartupTime() {
        return process.uptime() * 1000; // milliseconds
    }

    estimateTimeRemaining(progress) {
        if (progress >= 100) return 0;
        
        const elapsed = this.getStartupTime();
        const estimated = elapsed / (progress / 100);
        return Math.max(0, estimated - elapsed);
    }
}

module.exports = StartupController;
```

### 4. CSS Styling for StartupProgress
```css
.startup-progress-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(5px);
}

.startup-progress-container {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
}

.startup-progress-header {
    text-align: center;
    margin-bottom: 2rem;
}

.startup-progress-header h2 {
    color: #333;
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
}

.startup-progress-header p {
    color: #666;
    margin: 0;
    font-size: 0.9rem;
}

.progress-step {
    margin-bottom: 1.5rem;
}

.step-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.step-name {
    font-weight: 500;
    color: #333;
}

.step-percentage {
    color: #666;
    font-size: 0.9rem;
}

.step-progress-bar {
    width: 100%;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
}

.step-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #45a049);
    border-radius: 4px;
    transition: width 0.3s ease;
}

.overall-progress {
    margin-bottom: 1.5rem;
}

.overall-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
}

.overall-progress-bar {
    width: 100%;
    height: 12px;
    background: #f0f0f0;
    border-radius: 6px;
    overflow: hidden;
}

.overall-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #2196F3, #1976D2);
    border-radius: 6px;
    transition: width 0.3s ease;
}

.startup-status {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.status-item:last-child {
    margin-bottom: 0;
}

.status-label {
    color: #666;
    font-size: 0.9rem;
}

.status-value {
    font-weight: 500;
    color: #333;
}

.startup-error {
    background: #ffebee;
    border: 1px solid #ffcdd2;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    text-align: center;
}

.startup-error p {
    color: #c62828;
    margin: 0 0 1rem 0;
}

.startup-error button {
    background: #c62828;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
}

.startup-error button:hover {
    background: #b71c1c;
}

.startup-progress-footer {
    text-align: center;
    color: #666;
    font-size: 0.8rem;
    font-style: italic;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 600px) {
    .startup-progress-container {
        padding: 1.5rem;
        margin: 1rem;
    }
    
    .startup-progress-header h2 {
        font-size: 1.3rem;
    }
}
```

## Success Criteria
- [ ] Startup progress indicator functional and responsive
- [ ] Real-time progress updates working via WebSocket
- [ ] Lazy data loading implemented for frontend
- [ ] Startup status API endpoints responding correctly
- [ ] Frontend initialization optimized
- [ ] Progress tracking accurate and smooth
- [ ] Error handling and retry mechanisms working
- [ ] Unit tests passing with >90% coverage

## Testing Strategy
- **Unit Tests**: Component rendering, hook behavior, API calls
- **Integration Tests**: WebSocket communication, progress updates
- **Performance Tests**: Component rendering speed, memory usage
- **Error Handling**: Network failures, API errors, WebSocket disconnection

## Risk Mitigation
- **WebSocket Failures**: Fallback to polling mechanism
- **API Errors**: Graceful error handling and retry logic
- **Performance Issues**: Component optimization and lazy loading
- **User Experience**: Smooth animations and responsive design

## Final Integration
This phase completes the startup optimization by providing a seamless user experience with real-time progress feedback, ensuring users understand the system is working efficiently during the optimized startup process. 