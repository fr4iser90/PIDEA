/**
 * TaskModeBadge - Visual indicator for task modes
 * Provides color-coded badges for different task modes with strict error handling
 */

import React from 'react';
import { logger } from '@/infrastructure/logging/Logger';

const TaskModeBadge = ({ type, size = 'medium', showIcon = true }) => {
    // Known task modes with their configurations
    const typeConfigs = {
        refactoring: {
            label: 'Refactoring',
            color: '#4CAF50',
            bgColor: '#E8F5E8',
            icon: '🔄',
            description: 'Code restructuring and improvement'
        },
        testing: {
            label: 'Testing',
            color: '#2196F3',
            bgColor: '#E3F2FD',
            icon: '🧪',
            description: 'Test execution and validation'
        },
        analysis: {
            label: 'Analysis',
            color: '#FF9800',
            bgColor: '#FFF3E0',
            icon: '🔍',
            description: 'Code and project analysis'
        },
        deployment: {
            label: 'Deployment',
            color: '#9C27B0',
            bgColor: '#F3E5F5',
            icon: '🚀',
            description: 'Application deployment'
        },
        documentation: {
            label: 'Documentation',
            color: '#607D8B',
            bgColor: '#ECEFF1',
            icon: '📚',
            description: 'Documentation generation'
        },
        'task-review': {
            label: 'Review',
            color: '#FF5722',
            bgColor: '#FBE9E7',
            icon: '📋',
            description: 'Task review and validation'
        },
        'task-check-state': {
            label: 'Check State',
            color: '#795548',
            bgColor: '#EFEBE9',
            icon: '🔍',
            description: 'Quick status check'
        },
        'task-execution': {
            label: 'Execution',
            color: '#E91E63',
            bgColor: '#FCE4EC',
            icon: '⚡',
            description: 'Task execution'
        },
        'code-generation': {
            label: 'Code Gen',
            color: '#00BCD4',
            bgColor: '#E0F2F1',
            icon: '⚙️',
            description: 'Code generation'
        },
        'security-analysis': {
            label: 'Security',
            color: '#F44336',
            bgColor: '#FFEBEE',
            icon: '🔒',
            description: 'Security analysis'
        },
        'performance-analysis': {
            label: 'Performance',
            color: '#FFC107',
            bgColor: '#FFFDE7',
            icon: '⚡',
            description: 'Performance analysis'
        },
        'architecture-analysis': {
            label: 'Architecture',
            color: '#673AB7',
            bgColor: '#EDE7F6',
            icon: '🏗️',
            description: 'Architecture analysis'
        },
        'dependency-analysis': {
            label: 'Dependencies',
            color: '#009688',
            bgColor: '#E0F2F1',
            icon: '📦',
            description: 'Dependency analysis'
        },
        'tech-stack-analysis': {
            label: 'Tech Stack',
            color: '#3F51B5',
            bgColor: '#E8EAF6',
            icon: '🛠️',
            description: 'Technology stack analysis'
        },
        'manifest-analysis': {
            label: 'Manifest',
            color: '#FF9800',
            bgColor: '#FFF3E0',
            icon: '📄',
            description: 'Manifest file analysis'
        },
        'code-quality-analysis': {
            label: 'Code Quality',
            color: '#4CAF50',
            bgColor: '#E8F5E8',
            icon: '✨',
            description: 'Code quality analysis'
        },
        'individual-analysis': {
            label: 'Individual',
            color: '#607D8B',
            bgColor: '#ECEFF1',
            icon: '🔬',
            description: 'Individual analysis components'
        },
        'comprehensive-analysis': {
            label: 'Comprehensive',
            color: '#9C27B0',
            bgColor: '#F3E5F5',
            icon: '🎯',
            description: 'Comprehensive project analysis'
        },
        'recommendations': {
            label: 'Recommendations',
            color: '#FF5722',
            bgColor: '#FBE9E7',
            icon: '💡',
            description: 'Analysis recommendations'
        },
        'auto-finish': {
            label: 'Auto Finish',
            color: '#795548',
            bgColor: '#EFEBE9',
            icon: '✅',
            description: 'Automatic completion detection'
        },
        'todo-parsing': {
            label: 'Todo Parsing',
            color: '#607D8B',
            bgColor: '#ECEFF1',
            icon: '📝',
            description: 'Todo item parsing'
        },
        'confirmation': {
            label: 'Confirmation',
            color: '#4CAF50',
            bgColor: '#E8F5E8',
            icon: '✓',
            description: 'User confirmation step'
        },
        'completion-detection': {
            label: 'Completion',
            color: '#2196F3',
            bgColor: '#E3F2FD',
            icon: '🎯',
            description: 'Completion detection'
        },
        'task-create-workflow': {
            label: 'Task Creation',
            color: '#FF9800',
            bgColor: '#FFF3E0',
            icon: '➕',
            description: 'Task creation workflow'
        },
        'advanced-task-create-workflow': {
            label: 'Advanced Creation',
            color: '#9C27B0',
            bgColor: '#F3E5F5',
            icon: '🔬',
            description: 'Advanced task creation workflow'
        },
        'standard-task-workflow': {
            label: 'Standard Task',
            color: '#9E9E9E',
            bgColor: '#F5F5F5',
            icon: '📋',
            description: 'Standard task workflow'
        },
        'task-review-workflow': {
            label: 'Task Review',
            color: '#FF5722',
            bgColor: '#FBE9E7',
            icon: '📋',
            description: 'Task review workflow'
        },
        'task-execution-workflow': {
            label: 'Task Execution',
            color: '#E91E63',
            bgColor: '#FCE4EC',
            icon: '⚡',
            description: 'Task execution workflow'
        },
        'refactor-workflow': {
            label: 'Refactor',
            color: '#4CAF50',
            bgColor: '#E8F5E8',
            icon: '🔄',
            description: 'Refactoring workflow'
        },
        'testing-workflow': {
            label: 'Testing',
            color: '#2196F3',
            bgColor: '#E3F2FD',
            icon: '🧪',
            description: 'Testing workflow'
        },
        'analysis-workflow': {
            label: 'Analysis',
            color: '#FF9800',
            bgColor: '#FFF3E0',
            icon: '🔍',
            description: 'Analysis workflow'
        },
        'layer-violation-workflow': {
            label: 'Layer Violation',
            color: '#F44336',
            bgColor: '#FFEBEE',
            icon: '⚠️',
            description: 'Layer violation detection'
        },
        'layer-violation-fix-workflow': {
            label: 'Layer Fix',
            color: '#4CAF50',
            bgColor: '#E8F5E8',
            icon: '🔧',
            description: 'Layer violation fix'
        },
        'chat-management-workflow': {
            label: 'Chat Management',
            color: '#00BCD4',
            bgColor: '#E0F2F1',
            icon: '💬',
            description: 'Chat management workflow'
        }
    };

    // Size configurations
    const sizeConfigs = {
        small: {
            fontSize: '0.75rem',
            padding: '2px 6px',
            borderRadius: '4px',
            iconSize: '0.8em'
        },
        medium: {
            fontSize: '0.875rem',
            padding: '4px 8px',
            borderRadius: '6px',
            iconSize: '1em'
        },
        large: {
            fontSize: '1rem',
            padding: '6px 12px',
            borderRadius: '8px',
            iconSize: '1.2em'
        }
    };

    // Validate input parameters
    if (!type) {
        logger.warn('TaskModeBadge: Missing type parameter');
        return null;
    }

    if (typeof type !== 'string') {
        logger.error('TaskModeBadge: Invalid type parameter', { type, typeOf: typeof type });
        return null;
    }

    // Get configuration for the type
    const config = typeConfigs[type];
    if (!config) {
        logger.warn('TaskModeBadge: Unknown task mode type', { type });
        // Return a default badge for unknown types
        return (
            <span
                className="task-mode-badge unknown"
                style={{
                    ...sizeConfigs[size],
                    color: '#666',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                }}
                title={`Unknown task mode: ${type}`}
            >
                {showIcon && <span style={{ fontSize: sizeConfigs[size].iconSize }}>❓</span>}
                {type}
            </span>
        );
    }

    // Get size configuration
    const sizeConfig = sizeConfigs[size] || sizeConfigs.medium;

    try {
        return (
            <span
                className={`task-mode-badge ${type}`}
                style={{
                    ...sizeConfig,
                    color: config.color,
                    backgroundColor: config.bgColor,
                    border: `1px solid ${config.color}20`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                }}
                title={config.description}
            >
                {showIcon && (
                    <span style={{ fontSize: sizeConfig.iconSize }}>
                        {config.icon}
                    </span>
                )}
                {config.label}
            </span>
        );
    } catch (error) {
        logger.error('TaskModeBadge: Error rendering badge', {
            type,
            error: error.message,
            stack: error.stack
        });
        
        // Fallback rendering
        return (
            <span
                className="task-mode-badge error"
                style={{
                    ...sizeConfig,
                    color: '#f44336',
                    backgroundColor: '#ffebee',
                    border: '1px solid #f44336',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                }}
                title={`Error rendering badge for: ${type}`}
            >
                ❌ {type}
            </span>
        );
    }
};

export default TaskModeBadge;
