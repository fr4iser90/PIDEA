/**
 * AuthWrapper Integration Tests
 * Created: 2025-09-29T19:51:09.000Z
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthWrapper from '@/presentation/components/auth/AuthWrapper.jsx';
import IDERequirementService from '@/infrastructure/services/IDERequirementService.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';

// Mock dependencies
jest.mock('@/infrastructure/services/IDERequirementService.jsx');
jest.mock('@/infrastructure/stores/AuthStore.jsx');
jest.mock('@/infrastructure/stores/NotificationStore.jsx');

const mockIDERequirementService = {
  shouldShowRequirementModal: jest.fn()
};

const mockNotificationStore = {
  showInfo: jest.fn(),
  showWarning: jest.fn()
};

describe('AuthWrapper IDE Requirement Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    IDERequirementService.mockImplementation(() => mockIDERequirementService);
    useNotificationStore.mockReturnValue(mockNotificationStore);
  });

  describe('IDE Requirement Modal Display', () => {
    it('should show IDE requirement modal when user is authenticated and no IDE is running', async () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      mockIDERequirementService.shouldShowRequirementModal.mockResolvedValueOnce(true);

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      expect(screen.getByText('Main App Content')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockIDERequirementService.shouldShowRequirementModal).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('IDE Required')).toBeInTheDocument();
        expect(screen.getByText('No IDE Running')).toBeInTheDocument();
      });
    });

    it('should not show IDE requirement modal when IDE is running', async () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      mockIDERequirementService.shouldShowRequirementModal.mockResolvedValueOnce(false);

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      expect(screen.getByText('Main App Content')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockIDERequirementService.shouldShowRequirementModal).toHaveBeenCalled();
      });

      expect(screen.queryByText('IDE Required')).not.toBeInTheDocument();
    });

    it('should not show modal when user is not authenticated', () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      expect(screen.queryByText('IDE Required')).not.toBeInTheDocument();
      expect(mockIDERequirementService.shouldShowRequirementModal).not.toHaveBeenCalled();
    });

    it('should not show modal when still loading', () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: true
      });

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      expect(screen.queryByText('IDE Required')).not.toBeInTheDocument();
      expect(mockIDERequirementService.shouldShowRequirementModal).not.toHaveBeenCalled();
    });
  });

  describe('IDE Requirement Modal Interaction', () => {
    it('should close modal and re-check requirement after dismissal', async () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      // First call returns true, second call returns false (IDE started)
      mockIDERequirementService.shouldShowRequirementModal
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('IDE Required')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText('✕');
      closeButton.click();

      await waitFor(() => {
        expect(screen.queryByText('IDE Required')).not.toBeInTheDocument();
      });

      // Should have been called twice (initial check + re-check after close)
      await waitFor(() => {
        expect(mockIDERequirementService.shouldShowRequirementModal).toHaveBeenCalledTimes(2);
      });
    });

    it('should show success notification when IDE starts successfully', async () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      mockIDERequirementService.shouldShowRequirementModal.mockResolvedValueOnce(true);

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('IDE Required')).toBeInTheDocument();
      });

      // Simulate successful IDE start
      const startButton = screen.getByText('Start IDE');
      startButton.click();

      // Mock successful IDE start
      const { apiCall } = require('@/infrastructure/repositories/APIChatRepository.jsx');
      apiCall.mockResolvedValueOnce({
        success: true,
        data: { port: 9222, ideType: 'cursor' }
      });

      await waitFor(() => {
        expect(mockNotificationStore.showInfo).toHaveBeenCalledWith(
          'IDE started successfully!',
          'Success'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when checking IDE requirement', async () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      mockIDERequirementService.shouldShowRequirementModal.mockRejectedValueOnce(
        new Error('API error')
      );

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      expect(screen.getByText('Main App Content')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockIDERequirementService.shouldShowRequirementModal).toHaveBeenCalled();
      });

      // Should not show modal on error
      expect(screen.queryByText('IDE Required')).not.toBeInTheDocument();
    });

    it('should not prevent multiple rapid checks', async () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      mockIDERequirementService.shouldShowRequirementModal.mockResolvedValue(false);

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      // Wait for initial check
      await waitFor(() => {
        expect(mockIDERequirementService.shouldShowRequirementModal).toHaveBeenCalled();
      });

      // Should not show modal
      expect(screen.queryByText('IDE Required')).not.toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('should show login form when not authenticated', () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      // Should show login form instead of main content
      expect(screen.queryByText('Main App Content')).not.toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      useAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      render(
        <AuthWrapper>
          <div>Main App Content</div>
        </AuthWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Main App Content')).not.toBeInTheDocument();
    });
  });
});
