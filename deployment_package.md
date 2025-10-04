# HAProxy Manager - Production Deployment Guide

## 📦 Package Contents

```
haproxy-manager/
├── backend/
│   ├── app.py                 # Flask backend server
│   ├── requirements.txt       # Python dependencies
│   └── gunicorn_config.py    # Gunicorn configuration
├── frontend/
│   ├── build/                # React production build
│   └── package.json          # Node dependencies
├── scripts/
│   ├── install.sh            # Installation script
│   ├── haproxy-manager.service  # Systemd service
│   └── nginx.conf            # Nginx reverse proxy config
├── README.md
└── LICENSE
```

## 🚀 Quick Installation

### Prerequisites

- Ubuntu 20.04+ or Debian 11+ (or RHEL 8+)
- HAProxy 2.4+ installed
- Python 3.8+
- Root or sudo access

### One-Line Install

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/haproxy-manager/main/scripts/install.sh | sudo bash
```

## 📋 Manual Installation

### Step 1: Install System Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx haproxy

# RHEL/CentOS
sudo yum install -y python3 python3-pip nginx haproxy
```

### Step 2: Create Application User

```bash
sudo useradd -r -s /bin/false haproxy-manager
sudo usermod -a -G haproxy haproxy-manager
```

### Step 3: Install Application

```bash
# Create directory structure
sudo mkdir -p /opt/haproxy-manager
sudo mkdir -p /var/lib/haproxy-manager
sudo mkdir -p /var/log/haproxy-manager

# Clone or copy files
cd /opt/haproxy-manager

# Install Python dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 4: Configure HAProxy

Edit `/etc/haproxy/haproxy.cfg` to enable the stats socket:

```haproxy
global
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
```

Add stats endpoint:

```haproxy
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 5s
    stats admin if TRUE
```

Reload HAProxy:

```bash
sudo systemctl reload haproxy
```

### Step 5: Create Systemd Service

Create `/etc/systemd/system/haproxy-manager.service`:

```ini
[Unit]
Description=HAProxy Manager Web Interface
After=network.target haproxy.service
Requires=haproxy.service

[Service]
Type=notify
User=haproxy-manager
Group=haproxy
WorkingDirectory=/opt/haproxy-manager
Environment="PATH=/opt/haproxy-manager/venv/bin"
ExecStart=/opt/haproxy-manager/venv/bin/gunicorn \
    --config /opt/haproxy-manager/gunicorn_config.py \
    app:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable haproxy-manager
sudo systemctl start haproxy-manager
```

### Step 6: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/haproxy-manager`:

```nginx
server {
    listen 80;
    server_name haproxy.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name haproxy.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/haproxy-manager.crt;
    ssl_certificate_key /etc/ssl/private/haproxy-manager.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/haproxy-manager-access.log;
    error_log /var/log/nginx/haproxy-manager-error.log;
    
    # Static files
    location / {
        root /opt/haproxy-manager/static;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support (future)
    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/haproxy-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Setup Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8404/tcp  # HAProxy stats (optional, for internal access)

# Firewalld (RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Step 8: SSL Certificate

#### Using Let's Encrypt (Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d haproxy.yourdomain.com
```

#### Self-Signed Certificate (Development)

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/haproxy-manager.key \
    -out /etc/ssl/certs/haproxy-manager.crt
```

## 🔐 Security Configuration

### 1. File Permissions

```bash
sudo chown -R haproxy-manager:haproxy /opt/haproxy-manager
sudo chown -R haproxy-manager:haproxy /var/lib/haproxy-manager
sudo chmod 750 /opt/haproxy-manager
sudo chmod 700 /var/lib/haproxy-manager
sudo chmod 640 /etc/haproxy/haproxy.cfg
```

### 2. SELinux Configuration (RHEL/CentOS)

```bash
sudo setsebool -P httpd_can_network_connect 1
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/lib/haproxy-manager(/.*)?"
sudo restorecon -Rv /var/lib/haproxy-manager
```

### 3. Sudoers Configuration

Allow haproxy-manager user to reload HAProxy without password:

```bash
sudo visudo -f /etc/sudoers.d/haproxy-manager
```

Add:

```
haproxy-manager ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload haproxy
haproxy-manager ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart haproxy
haproxy-manager ALL=(ALL) NOPASSWD: /usr/sbin/haproxy -c -f /etc/haproxy/haproxy.cfg
```

### 4. Database Security

```bash
# Set secure permissions on user database
sudo chmod 600 /var/lib/haproxy-manager/users.db
sudo chown haproxy-manager:haproxy /var/lib/haproxy-manager/users.db
```

### 5. Change Default Password

After first login, change the default admin password:

```bash
python3 << EOF
import sqlite3
import hashlib

