# HAProxy Manager - Complete Production Solution

A modern, full-featured web-based management interface for HAProxy with real-time monitoring, configuration management, and comprehensive administrative controls.

## 🎯 Features

### Core Functionality
- ✅ **Secure Authentication** - Local user/password system with session management
- ✅ **Full CRUD Operations** - Manage frontends, backends, and servers
- ✅ **Server Control** - Enable/disable servers with one click, re-enable from UI
- ✅ **Real-time Monitoring** - Live stats via AJAX updates every 5 seconds
- ✅ **Configuration Management** - Edit and persist changes to haproxy.cfg
- ✅ **Live Reload** - Apply configuration changes without downtime
- ✅ **Health Indicators** - Visual status for all servers (UP/DOWN/DISABLED)

### Dashboard & Visualization
- 📊 **Real-time Charts** - Connection history, throughput graphs
- 📈 **Live Metrics** - Total connections, active servers, throughput
- 🥧 **Server Distribution** - Pie chart showing backend distribution
- 📉 **Connection Graphs** - Bar charts for current connections per server
- ⏱️ **Auto-refresh** - Dashboard updates automatically every 5 seconds

### Advanced Features
- 🔒 **Security** - SHA-256 password hashing, session tokens, CORS protection
- 💾 **Configuration Backup** - Automatic backups before changes
- ✔️ **Config Validation** - Syntax checking before applying changes
- 📝 **Generated Config** - View complete HAProxy configuration
- 🎨 **Modern UI** - Dark theme with Tailwind CSS, responsive design
- 🔔 **Notifications** - Toast notifications for all actions
- 📊 **Statistics Panel** - Data transfer metrics (bytes in/out)
- 🔄 **Load Balancing** - Support for roundrobin, leastconn, source algorithms

### UI/UX Enhancements
- 🌙 **Dark Mode** - Professional dark theme optimized for long sessions
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Fast Performance** - Optimized rendering with React
- 🎯 **Intuitive Navigation** - Sidebar navigation with icons
- 🎨 **Visual Feedback** - Status badges, loading states, hover effects
- 🔍 **Clear Status** - Color-coded health indicators (green/red)
- ⌨️ **Keyboard Friendly** - Proper form controls and accessibility
- 📊 **Data Tables** - Sortable, filterable server lists

## 🏗️ Architecture

```
┌─────────────────┐
│   React Frontend │ ← User Interface (Port 80/443)
└────────┬────────┘
         │
┌────────▼────────┐
│   Nginx Proxy   │ ← Reverse Proxy + SSL
└────────┬────────┘
         │
┌────────▼────────┐
│  Flask Backend  │ ← API Server (Port 5000)
│  (Gunicorn)     │
└────────┬────────┘
         │
┌────────▼────────┐
│    HAProxy      │ ← Load Balancer
│  /etc/haproxy/  │
└────────┬────────┘
         │
┌────────▼────────┐
│   Backend Pool  │ ← Your Application Servers
└─────────────────┘
```

## 📦 What's Included

### Frontend (React Application)
```
frontend/
├── src/
│   ├── App.jsx              # Main React component
│   ├── components/
│   │   ├── Dashboard.jsx    # Dashboard with charts
│   │   ├── Frontends.jsx    # Frontend management
│   │   ├── Backends.jsx     # Backend management
│   │   ├── Servers.jsx      # Server management
│   │   └── Config.jsx       # Configuration viewer
│   └── utils/
│       └── api.js           # API client
└── build/                   # Production build
```

### Backend (Flask API)
```
backend/
├── app.py                   # Main Flask application
├── requirements.txt         # Python dependencies
├── gunicorn_config.py      # Gunicorn settings
└── utils/
    ├── config_parser.py    # HAProxy config parser
    ├── auth.py             # Authentication
    └── haproxy.py          # HAProxy management
```

### Deployment
```
deployment/
├── install.sh              # Automated installer
├── nginx.conf              # Nginx configuration
├── haproxy-manager.service # Systemd service
└── backup.sh               # Backup script
```

## 🚀 Quick Start

