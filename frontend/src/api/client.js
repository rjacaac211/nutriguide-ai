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

export async function sendChat(userId, message, threadId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message, threadId }),
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update profile");
  }
  return res.json();
}

export async function loginByName(name) {
  const res = await fetch(`${API_BASE}/users/by-name?name=${encodeURIComponent(name)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Login failed");
  }
  return res.json();
}

export async function getCalorieGoal(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/calorie-goal`);
  if (!res.ok) {
    if (res.status === 404) return { goalKcal: 2000 };
    throw new Error("Failed to fetch calorie goal");
  }
  return res.json();
}

export async function getDailyCalories(userId, from, to) {
  const fromStr = typeof from === "string" ? from : from.toISOString().slice(0, 10);
  const toStr = typeof to === "string" ? to : to.toISOString().slice(0, 10);
  const res = await fetch(
    `${API_BASE}/users/${userId}/daily-calories?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`
  );
  if (!res.ok) throw new Error("Failed to fetch daily calories");
  const data = await res.json();
  return data.days ?? [];
}

export async function searchFoods(query, limit = 25) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`${API_BASE}/foods/search?${params}`);
  if (!res.ok) throw new Error("Food search failed");
  const data = await res.json();
  return data.foods ?? [];
}

export async function getFoodDetails(fdcId) {
  const res = await fetch(`${API_BASE}/foods/${fdcId}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch food details");
  }
  return res.json();
}

export async function getFoodLogs(userId, date) {
  const dateStr = typeof date === "string" ? date : date.toISOString().slice(0, 10);
  const res = await fetch(`${API_BASE}/users/${userId}/food-logs?date=${dateStr}`);
  if (!res.ok) throw new Error("Failed to fetch food logs");
  const data = await res.json();
  return data.logs ?? [];
}

export async function createFoodLog(userId, { mealType, items, loggedAt }) {
  const res = await fetch(`${API_BASE}/users/${userId}/food-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mealType, items, loggedAt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create food log");
  }
  return res.json();
}

export async function updateFoodLog(userId, logId, { mealType, items }) {
  const res = await fetch(`${API_BASE}/users/${userId}/food-logs/${logId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mealType, items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update food log");
  }
  return res.json();
}

export async function deleteFoodLog(userId, logId) {
  const res = await fetch(`${API_BASE}/users/${userId}/food-logs/${logId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete food log");
  }
}

export async function updateFoodLogItem(userId, logId, itemIndex, patch) {
  const res = await fetch(
    `${API_BASE}/users/${userId}/food-logs/${logId}/items/${itemIndex}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update item");
  }
  return res.json();
}

export async function deleteFoodLogItem(userId, logId, itemIndex) {
  const res = await fetch(
    `${API_BASE}/users/${userId}/food-logs/${logId}/items/${itemIndex}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete item");
  }
}

export async function getWeightLogs(userId, from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", typeof from === "string" ? from : from.toISOString().slice(0, 10));
  if (to) params.set("to", typeof to === "string" ? to : to.toISOString().slice(0, 10));
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/users/${userId}/weight-logs${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch weight logs");
  const data = await res.json();
  return data.logs ?? [];
}

export async function createWeightLog(userId, { weightKg, date, notes }) {
  const res = await fetch(`${API_BASE}/users/${userId}/weight-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weightKg, date, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create weight log");
  }
  return res.json();
}

export async function updateWeightLog(userId, logId, { weightKg, notes }) {
  const res = await fetch(`${API_BASE}/users/${userId}/weight-logs/${logId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weightKg, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update weight log");
  }
  return res.json();
}

export async function deleteWeightLog(userId, logId) {
  const res = await fetch(`${API_BASE}/users/${userId}/weight-logs/${logId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete weight log");
  }
}
