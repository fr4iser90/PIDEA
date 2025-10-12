/**
 * ChatRepository - Frontend repository for chat operations
 * Handles all chat-related API calls with proper error handling and data transformation
 */

import { logger } from "@/infrastructure/logging/Logger";
import ChatMessage from '@/domain/entities/ChatMessage.jsx';
import ChatSession from '@/domain/entities/ChatSession.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import etagManager from '@/infrastructure/services/ETagManager.js';
import TimeoutConfig from '@/config/timeout-config.js';

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

// Helper function to make API calls with ETag support
const apiCall = async (endpoint, options = {}, projectId = null) => {
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [ChatRepository] Making API call to:', url);
  
  // Get authentication headers
  const { getAuthHeaders } = useAuthStore.getState();
  const authHeaders = getAuthHeaders();
  
  logger.info('🔍 [ChatRepository] Auth headers:', authHeaders);
  
  // Add ETag headers only for analysis endpoints, not for IDE endpoints
  const isAnalysisEndpoint = endpoint.includes('/analysis') || endpoint.includes('/auto-finish') || endpoint.includes('/auto-test');
  const etagOptions = isAnalysisEndpoint ? etagManager.addETagHeaders(options, endpoint, projectId) : options;
  
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(etagOptions.headers || {})
    },
    credentials: 'include',
    ...etagOptions,
    ...options
  };

  logger.info('🔍 [ChatRepository] Final headers:', config.headers);
  logger.info('🔍 [ChatRepository] Request config:', {
    method: config.method || 'GET',
    headers: config.headers,
    hasBody: !!config.body
  });

  // Initialize timeout variables outside try block for proper cleanup
  let timeoutId = null;
  let controller = null;

  try {
    // Get appropriate timeout based on endpoint type
    const timeoutMs = TimeoutConfig.getApiTimeout(endpoint);
    logger.info(`🔍 [ChatRepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    // Add timeout to prevent hanging
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [ChatRepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);
    
    logger.info('🔍 [ChatRepository] Response status:', response.status);
    
    // Handle ETag response only for analysis endpoints
    if (isAnalysisEndpoint) {
      const etagResponse = etagManager.handleResponse(response, endpoint, projectId);
      
      if (response.status === 304) {
        // Handle 304 Not Modified - no data to return, client should use existing data
        const notModifiedData = etagManager.handleNotModified(endpoint, projectId);
        logger.info('✅ [ChatRepository] Using cached data (304 Not Modified)');
        return notModifiedData;
      }
    }
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [ChatRepository] 401 Unauthorized - user not authenticated');
        
        // CRITICAL FIX: Clear local state and redirect to login
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // No data caching - only ETags for HTTP efficiency
    logger.info('✅ [ChatRepository] API call successful');
    return data;
  } catch (error) {
    // Ensure timeout is cleared in all error scenarios
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Handle AbortError specifically for better error messages
    if (error.name === 'AbortError') {
      const timeoutMs = TimeoutConfig.getApiTimeout(endpoint);
      const timeoutError = new Error(`Request timeout after ${timeoutMs}ms for ${endpoint}. The server may be slow or unresponsive.`);
      timeoutError.name = 'TimeoutError';
      timeoutError.code = 'TIMEOUT';
      logger.error(`⏰ [ChatRepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [ChatRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

class ChatRepository {
  constructor() {
    this.baseURL = CHAT_API_CONFIG.baseURL;
    this.currentSession = null;
  }

  /**
   * Get chat history
   * @returns {Promise<Object>} Chat history
   */
  async getChatHistory() {
    return apiCall(CHAT_API_CONFIG.endpoints.chat.history);
  }

  /**
   * Get port-specific chat history
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Port chat history
   */
  async getPortChatHistory(port) {
    return apiCall(`${CHAT_API_CONFIG.baseURL}${CHAT_API_CONFIG.endpoints.chat.portHistory(port)}`);
  }

  /**
   * Send a message
   * @param {string} message - Message content
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<ChatMessage>} Chat message
   */
  async sendMessage(message, sessionId) {
    // Get user info for requestedBy field
    const { user } = useAuthStore.getState();
    const requestedBy = user?.email || user?.id || 'unknown';
    
    const data = await apiCall(CHAT_API_CONFIG.endpoints.chat.send, {
      method: 'POST',
      body: JSON.stringify({ message, requestedBy, sessionId })
    });
    if (!data.success || !data.data) throw new Error('Invalid response');
    
    // Create a ChatMessage from the response data
    const chatMessage = new ChatMessage(
      message,
      message.includes('```') ? 'code' : 'text',
      {
        id: data.data.messageId,
        sessionId: data.data.sessionId,
        timestamp: data.data.timestamp
      }
    );
    
    return chatMessage;
  }

  /**
   * Get chat status
   * @returns {Promise<Object>} Chat status
   */
  async getStatus() {
    return apiCall(CHAT_API_CONFIG.endpoints.chat.status);
  }

  /**
   * Get health status
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    return apiCall(CHAT_API_CONFIG.endpoints.health);
  }

  /**
   * Get settings
   * @returns {Promise<Object>} Settings
   */
  async getSettings() {
    return apiCall(CHAT_API_CONFIG.endpoints.settings);
  }

  /**
   * Get preview status
   * @returns {Promise<Object>} Preview status
   */
  async getPreviewStatus() {
    return apiCall(CHAT_API_CONFIG.endpoints.preview.status);
  }

  /**
   * Get preview data
   * @returns {Promise<Object>} Preview data
   */
  async getPreviewData() {
    return apiCall(CHAT_API_CONFIG.endpoints.preview.data);
  }

  /**
   * Fetch chat history for a specific session
   * @param {string} sessionId - Session ID
   * @returns {Promise<ChatSession>} Chat session
   */
  async fetchChatHistory(sessionId) {
    const data = await apiCall(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
    if (!data.success || !data.data) throw new Error('Invalid response');
    const sessionData = data.data;
    return ChatSession.fromJSON({
      id: sessionData.sessionId || sessionData.id,
      title: sessionData.title,
      metadata: sessionData.metadata,
      idePort: sessionData.idePort,
      messages: (sessionData.messages || []).map(m => ChatMessage.fromJSON(m))
    });
  }
}

export default ChatRepository;
export { CHAT_API_CONFIG as API_CONFIG };
export { apiCall };