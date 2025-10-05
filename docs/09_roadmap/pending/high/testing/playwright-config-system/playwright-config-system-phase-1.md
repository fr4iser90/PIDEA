# Phase 1: Frontend Database Integration

## Overview
Fix the existing Save Configuration button to actually save to database and implement configuration loading from database on component mount.

## Estimated Time: 2 hours

## Tasks

### 1. Fix Save Configuration Button (1 hour)
- [ ] Modify `handleConfigSubmit` to call `apiRepository.updatePlaywrightTestConfig()`
- [ ] Add loading state during save operation
- [ ] Add success/error feedback messages
- [ ] Keep existing `onConfigUpdate()` call for parent component

### 2. Implement Configuration Loading (1 hour)
- [ ] Add `useEffect` hook to load configuration on component mount
- [ ] Implement `loadConfigurationFromDatabase` function
- [ ] Add loading state during configuration load
- [ ] Handle empty configuration gracefully
- [ ] Add error handling for load failures

## Implementation Details

### Save Button Fix
```jsx
// Modify handleConfigSubmit in TestConfiguration.jsx (Line 67-71)
const handleConfigSubmit = async (e) => {
  e.preventDefault();
  
  try {
    setSavingConfig(true);
    
    // Save to database using existing API method
    const result = await apiRepository.updatePlaywrightTestConfig(null, configForm);
    
    if (result.success) {
      setShowSuccessMessage('Configuration saved successfully');
      // Also update parent component
      onConfigUpdate(configForm);
    } else {
      setShowErrorMessage('Failed to save configuration');
    }
  } catch (error) {
    console.error('Error saving configuration:', error);
    setShowErrorMessage('Error saving configuration');
  } finally {
    setSavingConfig(false);
  }
  
  setShowConfigForm(false);
};
```

### Configuration Loading Implementation
```jsx
// Add to TestConfiguration.jsx
useEffect(() => {
  const loadConfiguration = async () => {
    try {
      setLoadingConfig(true);
      const result = await apiRepository.getPlaywrightTestConfig(projectId);
      
      if (result.success && result.data.config) {
        setConfigForm(result.data.config);
        onConfigUpdate(result.data.config);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  if (projectId) {
    loadConfiguration();
  }
}, [projectId]);
```

### State Management Updates
```jsx
// Add to TestConfiguration.jsx state
const [savingConfig, setSavingConfig] = useState(false);
const [loadingConfig, setLoadingConfig] = useState(false);
const [showSuccessMessage, setShowSuccessMessage] = useState(false);
const [showErrorMessage, setShowErrorMessage] = useState(false);

// Update Save button to show loading state
<button
  type="submit"
  disabled={savingConfig}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
>
  {savingConfig ? 'Saving...' : 'Save Configuration'}
</button>
```

## Files to Modify
- `frontend/src/presentation/components/tests/main/TestConfiguration.jsx`

## Success Criteria
- [ ] Save button calls `apiRepository.updatePlaywrightTestConfig()`
- [ ] Configuration loads from database on component mount
- [ ] Loading states implemented for save/load operations
- [ ] Error handling implemented
- [ ] Success/error feedback implemented
- [ ] Parent component still receives updates via `onConfigUpdate()`

## Testing
- [ ] Test save button database integration
- [ ] Test configuration loading on mount
- [ ] Test error handling
- [ ] Test loading states
- [ ] Test success/error feedback
