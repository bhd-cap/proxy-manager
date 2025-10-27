/**
 * API Client for HAProxy Manager
 */

const API_BASE_URL = '/api';

class APIClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    return this.token;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      this.clearToken();
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Authentication
  async login(username: string, password: string) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // Configuration
  async getConfig() {
    return this.request('/config');
  }

  async updateConfig(config: any) {
    return this.request('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async reloadHAProxy() {
    return this.request('/reload', { method: 'POST' });
  }

  // Statistics
  async getStats() {
    return this.request('/stats');
  }

  // Server management
  async toggleServer(backend: string, server: string, enable: boolean) {
    return this.request(`/server/${backend}/${server}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enable }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const api = new APIClient();
