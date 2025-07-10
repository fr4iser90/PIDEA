# IDE Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the Unified IDE API and React components into your application. The integration enables seamless management of multiple IDE instances, switching between them, and accessing their features and DOM data.

## Prerequisites

Before integrating the IDE components, ensure you have:

- Node.js 16+ installed
- React 18+ in your project
- Access to the Unified IDE API endpoints
- WebSocket support for real-time updates

## Installation

### 1. Install Dependencies

```bash
npm install @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test
```

### 2. Copy Component Files

Copy the IDE component files to your project:

```bash
# Create directory structure
mkdir -p src/presentation/components/ide

# Copy components
cp -r ide-components/* src/presentation/components/ide/
```

### 3. Copy CSS Files

```bash
# Copy CSS files
cp ide-components.css src/css/
```

## Basic Integration

### 1. Set Up IDE Context Provider

Wrap your application with the IDE context provider:

```jsx
// src/App.jsx
import React from 'react';
import { IDEProvider } from '@/presentation/components/ide/IDEContext';
import { BrowserRouter as Router } from 'react-router-dom';

function App() {
  return (
    <Router>
      <IDEProvider>
        <div className="app">
          <header className="app-header">
            <h1>Your Application</h1>
          </header>
          <main className="app-main">
            {/* Your application content */}
          </main>
        </div>
      </IDEProvider>
    </Router>
  );
}

export default App;
```

### 2. Add IDE Selection Component

Add the IDE selector to your navigation:

```jsx
// src/components/Navigation.jsx
import React from 'react';
import { useIDEContext } from '@/presentation/components/ide/IDEContext';
import IDESelector from '@/presentation/components/ide/IDESelector';

function Navigation() {
  const { activePort, setActivePort } = useIDEContext();

  const handleIDEChange = (port) => {
    setActivePort(port);
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>Your App</h2>
      </div>
      <div className="nav-controls">
        <IDESelector
          value={activePort}
          onChange={handleIDEChange}
          showStatus={true}
          showFeatures={true}
        />
      </div>
    </nav>
  );
}

export default Navigation;
```

### 3. Add IDE Switch Component

Add IDE switching functionality:

```jsx
// src/components/IDESwitchPanel.jsx
import React from 'react';
import { useIDEContext } from '@/presentation/components/ide/IDEContext';
import IDESwitch from '@/presentation/components/ide/IDESwitch';

function IDESwitchPanel() {
  const { activePort, availableIDEs } = useIDEContext();

  const handleSwitchComplete = (result) => {
    console.log('IDE switch completed:', result);
    // Handle successful switch
  };

  const handleSwitchError = (error) => {
    console.error('IDE switch failed:', error);
    // Handle switch error
  };

  return (
    <div className="ide-switch-panel">
      <h3>IDE Switch</h3>
      <IDESwitch
        currentPort={activePort}
        targetPort={availableIDEs[0]?.port}
        onSwitchComplete={handleSwitchComplete}
        onSwitchError={handleSwitchError}
        showProgress={true}
      />
    </div>
  );
}

export default IDESwitchPanel;
```

### 4. Add IDE Mirror Component

Add IDE mirror interface:

```jsx
// src/components/IDEMirrorPanel.jsx
import React from 'react';
import { useIDEContext } from '@/presentation/components/ide/IDEContext';
import IDEMirror from '@/presentation/components/ide/IDEMirror';

function IDEMirrorPanel() {
  const { activePort } = useIDEContext();

  return (
    <div className="ide-mirror-panel">
      <h3>IDE Mirror</h3>
      <IDEMirror
        activePort={activePort}
        mode="view"
        autoRefresh={true}
        refreshInterval={5000}
        showProgress={true}
      />
    </div>
  );
}

export default IDEMirrorPanel;
```

### 5. Add IDE Features Component

Add IDE features display:

```jsx
// src/components/IDEFeaturesPanel.jsx
import React from 'react';
import { useIDEContext } from '@/presentation/components/ide/IDEContext';
import IDEFeatures from '@/presentation/components/ide/IDEFeatures';

function IDEFeaturesPanel() {
  const { activePort } = useIDEContext();

  return (
    <div className="ide-features-panel">
      <h3>IDE Features</h3>
      <IDEFeatures
        activePort={activePort}
        showDetails={true}
        showCapabilities={true}
      />
    </div>
  );
}

export default IDEFeaturesPanel;
```

## Advanced Integration

### 1. Custom Event Handling

Implement custom event handling for IDE events:

