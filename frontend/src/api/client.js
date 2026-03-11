const API_BASE = "/api";
const CHAT_TIMEOUT_MS = 90000; // 90 seconds for LLM response

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendChat(userId, message, messages = []) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message, messages }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Chat failed");
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(
        "Request timed out. Ensure the backend (port 3001) and AI agent (port 8000) are running."
      );
    }
    const msg = err.message || "";
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("Connection")) {
      throw new Error(
        "Cannot reach backend. Start it with: cd backend && npm run dev"
      );
    }
    throw err;
  }
}

export async function getProfile(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/profile`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch profile");
  }
  return res.json();
}

export async function updateProfile(userId, profile) {
  const res = await fetch(`${API_BASE}/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}
