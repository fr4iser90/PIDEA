/**
 * User Data Generator
 *
 * Generates test user data for database testing.
 * Provides utilities for creating realistic user records.
 */

const crypto = require("crypto");

/**
 * Generate test user data
 * @param {number} count - Number of users to generate
 * @param {Object} options - Generation options
 * @returns {Array} Generated user data
 */
function generateUsers(count = 1, options = {}) {
  const {
    startId = 1,
    roles = ["user", "admin", "moderator"],
    activeRatio = 0.8,
    emailDomain = "example.com",
  } = options;

  const users = [];

  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const username = `testuser${id}`;
    const email = `${username}@${emailDomain}`;
    const passwordHash = generatePasswordHash();
    const createdAt = generateRandomDate();
    const updatedAt = generateRandomDate(createdAt);
    const isActive = Math.random() < activeRatio;
    const role = roles[Math.floor(Math.random() * roles.length)];

    users.push({
      id,
      username,
      email,
      password_hash: passwordHash,
      created_at: createdAt,
      updated_at: updatedAt,
      is_active: isActive,
      role,
    });
  }

  return users;
}

/**
 * Generate password hash
 * @returns {string} Password hash
 */
function generatePasswordHash() {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync("testpassword", salt, 1000, 64, "sha512")
    .toString("hex");
  return `$2b$10$${salt}${hash}`;
}

/**
 * Generate random date
 * @param {Date} minDate - Minimum date
 * @returns {string} ISO date string
 */
function generateRandomDate(minDate = null) {
  const now = new Date();
  const start = minDate
    ? new Date(minDate)
    : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const end = now;

  const randomTime =
    start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString();
}

/**
 * Generate user with specific properties
 * @param {Object} properties - Specific properties to set
 * @returns {Object} Generated user
 */
function generateUser(properties = {}) {
  const defaultUser = generateUsers(1)[0];
  return { ...defaultUser, ...properties };
}

/**
 * Generate admin user
 * @returns {Object} Admin user
 */
function generateAdminUser() {
  return generateUser({
    role: "admin",
    is_active: true,
  });
}

/**
 * Generate inactive user
 * @returns {Object} Inactive user
 */
function generateInactiveUser() {
  return generateUser({
    is_active: false,
  });
}

/**
 * Generate user with specific role
 * @param {string} role - User role
 * @returns {Object} User with specific role
 */
function generateUserWithRole(role) {
  return generateUser({
    role,
    is_active: true,
  });
}

module.exports = {
  generateUsers,
  generateUser,
  generateAdminUser,
  generateInactiveUser,
  generateUserWithRole,
};