```jsx
// src/hooks/useIDEEvents.js
import { useEffect } from 'react';
import { useIDEContext } from '@/presentation/components/ide/IDEContext';

export function useIDEEvents() {
  const { eventBus } = useIDEContext();

  useEffect(() => {
    const handleIDEStatusChanged = (data) => {
      console.log('IDE status changed:', data);
      // Handle status change
    };

    const handleIDESelectionChanged = (data) => {
      console.log('IDE selection changed:', data);
      // Handle selection change
    };

    const handleDOMUpdated = (data) => {
      console.log('DOM updated:', data);
      // Handle DOM update
    };

    const handleFeaturesUpdated = (data) => {
      console.log('Features updated:', data);
      // Handle features update
    };

    // Subscribe to events
    eventBus.on('ideStatusChanged', handleIDEStatusChanged);
    eventBus.on('ideSelectionChanged', handleIDESelectionChanged);
    eventBus.on('domUpdated', handleDOMUpdated);
    eventBus.on('featuresUpdated', handleFeaturesUpdated);

    // Cleanup
    return () => {
      eventBus.off('ideStatusChanged', handleIDEStatusChanged);
      eventBus.off('ideSelectionChanged', handleIDESelectionChanged);
      eventBus.off('domUpdated', handleDOMUpdated);
      eventBus.off('featuresUpdated', handleFeaturesUpdated);
    };
  }, [eventBus]);
}
```

### 2. Custom API Integration

Create custom API integration:

