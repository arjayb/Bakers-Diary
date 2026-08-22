// Centralized API client (§33) — every fetch to the backend goes through
// here so auth headers, error shape, and the base URL are defined once.

const configuredBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const BASE_URL = configuredBase.replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('bd_token');
}

async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkErr) {
    // §34 "API unavailable" failure state — surfaced as a normal thrown
    // error the UI can catch and show, not an uncaught rejection.
    const err = new Error('Could not reach the server. Check your connection and try again.');
    err.status = 0;
    throw err;
  }

  let data = null;
  try { data = await response.json(); } catch { /* empty body, e.g. some 204s */ }

  if (!response.ok) {
    const err = new Error(data?.message || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }

  return data;
}

// --- Auth ---
export const login = (password) => request('/auth/login', { method: 'POST', body: { password } });
export const getMe = () => request('/auth/me');
export const forgotPassword = () => request('/auth/forgot-password', { method: 'POST' });

// --- Settings ---
export const getSettings = () => request('/settings');
export const updateSettings = (body) => request('/settings', { method: 'PATCH', body });

// --- Recipes ---
export const getRecipes = (params = '') => request(`/recipes${params}`);
export const getRecipe = (id) => request(`/recipes/${id}`);
export const createRecipe = (body) => request('/recipes', { method: 'POST', body });
export const updateRecipe = (id, body) => request(`/recipes/${id}`, { method: 'PATCH', body });
export const deleteRecipe = (id) => request(`/recipes/${id}`, { method: 'DELETE' });
export const getRecipeNutrition = (id) => request(`/recipes/${id}/nutrition`);
export const rematchIngredient = (id, name) => request(`/recipes/${id}/nutrition/${encodeURIComponent(name)}/rematch`, { method: 'PATCH' });
export const getRecipeBakes = (id) => request(`/recipes/${id}/bakes`);

// --- Sessions (Cook/Bake mode) ---
export const startSession = (recipeId) => request('/sessions', { method: 'POST', body: { recipeId } });
export const getSession = (id) => request(`/sessions/${id}`);
export const getContinuableSession = () => request('/sessions/continue');
export const updateSessionProgress = (id, body) => request(`/sessions/${id}/progress`, { method: 'PATCH', body });
export const attachStepPhoto = (id, body) => request(`/sessions/${id}/step-photo`, { method: 'PATCH', body });
export const completeSession = (id, body) => request(`/sessions/${id}/complete`, { method: 'PATCH', body });
export const abandonSession = (id) => request(`/sessions/${id}/abandon`, { method: 'PATCH' });

// --- Journal ---
export const getJournal = () => request('/journal');
export const getJournalEntry = (sessionId) => request(`/journal/${sessionId}`);

// --- Conversions ---
export const convert = (body) => request('/conversions', { method: 'POST', body });

// --- Groceries ---
export const getGroceryItems = () => request('/groceries');
export const addGroceryItem = (body) => request('/groceries', { method: 'POST', body });
export const addGroceriesFromRecipe = (recipeId) => request(`/groceries/from-recipe/${recipeId}`, { method: 'POST' });
export const updateGroceryItem = (id, body) => request(`/groceries/${id}`, { method: 'PATCH', body });
export const deleteGroceryItem = (id) => request(`/groceries/${id}`, { method: 'DELETE' });

// --- Media ---
export const uploadMedia = (file) => {
  const form = new FormData();
  form.append('photo', file);
  return request('/media', { method: 'POST', body: form, isFormData: true });
};

export const setToken = (token) => localStorage.setItem('bd_token', token);
export const clearToken = () => localStorage.removeItem('bd_token');
export const hasToken = () => Boolean(getToken());
