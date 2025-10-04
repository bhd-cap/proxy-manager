import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Server, Settings, BarChart3, RefreshCw, Power, PowerOff, Plus, Edit2, Trash2, Save, X, LogOut, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const HaproxyManager = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [frontends, setFrontends] = useState([
    { id: 1, name: 'web_frontend', bind: '*:80', backend: 'web_backend', status: 'UP' },
    { id: 2, name: 'api_frontend', bind: '*:8080', backend: 'api_backend', status: 'UP' }
  ]);
  const [backends, setBackends] = useState([
    { id: 1, name: 'web_backend', balance: 'roundrobin', servers: [1, 2] },
    { id: 2, name: 'api_backend', balance: 'leastconn', servers: [3, 4] }
  ]);
  const [servers, setServers] = useState([
    { id: 1, name: 'web1', host: '192.168.1.10', port: 8080, backendId: 1, status: 'UP', enabled: true, currentConns: 45, totalConns: 1250, bytesIn: 2500000, bytesOut: 8900000 },
    { id: 2, name: 'web2', host: '192.168.1.11', port: 8080, backendId: 1, status: 'UP', enabled: true, currentConns: 38, totalConns: 1180, bytesIn: 2300000, bytesOut: 8200000 },
    { id: 3, name: 'api1', host: '192.168.1.20', port: 3000, backendId: 2, status: 'UP', enabled: true, currentConns: 22, totalConns: 890, bytesIn: 1800000, bytesOut: 5500000 },
    { id: 4, name: 'api2', host: '192.168.1.21', port: 3000, backendId: 2, status: 'DOWN', enabled: false, currentConns: 0, totalConns: 0, bytesIn: 0, bytesOut: 0 }
  ]);
  
  const [statsHistory, setStatsHistory] = useState([
    { time: '10:00', connections: 65, throughput: 450 },
    { time: '10:05', connections: 72, throughput: 520 },
    { time: '10:10', connections: 85, throughput: 580 },
    { time: '10:15', connections: 78, throughput: 495 },
    { time: '10:20', connections: 95, throughput: 640 },
    { time: '10:25', connections: 105, throughput: 720 }
  ]);
  
  const [editMode, setEditMode] = useState({ type: null, id: null });
  const [formData, setFormData] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate real-time stats updates
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const interval = setInterval(() => {
      setServers(prev => prev.map(s => ({
        ...s,
        currentConns: s.enabled && s.status === 'UP' ? Math.floor(Math.random() * 100) : 0
      })));
      
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      setStatsHistory(prev => {
        const newHistory = [...prev.slice(-5), {
          time: timeStr,
          connections: Math.floor(Math.random() * 50) + 70,
          throughput: Math.floor(Math.random() * 300) + 400
        }];
        return newHistory;
      });
      
      setLastUpdate(new Date());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
      showNotification('Login successful', 'success');
    } else {
      showNotification('Invalid credentials', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    showNotification('Logged out successfully', 'success');
  };

  const toggleServerStatus = (id) => {
    setServers(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled, status: !s.enabled ? 'UP' : 'DOWN', currentConns: !s.enabled ? s.currentConns : 0 } : s
    ));
    showNotification(`Server ${!servers.find(s => s.id === id).enabled ? 'enabled' : 'disabled'} successfully`, 'success');
  };

  const startEdit = (type, item) => {
    setEditMode({ type, id: item.id });
    setFormData(item);
  };

  const cancelEdit = () => {
    setEditMode({ type: null, id: null });
    setFormData({});
  };

  const saveEdit = () => {
    if (editMode.type === 'frontend') {
      setFrontends(prev => prev.map(f => f.id === editMode.id ? { ...f, ...formData } : f));
    } else if (editMode.type === 'backend') {
      setBackends(prev => prev.map(b => b.id === editMode.id ? { ...b, ...formData } : b));
    } else if (editMode.type === 'server') {
      setServers(prev => prev.map(s => s.id === editMode.id ? { ...s, ...formData } : s));
    }
    showNotification('Changes saved successfully', 'success');
    cancelEdit();
  };

  const addNew = (type) => {
    const newId = Math.max(...(type === 'frontend' ? frontends : type === 'backend' ? backends : servers).map(i => i.id)) + 1;
    if (type === 'frontend') {
      setFrontends(prev => [...prev, { id: newId, name: 'new_frontend', bind: '*:80', backend: backends[0]?.name || '', status: 'UP' }]);
    } else if (type === 'backend') {
      setBackends(prev => [...prev, { id: newId, name: 'new_backend', balance: 'roundrobin', servers: [] }]);
    } else if (type === 'server') {
      setServers(prev => [...prev, { id: newId, name: 'new_server', host: '0.0.0.0', port: 80, backendId: backends[0]?.id || 1, status: 'DOWN', enabled: false, currentConns: 0, totalConns: 0, bytesIn: 0, bytesOut: 0 }]);
    }
    showNotification(`New ${type} added`, 'success');
  };

  const deleteItem = (type, id) => {
    if (type === 'frontend') {
      setFrontends(prev => prev.filter(f => f.id !== id));
    } else if (type === 'backend') {
      setBackends(prev => prev.filter(b => b.id !== id));
    } else if (type === 'server') {
      setServers(prev => prev.filter(s => s.id !== id));
    }
    showNotification(`${type} deleted successfully`, 'success');
  };

  const applyConfig = () => {
    showNotification('Configuration applied and HAProxy reloaded', 'success');
  };

  const formatBytes = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md border border-gray-700">
          <div className="flex items-center justify-center mb-8">
            <Activity className="text-blue-400 mr-3" size={40} />
            <h1 className="text-3xl font-bold text-white">HAProxy Manager</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              Sign In
            </button>
            <p className="text-xs text-gray-400 text-center">Demo: admin / admin</p>
          </form>
        </div>
      </div>
    );
  }

  const totalConnections = servers.reduce((sum, s) => sum + s.currentConns, 0);
  const activeServers = servers.filter(s => s.status === 'UP' && s.enabled).length;
  const totalServers = servers.length;
  const avgThroughput = statsHistory[statsHistory.length - 1]?.throughput || 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : <AlertCircle size={20} className="mr-2" />}
          {notification.message}
        </div>
      )}
      
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="text-blue-400 mr-3" size={32} />
            <h1 className="text-2xl font-bold">HAProxy Manager</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-400">
              <Clock size={16} className="mr-2" />
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
            <button onClick={handleLogout} className="flex items-center text-gray-300 hover:text-white">
              <LogOut size={20} className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-gray-800 min-h-screen p-4 border-r border-gray-700">
          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
              { id: 'frontends', icon: Server, label: 'Frontends' },
              { id: 'backends', icon: Activity, label: 'Backends' },
              { id: 'servers', icon: Server, label: 'Servers' },
              { id: 'config', icon: Settings, label: 'Configuration' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <tab.icon size={20} className="mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Connections</p>
                      <p className="text-3xl font-bold mt-2">{totalConnections}</p>
                    </div>
                    <Activity className="text-blue-400" size={40} />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Servers</p>
                      <p className="text-3xl font-bold mt-2">{activeServers}/{totalServers}</p>
                    </div>
                    <Server className="text-green-400" size={40} />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Throughput</p>
                      <p className="text-3xl font-bold mt-2">{avgThroughput} KB/s</p>
                    </div>
                    <TrendingUp className="text-yellow-400" size={40} />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Frontends</p>
                      <p className="text-3xl font-bold mt-2">{frontends.length}</p>
                    </div>
                    <Settings className="text-purple-400" size={40} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Connection History</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={statsHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                      <Legend />
                      <Line type="monotone" dataKey="connections" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Throughput (KB/s)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={statsHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                      <Legend />
                      <Line type="monotone" dataKey="throughput" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Server Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={backends.map(b => ({
                          name: b.name,
                          value: servers.filter(s => s.backendId === b.id && s.enabled).length
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {backends.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Current Connections by Server</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={servers.filter(s => s.enabled)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                      <Bar dataKey="currentConns" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'frontends' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Frontends</h2>
                <button onClick={() => addNew('frontend')} className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
                  <Plus size={20} className="mr-2" />
                  Add Frontend
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Bind</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Backend</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {frontends.map(f => (
                      <tr key={f.id}>
                        <td className="px-6 py-4">
                          {editMode.type === 'frontend' && editMode.id === f.id ? (
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="bg-gray-700 px-2 py-1 rounded border border-gray-600"
                            />
                          ) : f.name}
                        </td>
                        <td className="px-6 py-4">
                          {editMode.type === 'frontend' && editMode.id === f.id ? (
                            <input
                              type="text"
                              value={formData.bind}
                              onChange={(e) => setFormData({ ...formData, bind: e.target.value })}
                              className="bg-gray-700 px-2 py-1 rounded border border-gray-600"
                            />
                          ) : f.bind}
                        </td>
                        <td className="px-6 py-4">
                          {editMode.type === 'frontend' && editMode.id === f.id ? (
                            <select
                              value={formData.backend}
                              onChange={(e) => setFormData({ ...formData, backend: e.target.value })}
                              className="bg-gray-700 px-2 py-1 rounded border border-gray-600"
                            >
                              {backends.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                          ) : f.backend}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${f.status === 'UP' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {editMode.type === 'frontend' && editMode.id === f.id ? (
                            <div className="flex space-x-2">
                              <button onClick={saveEdit} className="text-green-400 hover:text-green-300">
                                <Save size={18} />
                              </button>
                              <button onClick={cancelEdit} className="text-red-400 hover:text-red-300">
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button onClick={() => startEdit('frontend', f)} className="text-blue-400 hover:text-blue-300">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteItem('frontend', f.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'backends' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Backends</h2>
                <button onClick={() => addNew('backend')} className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
                  <Plus size={20} className="mr-2" />
                  Add Backend
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Balance Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Servers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {backends.map(b => (
                      <tr key={b.id}>
                        <td className="px-6 py-4">
                          {editMode.type === 'backend' && editMode.id === b.id ? (
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="bg-gray-700 px-2 py-1 rounded border border-gray-600"
                            />
                          ) : b.name}
                        </td>
                        <td className="px-6 py-4">
                          {editMode.type === 'backend' && editMode.id === b.id ? (
                            <select
                              value={formData.balance}
                              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                              className="bg-gray-700 px-2 py-1 rounded border border-gray-600"
                            >
                              <option value="roundrobin">Round Robin</option>
                              <option value="leastconn">Least Connections</option>
                              <option value="source">Source IP</option>
                            </select>
                          ) : b.balance}
                        </td>
                        <td className="px-6 py-4">{servers.filter(s => s.backendId === b.id).length}</td>
                        <td className="px-6 py-4">
                          {editMode.type === 'backend' && editMode.id === b.id ? (
                            <div className="flex space-x-2">
                              <button onClick={saveEdit} className="text-green-400 hover:text-green-300">
                                <Save size={18} />
                              </button>
                              <button onClick={cancelEdit} className="text-red-400 hover:text-red-300">
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button onClick={() => startEdit('backend', b)} className="text-blue-400 hover:text-blue-300">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteItem('backend', b.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Backend Servers</h2>
                <button onClick={() => addNew('server')} className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
                  <Plus size={20} className="mr-2" />
                  Add Server
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Host:Port</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Backend</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Connections</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Data Transfer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {servers.map(s => (
                      <tr key={s.id} className={!s.enabled ? 'opacity-50' : ''}>
                        <td className="px-6 py-4">
                          {editMode.type === 'server' && editMode.id === s.id ? (
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="bg-gray-700 px-2 py-1 rounded border border-gray-600"
                            />
                          ) : s.name}
                        </td>
                        <td className="px-6 py-4">
                          {editMode.type === 'server' && editMode.id === s.id ? (
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                value={formData.host}
                                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                className="bg-gray-700 px-2 py-1 rounded border border-gray-600 w-32"
                                placeholder="Host"
                              />
                              <input
                                type="number"
                                value={formData.port}
                                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                className="bg-gray-700 px-2 py-1 rounded border border-gray-600 w-20"
                                placeholder="Port"
                              />
                            </div>
                          ) : `${s.host}:${s.port}`}
                        </td>
                        <td className="px-6 py-4">
                          {editMode.type === 'server' && editMode.id === s.id ? (
                            <select
                              value={formData.backendId}
                              onChange={(e) => setFormData({ ...formData, backendId: parseInt(e.target.value) })}
                              className="bg-gray-700 px-2 py-1 rounded border border-gray-600"
                            >
                              {backends.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                          ) : backends.find(b => b.id === s.backendId)?.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${s.status === 'UP' && s.enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className={`px-2 py-1 rounded text-xs ${s.status === 'UP' && s.enabled ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                              {s.enabled ? s.status : 'DISABLED'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div>Current: {s.currentConns}</div>
                            <div className="text-gray-400">Total: {s.totalConns}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div>In: {formatBytes(s.bytesIn)}</div>
                            <div className="text-gray-400">Out: {formatBytes(s.bytesOut)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editMode.type === 'server' && editMode.id === s.id ? (
                            <div className="flex space-x-2">
                              <button onClick={saveEdit} className="text-green-400 hover:text-green-300">
                                <Save size={18} />
                              </button>
                              <button onClick={cancelEdit} className="text-red-400 hover:text-red-300">
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => toggleServerStatus(s.id)}
                                className={`${s.enabled ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                                title={s.enabled ? 'Disable' : 'Enable'}
                              >
                                {s.enabled ? <PowerOff size={18} /> : <Power size={18} />}
                              </button>
                              <button onClick={() => startEdit('server', s)} className="text-blue-400 hover:text-blue-300">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteItem('server', s.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Configuration Management</h2>
              
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Generated HAProxy Configuration</h3>
                <div className="bg-gray-900 rounded p-4 font-mono text-sm overflow-x-auto border border-gray-700">
                  <pre className="text-green-400">
{`global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

${frontends.map(f => `frontend ${f.name}
    bind ${f.bind}
    default_backend ${f.backend}
`).join('\n')}
${backends.map(b => `backend ${b.name}
    balance ${b.balance}
${servers.filter(s => s.backendId === b.id).map(s => 
    `    server ${s.name} ${s.host}:${s.port} check${!s.enabled ? ' disabled' : ''}`
).join('\n')}
`).join('\n')}`}
                  </pre>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-4">
                  <button
                    onClick={applyConfig}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center"
                  >
                    <RefreshCw size={20} className="mr-2" />
                    Apply Configuration & Reload HAProxy
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg">
                      Download Config
                    </button>
                    <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg">
                      Validate Config
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">HAProxy Version:</span>
                    <span className="ml-2 text-white">2.8.3</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Config File:</span>
                    <span className="ml-2 text-white">/etc/haproxy/haproxy.cfg</span>
                  </div>
                  <div>
                    <span className="text-gray-400">PID File:</span>
                    <span className="ml-2 text-white">/var/run/haproxy.pid</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Socket:</span>
                    <span className="ml-2 text-white">/run/haproxy/admin.sock</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HaproxyManager;