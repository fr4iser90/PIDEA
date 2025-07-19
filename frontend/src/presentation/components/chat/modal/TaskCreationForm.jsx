import React, { useState, useEffect, useCallback } from 'react';
import VoiceInput from '../../common/VoiceInput';

const TaskCreationForm = ({ onSubmit, onCancel, isGeneratingPlan, errors }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature',
    priority: 'medium',
    category: '',
    estimatedHours: ''
  });
  
  const [validation, setValidation] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Validation rules
  const validationRules = {
    title: {
      required: true,
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/,
      message: 'Title must be 3-100 characters, alphanumeric only'
    },
    description: {
      required: true,
      minLength: 10,
      maxLength: 1000,
      message: 'Description must be 10-1000 characters'
    },
    category: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\s\-_]+$/,
      message: 'Category must be 2-50 characters, alphanumeric only'
    },
    estimatedHours: {
      required: false,
      type: 'number',
      min: 1,
      max: 100,
      message: 'Estimated time must be 1-100 hours'
    },
    type: {
      required: true,
      enum: ['feature', 'bugfix', 'refactor', 'documentation', 'testing', 'performance', 'security', 'automation', 'deployment'],
      message: 'Please select a valid task type'
    },
    priority: {
      required: true,
      enum: ['low', 'medium', 'high', 'urgent'],
      message: 'Please select a valid priority level'
    }
  };

  // Validation function
  const validateField = useCallback((field, value) => {
    const rules = validationRules[field];
    if (!rules) return { isValid: true, message: '' };
    
    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      return { isValid: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` };
    }
    
    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      return { isValid: false, message: rules.message || `${field} must be at least ${rules.minLength} characters` };
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      return { isValid: false, message: rules.message || `${field} must be at most ${rules.maxLength} characters` };
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return { isValid: false, message: rules.message || `${field} format is invalid` };
    }
    
    // Type validation
    if (rules.type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return { isValid: false, message: `${field} must be a number` };
      }
      if (rules.min && num < rules.min) {
        return { isValid: false, message: `${field} must be at least ${rules.min}` };
      }
      if (rules.max && num > rules.max) {
        return { isValid: false, message: `${field} must be at most ${rules.max}` };
      }
    }
    
    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      return { isValid: false, message: rules.message || `Please select a valid ${field}` };
    }
    
    return { isValid: true, message: '' };
  }, [validationRules]);

  // Form validation
  const validateForm = useCallback(() => {
    const newValidation = {};
    let formIsValid = true;
    
    Object.keys(formData).forEach(field => {
      const validation = validateField(field, formData[field]);
      newValidation[field] = validation;
      if (!validation.isValid) {
        formIsValid = false;
      }
    });
    
    setValidation(newValidation);
    setIsValid(formIsValid);
    return formIsValid;
  }, [formData, validateField]);

  // Debounced validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateForm();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [formData, validateForm]);

  // Data persistence
  const STORAGE_KEY = 'task-creation-form-data';

  // Load saved data
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to load saved form data:', error);
      }
    }
  }, []);

  // Save data on change
  useEffect(() => {
    if (Object.values(formData).some(value => value !== '')) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  // Clear saved data on successful submission
  const clearSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
  };
  
  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleFieldBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach(field => {
      allTouched[field] = true;
    });
    setTouched(allTouched);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      clearSavedData(); // Clear saved data on successful submission
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      type: 'feature',
      priority: 'medium',
      category: '',
      estimatedHours: ''
    });
    setValidation({});
    setTouched({});
    clearSavedData();
  };

  // Voice input handlers
  const handleVoiceTitle = (text) => {
    handleInputChange('title', text);
  };

  const handleVoiceDescription = (text) => {
    handleInputChange('description', text);
  };

  return (
    <div className="modal-description">
      <p>Describe your task and let AI create a comprehensive implementation plan with automatic execution.</p>
      
      <form onSubmit={handleSubmit} className="task-creation-form">
        {/* Task Title */}
        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Task Title *
          </label>
          <div className="input-with-voice">
            <input
              type="text"
              id="title"
              className={`form-input ${validation.title && !validation.title.isValid && touched.title ? 'form-input-error' : ''} ${validation.title && validation.title.isValid && touched.title && formData.title ? 'form-input-success' : ''}`}
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              onBlur={() => handleFieldBlur('title')}
              placeholder="Enter a descriptive title for your task..."
              disabled={isGeneratingPlan}
              required
              maxLength={100}
            />
            <VoiceInput 
              onTextReceived={handleVoiceTitle}
              disabled={isGeneratingPlan}
              size="md"
            />
          </div>
          {validation.title && !validation.title.isValid && touched.title && (
            <div className="error-message">{validation.title.message}</div>
          )}
          {validation.title && validation.title.isValid && touched.title && formData.title && (
            <div className="success-message">✓ Title is valid</div>
          )}
          <div className="char-count">
            {formData.title.length}/100
          </div>
        </div>
        
        {/* Task Description */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Task Description *
          </label>
          <div className="input-with-voice">
            <textarea
              id="description"
              className={`form-textarea ${validation.description && !validation.description.isValid && touched.description ? 'form-textarea-error' : ''} ${validation.description && validation.description.isValid && touched.description && formData.description ? 'form-textarea-success' : ''}`}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={() => handleFieldBlur('description')}
              placeholder="Describe what you want to build or implement in detail..."
              rows={4}
              disabled={isGeneratingPlan}
              required
              maxLength={1000}
            />
            <VoiceInput 
              onTextReceived={handleVoiceDescription}
              disabled={isGeneratingPlan}
              size="md"
            />
          </div>
          {validation.description && !validation.description.isValid && touched.description && (
            <div className="error-message">{validation.description.message}</div>
          )}
          {validation.description && validation.description.isValid && touched.description && formData.description && (
            <div className="success-message">✓ Description is valid</div>
          )}
          <div className="char-count">
            {formData.description.length}/1000
          </div>
        </div>
        
        {/* Task Type and Priority Row */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="type" className="form-label">
              Task Type
            </label>
            <select
              id="type"
              className="form-select"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              disabled={isGeneratingPlan}
            >
              <option value="feature">Feature</option>
              <option value="bugfix">Bug Fix</option>
              <option value="refactor">Refactor</option>
              <option value="documentation">Documentation</option>
              <option value="testing">Testing</option>
              <option value="performance">Performance</option>
              <option value="security">Security</option>
              <option value="automation">Automation</option>
              <option value="deployment">Deployment</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="priority" className="form-label">
              Priority
            </label>
            <select
              id="priority"
              className="form-select"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              disabled={isGeneratingPlan}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        
        {/* Category and Estimated Time Row */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              Category *
            </label>
            <input
              type="text"
              id="category"
              className={`form-input ${validation.category && !validation.category.isValid && touched.category ? 'form-input-error' : ''} ${validation.category && validation.category.isValid && touched.category && formData.category ? 'form-input-success' : ''}`}
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              onBlur={() => handleFieldBlur('category')}
              placeholder="e.g., frontend, backend, database, etc."
              disabled={isGeneratingPlan}
              required
              maxLength={50}
            />
            {validation.category && !validation.category.isValid && touched.category && (
              <div className="error-message">{validation.category.message}</div>
            )}
            {validation.category && validation.category.isValid && touched.category && formData.category && (
              <div className="success-message">✓ Category is valid</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="estimatedHours" className="form-label">
              Estimated Time (hours) <span className="optional-label">(Optional)</span>
            </label>
            <input
              type="number"
              id="estimatedHours"
              className={`form-input ${validation.estimatedHours && !validation.estimatedHours.isValid && touched.estimatedHours ? 'form-input-error' : ''} ${validation.estimatedHours && validation.estimatedHours.isValid && touched.estimatedHours && formData.estimatedHours ? 'form-input-success' : ''}`}
              value={formData.estimatedHours}
              onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
              onBlur={() => handleFieldBlur('estimatedHours')}
              placeholder="2"
              min="1"
              max="100"
              disabled={isGeneratingPlan}
            />
            {validation.estimatedHours && !validation.estimatedHours.isValid && touched.estimatedHours && (
              <div className="error-message">{validation.estimatedHours.message}</div>
            )}
            {validation.estimatedHours && validation.estimatedHours.isValid && touched.estimatedHours && formData.estimatedHours && (
              <div className="success-message">✓ Time estimate is valid</div>
            )}
          </div>
        </div>
        
        {/* Submit Error */}
        {errors && errors.length > 0 && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {errors[0]}
          </div>
        )}
        
        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={handleReset}
            disabled={isGeneratingPlan}
          >
            Reset
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={onCancel}
            disabled={isGeneratingPlan}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isGeneratingPlan || !isValid}
          >
            {isGeneratingPlan ? (
              <>
                <div className="spinner"></div>
                Generating Plan...
              </>
            ) : (
              '📋 Generate Plan'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskCreationForm; 