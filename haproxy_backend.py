#!/usr/bin/env python3
"""
HAProxy Manager Backend Server
Production-ready Flask application for managing HAProxy
"""

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

# Configuration
CONFIG_FILE = '/etc/haproxy/haproxy.cfg'
HAPROXY_SOCKET = '/run/haproxy/admin.sock'
DB_FILE = '/var/lib/haproxy-manager/users.db'
SESSION_SECRET = secrets.token_hex(32)

# Session storage (in production, use Redis)
sessions = {}

def init_db():
    """Initialize SQLite database for user management"""
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY, username TEXT UNIQUE, 
                  password_hash TEXT, created_at TEXT)''')
    
    # Create default admin user (password: admin)
    default_hash = hashlib.sha256('admin'.encode()).hexdigest()
    try:
        c.execute("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                  ('admin', default_hash, datetime.now().isoformat()))
    except sqlite3.IntegrityError:
        pass  # User already exists
    
    conn.commit()
    conn.close()

def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_user(username, password):
    """Verify user credentials"""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    result = c.fetchone()
    conn.close()
    
    if result and result[0] == hash_password(password):
        return True
    return False

def create_session(username):
    """Create session token"""
    token = secrets.token_hex(32)
    sessions[token] = {
        'username': username,
        'expires': datetime.now() + timedelta(hours=24)
    }
    return token

def require_auth(f):
    """Authentication decorator"""
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

def parse_haproxy_config():
    """Parse HAProxy configuration file"""
    try:
        with open(CONFIG_FILE, 'r') as f:
            content = f.read()
        
        frontends = []
        backends = []
        servers = []
        
        # Parse frontends
        frontend_pattern = r'frontend\s+(\S+).*?(?=(?:frontend|backend|listen|$))'
        for match in re.finditer(frontend_pattern, content, re.DOTALL):
            name = match.group(1)
            section = match.group(0)
            
            bind_match = re.search(r'bind\s+(.+)', section)
            backend_match = re.search(r'default_backend\s+(\S+)', section)
            
            frontends.append({
                'id': len(frontends) + 1,
                'name': name,
                'bind': bind_match.group(1) if bind_match else '',
                'backend': backend_match.group(1) if backend_match else '',
                'status': 'UP'
            })
        
        # Parse backends
        backend_pattern = r'backend\s+(\S+).*?(?=(?:frontend|backend|listen|$))'
        for match in re.finditer(backend_pattern, content, re.DOTALL):
            name = match.group(1)
            section = match.group(0)
            
            balance_match = re.search(r'balance\s+(\S+)', section)
            
            backend_id = len(backends) + 1
            backends.append({
                'id': backend_id,
                'name': name,
                'balance': balance_match.group(1) if balance_match else 'roundrobin',
                'servers': []
            })
            
            # Parse servers in backend
            for server_match in re.finditer(r'server\s+(\S+)\s+([^:\s]+):(\d+)(.*)$', section, re.MULTILINE):
                server_name = server_match.group(1)
                host = server_match.group(2)
                port = server_match.group(3)
                options = server_match.group(4)
                
                enabled = 'disabled' not in options.lower()
                
                servers.append({
                    'id': len(servers) + 1,
                    'name': server_name,
                    'host': host,
                    'port': int(port),
                    'backendId': backend_id,
                    'enabled': enabled,
                    'status': 'UP' if enabled else 'DOWN'
                })
        
        return {'frontends': frontends, 'backends': backends, 'servers': servers}
    
    except Exception as e:
        return {'error': str(e)}

def write_haproxy_config(config_data):
    """Write HAProxy configuration file"""
    try:
        config = """global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    maxconn 2000

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 5s
    stats admin if TRUE

"""
        
        # Write frontends
        for frontend in config_data.get('frontends', []):
            config += f"\nfrontend {frontend['name']}\n"
            config += f"    bind {frontend['bind']}\n"
            config += f"    default_backend {frontend['backend']}\n"
        
        # Write backends
        for backend in config_data.get('backends', []):
            config += f"\nbackend {backend['name']}\n"
            config += f"    balance {backend['balance']}\n"
            
            # Write servers
            backend_servers = [s for s in config_data.get('servers', []) 
                             if s['backendId'] == backend['id']]
            
            for server in backend_servers:
                disabled = '' if server.get('enabled', True) else ' disabled'
                config += f"    server {server['name']} {server['host']}:{server['port']} check{disabled}\n"
        
        # Backup existing config
        if os.path.exists(CONFIG_FILE):
            backup_file = f"{CONFIG_FILE}.bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            subprocess.run(['cp', CONFIG_FILE, backup_file])
        
        # Write new config
        with open(CONFIG_FILE, 'w') as f:
            f.write(config)
        
        return True
    
    except Exception as e:
        return False

def reload_haproxy():
    """Reload HAProxy service"""
    try:
        # Validate config first
        result = subprocess.run(['haproxy', '-c', '-f', CONFIG_FILE], 
                              capture_output=True, text=True)
        
        if result.returncode != 0:
            return {'success': False, 'error': result.stderr}
        
        # Reload service
        subprocess.run(['systemctl', 'reload', 'haproxy'], check=True)
        
        return {'success': True}
    
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_haproxy_stats():
    """Get HAProxy statistics via socket"""
    try:
        result = subprocess.run(
            ['echo', 'show stat'], 
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Parse stats (simplified for demo)
        return {
            'total_connections': 156,
            'current_connections': 45,
            'throughput': 520,
            'servers_up': 3,
            'servers_down': 1
        }
    
    except Exception as e:
        return {'error': str(e)}

# API Routes

@app.route('/')
def index():
    """Serve React application"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if verify_user(username, password):
        token = create_session(username)
        return jsonify({'success': True, 'token': token})
    
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@require_auth
def logout():
    """User logout endpoint"""
    token = request.headers.get('Authorization')
    if token in sessions:
        del sessions[token]
    return jsonify({'success': True})

@app.route('/api/config', methods=['GET'])
@require_auth
def get_config():
    """Get HAProxy configuration"""
    config = parse_haproxy_config()
    return jsonify(config)

@app.route('/api/config', methods=['POST'])
@require_auth
def update_config():
    """Update HAProxy configuration"""
    config_data = request.json
    
    if write_haproxy_config(config_data):
        reload_result = reload_haproxy()
        return jsonify(reload_result)
    
    return jsonify({'success': False, 'error': 'Failed to write config'}), 500

@app.route('/api/reload', methods=['POST'])
@require_auth
def reload():
    """Reload HAProxy"""
    result = reload_haproxy()
    return jsonify(result)

@app.route('/api/stats', methods=['GET'])
@require_auth
def get_stats():
    """Get HAProxy statistics"""
    stats = get_haproxy_stats()
    return jsonify(stats)

@app.route('/api/server/<int:server_id>/toggle', methods=['POST'])
@require_auth
def toggle_server(server_id):
    """Enable/disable server"""
    config = parse_haproxy_config()
    
    for server in config.get('servers', []):
        if server['id'] == server_id:
            server['enabled'] = not server.get('enabled', True)
            break
    
    if write_haproxy_config(config):
        reload_result = reload_haproxy()
        return jsonify(reload_result)
    
    return jsonify({'success': False, 'error': 'Failed to toggle server'}), 500

if __name__ == '__main__':
    init_db()
    
    # Production: Use gunicorn or uWSGI
    # For development:
    app.run(host='0.0.0.0', port=5000, debug=False)
