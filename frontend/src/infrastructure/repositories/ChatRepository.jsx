/**
 * ChatRepository - Frontend repository for chat operations
 * Handles all chat-related API calls with proper error handling and data transformation
 */

import { logger } from "@/infrastructure/logging/Logger";
import ChatMessage from '@/domain/entities/ChatMessage.jsx';
import ChatSession from '@/domain/entities/ChatSession.jsx';
import apiService from '@/infrastructure/services/ApiService.js';

// Chat API Configuration
const CHAT_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    chat: {
      send: '/api/chat',
      history: '/api/chat/history',
      status: '/api/chat/status',
      portHistory: (port) => `/api/chat/port/${port}/history`,
      portSwitch: (port) => `/api/chat/port/${port}/switch`,
    },
    health: '/api/health',
    settings: '/api/settings',
    preview: {
      status: '/api/preview/status',
      data: '/api/preview/data'
    }
  }
};

// Centralized API call function using ApiService
const apiCall = async (endpoint, options = {}, projectId = null) => {
  return apiService.call(endpoint, options, projectId);
};

export default class ChatRepository {
  constructor() {
    this.baseURL = CHAT_API_CONFIG.baseURL;
    this.currentSession = null;
  }

  /**
   * Send a chat message
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Chat response
   */
  async sendMessage(message, options = {}) {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.chat.send, {
        method: 'POST',
        body: JSON.stringify({
          message,
          ...options
        })
      });

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error) {
      logger.error('Failed to send chat message:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Chat history
   */
  async getChatHistory(options = {}) {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.chat.history, {
        method: 'GET'
      });

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get chat history');
      }
    } catch (error) {
      logger.error('Failed to get chat history:', error);
      throw error;
    }
  }

  /**
   * Get chat status
   * @returns {Promise<Object>} Chat status
   */
  async getChatStatus() {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.chat.status);

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get chat status');
      }
    } catch (error) {
      logger.error('Failed to get chat status:', error);
      throw error;
    }
  }

  /**
   * Get port-specific chat history
   * @param {number} port - Port number
   * @returns {Promise<Object>} Port chat history
   */
  async getPortChatHistory(port) {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.chat.portHistory(port));

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get port chat history');
      }
    } catch (error) {
      logger.error('Failed to get port chat history:', error);
      throw error;
    }
  }

  /**
   * Switch chat port
   * @param {number} port - Port number
   * @returns {Promise<Object>} Switch response
   */
  async switchChatPort(port) {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.chat.portSwitch(port), {
        method: 'POST',
        body: JSON.stringify({ port })
      });

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to switch chat port');
      }
    } catch (error) {
      logger.error('Failed to switch chat port:', error);
      throw error;
    }
  }

  /**
   * Get health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.health);

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get health status');
      }
    } catch (error) {
      logger.error('Failed to get health status:', error);
      throw error;
    }
  }

  /**
   * Get settings
   * @returns {Promise<Object>} Settings
   */
  async getSettings() {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.settings);

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get settings');
      }
    } catch (error) {
      logger.error('Failed to get settings:', error);
      throw error;
    }
  }

  /**
   * Get preview status
   * @returns {Promise<Object>} Preview status
   */
  async getPreviewStatus() {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.preview.status);

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get preview status');
      }
    } catch (error) {
      logger.error('Failed to get preview status:', error);
      throw error;
    }
  }

  /**
   * Get preview data
   * @returns {Promise<Object>} Preview data
   */
  async getPreviewData() {
    try {
      const response = await apiCall(CHAT_API_CONFIG.endpoints.preview.data);

      if (response.success) {
        return {
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get preview data');
      }
    } catch (error) {
      logger.error('Failed to get preview data:', error);
      throw error;
    }
  }
}

// Export configuration and utility function
export { CHAT_API_CONFIG as API_CONFIG };
export { apiCall };