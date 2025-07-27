import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortConfigInput from '@/presentation/components/chat/main/PortConfigInput.jsx';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock IDEStore with proper implementation
const mockValidatePort = jest.fn();
const mockIsValidPortRange = jest.fn();

jest.mock('@/infrastructure/stores/IDEStore.jsx', () => ({
  __esModule: true,
  default: () => ({
    validatePort: mockValidatePort,
    isValidPortRange: mockIsValidPortRange
  })
}));

describe('PortConfigInput', () => {
  const mockOnPortChange = jest.fn();
  const mockOnPortValidate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockValidatePort.mockResolvedValue(true);
    mockIsValidPortRange.mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<PortConfigInput />);
      
      expect(screen.getByLabelText('Port Configuration')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter port (1-65535)')).toBeInTheDocument();
      expect(screen.getByText('Enter a port number between 1 and 65535')).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      render(
        <PortConfigInput
          initialPort={9222}
          placeholder="Custom placeholder"
          className="custom-class"
        />
      );
      
      const input = screen.getByPlaceholderText('Custom placeholder');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('9222');
    });

    it('renders disabled state', () => {
      render(<PortConfigInput disabled={true} />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toBeDisabled();
    });
  });

  describe('Input Handling', () => {
    it('calls onPortChange when input changes', () => {
      render(<PortConfigInput onPortChange={mockOnPortChange} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9222' } });
      
      expect(mockOnPortChange).toHaveBeenCalledWith('9222');
    });

    it('handles empty input', () => {
      render(<PortConfigInput onPortChange={mockOnPortChange} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '' } });
      
      expect(mockOnPortChange).toHaveBeenCalledWith('');
    });

    it('handles non-numeric input', () => {
      render(<PortConfigInput onPortChange={mockOnPortChange} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'abc' } });
      
      expect(mockOnPortChange).toHaveBeenCalledWith('abc');
    });
  });

  describe('Validation', () => {
    it('validates port range on blur', async () => {
      render(<PortConfigInput onPortValidate={mockOnPortValidate} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9222' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(mockIsValidPortRange).toHaveBeenCalledWith(9222);
        expect(mockValidatePort).toHaveBeenCalledWith(9222);
      });
    });

    it('shows error for invalid port range', async () => {
      mockIsValidPortRange.mockReturnValue(false);
      
      render(<PortConfigInput onPortValidate={mockOnPortValidate} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9999' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('Port not in valid IDE range (9222-9251)')).toBeInTheDocument();
        expect(mockOnPortValidate).toHaveBeenCalledWith({
          isValid: false,
          error: 'Port not in valid IDE range',
          port: null
        });
      });
    });

    it('shows error for out of range port', async () => {
      render(<PortConfigInput onPortValidate={mockOnPortValidate} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '70000' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('Port must be between 1 and 65535')).toBeInTheDocument();
        expect(mockOnPortValidate).toHaveBeenCalledWith({
          isValid: false,
          error: 'Port must be between 1 and 65535',
          port: null
        });
      });
    });

    it('shows error for non-numeric input', async () => {
      render(<PortConfigInput onPortValidate={mockOnPortValidate} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('Port must be between 1 and 65535')).toBeInTheDocument();
        expect(mockOnPortValidate).toHaveBeenCalledWith({
          isValid: false,
          error: 'Port must be between 1 and 65535',
          port: null
        });
      });
    });
  });

  describe('Clear Functionality', () => {
    it('clears input when clear button is clicked', () => {
      render(<PortConfigInput initialPort={9222} onPortChange={mockOnPortChange} onPortValidate={mockOnPortValidate} />);
      
      const clearButton = screen.getByRole('button', { name: /clear port/i });
      fireEvent.click(clearButton);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue('');
      expect(mockOnPortChange).toHaveBeenCalledWith('');
      expect(mockOnPortValidate).toHaveBeenCalledWith({
        isValid: false,
        error: null,
        port: null
      });
    });

    it('does not show clear button when input is empty', () => {
      render(<PortConfigInput />);
      
      expect(screen.queryByRole('button', { name: /clear port/i })).not.toBeInTheDocument();
    });

    it('shows loading spinner during validation', async () => {
      // Mock a delayed validation
      mockValidatePort.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9222' } });
      fireEvent.blur(input);
      
      // Should show loading spinner
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(input).toHaveClass('port-input-loading');
    });
  });

  describe('Keyboard Handling', () => {
    it('validates on Enter key press', async () => {
      render(<PortConfigInput onPortValidate={mockOnPortValidate} />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9222' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockValidatePort).toHaveBeenCalledWith(9222);
      });
    });

    it('prevents default on Enter key press', () => {
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      const event = { key: 'Enter', preventDefault: jest.fn() };
      fireEvent.keyDown(input, event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('aria-describedby', 'port-help');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('updates ARIA attributes on error', async () => {
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9999' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-describedby', 'port-error');
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('has proper error role', async () => {
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9999' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner during validation', async () => {
      // Mock a delayed validation
      mockValidatePort.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9222' } });
      fireEvent.blur(input);
      
      // Should show loading spinner
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(input).toHaveClass('port-input-loading');
    });

    it('disables input during validation', async () => {
      // Mock a delayed validation
      mockValidatePort.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9222' } });
      fireEvent.blur(input);
      
      expect(input).toBeDisabled();
    });
  });

  describe('CSS Classes', () => {
    it('applies error class when validation fails', async () => {
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9999' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(input).toHaveClass('port-input-error');
      });
    });

    it('applies loading class during validation', async () => {
      // Mock a delayed validation
      mockValidatePort.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<PortConfigInput />);
      
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '9222' } });
      fireEvent.blur(input);
      
      expect(input).toHaveClass('port-input-loading');
    });

    it('applies disabled class when disabled', () => {
      render(<PortConfigInput disabled={true} />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveClass('port-input-disabled');
    });
  });
}); 