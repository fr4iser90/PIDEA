/**
 * Example Frontend Usage
 * 
 * Shows how to use the ResponseManager with the new backend API
 */

import responseManager from '../utils/ResponseManager.js';

// Example API service
class UserService {
  constructor() {
    this.baseUrl = '/api/users';
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object>} User data or error
   */
  async getUser(id) {
    const result = await responseManager.get(`${this.baseUrl}/${id}`);
    
    if (result.success) {
      // ✅ Success - data is direct
      return result.data; // { id: 123, name: "John", email: "john@example.com" }
    } else {
      // ❌ Error - structured error object
      return responseManager.handleError(result, (error) => {
        console.error('Failed to get user:', error.message);
      });
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user or error
   */
  async createUser(userData) {
    const result = await responseManager.post(this.baseUrl, userData);
    
    if (result.success) {
      // ✅ Success - data is direct
      return result.data; // { id: 456, name: "Jane", email: "jane@example.com" }
    } else {
      // ❌ Error - structured error
      return responseManager.handleError(result, (error) => {
        if (error.code === 'VALIDATION_ERROR') {
          console.error('Validation failed:', error.details);
        } else {
          console.error('Failed to create user:', error.message);
        }
      });
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user or error
   */
  async updateUser(id, userData) {
    const result = await responseManager.put(`${this.baseUrl}/${id}`, userData);
    
    if (result.success) {
      return result.data;
    } else {
      return responseManager.handleError(result);
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success or error
   */
  async deleteUser(id) {
    const result = await responseManager.delete(`${this.baseUrl}/${id}`);
    
    if (result.success) {
      return true; // 204 No Content
    } else {
      return responseManager.handleError(result);
    }
  }
}

// Usage examples
const userService = new UserService();

// Example 1: Get user
async function exampleGetUser() {
  try {
    const user = await userService.getUser(123);
    console.log('User:', user); // { id: 123, name: "John", email: "john@example.com" }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Create user
async function exampleCreateUser() {
  try {
    const newUser = await userService.createUser({
      name: 'Jane Doe',
      email: 'jane@example.com'
    });
    console.log('Created user:', newUser); // { id: 456, name: "Jane Doe", email: "jane@example.com" }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 3: Error handling
async function exampleErrorHandling() {
  try {
    const user = await userService.getUser(999); // Non-existent user
    console.log('User:', user);
  } catch (error) {
    // Error response from backend:
    // {
    //   "error": {
    //     "message": "User not found",
    //     "code": "NOT_FOUND",
    //     "statusCode": 404,
    //     "timestamp": "2025-10-14T13:38:52.016Z"
    //   }
    // }
    console.error('Error:', error.message); // "User not found"
    console.error('Code:', error.code);     // "NOT_FOUND"
  }
}

export { UserService, exampleGetUser, exampleCreateUser, exampleErrorHandling };
