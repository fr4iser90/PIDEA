/**
 * True when the process runs inside a Docker container (/.dockerenv exists).
 * Use for same-origin URL/port rules; DB host uses separate resolution.
 */
const fs = require("fs");

function isDockerRuntime() {
  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

module.exports = { isDockerRuntime };
