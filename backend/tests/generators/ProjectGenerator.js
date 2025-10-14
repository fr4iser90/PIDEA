/**
 * Project Data Generator
 *
 * Generates test project data for database testing.
 * Provides utilities for creating realistic project records.
 */

/**
 * Generate test project data
 * @param {number} count - Number of projects to generate
 * @param {Object} options - Generation options
 * @returns {Array} Generated project data
 */
function generateProjects(count = 1, options = {}) {
  const {
    startId = 1,
    ownerIds = [1, 2, 3],
    statuses = ["active", "inactive", "archived"],
    visibilities = ["private", "public", "internal"],
    namePrefix = "Test Project",
  } = options;

  const projects = [];

  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const name = `${namePrefix} ${id}`;
    const description = generateProjectDescription();
    const ownerId = ownerIds[Math.floor(Math.random() * ownerIds.length)];
    const createdAt = generateRandomDate();
    const updatedAt = generateRandomDate(createdAt);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const visibility =
      visibilities[Math.floor(Math.random() * visibilities.length)];

    projects.push({
      id,
      name,
      description,
      owner_id: ownerId,
      created_at: createdAt,
      updated_at: updatedAt,
      status,
      visibility,
    });
  }

  return projects;
}

/**
 * Generate project description
 * @returns {string} Project description
 */
function generateProjectDescription() {
  const descriptions = [
    "A test project for database testing",
    "Another test project for database testing",
    "A third test project for database testing",
    "Test project with comprehensive testing scenarios",
    "Database testing project with multiple components",
    "Test project for performance validation",
    "Database testing project with audit trails",
    "Test project for migration testing",
    "Database testing project with error handling",
    "Test project for cross-database compatibility",
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
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
 * Generate project with specific properties
 * @param {Object} properties - Specific properties to set
 * @returns {Object} Generated project
 */
function generateProject(properties = {}) {
  const defaultProject = generateProjects(1)[0];
  return { ...defaultProject, ...properties };
}

/**
 * Generate active project
 * @returns {Object} Active project
 */
function generateActiveProject() {
  return generateProject({
    status: "active",
    visibility: "private",
  });
}

/**
 * Generate public project
 * @returns {Object} Public project
 */
function generatePublicProject() {
  return generateProject({
    status: "active",
    visibility: "public",
  });
}

/**
 * Generate archived project
 * @returns {Object} Archived project
 */
function generateArchivedProject() {
  return generateProject({
    status: "archived",
    visibility: "private",
  });
}

/**
 * Generate project for specific owner
 * @param {number} ownerId - Owner ID
 * @returns {Object} Project for specific owner
 */
function generateProjectForOwner(ownerId) {
  return generateProject({
    owner_id: ownerId,
    status: "active",
  });
}

/**
 * Generate project with specific status
 * @param {string} status - Project status
 * @returns {Object} Project with specific status
 */
function generateProjectWithStatus(status) {
  return generateProject({
    status,
    visibility: "private",
  });
}

/**
 * Generate project with specific visibility
 * @param {string} visibility - Project visibility
 * @returns {Object} Project with specific visibility
 */
function generateProjectWithVisibility(visibility) {
  return generateProject({
    status: "active",
    visibility,
  });
}

module.exports = {
  generateProjects,
  generateProject,
  generateActiveProject,
  generatePublicProject,
  generateArchivedProject,
  generateProjectForOwner,
  generateProjectWithStatus,
  generateProjectWithVisibility,
};