new_password = "your_secure_password_here"
password_hash = hashlib.sha256(new_password.encode()).hexdigest()

conn = sqlite3.connect('/var/lib/haproxy-manager/users.db')
c = conn.cursor()
c.execute("UPDATE users SET password_hash = ? WHERE username = 'admin'", (password_hash,))
conn.commit()
conn.close()
print("Password updated successfully")
EOF
```

## 📝 Configuration Files

### gunicorn_config.py

```python
# /opt/haproxy-manager/gunicorn_config.py

import multiprocessing

# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "/var/log/haproxy-manager/access.log"
errorlog = "/var/log/haproxy-manager/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "haproxy-manager"

# Server mechanics
daemon = False
pidfile = "/var/run/haproxy-manager.pid"
user = "haproxy-manager"
group = "haproxy"
tmp_upload_dir = None

# SSL (if not using nginx)
# keyfile = "/etc/ssl/private/haproxy-manager.key"
# certfile = "/etc/ssl/certs/haproxy-manager.crt"
```

### requirements.txt

```txt
Flask==3.0.0
Flask-CORS==4.0.0
gunicorn==21.2.0
```

### Environment Variables

Create `/opt/haproxy-manager/.env`:

```bash
FLASK_ENV=production
CONFIG_FILE=/etc/haproxy/haproxy.cfg
HAPROXY_SOCKET=/run/haproxy/admin.sock
DB_FILE=/var/lib/haproxy-manager/users.db
SESSION_TIMEOUT=86400
LOG_LEVEL=INFO
```

## 🔧 Operations

### Start/Stop/Restart Service

```bash
sudo systemctl start haproxy-manager
sudo systemctl stop haproxy-manager
sudo systemctl restart haproxy-manager
sudo systemctl status haproxy-manager
```

### View Logs

```bash
# Application logs
sudo journalctl -u haproxy-manager -f

# Gunicorn logs
sudo tail -f /var/log/haproxy-manager/access.log
sudo tail -f /var/log/haproxy-manager/error.log

# Nginx logs
sudo tail -f /var/log/nginx/haproxy-manager-access.log
sudo tail -f /var/log/nginx/haproxy-manager-error.log

# HAProxy logs
sudo tail -f /var/log/haproxy.log
```

### Backup Configuration

```bash
# Backup script
sudo cat > /usr/local/bin/backup-haproxy-manager.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/haproxy-manager"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup HAProxy config
cp /etc/haproxy/haproxy.cfg $BACKUP_DIR/haproxy.cfg.$DATE

# Backup user database
cp /var/lib/haproxy-manager/users.db $BACKUP_DIR/users.db.$DATE

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-haproxy-manager.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-haproxy-manager.sh" | sudo crontab -
```

### Health Checks

```bash
# Check if service is running
systemctl is-active haproxy-manager

# Check API endpoint
curl -k https://localhost/api/stats -H "Authorization: your-token"

# Check HAProxy stats
curl http://localhost:8404/stats
```

## 🔍 Monitoring

### Prometheus Integration (Optional)

Install HAProxy exporter:

```bash
cd /opt
wget https://github.com/prometheus/haproxy_exporter/releases/download/v0.15.0/haproxy_exporter-0.15.0.linux-amd64.tar.gz
tar xvf haproxy_exporter-0.15.0.linux-amd64.tar.gz
sudo mv haproxy_exporter-0.15.0.linux-amd64/haproxy_exporter /usr/local/bin/

# Create systemd service
sudo cat > /etc/systemd/system/haproxy-exporter.service << EOF
[Unit]
Description=HAProxy Exporter
After=network.target

