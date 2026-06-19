const LIVE_STATUS = "live";
const PENDING_STATUS = "pending";

export const PROJECT_STATUS_ENV = "PROJECT_STATUS";

export const PROJECT_STATUS = {
  LIVE: LIVE_STATUS,
  PENDING: PENDING_STATUS,
};

const PENDING_MESSAGE =
  "llmapikey is pending while we evaluate a provider that can support a free monthly key giveaway without surprise BYOK pass-through fees.";

/**
 * Runtime project lifecycle. Defaults fail-closed so a missing or mistyped env
 * cannot accidentally reopen key minting.
 *
 * @returns {"live"|"pending"}
 */
export function getProjectStatus() {
  return normalizeStatus(process.env[PROJECT_STATUS_ENV]);
}

/**
 * @returns {boolean}
 */
export function isProjectLive() {
  return getProjectStatus() === LIVE_STATUS;
}

/**
 * @returns {boolean}
 */
export function isKeyMintingEnabled() {
  return isProjectLive() && process.env.PROVISIONING_ENABLED === "true";
}

/**
 * Human-facing explanation for the first disabled gate, or null when minting is
 * enabled.
 *
 * @returns {string|null}
 */
export function keyMintingGateMessage() {
  if (!isProjectLive()) return PENDING_MESSAGE;
  if (process.env.PROVISIONING_ENABLED !== "true") {
    return "Key giveaway is not live yet. Check back soon.";
  }
  return null;
}

/**
 * @returns {string}
 */
export function projectPendingMessage() {
  return PENDING_MESSAGE;
}

/**
 * @param {unknown} value
 * @returns {"live"|"pending"}
 */
function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase() === LIVE_STATUS
    ? LIVE_STATUS
    : PENDING_STATUS;
}
