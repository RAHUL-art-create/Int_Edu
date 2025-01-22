export function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

export function loadFromLocalStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    return null;
  }
}

export function saveProgress(courseId, progress) {
  const key = `course_progress_${courseId}`;
  saveToLocalStorage(key, progress);
}

export function loadProgress(courseId) {
  const key = `course_progress_${courseId}`;
  return loadFromLocalStorage(key) || [];
}