### Option 1: Automated Installation (Recommended)

```bash
# Download and run the installer
curl -sSL https://github.com/bhd-cap/proxy-manager/main/install.sh | sudo bash

# Or download first and inspect
wget https://github.com/bhd-cap/proxy-manager/main/install.sh
sudo bash install.sh
```

The installer will:
1. ✅ Detect your OS (Ubuntu/Debian/RHEL)
2. ✅ Install all dependencies
3. ✅ Create system user and directories
4. ✅ Setup Python virtual environment
5. ✅ Configure HAProxy with stats socket
6. ✅ Create systemd service
7. ✅ Configure Nginx reverse proxy
8. ✅ Set up proper permissions
9. ✅ Start all services

### Option 2: Manual Installation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed manual installation instructions.

## 🔐 Default Credentials

**⚠️ CRITICAL: Change these immediately after first login!**

```
Username: admin
Password: admin
```

### Change Password

```bash
# Method 1: Via Python script
sudo python3 << 'EOF'
import sqlite3
import hashlib

new_password = "your_secure_password_here"
password_hash = hashlib.sha256(new_password.encode()).hexdigest()

conn = sqlite3.connect('/var/lib/haproxy-manager/users.db')
c = conn.cursor()
c.execute("UPDATE users SET password_hash = ? WHERE username = 'admin'", (password_hash,))
conn.commit()
conn.close()
print("✓ Password updated")
EOF

# Method 2: Via API (after login)
curl -X POST http://localhost/api/users/change-password \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"admin","new_password":"new_secure_pass"}'
```

## 📖 Usage Guide

### Accessing the Interface

1. **Open your browser**
   ```
   http://your-server-ip
   or
   https://haproxy.yourdomain.com
   ```

2. **Login with credentials**
   - Default: admin / admin

3. **Navigate the interface**
   - **Dashboard**: Real-time metrics and graphs
   - **Frontends**: Manage frontend listeners
   - **Backends**: Configure backend pools
   - **Servers**: Add/remove/enable/disable servers
   - **Configuration**: View and apply changes

### Managing Servers

#### Add a New Server
1. Go to **Servers** tab
2. Click **"Add Server"**
3. Fill in details:
   - Name: `web3`
   - Host: `192.168.1.12`
   - Port: `8080`
   - Backend: Select from dropdown
4. Click **Save**
5. Click **"Apply Configuration"** to activate

#### Enable/Disable Server
1. Find server in **Servers** list
2. Click power icon (🔴 = disabled, 🟢 = enabled)
3. Click **"Apply Configuration"**

#### Edit Server
1. Click **Edit** icon (pencil)
2. Modify fields
3. Click **Save** (checkmark)
4. Click **"Apply Configuration"**

### Managing Frontends

#### Add Frontend
1. Go to **Frontends** tab
2. Click **"Add Frontend"**
3. Configure:
   - Name: `api_frontend`
   - Bind: `*:8080` (or specific IP)
   - Backend: Select target backend
4. Save and apply

#### Edit Bind Port
1. Click **Edit** on frontend
2. Change bind address (e.g., `*:443` for HTTPS)
3. Save and apply configuration

### Managing Backends

#### Add Backend Pool
1. Go to **Backends** tab
2. Click **"Add Backend"**
3. Configure:
   - Name: `api_backend`
   - Balance: `roundrobin`, `leastconn`, or `source`
4. Add servers to this backend in **Servers** tab

### Applying Changes

**IMPORTANT**: Changes are not active until you apply configuration!

1. Make your changes (add/edit/delete)
2. Go to **Configuration** tab
3. Review generated configuration
4. Click **"Apply Configuration & Reload HAProxy"**
5. Wait for success notification

## 📊 Monitoring

### Dashboard Metrics

- **Total Connections**: Current active connections across all servers
- **Active Servers**: Number of UP servers vs total
- **Throughput**: Real-time data transfer rate (KB/s)
- **Frontends**: Total number of configured frontends

### Real-time Graphs

- **Connection History**: Line chart showing connection trends
- **Throughput Graph**: Data transfer rates over time
- **Server Distribution**: Pie chart of servers per backend
- **Current Connections**: Bar chart per server

