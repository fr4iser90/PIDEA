# IDE React Components Documentation

## Overview

The IDE React components provide a unified interface for managing multiple IDE instances, switching between them, and displaying their features and DOM data. These components are built with React and integrate with the Unified IDE API.

## Component Architecture

The IDE components follow a modular architecture with the following structure:

```
src/presentation/components/ide/
├── IDESwitch.jsx          # IDE switching component
├── IDEMirror.jsx          # IDE mirror interface
├── IDEFeatures.jsx        # IDE features display
├── IDESelector.jsx        # IDE selection dropdown
└── IDEContext.jsx         # Context provider for IDE state
```

## IDE Context Provider

The `IDEContext` provides global state management for IDE-related functionality.

### Usage

```jsx
import { IDEProvider } from '@/presentation/components/ide/IDEContext';

function App() {
  return (
    <IDEProvider>
      <YourApp />
    </IDEProvider>
  );
}
```

### Context Values

```jsx
const {
  activePort,
  setActivePort,
  availableIDEs,
  currentIDE,
  switchIDE,
  ideFeatures,
  domData,
  loading,
  error
} = useIDEContext();
```

### Properties

- `activePort` (number): Currently active IDE port
- `setActivePort` (function): Function to change active port
- `availableIDEs` (array): List of available IDE instances
- `currentIDE` (object): Current IDE information
- `switchIDE` (function): Function to switch between IDEs
- `ideFeatures` (object): Features of current IDE
- `domData` (object): DOM data of current IDE
- `loading` (boolean): Loading state
- `error` (string): Error message if any

## IDESwitch Component

The `IDESwitch` component provides functionality to switch between different IDE instances.

### Props

```jsx
IDESwitch.propTypes = {
  currentPort: PropTypes.number,
  targetPort: PropTypes.number,
  onSwitchComplete: PropTypes.func,
  onSwitchError: PropTypes.func,
  autoSwitch: PropTypes.bool,
  showProgress: PropTypes.bool,
  eventBus: PropTypes.object
};
```

### Usage

```jsx
import IDESwitch from '@/presentation/components/ide/IDESwitch';

function IDEInterface() {
  const handleSwitchComplete = (result) => {
    console.log('Switch completed:', result);
  };

  const handleSwitchError = (error) => {
    console.error('Switch failed:', error);
  };

  return (
    <IDESwitch
      currentPort={9222}
      targetPort={9223}
      onSwitchComplete={handleSwitchComplete}
      onSwitchError={handleSwitchError}
      showProgress={true}
    />
  );
}
```

### Features

- **Manual Switching**: Switch between IDEs manually
- **Auto Switching**: Automatic switching based on conditions
- **Progress Tracking**: Visual progress indicators during switch
- **Error Handling**: Graceful error handling and recovery
- **History Tracking**: Track switch history
- **Event Integration**: WebSocket event integration

### Events

The component listens to and emits the following events:

- `ideSwitchRequested`: When a switch is requested
- `ideSwitchProgress`: Progress updates during switch
- `ideSwitchComplete`: When switch is completed
- `ideSwitchError`: When switch fails

## IDEMirror Component

The `IDEMirror` component displays the DOM structure of the IDE interface and allows interaction.

### Props

```jsx
IDEMirror.propTypes = {
  activePort: PropTypes.number,
  mode: PropTypes.oneOf(['view', 'interact']),
  autoRefresh: PropTypes.bool,
  refreshInterval: PropTypes.number,
  showProgress: PropTypes.bool,
  eventBus: PropTypes.object
};
```

### Usage

```jsx
import IDEMirror from '@/presentation/components/ide/IDEMirror';

function IDEMirrorInterface() {
  return (
    <IDEMirror
      activePort={9222}
      mode="view"
      autoRefresh={true}
      refreshInterval={5000}
      showProgress={true}
    />
  );
}
```

### Features

- **DOM Display**: Visual representation of IDE DOM structure
- **Interactive Mode**: Click and interact with IDE elements
- **Auto Refresh**: Automatic DOM updates
- **Element Details**: Detailed information about selected elements
- **Real-time Updates**: WebSocket-based real-time updates
- **Error Recovery**: Automatic retry on connection failures