```jsx
// src/services/IDEService.js
import { apiCall } from '@/infrastructure/repositories/APIChatRepository';

export class IDEService {
  static async getAvailableIDEs() {
    try {
      const response = await apiCall('/api/ide/available');
      return response.data;
    } catch (error) {
      console.error('Failed to get available IDEs:', error);
      throw error;
    }
  }

  static async switchIDE(port, reason = 'manual', fromPort = null) {
    try {
      const response = await apiCall('/api/ide/selection', {
        method: 'POST',
        body: JSON.stringify({
          port,
          reason,
          fromPort
        })
      });
      return response.data;
    } catch (error) {
      console.error('Failed to switch IDE:', error);
      throw error;
    }
  }

  static async getIDEFeatures(port) {
    try {
      const response = await apiCall(`/api/ide/features?port=${port}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get IDE features:', error);
      throw error;
    }
  }

  static async getDOMData(port) {
    try {
      const response = await apiCall(`/api/ide/mirror/dom?port=${port}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get DOM data:', error);
      throw error;
    }
  }
}
```

### 3. Custom Hooks

Create custom hooks for IDE functionality:

```jsx
// src/hooks/useIDE.js
import { useState, useEffect, useCallback } from 'react';
import { IDEService } from '@/services/IDEService';

export function useIDE(port) {
  const [ideData, setIDEData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadIDEData = useCallback(async () => {
    if (!port) return;

    setLoading(true);
    setError(null);

    try {
      const [features, domData] = await Promise.all([
        IDEService.getIDEFeatures(port),
        IDEService.getDOMData(port)
      ]);

      setIDEData({ features, domData });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [port]);

  useEffect(() => {
    loadIDEData();
  }, [loadIDEData]);

  const refresh = useCallback(() => {
    loadIDEData();
  }, [loadIDEData]);

  return {
    ideData,
    loading,
    error,
    refresh
  };
}
```

### 4. Custom Components

Create custom components that extend the base IDE components:

```jsx
// src/components/CustomIDESwitch.jsx
import React, { useState } from 'react';
import IDESwitch from '@/presentation/components/ide/IDESwitch';

function CustomIDESwitch({ currentPort, targetPort, onSwitchComplete, onSwitchError }) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSwitchRequest = () => {
    setShowConfirmation(true);
  };

  const handleConfirmSwitch = () => {
    setShowConfirmation(false);
    // Proceed with switch
  };

  const handleCancelSwitch = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="custom-ide-switch">
      <IDESwitch
        currentPort={currentPort}
        targetPort={targetPort}
        onSwitchComplete={onSwitchComplete}
        onSwitchError={onSwitchError}
        showProgress={true}
      />
      
      {showConfirmation && (
        <div className="confirmation-dialog">
          <p>Are you sure you want to switch IDEs?</p>
          <button onClick={handleConfirmSwitch}>Confirm</button>
          <button onClick={handleCancelSwitch}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default CustomIDESwitch;
```

## Configuration

### 1. Environment Variables

Set up environment variables for API configuration:

```bash
# .env
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000/ws
REACT_APP_API_TIMEOUT=10000
REACT_APP_WS_RECONNECT_INTERVAL=5000
```

### 2. API Configuration

Configure API settings:

```jsx
// src/config/api.js
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

export const WS_CONFIG = {
  url: process.env.REACT_APP_WS_URL,
  reconnectInterval: parseInt(process.env.REACT_APP_WS_RECONNECT_INTERVAL) || 5000
};
```

### 3. Authentication

Set up authentication for API calls:

```jsx
// src/services/auth.js
export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

export function removeAuthToken() {
  localStorage.removeItem('authToken');
}

// Update API call to include auth
export async function authenticatedApiCall(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  };

  return apiCall(endpoint, config);
}
```

## Styling Integration

### 1. CSS Customization

Customize the component styles:

```css
/* src/css/ide-custom.css */
.ide-switch {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #f8f9fa;
}

.ide-mirror {
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
}

.ide-features {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  padding: 20px;
}

.ide-selector select {
  border: 2px solid #007bff;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
}
```

### 2. Theme Integration

Integrate with your application theme:

```jsx
// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  const themeConfig = {
    light: {
      primary: '#007bff',
      secondary: '#6c757d',
      background: '#ffffff',
      text: '#212529'
    },
    dark: {
      primary: '#0d6efd',
      secondary: '#adb5bd',
      background: '#212529',
      text: '#f8f9fa'
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

## Testing Integration

### 1. Unit Tests

Add unit tests for your integration:

```jsx
// src/components/__tests__/IDESwitchPanel.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IDESwitchPanel from '../IDESwitchPanel';
import { IDEProvider } from '@/presentation/components/ide/IDEContext';

describe('IDESwitchPanel', () => {
  it('should render IDE switch component', () => {
    render(
      <IDEProvider>
        <IDESwitchPanel />
      </IDEProvider>
    );

    expect(screen.getByText('IDE Switch')).toBeInTheDocument();
  });

  it('should handle switch completion', () => {
    const mockOnSwitchComplete = jest.fn();
    
    render(
      <IDEProvider>
        <IDESwitchPanel onSwitchComplete={mockOnSwitchComplete} />
      </IDEProvider>
    );

    // Test switch completion
  });
});
```

### 2. Integration Tests

Add integration tests:

```jsx
// src/tests/integration/IDEIntegration.test.jsx
import { test, expect } from '@playwright/test';

test.describe('IDE Integration', () => {
  test('should complete IDE switching workflow', async ({ page }) => {
    await page.goto('/');
    
    // Test IDE selection
    await page.selectOption('.ide-selector select', '9223');
    
    // Test IDE switching
    await page.click('.switch-button');
    
    // Verify switch completion
    await expect(page.locator('.switch-status')).toContainText('Switch completed');
  });
});
```

## Performance Optimization

### 1. Lazy Loading

Implement lazy loading for IDE components:

```jsx
// src/components/LazyIDEMirror.jsx
import React, { Suspense } from 'react';

const IDEMirror = React.lazy(() => import('@/presentation/components/ide/IDEMirror'));

function LazyIDEMirror(props) {
  return (
    <Suspense fallback={<div>Loading IDE Mirror...</div>}>
      <IDEMirror {...props} />
    </Suspense>
  );
}

export default LazyIDEMirror;
```

### 2. Memoization

Optimize component performance:

```jsx
// src/components/OptimizedIDEFeatures.jsx
import React, { memo, useMemo } from 'react';
import IDEFeatures from '@/presentation/components/ide/IDEFeatures';

const OptimizedIDEFeatures = memo(({ activePort, ...props }) => {
  const processedFeatures = useMemo(() => {
    // Process features data
    return processFeaturesData(props.features);
  }, [props.features]);

  return (
    <IDEFeatures
      activePort={activePort}
      features={processedFeatures}
      {...props}
    />
  );
});

export default OptimizedIDEFeatures;
```

## Error Handling

### 1. Global Error Boundary

Implement error boundary for IDE components:

```jsx
// src/components/IDEErrorBoundary.jsx
import React from 'react';

class IDEErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('IDE Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ide-error-boundary">
          <h2>IDE Error</h2>
          <p>Something went wrong with the IDE components.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default IDEErrorBoundary;
```

### 2. Retry Logic

Implement retry logic for failed operations:

```jsx
// src/hooks/useRetry.js
import { useState, useCallback } from 'react';

export function useRetry(maxRetries = 3, delay = 1000) {
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(async (operation) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        setRetryCount(i + 1);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }, [maxRetries, delay]);

  return { retry, retryCount };
}
```

## Deployment

### 1. Build Configuration

Configure build settings:

```json
// package.json
{
  "scripts": {
    "build": "react-scripts build",
    "build:prod": "REACT_APP_ENV=production react-scripts build"
  }
}
```

### 2. Environment Configuration

Set up environment-specific configurations:

```jsx
// src/config/environment.js
const environments = {
  development: {
    apiUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws',
    debug: true
  },
  staging: {
    apiUrl: 'https://staging-api.yourapp.com',
    wsUrl: 'wss://staging-ws.yourapp.com',
    debug: false
  },
  production: {
    apiUrl: 'https://api.yourapp.com',
    wsUrl: 'wss://ws.yourapp.com',
    debug: false
  }
};

export const config = environments[process.env.REACT_APP_ENV] || environments.development;
```

## Troubleshooting

### Common Issues

1. **Components not rendering**: Check if IDE context is properly provided
2. **API calls failing**: Verify API endpoints and authentication
3. **WebSocket not connecting**: Check WebSocket URL and network connectivity
4. **Performance issues**: Enable memoization and lazy loading
5. **Styling conflicts**: Check CSS specificity and class names

### Debug Mode

Enable debug mode for troubleshooting:

```javascript
// Enable debug mode
localStorage.setItem('ide-debug', 'true');

// Debug logging
if (localStorage.getItem('ide-debug') === 'true') {
  console.log('IDE Debug:', data);
}
```

### Support

For additional support:

1. Check the component documentation
2. Review the API documentation
3. Check the troubleshooting guide
4. Contact the development team 