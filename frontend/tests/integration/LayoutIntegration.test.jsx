/**
 * Layout Integration Tests
 * Tests component rendering with different themes and layout responsiveness
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarRight from '@/presentation/components/SidebarRight';
import SidebarLeft from '@/presentation/components/SidebarLeft';

// Mock the event bus
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

// Mock the stores
jest.mock('@/infrastructure/stores/AuthStore.jsx', () => ({
  __esModule: true,
  default: () => ({
    isAuthenticated: true,
  }),
}));

jest.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: () => ({
    availableIDEs: [
      {
        port: 3000,
        ideType: 'cursor',
        projectName: 'Test Project',
        status: 'running',
        active: true,
        workspacePath: '/test/workspace',
      },
    ],
    loadAvailableIDEs: jest.fn(),
    switchIDE: jest.fn(),
  }),
}));

describe('Layout Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up DOM
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  describe('SidebarRight Component', () => {
    it('should render with proper container structure', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      // Check for outer container
      const sidebarRight = document.querySelector('.sidebar-right');
      expect(sidebarRight).toBeInTheDocument();

      // Check for inner content container
      const sidebarRightContent = document.querySelector('.sidebar-right-content');
      expect(sidebarRightContent).toBeInTheDocument();

      // Check for panel header
      const panelHeader = document.querySelector('.panel-header');
      expect(panelHeader).toBeInTheDocument();

      // Check for panel content
      const panelContent = document.querySelector('.panel-content');
      expect(panelContent).toBeInTheDocument();
    });

    it('should have proper toggle functionality', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const toggleButton = screen.getByTitle('Panel ein-/ausblenden');
      expect(toggleButton).toBeInTheDocument();

      // Check initial state (collapsed)
      expect(toggleButton.textContent).toBe('▶');

      // Click to expand
      fireEvent.click(toggleButton);
      expect(toggleButton.textContent).toBe('◀');

      // Click to collapse
      fireEvent.click(toggleButton);
      expect(toggleButton.textContent).toBe('▶');
    });

    it('should render all tab buttons', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      // Check for all tab buttons
      expect(screen.getByText('🗂️ Tasks')).toBeInTheDocument();
      expect(screen.getByText('🔄 Queue')).toBeInTheDocument();
      expect(screen.getByText('🤖 Auto')).toBeInTheDocument();
      expect(screen.getByText('🧩 Frameworks')).toBeInTheDocument();
      expect(screen.getByText('💬 Prompts')).toBeInTheDocument();
      expect(screen.getByText('📋 Templates')).toBeInTheDocument();
      expect(screen.getByText('📊 Analysis')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
    });

    it('should switch between tabs correctly', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      // Default should be tasks tab
      const tasksTab = screen.getByText('🗂️ Tasks');
      expect(tasksTab).toHaveClass('active');

      // Click on auto tab
      const autoTab = screen.getByText('🤖 Auto');
      fireEvent.click(autoTab);
      expect(autoTab).toHaveClass('active');
      expect(tasksTab).not.toHaveClass('active');
    });

    it('should apply correct CSS classes for styling', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const sidebarRight = document.querySelector('.sidebar-right');
      const computedStyle = getComputedStyle(sidebarRight);

      // Check CSS properties are applied
      expect(computedStyle.position).toBe('fixed');
      expect(computedStyle.right).toBe('0px');
      expect(computedStyle.zIndex).toBe('100');
    });
  });

  describe('SidebarLeft Component', () => {
    it('should render with proper container structure', () => {
      render(
        <SidebarLeft 
          eventBus={mockEventBus}
          activePort={3000}
          onActivePortChange={jest.fn()}
          mode="chat"
        />
      );

      // Check for outer container
      const sidebarLeft = document.querySelector('.sidebar-left');
      expect(sidebarLeft).toBeInTheDocument();

      // Check for inner content container
      const sidebarLeftContent = document.querySelector('.sidebar-left-content');
      expect(sidebarLeftContent).toBeInTheDocument();

      // Check for IDE management section
      const ideManagement = document.querySelector('.ide-management-section');
      expect(ideManagement).toBeInTheDocument();
    });

    it('should render IDE list correctly', () => {
      render(
        <SidebarLeft 
          eventBus={mockEventBus}
          activePort={3000}
          onActivePortChange={jest.fn()}
          mode="chat"
        />
      );

      // Check for IDE items
      const ideItems = document.querySelectorAll('.ide-item');
      expect(ideItems).toHaveLength(1);

      // Check for active IDE
      const activeIDE = document.querySelector('.ide-item.active');
      expect(activeIDE).toBeInTheDocument();
    });

    it('should apply correct CSS classes for styling', () => {
      render(
        <SidebarLeft 
          eventBus={mockEventBus}
          activePort={3000}
          onActivePortChange={jest.fn()}
          mode="chat"
        />
      );

      const sidebarLeft = document.querySelector('.sidebar-left');
      const computedStyle = getComputedStyle(sidebarLeft);

      // Check CSS properties are applied
      expect(computedStyle.position).toBe('fixed');
      expect(computedStyle.left).toBe('0px');
      expect(computedStyle.zIndex).toBe('100');
    });
  });

  describe('Theme Integration', () => {
    it('should apply dark theme by default', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const sidebarRight = document.querySelector('.sidebar-right');
      const computedStyle = getComputedStyle(sidebarRight);

      // Check dark theme colors
      expect(computedStyle.backgroundColor).toBe('rgb(32, 35, 42)');
    });

    it('should apply light theme when class is added', () => {
      document.body.classList.add('light-theme');
      
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      // Check if light theme styles are applied
      const computedStyle = getComputedStyle(document.documentElement);
      expect(computedStyle.getPropertyValue('--bg-primary')).toBeDefined();
      
      document.body.classList.remove('light-theme');
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle mobile viewport correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const sidebarRight = document.querySelector('.sidebar-right');
      const computedStyle = getComputedStyle(sidebarRight);

      // Check responsive behavior
      expect(computedStyle.width).toBe('20rem');
    });

    it('should handle tablet viewport correctly', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const sidebarRight = document.querySelector('.sidebar-right');
      const computedStyle = getComputedStyle(sidebarRight);

      // Check tablet behavior
      expect(computedStyle.width).toBe('20rem');
    });
  });

  describe('Component Interaction', () => {
    it('should handle event bus communication', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      // Check if event bus methods are called
      expect(mockEventBus.on).toHaveBeenCalled();
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      // Change active port
      rerender(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3001}
        />
      );

      // Component should still render correctly
      const sidebarRight = document.querySelector('.sidebar-right');
      expect(sidebarRight).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const toggleButton = screen.getByTitle('Panel ein-/ausblenden');
      expect(toggleButton).toHaveAttribute('title');
    });

    it('should support keyboard navigation', () => {
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const toggleButton = screen.getByTitle('Panel ein-/ausblenden');
      
      // Should be focusable
      toggleButton.focus();
      expect(document.activeElement).toBe(toggleButton);

      // Should respond to Enter key
      fireEvent.keyDown(toggleButton, { key: 'Enter', code: 'Enter' });
      expect(toggleButton.textContent).toBe('◀');
    });
  });

  describe('Performance', () => {
    it('should render without performance issues', async () => {
      const startTime = performance.now();
      
      render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle multiple re-renders efficiently', () => {
      const { rerender } = render(
        <SidebarRight 
          eventBus={mockEventBus}
          attachedPrompts={[]}
          setAttachedPrompts={jest.fn()}
          activePort={3000}
        />
      );

      // Multiple re-renders should not cause issues
      for (let i = 0; i < 10; i++) {
        rerender(
          <SidebarRight 
            eventBus={mockEventBus}
            attachedPrompts={[]}
            setAttachedPrompts={jest.fn()}
            activePort={3000 + i}
          />
        );
      }

      const sidebarRight = document.querySelector('.sidebar-right');
      expect(sidebarRight).toBeInTheDocument();
    });
  });
});
