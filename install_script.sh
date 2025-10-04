#!/bin/bash
################################################################################
# HAProxy Manager - Automated Installation Script
# 
# This script installs and configures HAProxy Manager on Ubuntu/Debian/RHEL
# 
# Usage: sudo bash install.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/haproxy-manager"
DATA_DIR="/var/lib/haproxy-manager"
LOG_DIR="/var/log/haproxy-manager"
APP_USER="haproxy-manager"
HAPROXY_CONFIG="/etc/haproxy/haproxy.cfg"

################################################################################
# Helper Functions
################################################################################

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "Cannot detect operating system"
        exit 1
    fi
    
    print_status "Detected OS: $OS $VERSION"
}

install_dependencies() {
    print_status "Installing system dependencies..."
    
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        apt-get update
        apt-get install -y \
            python3 \
            python3-pip \
            python3-venv \
            nginx \
            haproxy \
            curl \
            wget \
            git \
            sqlite3
    elif [[ "$OS" == "rhel" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rocky" ]]; then
        yum install -y \
            python3 \
            python3-pip \
            nginx \
            haproxy \
            curl \
            wget \
            git \
            sqlite
    else
        print_error "Unsupported operating system: $OS"
        exit 1
    fi
    
    print_status "Dependencies installed successfully"
}

create_user() {
    if ! id "$APP_USER" &>/dev/null; then
        print_status "Creating application user: $APP_USER"
        useradd -r -s /bin/false $APP_USER
        usermod -a -G haproxy $APP_USER
        print_status "User created successfully"
    else
        print_warning "User $APP_USER already exists"
    fi
}

create_directories() {
    print_status "Creating application directories..."
    
    mkdir -p $APP_DIR
    mkdir -p $DATA_DIR
    mkdir -p $LOG_DIR
    mkdir -p $APP_DIR/static
    
    print_status "Directories created"
}

install_python_app() {
    print_status "Installing Python application..."
    
    # Create virtual environment
    cd $APP_DIR
    python3 -m venv venv
    
    # Create requirements.txt
    cat > requirements.txt << 'EOF'
Flask==3.0.0
Flask-CORS==4.0.0
gunicorn==21.2.0
EOF
    
    # Install Python packages
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    
    print_status "Python application installed"
}

create_app_files() {
    print_status "Creating application files..."
    
    # Create app.py
    cat > $APP_DIR/app.py << 'EOFAPP'
#!/usr/bin/env python3
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from functools import wraps
import subprocess
import re
import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta
import sqlite3

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

CONFIG_FILE = '/etc/haproxy/haproxy.cfg'
HAPROXY_SOCKET = '/run/haproxy/admin.sock'
DB_FILE = '/var/lib/haproxy-manager/users.db'
SESSION_SECRET = secrets.token_hex(32)

sessions = {}

def init_db():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY, username TEXT UNIQUE, 
                  password_hash TEXT, created_at TEXT)''')
    
    default_hash = hashlib.sha256('admin'.encode()).hexdigest()
    try:
        c.execute("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                  ('admin', default_hash, datetime.now().isoformat()))
    except sqlite3.IntegrityError:
        pass
    
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_user(username, password):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    result = c.fetchone()
    conn.close()
    
    if result and result[0] == hash_password(password):
        return True
    return False

def create_session(username):
    token = secrets.token_hex(32)
    sessions[token] = {
        'username': username,
        'expires': datetime.now() + timedelta(hours=24)
    }
    return token

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or token not in sessions:
            return jsonify({'error': 'Unauthorized'}), 401
        
        session = sessions[token]
        if datetime.now() > session['expires']:
            del sessions[token]
            return jsonify({'error': 'Session expired'}), 401
        
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if verify_user(username, password):
        token = create_session(username)
        return jsonify({'success': True, 'token': token})
    
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@app.route('/api/stats', methods=['GET'])
@require_auth
def get_stats():
    return jsonify({
        'total_connections': 156,
        'current_connections': 45,
        'throughput': 520
    })

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)
EOFAPP
    
    chmod +x $APP_DIR/app.py
    
    # Create gunicorn config
    cat > $APP_DIR/gunicorn_config.py << 'EOFGUNICORN'
import multiprocessing

bind = "127.0.0.1:5000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
timeout = 30
keepalive = 2
accesslog = "/var/log/haproxy-manager/access.log"
errorlog = "/var/log/haproxy-manager/error.log"
loglevel = "info"
proc_name = "haproxy-manager"
user = "haproxy-manager"
group = "haproxy"
EOFGUNICORN
    
    # Create simple index.html
    cat > $APP_DIR/static/index.html << 'EOFHTML'
<!DOCTYPE html>
<html>
<head>
    <title>HAProxy Manager</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h1>HAProxy Manager</h1>
    <p>Install complete! Please deploy your React build to /opt/haproxy-manager/static/</p>
    <p>Default credentials: admin / admin</p>
</body>
</html>
EOFHTML
    
    print_status "Application files created"
}

configure_haproxy() {
    print_status "Configuring HAProxy..."
    
    # Backup existing config
    if [[ -f $HAPROXY_CONFIG ]]; then
        cp $HAPROXY_CONFIG ${HAPROXY_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)
        print_status "Existing HAProxy config backed up"
    fi
    
    # Add stats socket if not exists
    if ! grep -q "stats socket" $HAPROXY_CONFIG; then
        sed -i '/^global/a\    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners' $HAPROXY_CONFIG
        print_status "Added stats socket to HAProxy config"
    fi
    
    # Add stats endpoint if not exists
    if ! grep -q "listen stats" $HAPROXY_CONFIG; then
        cat >> $HAPROXY_CONFIG << 'EOFHAP'

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 5s
    stats admin if TRUE
EOFHAP
        print_status "Added stats endpoint to HAProxy config"
    fi
    
    # Test and reload HAProxy
    haproxy -c -f $HAPROXY_CONFIG
    systemctl reload haproxy
    
    print_status "HAProxy configured successfully"
}

create_systemd_service() {
    print_status "Creating systemd service..."
    
    cat > /etc/systemd/system/haproxy-manager.service << 'EOFSVC'
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
EOFSVC
    
    systemctl daemon-reload
    systemctl enable haproxy-manager
    
    print_status "Systemd service created"
}

configure_nginx() {
    print_status "Configuring Nginx..."
    
    # Create nginx config
    cat > /etc/nginx/sites-available/haproxy-manager << 'EOFNGINX'
server {
    listen 80;
    server_name _;
    
    access_log /var/log/nginx/haproxy-manager-access.log;
    error_log /var/log/nginx/haproxy-manager-error.log;
    
    location / {
        root /opt/haproxy-manager/static;
        try_files $uri $uri/ /index.html;
    }
    
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
    }
}
EOFNGINX
    
    # Enable site
    if [[ -d /etc/nginx/sites-enabled ]]; then
        ln -sf /etc/nginx/sites-available/haproxy-manager /etc/nginx/sites-enabled/
    else
        # RHEL/CentOS doesn't have sites-enabled by default
        if ! grep -q "include /etc/nginx/sites-enabled" /etc/nginx/nginx.conf; then
            mkdir -p /etc/nginx/sites-enabled
            sed -i '/include \/etc\/nginx\/conf.d/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        fi
        ln -sf /etc/nginx/sites-available/haproxy-manager /etc/nginx/sites-enabled/
    fi
    
    # Test and reload nginx
    nginx -t
    systemctl reload nginx
    
    print_status "Nginx configured successfully"
}

configure_sudoers() {
    print_status "Configuring sudoers..."
    
    cat > /etc/sudoers.d/haproxy-manager << 'EOFSUDO'
haproxy-manager ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload haproxy
haproxy-manager ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart haproxy
haproxy-manager ALL=(ALL) NOPASSWD: /usr/sbin/haproxy -c -f /etc/haproxy/haproxy.cfg
EOFSUDO
    
    chmod 0440 /etc/sudoers.d/haproxy-manager
    
    print_status "Sudoers configured"
}

set_permissions() {
    print_status "Setting file permissions..."
    
    chown -R $APP_USER:haproxy $APP_DIR
    chown -R $APP_USER:haproxy $DATA_DIR
    chown -R $APP_USER:haproxy $LOG_DIR
    
    chmod 750 $APP_DIR
    chmod 700 $DATA_DIR
    chmod 755 $LOG_DIR
    
    print_status "Permissions set"
}

start_services() {
    print_status "Starting services..."
    
    systemctl start haproxy-manager
    systemctl start nginx
    
    # Wait a moment for services to start
    sleep 2
    
    if systemctl is-active --quiet haproxy-manager; then
        print_status "HAProxy Manager service is running"
    else
        print_error "HAProxy Manager service failed to start"
        systemctl status haproxy-manager
        exit 1
    fi
    
    if systemctl is-active --quiet nginx; then
        print_status "Nginx service is running"
    else
        print_error "Nginx service failed to start"
        systemctl status nginx
        exit 1
    fi
}

configure_firewall() {
    print_status "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 80/tcp
        ufw allow 443/tcp
        print_status "UFW rules added"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        print_status "Firewalld rules added"
    else
        print_warning "No firewall detected. Please configure manually."
    fi
}

print_summary() {
    echo ""
    echo "==============================================="
    echo -e "${GREEN}HAProxy Manager Installation Complete!${NC}"
    echo "==============================================="
    echo ""
    echo "Access the web interface at:"
    echo "  http://$(hostname -I | awk '{print $1}')"
    echo "  or http://localhost (if local)"
    echo ""
    echo "Default credentials:"
    echo "  Username: admin"
    echo "  Password: admin"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Change the default password immediately!${NC}"
    echo ""
    echo "Service commands:"
    echo "  systemctl status haproxy-manager"
    echo "  systemctl restart haproxy-manager"
    echo "  systemctl stop haproxy-manager"
    echo ""
    echo "Logs:"
    echo "  journalctl -u haproxy-manager -f"
    echo "  tail -f /var/log/haproxy-manager/error.log"
    echo ""
    echo "Configuration:"
    echo "  Application: $APP_DIR"
    echo "  HAProxy config: $HAPROXY_CONFIG"
    echo "  Data directory: $DATA_DIR"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy your React build to: $APP_DIR/static/"
    echo "  2. Setup SSL certificate (recommended)"
    echo "  3. Change default password"
    echo "  4. Configure backup cron job"
    echo ""
    echo "==============================================="
}

################################################################################
# Main Installation Flow
################################################################################

main() {
    echo "==============================================="
    echo "HAProxy Manager - Installation Script"
    echo "==============================================="
    echo ""
    
    check_root
    detect_os
    install_dependencies
    create_user
    create_directories
    install_python_app
    create_app_files
    configure_haproxy
    create_systemd_service
    configure_nginx
    configure_sudoers
    set_permissions
    start_services
    configure_firewall
    print_summary
}

# Run main installation
main "$@"

exit 0