/**
 * WorkflowTypeBadge - Visual indicator for workflow types
 * Provides color-coded badges for different workflow types with strict error handling
 */

import React from 'react';
import { logger } from '@/infrastructure/logging/Logger';

const WorkflowTypeBadge = ({ type, size = 'medium', showIcon = true }) => {
    // Known workflow types with their configurations
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
            color: '#9C27B0',
            bgColor: '#F3E5F5',
            icon: '🔍',
            description: 'Code and architecture analysis'
        },
        feature: {
            label: 'Feature',
            color: '#FF9800',
            bgColor: '#FFF3E0',
            icon: '✨',
            description: 'New feature implementation'
        },
        bugfix: {
            label: 'Bug Fix',
            color: '#F44336',
            bgColor: '#FFEBEE',
            icon: '🐛',
            description: 'Bug resolution and fixes'
        },
        documentation: {
            label: 'Documentation',
            color: '#607D8B',
            bgColor: '#ECEFF1',
            icon: '📚',
            description: 'Documentation updates'
        },
        manual: {
            label: 'Manual',
            color: '#795548',
            bgColor: '#EFEBE9',
            icon: '👤',
            description: 'Manual user tasks'
        },
        optimization: {
            label: 'Optimization',
            color: '#00BCD4',
            bgColor: '#E0F7FA',
            icon: '⚡',
            description: 'Performance optimization'
        },
        security: {
            label: 'Security',
            color: '#E91E63',
            bgColor: '#FCE4EC',
            icon: '🔒',
            description: 'Security-related tasks'
        },
        generic: {
            label: 'Generic',
            color: '#9E9E9E',
            bgColor: '#FAFAFA',
            icon: '📋',
            description: 'Generic workflow'
        }
    };

    // Handle unknown types with strict error handling
    const handleUnknownType = (unknownType) => {
        logger.error('Unknown workflow type detected', { 
            type: unknownType,
            knownTypes: Object.keys(typeConfigs)
        });
        
        return {
            label: 'Unknown Type',
            color: '#FF5722',
            bgColor: '#FFEBEE',
            icon: '❓',
            description: 'Unknown workflow type - requires investigation'
        };
    };

    // Get type configuration or handle unknown type
    const getTypeConfig = (workflowType) => {
        if (!workflowType) {
            logger.error('Workflow type is required for WorkflowTypeBadge');
            return handleUnknownType('undefined');
        }

        const config = typeConfigs[workflowType.toLowerCase()];
        if (!config) {
            return handleUnknownType(workflowType);
        }

        return config;
    };

    const config = getTypeConfig(type);

    // Size classes
    const sizeClasses = {
        small: 'badge-small',
        medium: 'badge-medium',
        large: 'badge-large'
    };

    const sizeClass = sizeClasses[size] || sizeClasses.medium;

    return (
        <div 
            className={`workflow-type-badge ${sizeClass}`}
            style={{
                backgroundColor: config.bgColor,
                color: config.color,
                borderColor: config.color
            }}
            title={config.description}
        >
            {showIcon && (
                <span className="badge-icon">
                    {config.icon}
                </span>
            )}
            <span className="badge-label">
                {config.label}
            </span>
        </div>
    );
};

export default WorkflowTypeBadge; 