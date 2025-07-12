export const ERROR_TYPES = {
  AUTH: 'auth',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

export const ERROR_CODES = {
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT: 'VALIDATION_FORMAT',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE'
};

export class ErrorCategorizer {
  static categorize(error) {
    if (!error) return { type: ERROR_TYPES.UNKNOWN, code: null };

    // Check for specific error codes
    if (error.code) {
      return this.categorizeByCode(error.code);
    }

    // Check for specific error messages
    if (error.message) {
      return this.categorizeByMessage(error.message);
    }

    // Check for HTTP status codes
    if (error.status) {
      return this.categorizeByStatus(error.status);
    }

    return { type: ERROR_TYPES.UNKNOWN, code: null };
  }

  static categorizeByCode(code) {
    switch (code) {
      case ERROR_CODES.AUTH_EXPIRED:
      case ERROR_CODES.AUTH_INVALID:
      case ERROR_CODES.AUTH_REQUIRED:
        return { type: ERROR_TYPES.AUTH, code };

      case ERROR_CODES.NETWORK_TIMEOUT:
      case ERROR_CODES.NETWORK_OFFLINE:
        return { type: ERROR_TYPES.NETWORK, code };

      case ERROR_CODES.VALIDATION_REQUIRED:
      case ERROR_CODES.VALIDATION_FORMAT:
        return { type: ERROR_TYPES.VALIDATION, code };

      case ERROR_CODES.SERVER_ERROR:
      case ERROR_CODES.SERVER_UNAVAILABLE:
        return { type: ERROR_TYPES.SERVER, code };

      default:
        return { type: ERROR_TYPES.UNKNOWN, code };
    }
  }

  static categorizeByMessage(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('expired') || 
        lowerMessage.includes('token') || 
        lowerMessage.includes('auth') ||
        lowerMessage.includes('login')) {
      return { type: ERROR_TYPES.AUTH, code: ERROR_CODES.AUTH_EXPIRED };
    }

    if (lowerMessage.includes('network') || 
        lowerMessage.includes('fetch') || 
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('offline')) {
      return { type: ERROR_TYPES.NETWORK, code: ERROR_CODES.NETWORK_TIMEOUT };
    }

    if (lowerMessage.includes('validation') || 
        lowerMessage.includes('required') || 
        lowerMessage.includes('format')) {
      return { type: ERROR_TYPES.VALIDATION, code: ERROR_CODES.VALIDATION_REQUIRED };
    }

    if (lowerMessage.includes('server') || 
        lowerMessage.includes('500') || 
        lowerMessage.includes('503')) {
      return { type: ERROR_TYPES.SERVER, code: ERROR_CODES.SERVER_ERROR };
    }

    return { type: ERROR_TYPES.UNKNOWN, code: null };
  }

  static categorizeByStatus(status) {
    if (status >= 500) {
      return { type: ERROR_TYPES.SERVER, code: ERROR_CODES.SERVER_ERROR };
    }

    if (status === 401 || status === 403) {
      return { type: ERROR_TYPES.AUTH, code: ERROR_CODES.AUTH_REQUIRED };
    }

    if (status === 400 || status === 422) {
      return { type: ERROR_TYPES.VALIDATION, code: ERROR_CODES.VALIDATION_REQUIRED };
    }

    if (status === 0) {
      return { type: ERROR_TYPES.NETWORK, code: ERROR_CODES.NETWORK_OFFLINE };
    }

    return { type: ERROR_TYPES.UNKNOWN, code: null };
  }

  static getErrorIcon(type) {
    switch (type) {
      case ERROR_TYPES.AUTH: return '🔐';
      case ERROR_TYPES.NETWORK: return '🌐';
      case ERROR_TYPES.VALIDATION: return '⚠️';
      case ERROR_TYPES.SERVER: return '🖥️';
      case ERROR_TYPES.CLIENT: return '💻';
      default: return '❌';
    }
  }

  static getErrorColor(type) {
    switch (type) {
      case ERROR_TYPES.AUTH: return '#e53e3e';
      case ERROR_TYPES.NETWORK: return '#d69e2e';
      case ERROR_TYPES.VALIDATION: return '#3182ce';
      case ERROR_TYPES.SERVER: return '#805ad5';
      case ERROR_TYPES.CLIENT: return '#38a169';
      default: return '#e53e3e';
    }
  }

  static getErrorMessage(error, type) {
    switch (type) {
      case ERROR_TYPES.AUTH:
        return 'Authentication required. Please log in again.';
      case ERROR_TYPES.NETWORK:
        return 'Network connection issue. Please check your internet connection.';
      case ERROR_TYPES.VALIDATION:
        return 'Please check your input and try again.';
      case ERROR_TYPES.SERVER:
        return 'Server error. Please try again later.';
      case ERROR_TYPES.CLIENT:
        return 'An error occurred. Please refresh the page.';
      default:
        return error?.message || 'An unexpected error occurred.';
    }
  }
} 