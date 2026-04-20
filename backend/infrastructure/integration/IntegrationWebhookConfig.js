/**
 * Runtime callback URL/secret for AgentLayer (optional override of env).
 * Persisted only in memory unless you add a store later.
 */

let runtimeUrl = null;
let runtimeSecret = null;

function getCallbackUrl() {
  return runtimeUrl || process.env.PIDEA_INTEGRATION_CALLBACK_URL || null;
}

function getCallbackSecret() {
  return runtimeSecret || process.env.PIDEA_INTEGRATION_CALLBACK_SECRET || "";
}

function setRuntimeFromBody(body) {
  runtimeUrl = body.url || null;
  runtimeSecret = body.secret != null ? body.secret : runtimeSecret;
}

function clearRuntime() {
  runtimeUrl = null;
  runtimeSecret = null;
}

function isWebhookRegisterAllowed() {
  return process.env.PIDEA_INTEGRATION_ALLOW_WEBHOOK_REGISTER === "true";
}

function maskUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return "[invalid]";
  }
}

module.exports = {
  getCallbackUrl,
  getCallbackSecret,
  setRuntimeFromBody,
  clearRuntime,
  isWebhookRegisterAllowed,
  maskUrl,
};
