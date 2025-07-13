# Phase 2: Form and Validation

## Overview
Implement comprehensive form validation, enhanced dropdown options, and improved user experience with better error handling and loading states.

## Tasks

### 1. Enhanced Form Validation
**File**: `frontend/src/presentation/components/chat/modal/TaskCreationForm.jsx`

**Updates**:
```jsx
import React, { useState, useEffect } from 'react';

const TaskCreationForm = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  isSubmitting, 
  error 
}) => {
  const [validationErrors, setValidationErrors] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Validation rules
  const validationRules = {
    description: {
      required: true,
      minLength: 10,
      maxLength: 1000,
      pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/
    },
    category: {
      required: true,
      allowedValues: ['feature', 'bugfix', 'refactor', 'documentation', 'testing', 'performance', 'security', 'automation']
    },
    priority: {
      required: true,
      allowedValues: ['low', 'medium', 'high', 'urgent']
    },
    type: {
      required: true,
      allowedValues: ['feature', 'bugfix', 'refactor', 'documentation', 'testing', 'deployment']
    },
    estimatedHours: {
      required: true,
      min: 1,
      max: 100,
      type: 'number'
    }
  };

  // Validate field
  const validateField = (field, value) => {
    const rules = validationRules[field];
    const errors = [];

    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field} is required`);
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors.push(`${field} must be less than ${rules.maxLength} characters`);
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors.push(`${field} contains invalid characters`);
    }

    if (rules.allowedValues && value && !rules.allowedValues.includes(value)) {
      errors.push(`${field} must be one of: ${rules.allowedValues.join(', ')}`);
    }

    if (rules.min && value && parseInt(value) < rules.min) {
      errors.push(`${field} must be at least ${rules.min}`);
    }

    if (rules.max && value && parseInt(value) > rules.max) {
      errors.push(`${field} must be less than ${rules.max}`);
    }

    if (rules.type === 'number' && value && isNaN(parseInt(value))) {
      errors.push(`${field} must be a valid number`);
    }

    return errors;
  };

  // Validate all fields
  const validateForm = () => {
    const errors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
      const fieldErrors = validateField(field, formData[field]);
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    setIsValid(isValid);
    return isValid;
  };

  // Validate on form data change
  useEffect(() => {
    validateForm();
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: []
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const getFieldError = (field) => {
    return validationErrors[field] && validationErrors[field].length > 0 
      ? validationErrors[field][0] 
      : null;
  };

  const getFieldClassName = (field) => {
    const baseClass = 'form-control';
    const errorClass = getFieldError(field) ? 'form-control-error' : '';
    return `${baseClass} ${errorClass}`.trim();
  };

  return (
    <form onSubmit={handleSubmit} className="task-creation-form">
      <div className="form-group">
        <label htmlFor="description">
          Task Description *
          <span className="char-count">
            {formData.description.length}/1000
          </span>
        </label>
        <textarea
          id="description"
          className={getFieldClassName('description')}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe what you want to build or implement... (minimum 10 characters)"
          rows={4}
          required
          disabled={isSubmitting}
          maxLength={1000}
        />
        {getFieldError('description') && (
          <div className="field-error">{getFieldError('description')}</div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            className={getFieldClassName('category')}
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            disabled={isSubmitting}
            required
          >
            <option value="">Select category...</option>
            <option value="feature">🚀 Feature</option>
            <option value="bugfix">🐛 Bug Fix</option>
            <option value="refactor">🔧 Refactor</option>
            <option value="documentation">📚 Documentation</option>
            <option value="testing">🧪 Testing</option>
            <option value="performance">⚡ Performance</option>
            <option value="security">🔒 Security</option>
            <option value="automation">🤖 Automation</option>
          </select>
          {getFieldError('category') && (
            <div className="field-error">{getFieldError('category')}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority *</label>
          <select
            id="priority"
            className={getFieldClassName('priority')}
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            disabled={isSubmitting}
            required
          >
            <option value="">Select priority...</option>
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🟠 High</option>
            <option value="urgent">🔴 Urgent</option>
          </select>
          {getFieldError('priority') && (
            <div className="field-error">{getFieldError('priority')}</div>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="type">Type *</label>
          <select
            id="type"
            className={getFieldClassName('type')}
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            disabled={isSubmitting}
            required
          >
            <option value="">Select type...</option>
            <option value="feature">🚀 Feature</option>
            <option value="bugfix">🐛 Bug Fix</option>
            <option value="refactor">🔧 Refactor</option>
            <option value="documentation">📚 Documentation</option>
            <option value="testing">🧪 Testing</option>
            <option value="deployment">🚀 Deployment</option>
          </select>
          {getFieldError('type') && (
            <div className="field-error">{getFieldError('type')}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="estimatedHours">Estimated Hours *</label>
          <input
            type="number"
            id="estimatedHours"
            className={getFieldClassName('estimatedHours')}
            value={formData.estimatedHours}
            onChange={(e) => handleInputChange('estimatedHours', parseInt(e.target.value) || 1)}
            min="1"
            max="100"
            disabled={isSubmitting}
            required
          />
          {getFieldError('estimatedHours') && (
            <div className="field-error">{getFieldError('estimatedHours')}</div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={() => {
            setFormData({
              description: '',
              category: '',
              priority: '',
              type: '',
              estimatedHours: 2
            });
            setValidationErrors({});
          }}
          disabled={isSubmitting}
        >
          Reset
        </button>
        <button 
          type="submit" 
          className="btn-primary"
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? (
            <>
              <div className="spinner"></div>
              Creating Task...
            </>
          ) : (
            '🚀 Create & Execute'
          )}
        </button>
      </div>
    </form>
  );
};

export default TaskCreationForm;
```

### 2. Enhanced CSS for Validation
**File**: `frontend/src/css/modal/task-creation-modal.css`

**Additions**:
```css
/* Enhanced form styling */
.form-control {
  padding: 12px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a2a2a;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.2s;
  width: 100%;
}

.form-control:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.form-control-error {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2);
}

.form-control-error:focus {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.3);
}

.field-error {
  color: #ff6b6b;
  font-size: 0.8rem;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-error::before {
  content: "⚠️";
  font-size: 0.7rem;
}

.char-count {
  float: right;
  font-size: 0.8rem;
  color: #888;
  font-weight: normal;
}

.char-count.warning {
  color: #ffaa00;
}

.char-count.error {
  color: #ff6b6b;
}

/* Enhanced label styling */
.form-group label {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Enhanced select styling */
.form-group select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

/* Enhanced button states */
.btn-primary:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
  transform: none;
  opacity: 0.6;
}

.btn-primary:disabled:hover {
  background: #444;
  transform: none;
}

/* Form validation feedback */
.form-group.has-error label {
  color: #ff6b6b;
}

.form-group.has-error .form-control {
  border-color: #ff6b6b;
}

/* Success state */
.form-group.has-success .form-control {
  border-color: #44aa44;
  box-shadow: 0 0 0 2px rgba(68, 170, 68, 0.2);
}

/* Loading state enhancements */
.form-loading {
  opacity: 0.6;
  pointer-events: none;
}

.form-loading .form-control {
  background: #333;
}

/* Tooltip for validation */
.form-group {
  position: relative;
}

.form-group:hover .validation-tooltip {
  display: block;
}

.validation-tooltip {
  display: none;
  position: absolute;
  top: -30px;
  left: 0;
  background: #333;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  z-index: 1000;
  white-space: nowrap;
}

.validation-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 10px;
  border: 4px solid transparent;
  border-top-color: #333;
}
```

### 3. Enhanced TaskCreationModal with Validation
**File**: `frontend/src/presentation/components/chat/modal/TaskCreationModal.jsx`

**Updates**:
```jsx
import React, { useState, useEffect } from 'react';
import TaskCreationForm from './TaskCreationForm';
import '@/css/modal/task-creation-modal.css';

const TaskCreationModal = ({ 
  isOpen, 
  onClose, 
  eventBus,
  activePort 
}) => {
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    priority: '',
    type: '',
    estimatedHours: 2
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        description: '',
        category: '',
        priority: '',
        type: '',
        estimatedHours: 2
      });
      setError(null);
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const handleFormSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Show confirmation dialog
      setShowConfirmation(true);
      
      // TODO: Implement workflow orchestration in Phase 3
      console.log('Form submitted:', data);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close modal
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleConfirmSubmit = () => {
    setShowConfirmation(false);
    // Continue with actual submission
  };

  const handleCancelSubmit = () => {
    setShowConfirmation(false);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="task-creation-modal-overlay" onClick={handleClose}>
      <div className="task-creation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚀 Create AI-Powered Task</h2>
          <button className="modal-close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="modal-description">
            <p>Describe your task and let AI create a comprehensive implementation plan with automatic execution.</p>
            <div className="modal-features">
              <span className="feature-tag">🤖 AI Planning</span>
              <span className="feature-tag">⚡ Auto Execution</span>
              <span className="feature-tag">📋 Progress Tracking</span>
            </div>
          </div>

          {!showConfirmation ? (
            <TaskCreationForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
              error={error}
            />
          ) : (
            <div className="confirmation-dialog">
              <h3>Confirm Task Creation</h3>
              <div className="confirmation-details">
                <p><strong>Description:</strong> {formData.description}</p>
                <p><strong>Category:</strong> {formData.category}</p>
                <p><strong>Priority:</strong> {formData.priority}</p>
                <p><strong>Type:</strong> {formData.type}</p>
                <p><strong>Estimated Hours:</strong> {formData.estimatedHours}</p>
              </div>
              <div className="confirmation-warning">
                <p>⚠️ This will start an AI-powered workflow that will:</p>
                <ul>
                  <li>Create a comprehensive implementation plan</li>
                  <li>Generate tasks in the database</li>
                  <li>Execute the implementation automatically</li>
                  <li>Create Git branches and commits</li>
                </ul>
              </div>
              <div className="confirmation-actions">
                <button 
                  className="btn-secondary"
                  onClick={handleCancelSubmit}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner"></div>
                      Starting Workflow...
                    </>
                  ) : (
                    '🚀 Start AI Workflow'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCreationModal;
```

### 4. Additional CSS for Confirmation Dialog
**File**: `frontend/src/css/modal/task-creation-modal.css`

**Additions**:
```css
/* Modal features */
.modal-features {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.feature-tag {
  background: rgba(0, 122, 204, 0.2);
  color: #007acc;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  border: 1px solid rgba(0, 122, 204, 0.3);
}

/* Confirmation dialog */
.confirmation-dialog {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid #333;
}

.confirmation-dialog h3 {
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 1.2rem;
}

.confirmation-details {
  margin-bottom: 20px;
}

.confirmation-details p {
  margin: 8px 0;
  color: #ccc;
  font-size: 0.9rem;
}

.confirmation-details strong {
  color: #fff;
}

.confirmation-warning {
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid rgba(255, 170, 0, 0.3);
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.confirmation-warning p {
  margin: 0 0 12px 0;
  color: #ffaa00;
  font-weight: 500;
}

.confirmation-warning ul {
  margin: 0;
  padding-left: 20px;
  color: #ccc;
}

.confirmation-warning li {
  margin: 4px 0;
  font-size: 0.9rem;
}

.confirmation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Enhanced responsive design */
@media (max-width: 768px) {
  .modal-features {
    justify-content: center;
  }
  
  .confirmation-actions {
    flex-direction: column;
  }
  
  .confirmation-actions button {
    width: 100%;
  }
}
```

## Success Criteria
- [ ] Form validation works for all fields
- [ ] Real-time validation feedback is displayed
- [ ] Character count for description field works
- [ ] Confirmation dialog shows before submission
- [ ] Enhanced dropdown options with icons
- [ ] Error states are visually distinct
- [ ] Form cannot be submitted when invalid
- [ ] Responsive design works on all screen sizes
- [ ] Loading states are properly handled
- [ ] No console errors or warnings

## Testing Checklist
- [ ] Test all validation rules
- [ ] Test real-time validation updates
- [ ] Test form submission with invalid data
- [ ] Test confirmation dialog flow
- [ ] Test character count limits
- [ ] Test dropdown selections
- [ ] Test error message display
- [ ] Test loading state transitions
- [ ] Test responsive design breakpoints
- [ ] Test accessibility features 