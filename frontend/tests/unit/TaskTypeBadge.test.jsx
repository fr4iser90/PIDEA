import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskTypeBadge from '@/components/TaskTypeBadge.jsx';

describe('TaskTypeBadge', () => {
  test('renders with basic category', () => {
    render(<TaskTypeBadge category="manual" />);
    expect(screen.getByText('Manual Tasks')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
  });

  test('renders with category and subcategory', () => {
    render(<TaskTypeBadge category="analysis" subcategory="architecture" />);
    expect(screen.getByText('Analysis Tasks • Architecture Analysis')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  test('renders without icon when showIcon is false', () => {
    render(<TaskTypeBadge category="testing" showIcon={false} />);
    expect(screen.getByText('Testing Tasks')).toBeInTheDocument();
    expect(screen.queryByText('🧪')).not.toBeInTheDocument();
  });

  test('renders without subcategory when showSubcategory is false', () => {
    render(<TaskTypeBadge category="refactoring" subcategory="code_quality" showSubcategory={false} />);
    expect(screen.getByText('Refactoring Tasks')).toBeInTheDocument();
    expect(screen.queryByText('Code Quality')).not.toBeInTheDocument();
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<TaskTypeBadge category="security" size="small" />);
    expect(screen.getByText('Security Tasks')).toBeInTheDocument();

    rerender(<TaskTypeBadge category="security" size="large" />);
    expect(screen.getByText('Security Tasks')).toBeInTheDocument();
  });

  test('renders with unknown category', () => {
    render(<TaskTypeBadge category="unknown" />);
    expect(screen.getByText('Unknown Category')).toBeInTheDocument();
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<TaskTypeBadge category="deployment" className="custom-class" />);
    const badge = screen.getByText('Deployment Tasks').closest('.task-type-badge');
    expect(badge).toHaveClass('custom-class');
  });

  test('has correct styling with category color', () => {
    render(<TaskTypeBadge category="testing" />);
    const badge = screen.getByText('Testing Tasks').closest('.task-type-badge');
    expect(badge).toHaveStyle({
      color: '#10B981',
      backgroundColor: '#10B98120',
      border: '1px solid #10B98140'
    });
  });
}); 