### Modes

- **View Mode**: Read-only display of DOM structure
- **Interact Mode**: Interactive mode for clicking and interacting

### Element Interaction

In interact mode, users can:
- Click on elements
- Hover over elements
- View element properties
- Navigate DOM tree

## IDEFeatures Component

The `IDEFeatures` component displays the features and capabilities of the current IDE.

### Props

```jsx
IDEFeatures.propTypes = {
  activePort: PropTypes.number,
  showDetails: PropTypes.bool,
  showCapabilities: PropTypes.bool,
  eventBus: PropTypes.object
};
```

### Usage

```jsx
import IDEFeatures from '@/presentation/components/ide/IDEFeatures';

function IDEFeaturesInterface() {
  return (
    <IDEFeatures
      activePort={9222}
      showDetails={true}
      showCapabilities={true}
    />
  );
}
```

### Features

- **Feature Display**: Show available IDE features
- **Capability Overview**: Display IDE capabilities
- **Version Information**: Show feature versions
- **Status Indicators**: Visual status indicators
- **Category Grouping**: Group features by category
- **Real-time Updates**: Update when IDE changes

### Feature Categories

- **Core Features**: Essential IDE functionality
- **Development Tools**: Development-specific features
- **Productivity**: Productivity-enhancing features

## IDESelector Component

The `IDESelector` component provides a dropdown interface for selecting IDE instances.

### Props

```jsx
IDESelector.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  showStatus: PropTypes.bool,
  showFeatures: PropTypes.bool,
  eventBus: PropTypes.object
};
```

### Usage

```jsx
import IDESelector from '@/presentation/components/ide/IDESelector';

function IDESelectorInterface() {
  const handleIDEChange = (port) => {
    console.log('Selected IDE port:', port);
  };

  return (
    <IDESelector
      value={9222}
      onChange={handleIDEChange}
      showStatus={true}
      showFeatures={true}
    />
  );
}
```

### Features

- **IDE Selection**: Dropdown for selecting IDE instances
- **Status Indicators**: Visual status indicators for each IDE
- **Feature Badges**: Show available features for each IDE
- **Real-time Updates**: Update when IDE status changes
- **Filtering**: Filter IDEs by status or features

## CSS Styling

All components include CSS modules for styling. The main CSS file is `ide-components.css`.

### CSS Classes

#### IDESwitch
- `.ide-switch`: Main container
- `.switch-controls`: Control buttons
- `.switch-progress`: Progress indicators
- `.switch-status`: Status messages
- `.switch-history`: History display

#### IDEMirror
- `.ide-mirror`: Main container
- `.dom-tree`: DOM tree display
- `.element-node`: Individual DOM elements
- `.element-details`: Element details panel
- `.mirror-controls`: Control buttons

#### IDEFeatures
- `.ide-features`: Main container
- `.feature-category`: Feature category sections
- `.feature-item`: Individual feature items
- `.feature-status`: Feature status indicators
- `.capabilities`: Capabilities display

#### IDESelector
- `.ide-selector`: Main container
- `.selector-dropdown`: Dropdown element
- `.ide-option`: Individual IDE options
- `.status-indicator`: Status indicators
- `.feature-badges`: Feature badges

## Event Handling

All components integrate with the event bus for real-time updates:

### WebSocket Events

```javascript
// Listen for IDE events
eventBus.on('ideStatusChanged', (data) => {
  // Handle IDE status changes
});

eventBus.on('ideSelectionChanged', (data) => {
  // Handle IDE selection changes
});

eventBus.on('domUpdated', (data) => {
  // Handle DOM updates
});

eventBus.on('featuresUpdated', (data) => {
  // Handle feature updates
});
```

### Component Events

```javascript
// Emit component events
eventBus.emit('ideSwitchRequested', {
  fromPort: 9222,
  toPort: 9223,
  reason: 'manual'
});

eventBus.emit('elementInteraction', {
  elementId: 'button1',
  action: 'click',
  coordinates: { x: 100, y: 200 }
});
```

