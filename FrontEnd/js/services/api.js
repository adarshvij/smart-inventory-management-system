/**
 * API Service Utility
 */

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('sims_token');
  }

  getToken() {
    return this.token || localStorage.getItem('sims_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('sims_token', token);
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem('sims_token');
    localStorage.removeItem('sims_user');
  }

  getHeaders(isFormData = false) {
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle Unauthorized (Token Expiry)
      if (response.status === 401) {
        this.clearAuth();
        if (window.toast) {
          window.toast.show('Session expired. Please log in again.', 'warning');
        }
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
        throw new Error('Session expired');
      }

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = data?.message || data || 'An error occurred';
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      if (error.message !== 'Session expired') {
        if (window.toast) {
          window.toast.show(error.message || 'Network error occurred', 'error');
        }
      }
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async patch(endpoint, data) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Authentication Helpers
  isAuthenticated() {
    return !!this.getToken();
  }
  
  getUser() {
    const userStr = localStorage.getItem('sims_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getRole() {
    const user = this.getUser();
    return user?.role || 'staff';
  }

  isAdmin() {
    return this.getRole() === 'admin';
  }

  isManager() {
    return this.getRole() === 'manager';
  }

  isStaff() {
    return this.getRole() === 'staff';
  }

  canEdit() {
    return this.isAdmin() || this.isManager();
  }

  canDelete() {
    return this.isAdmin();
  }
}

window.api = new ApiService();

// ─── Shared Role Badge Renderer ────────────────────────────────────────────────
window.renderRoleBadge = function () {
  const el = document.getElementById('userRole');
  if (!el) return;
  const role = window.api.getRole();
  const styles = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    manager: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    staff: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  el.className = 'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' + (styles[role] || styles.staff);
  el.textContent = role;
};
