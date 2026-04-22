export const CALLS_UPDATED_EVENT = "customer-call-insights:calls-updated";
export const CALLS_UPDATED_STORAGE_KEY = "customer-call-insights:calls-updated-at";

export function notifyCallsUpdated(payload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const detail = {
    ...payload,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(CALLS_UPDATED_STORAGE_KEY, String(detail.updatedAt));
  } catch (error) {
    console.warn("Unable to write call update marker to localStorage.", error);
  }

  try {
    window.dispatchEvent(new CustomEvent(CALLS_UPDATED_EVENT, { detail }));
  } catch (error) {
    console.warn("Unable to dispatch call update event.", error);
  }
}