## Error Handling

All components include comprehensive error handling:

### Error States

```jsx
// Error display
{error && (
  <div className="error-message">
    <p>{error}</p>
    <button onClick={handleRetry}>Retry</button>
  </div>
)}
```

### Loading States

```jsx
// Loading display
{loading && (
  <div className="loading-spinner">
    <p>Loading...</p>
  </div>
)}
```

### Retry Logic

```jsx
// Automatic retry
const handleRetry = async () => {
  setError(null);
  setLoading(true);
  try {
    await loadData();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## Performance Optimization

### Memoization

```jsx
// Memoize expensive operations
const memoizedFeatures = useMemo(() => {
  return processFeatures(rawFeatures);
}, [rawFeatures]);

const memoizedDOM = useMemo(() => {
  return processDOM(rawDOM);
}, [rawDOM]);
```

### Debouncing

```jsx
// Debounce frequent updates
const debouncedRefresh = useCallback(
  debounce(() => {
    refreshDOM();
  }, 1000),
  []
);
```

### Virtual Scrolling

```jsx
// Virtual scrolling for large DOM trees
import { FixedSizeList as List } from 'react-window';

const VirtualizedDOMTree = ({ items }) => (
  <List
    height={400}
    itemCount={items.length}
    itemSize={35}
    itemData={items}
  >
    {DOMTreeItem}
  </List>
);
```

## Testing

### Unit Tests

Each component includes comprehensive unit tests:

```javascript
// Example test
describe('IDESwitch Component', () => {
  it('should handle successful IDE switch', async () => {
    // Test implementation
  });

  it('should handle switch errors', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Integration tests verify component interactions:

```javascript
// Example integration test
describe('IDE Components Integration', () => {
  it('should update mirror when IDE changes', async () => {
    // Test implementation
  });
});
```

### E2E Tests

End-to-end tests verify complete workflows:

```javascript
// Example E2E test
test('should complete IDE switching workflow', async ({ page }) => {
  // Test implementation
});
```

## Accessibility

All components include accessibility features:

### ARIA Labels

```jsx
// Proper ARIA labels
<button
  aria-label="Switch to VS Code"
  aria-describedby="switch-description"
>
  Switch
</button>
```

### Keyboard Navigation

```jsx
// Keyboard navigation support
const handleKeyDown = (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    handleSwitch();
  }
};
```

### Screen Reader Support

```jsx
// Screen reader announcements
useEffect(() => {
  if (switchStatus) {
    announceToScreenReader(`IDE switch ${switchStatus}`);
  }
}, [switchStatus]);
```

## Browser Compatibility

The components support:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills

Required polyfills for older browsers:

```javascript
// Include polyfills
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```

## Bundle Size

Component bundle sizes (gzipped):

- IDESwitch: ~15KB
- IDEMirror: ~25KB
- IDEFeatures: ~12KB
- IDESelector: ~8KB
- IDEContext: ~5KB

Total: ~65KB

## Migration Guide

### From Legacy Components

1. **Update imports**: Change import paths to new component structure
2. **Update props**: Adapt to new prop interfaces
3. **Update event handling**: Use new event bus integration
4. **Update styling**: Adapt to new CSS class names
5. **Update context**: Use new IDE context provider

### Breaking Changes

- Component prop interfaces have changed
- Event names have been standardized
- CSS class names have been updated
- Context structure has been modified

## Troubleshooting

### Common Issues

1. **Component not rendering**: Check if IDE context is provided
2. **API calls failing**: Verify authentication and API endpoints
3. **WebSocket not connecting**: Check WebSocket URL and authentication
4. **Performance issues**: Enable memoization and virtual scrolling
5. **Styling issues**: Verify CSS imports and class names

### Debug Mode

Enable debug mode for detailed logging:

```javascript
// Enable debug mode
localStorage.setItem('ide-debug', 'true');
```

### Performance Monitoring

Monitor component performance:

```javascript
// Performance monitoring
const startTime = performance.now();
// Component operation
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime}ms`);
``` 