### Health Indicators

- 🟢 **UP**: Server is healthy and accepting traffic
- 🔴 **DOWN**: Server failed health checks
- ⚪ **DISABLED**: Server manually disabled via UI

### Data Transfer Stats

Each server displays:
- **Current Connections**: Active connections right now
- **Total Connections**: Cumulative connection count
- **Bytes In**: Data received from clients
- **Bytes Out**: Data sent to clients

## 🔧 Configuration

### HAProxy Integration

The manager modifies `/etc/haproxy/haproxy.cfg` directly:

```haproxy
# Auto-generated by HAProxy Manager
global
    stats socket /run/haproxy/admin.sock mode 660 level admin

frontend web_frontend
    bind *:80
    default_backend web_backend

backend web_backend
    balance roundrobin
    server web1 192.168.1.10:8080 check
    server web2 192.168.1.11:8080 check
    server web3 192.168.1.12:8080 check disabled
```

### Configuration Backup

Automatic backups are created before each change:
```
/etc/haproxy/haproxy.cfg.bak.20250104_143022
/etc/haproxy/haproxy.cfg.bak.20250104_145530
```

Restore from backup:
```bash
sudo cp /etc/haproxy/haproxy.cfg.bak.20250104_143022 /etc/haproxy/haproxy.cfg
sudo systemctl reload haproxy
```

### Environment Variables

Edit `/opt/haproxy-manager/.env`:

```bash
FLASK_ENV=production
CONFIG_FILE=/etc/haproxy/haproxy.cfg
HAPROXY_SOCKET=/run/haproxy/admin.sock
DB_FILE=/var/lib/haproxy-manager/users.db
SESSION_TIMEOUT=86400
LOG_LEVEL=INFO
MAX_CONFIG_BACKUPS=30
STATS_UPDATE_INTERVAL=5000
```

## 🛡️ Security Best Practices

### 1. Change Default Password
```bash
# Immediately after installation
# See "Change Password" section above
```

### 2. Enable SSL/HTTPS
```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d haproxy.yourdomain.com

# Certificate auto-renewal
sudo systemctl enable certbot.timer
```

### 3. Firewall Configuration
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5000/tcp  # Block direct Flask access
sudo ufw deny 8404/tcp  # Block HAProxy stats (or allow only internal)

# RHEL/CentOS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 4. Restrict Access by IP

Edit Nginx config:
```nginx
location /api {
    allow 192.168.1.0/24;  # Your internal network
    allow 10.0.0.0/8;       # VPN network
    deny all;
    
    proxy_pass http://127.0.0.1:5000;
    # ... rest of config
}
```

### 5. Enable Rate Limiting

Add to Nginx:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api {
    limit_req zone=api_limit burst=20;
    # ... rest of config
}
```

### 6. Audit Logging

All configuration changes are logged:
```bash
tail -f /var/log/haproxy-manager/access.log
```

## 🔄 Backup & Restore

### Automated Backups

Daily backups at 2 AM (configured by installer):

```bash
/usr/local/bin/backup-haproxy-manager.sh
```

Backup locations:
- HAProxy configs: `/var/backups/haproxy-manager/haproxy.cfg.*`
- User database: `/var/backups/haproxy-manager/users.db.*`

### Manual Backup

```bash
sudo /usr/local/bin/backup-haproxy-manager.sh
```

### Restore from Backup

```bash
# List available backups
ls -la /var/backups/haproxy-manager/

# Restore HAProxy config
sudo cp /var/backups/haproxy-manager/haproxy.cfg.20250104_020000 \
        /etc/haproxy/haproxy.cfg
sudo systemctl reload haproxy

# Restore user database
sudo systemctl stop haproxy-manager
sudo cp /var/backups/haproxy-manager/users.db.20250104_020000 \
        /var/lib/haproxy-manager/users.db
sudo systemctl start haproxy-manager
```

## 📈 Performance Tuning

### Gunicorn Workers

Edit `/opt/haproxy-manager/gunicorn_config.py`:

```python
import multiprocessing

