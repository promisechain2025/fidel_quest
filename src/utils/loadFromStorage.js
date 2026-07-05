export const loadFromStorage = (key, fallback = '') => {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