[Service]
Type=simple
User=haproxy
ExecStart=/usr/local/bin/haproxy_exporter \
  --haproxy.scrape-uri="http://localhost:8404/stats;csv"
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable haproxy-exporter
sudo systemctl start haproxy-exporter
```

### Grafana Dashboard

Import HAProxy dashboard ID: 367 or 12693

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status haproxy-manager

# Check permissions
ls -la /opt/haproxy-manager
ls -la /var/lib/haproxy-manager

# Check if port is available
sudo netstat -tlnp | grep 5000

# Verify Python environment
cd /opt/haproxy-manager
source venv/bin/activate
python -c "import flask; print(flask.__version__)"
```

### Cannot Apply Configuration

```bash
# Test HAProxy config syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Check HAProxy socket permissions
ls -la /run/haproxy/admin.sock
sudo usermod -a -G haproxy haproxy-manager

# Verify sudoers configuration
sudo -l -U haproxy-manager
```

### Login Issues

```bash
# Reset admin password
sudo python3 << 'EOF'
import sqlite3
import hashlib

conn = sqlite3.connect('/var/lib/haproxy-manager/users.db')
c = conn.cursor()
password_hash = hashlib.sha256('admin'.encode()).hexdigest()
c.execute("UPDATE users SET password_hash = ? WHERE username = 'admin'", (password_hash,))
conn.commit()
conn.close()
EOF
```

### Database Locked Error

```bash
# Check database permissions
sudo ls -la /var/lib/haproxy-manager/users.db

# Stop service and check for locks
sudo systemctl stop haproxy-manager
sudo fuser /var/lib/haproxy-manager/users.db
sudo rm -f /var/lib/haproxy-manager/users.db-journal
sudo systemctl start haproxy-manager
```

## 🔄 Updates

### Update Application

```bash
cd /opt/haproxy-manager
sudo systemctl stop haproxy-manager

# Backup current version
sudo cp -r /opt/haproxy-manager /opt/haproxy-manager.backup

# Pull new version (or copy files)
git pull origin main

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Restart service
sudo systemctl start haproxy-manager
```

### Rollback

```bash
sudo systemctl stop haproxy-manager
sudo rm -rf /opt/haproxy-manager
sudo mv /opt/haproxy-manager.backup /opt/haproxy-manager
sudo systemctl start haproxy-manager
```

## 📊 Performance Tuning

### Gunicorn Workers

Adjust workers in `gunicorn_config.py`:

```python
# For CPU-bound tasks
workers = (2 * cpu_count) + 1

# For I/O-bound tasks
workers = (4 * cpu_count) + 1
```

### Nginx Caching

Add to nginx config:

```nginx
proxy_cache_path /var/cache/nginx/haproxy-manager levels=1:2 keys_zone=haproxy_cache:10m max_size=100m inactive=60m use_temp_path=off;

location /api/stats {
    proxy_cache haproxy_cache;
    proxy_cache_valid 200 10s;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    # ... rest of proxy config
}
```

### System Limits

Edit `/etc/security/limits.conf`:

```
haproxy-manager soft nofile 65536
haproxy-manager hard nofile 65536
```

## 🧪 Testing

### API Testing

```bash
# Login
TOKEN=$(curl -s -X POST https://haproxy.yourdomain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.token')

# Get configuration
curl -s https://haproxy.yourdomain.com/api/config \
  -H "Authorization: $TOKEN" | jq

# Get stats
curl -s https://haproxy.yourdomain.com/api/stats \
  -H "Authorization: $TOKEN" | jq
```

### Load Testing

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Test API endpoint
hey -n 1000 -c 10 -H "Authorization: $TOKEN" \
  https://haproxy.yourdomain.com/api/stats
```

## 📚 Additional Resources

- [HAProxy Documentation](http://docs.haproxy.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🆘 Support

For issues and feature requests:
- GitHub Issues: https://github.com/your-repo/haproxy-manager/issues
- Documentation: https://docs.haproxy-manager.com
- Community Forum: https://community.haproxy-manager.com

## 📄 License

MIT License - See LICENSE file for details

## ✅ Post-Installation Checklist

- [ ] Service is running: `systemctl status haproxy-manager`
- [ ] Nginx is configured and running
- [ ] SSL certificate is installed
- [ ] Firewall rules are configured
- [ ] Default password has been changed
- [ ] Backups are configured
- [ ] Logs are being written correctly
- [ ] Can login to web interface
- [ ] Can view HAProxy configuration
- [ ] Can modify and reload configuration
- [ ] Monitoring is setup (optional)
- [ ] Documentation is accessible to team