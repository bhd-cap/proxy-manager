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

  // User Management
  async getUsers() {
    return this.request('/users');
  }

  async createUser(username: string, password: string) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async deleteUser(username: string) {
    return this.request(`/users/${username}`, {
      method: 'DELETE',
    });
  }

  async changePassword(username: string, password: string) {
    return this.request(`/users/${username}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  // Frontend Server Management
  async getFrontends() {
    return this.request('/frontends');
  }

  async createFrontend(data: any) {
    return this.request('/frontends', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFrontend(id: number, data: any) {
    return this.request(`/frontends/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFrontend(id: number) {
    return this.request(`/frontends/${id}`, {
      method: 'DELETE',
    });
  }

  // Backend Server Management
  async getBackends() {
    return this.request('/backends');
  }

  async createBackend(data: any) {
    return this.request('/backends', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBackend(id: number, data: any) {
    return this.request(`/backends/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBackend(id: number) {
    return this.request(`/backends/${id}`, {
      method: 'DELETE',
    });
  }

  async addBackendServer(backendName: string, data: any) {
    return this.request(`/backends/${backendName}/servers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBackendServer(backendName: string, serverId: number, data: any) {
    return this.request(`/backends/${backendName}/servers/${serverId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBackendServer(backendName: string, serverId: number) {
    return this.request(`/backends/${backendName}/servers/${serverId}`, {
      method: 'DELETE',
    });
  }

  // Connection History
  async getConnectionHistory(serverName?: string, serverType?: string, limit?: number) {
    const params = new URLSearchParams();
    if (serverName) params.append('server_name', serverName);
    if (serverType) params.append('server_type', serverType);
    if (limit) params.append('limit', limit.toString());

    const query = params.toString();
    return this.request(`/connections${query ? '?' + query : ''}`);
  }

  async getActiveConnections() {
    return this.request('/connections/active');
  }

  // HAProxy Config Management
  async applyConfig() {
    return this.request('/haproxy/apply', {
      method: 'POST',
    });
  }

  async getBackups() {
    return this.request('/haproxy/backups');
  }

  async restoreBackup(backupId: number) {
    return this.request(`/haproxy/backups/${backupId}/restore`, {
      method: 'POST',
    });
  }
}

export const api = new APIClient();