# For CPU-intensive tasks
workers = (2 * multiprocessing.cpu_count()) + 1

# For I/O-intensive tasks (more connections)
workers = (4 * multiprocessing.cpu_count()) + 1

# Or set manually
workers = 8
```

### Nginx Caching

Add to `/etc/nginx/sites-available/haproxy-manager`:

```nginx
proxy_cache_path /var/cache/nginx/haproxy levels=1:2 
                 keys_zone=haproxy_cache:10m 
                 max_size=100m inactive=60m;

location /api/stats {
    proxy_cache haproxy_cache;
    proxy_cache_valid 200 10s;
    proxy_cache_bypass $http_pragma;
    # ... rest of proxy config
}
```

### System Limits

Edit `/etc/security/limits.conf`:

```
haproxy-manager soft nofile 65536
haproxy-manager hard nofile 65536
haproxy soft nofile 65536
haproxy hard nofile 65536
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status haproxy-manager

# View detailed logs
sudo journalctl -u haproxy-manager -n 100 --no-pager

# Check Python environment
cd /opt/haproxy-manager
source venv/bin/activate
python -c "import flask; print('Flask OK')"
```

### Can't Login

```bash
# Reset to default admin/admin
sudo python3 << 'EOF'
import sqlite3
import hashlib
conn = sqlite3.connect('/var/lib/haproxy-manager/users.db')
c = conn.cursor()
c.execute("UPDATE users SET password_hash = ? WHERE username = 'admin'", 
          (hashlib.sha256('admin'.encode()).hexdigest(),))
conn.commit()
conn.close()
EOF

# Restart service
sudo systemctl restart haproxy-manager
```

### Configuration Not Applying

```bash
# Test HAProxy config syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Check permissions
ls -la /etc/haproxy/haproxy.cfg
sudo chmod 640 /etc/haproxy/haproxy.cfg

# Check sudoers
sudo -l -U haproxy-manager
```

### Stats Not Updating

```bash
# Check HAProxy stats socket
ls -la /run/haproxy/admin.sock
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock

# Verify user group membership
groups haproxy-manager
sudo usermod -a -G haproxy haproxy-manager
sudo systemctl restart haproxy-manager
```

## 📚 API Documentation

### Authentication

```bash
# Login
curl -X POST http://localhost/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Response
{"success": true, "token": "abc123..."}
```

### Get Configuration

```bash
curl http://localhost/api/config \
  -H "Authorization: YOUR_TOKEN"
```

### Update Configuration

```bash
curl -X POST http://localhost/api/config \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @config.json
```

### Get Statistics

```bash
curl http://localhost/api/stats \
  -H "Authorization: YOUR_TOKEN"
```

### Toggle Server

```bash
curl -X POST http://localhost/api/server/1/toggle \
  -H "Authorization: YOUR_TOKEN"
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: https://docs.haproxy-manager.com
- **Issues**: https://github.com/your-repo/haproxy-manager/issues
- **Discussions**: https://github.com/your-repo/haproxy-manager/discussions
- **Email**: support@haproxy-manager.com

## ✅ Production Checklist

Before going live:

- [ ] Change default admin password
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Configure monitoring/alerting
- [ ] Restrict access by IP (if needed)
- [ ] Review and test all HAProxy backends
- [ ] Document your specific configuration
- [ ] Train team on using the interface
- [ ] Set up log rotation
- [ ] Configure rate limiting
- [ ] Test disaster recovery procedures

## 🌟 Features Roadmap

- [ ] Multi-user support with roles
- [ ] Real-time WebSocket updates
- [ ] Configuration diff viewer
- [ ] ACL management
- [ ] SSL certificate management
- [ ] Backup/restore via UI
- [ ] Configuration templates
- [ ] Audit log viewer
- [ ] Email notifications
- [ ] Slack/Teams integration
- [ ] API rate limiting per user
- [ ] 2FA authentication
- [ ] Dark/Light theme toggle
- [ ] Export configurations
- [ ] Import from existing setup

---

**Built with ❤️ for the DevOps community**
