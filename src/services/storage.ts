
export function readStorage<T>(key: string, fallback: T): T {
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T, eventName?: string): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  if (eventName) {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

export function subscribeToStorage(key: string, callback: () => void, eventName?: string): () => void {
  function syncStorage(event: StorageEvent): void {
    if (!event || event.key === key) callback();
  }

  window.addEventListener("storage", syncStorage);
  if (eventName) window.addEventListener(eventName, callback);

  return () => {
    window.removeEventListener("storage", syncStorage);
    if (eventName) window.removeEventListener(eventName, callback);
  };
}
