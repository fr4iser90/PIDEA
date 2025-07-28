import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskCompletionBadge from '@/components/TaskCompletionBadge';

describe('TaskCompletionBadge', () => {
  test('should render completed task badge', () => {
    const task = { status: 'completed', progress: 100 };
    render(<TaskCompletionBadge task={task} />);
    
    expect(screen.getByText('✅ COMPLETED')).toBeInTheDocument();
  });

  test('should render partially completed task badge', () => {
    const task = { status: 'pending', progress: 75 };
    render(<TaskCompletionBadge task={task} />);
    
    expect(screen.getByText('🔄 75% COMPLETE')).toBeInTheDocument();
  });

  test('should render pending task badge', () => {
    const task = { status: 'pending', progress: 0 };
    render(<TaskCompletionBadge task={task} />);
    
    expect(screen.getByText('⏳ PENDING')).toBeInTheDocument();
  });

  test('should render unknown badge for null task', () => {
    render(<TaskCompletionBadge task={null} />);
    
    expect(screen.getByText('❓ Unknown')).toBeInTheDocument();
  });

  test('should apply correct size class', () => {
    const task = { status: 'pending', progress: 0 };
    render(<TaskCompletionBadge task={task} size="large" />);
    
    const badge = screen.getByText('⏳ PENDING');
    expect(badge).toHaveClass('status-badge', 'large');
  });

  test('should hide icon when showIcon is false', () => {
    const task = { status: 'completed', progress: 100 };
    render(<TaskCompletionBadge task={task} showIcon={false} />);
    
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.queryByText('✅')).not.toBeInTheDocument();
  });

  test('should show progress for partially completed task', () => {
    const task = { status: 'pending', progress: 50 };
    render(<TaskCompletionBadge task={task} showProgress={true} />);
    
    expect(screen.getByText('🔄 50% COMPLETE')).toBeInTheDocument();
  });

  test('should handle completed status with value object', () => {
    const task = { status: { value: 'completed' }, progress: 0 };
    render(<TaskCompletionBadge task={task} />);
    
    expect(screen.getByText('✅ COMPLETED')).toBeInTheDocument();
  });

  test('should handle undefined task gracefully', () => {
    render(<TaskCompletionBadge task={undefined} />);
    
    expect(screen.getByText('❓ Unknown')).toBeInTheDocument();
  });

  test('should apply correct CSS classes for different statuses', () => {
    const completedTask = { status: 'completed', progress: 100 };
    const { rerender } = render(<TaskCompletionBadge task={completedTask} />);
    
    let badge = screen.getByText('✅ COMPLETED');
    expect(badge).toHaveClass('status-badge', 'completed');
    
    const partiallyCompletedTask = { status: 'pending', progress: 50 };
    rerender(<TaskCompletionBadge task={partiallyCompletedTask} />);
    
    badge = screen.getByText('🔄 50% COMPLETE');
    expect(badge).toHaveClass('status-badge', 'partially_completed');
    
    const pendingTask = { status: 'pending', progress: 0 };
    rerender(<TaskCompletionBadge task={pendingTask} />);
    
    badge = screen.getByText('⏳ PENDING');
    expect(badge).toHaveClass('status-badge', 'pending');
  });

  test('should have correct title attribute for tooltip', () => {
    const task = { status: 'pending', progress: 75 };
    render(<TaskCompletionBadge task={task} showProgress={true} />);
    
    const badge = screen.getByText('🔄 75% COMPLETE');
    expect(badge).toHaveAttribute('title', '75% complete');
  });

  test('should have correct title for completed task', () => {
    const task = { status: 'completed', progress: 100 };
    render(<TaskCompletionBadge task={task} />);
    
    const badge = screen.getByText('✅ COMPLETED');
    expect(badge).toHaveAttribute('title', 'COMPLETED');
  });
}); 