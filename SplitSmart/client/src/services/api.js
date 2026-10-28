const API_BASE = '/api';

/**
 * Universal request wrapper that automatically attaches the JWT token
 * and handles JSON parsing and standard HTTP errors.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('splitsmart_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    getMe: () => request('/auth/me'),
    searchUsers: (query) => request(`/auth/search?query=${encodeURIComponent(query)}`)
  },

  // Groups
  groups: {
    getAll: () => request('/groups'),
    create: (groupData) => request('/groups', { method: 'POST', body: JSON.stringify(groupData) }),
    getById: (id) => request(`/groups/${id}`),
    update: (id, data) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
    getBalances: (id) => request(`/groups/${id}/balances`),
    settle: (id, balances = null) => request(`/groups/${id}/settle`, { method: 'POST', body: JSON.stringify(balances ? { balances } : {}) }),
    getSettlements: (id) => request(`/groups/${id}/settlements`)
  },

  // Expenses
  expenses: {
    getAll: (groupId = null) => request(`/expenses${groupId ? `?groupId=${groupId}` : ''}`),
    create: (expenseData) => request('/expenses', { method: 'POST', body: JSON.stringify(expenseData) }),
    getById: (id) => request(`/expenses/${id}`),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' })
  }
};
