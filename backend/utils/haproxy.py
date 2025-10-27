"""HAProxy management utilities"""
import subprocess
import socket
import os
import re
import hashlib
from datetime import datetime
from .database import get_db_connection, log_audit

def get_haproxy_config_path():
    """Get HAProxy configuration file path"""
    return os.getenv('HAPROXY_CONFIG_PATH', '/etc/haproxy/haproxy.cfg')

def get_haproxy_socket_path():
    """Get HAProxy admin socket path"""
    return os.getenv('HAPROXY_SOCKET_PATH', '/run/haproxy/admin.sock')

def read_haproxy_stats():
    """Read HAProxy statistics from admin socket"""
    socket_path = get_haproxy_socket_path()

    try:
        # Connect to HAProxy admin socket
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(socket_path)

        # Send 'show stat' command
        sock.sendall(b'show stat\n')

        # Read response
        response = b''
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            response += chunk

        sock.close()

        # Parse CSV response
        lines = response.decode('utf-8').strip().split('\n')
        if not lines:
            return None

        # First line is headers
        headers = lines[0].strip('# ').split(',')

        stats = {
            'frontends': [],
            'backends': [],
            'servers': [],
            'summary': {
                'total_sessions': 0,
                'current_sessions': 0,
                'bytes_in': 0,
                'bytes_out': 0
            }
        }

        for line in lines[1:]:
            if not line.strip():
                continue

            values = line.split(',')
            if len(values) < len(headers):
                continue

            entry = dict(zip(headers, values))

            pxname = entry.get('pxname', '')
            svname = entry.get('svname', '')

            # Frontend
            if svname == 'FRONTEND':
                stats['frontends'].append({
                    'name': pxname,
                    'status': entry.get('status', 'UNKNOWN'),
                    'sessions_current': int(entry.get('scur', 0) or 0),
                    'sessions_total': int(entry.get('stot', 0) or 0),
                    'bytes_in': int(entry.get('bin', 0) or 0),
                    'bytes_out': int(entry.get('bout', 0) or 0),
                    'requests_total': int(entry.get('req_tot', 0) or 0),
                    'rate': int(entry.get('rate', 0) or 0)
                })

            # Backend
            elif svname == 'BACKEND':
                stats['backends'].append({
                    'name': pxname,
                    'status': entry.get('status', 'UNKNOWN'),
                    'sessions_current': int(entry.get('scur', 0) or 0),
                    'sessions_total': int(entry.get('stot', 0) or 0),
                    'bytes_in': int(entry.get('bin', 0) or 0),
                    'bytes_out': int(entry.get('bout', 0) or 0),
                    'queue_current': int(entry.get('qcur', 0) or 0),
                    'active_servers': int(entry.get('act', 0) or 0),
                    'backup_servers': int(entry.get('bck', 0) or 0)
                })

            # Server
            elif svname not in ('FRONTEND', 'BACKEND'):
                stats['servers'].append({
                    'backend': pxname,
                    'name': svname,
                    'status': entry.get('status', 'UNKNOWN'),
                    'weight': int(entry.get('weight', 0) or 0),
                    'sessions_current': int(entry.get('scur', 0) or 0),
                    'sessions_total': int(entry.get('stot', 0) or 0),
                    'bytes_in': int(entry.get('bin', 0) or 0),
                    'bytes_out': int(entry.get('bout', 0) or 0),
                    'check_status': entry.get('check_status', ''),
                    'last_status_change': entry.get('lastchg', ''),
                    'downtime': int(entry.get('downtime', 0) or 0)
                })

                # Add to summary
                stats['summary']['total_sessions'] += int(entry.get('stot', 0) or 0)
                stats['summary']['current_sessions'] += int(entry.get('scur', 0) or 0)
                stats['summary']['bytes_in'] += int(entry.get('bin', 0) or 0)
                stats['summary']['bytes_out'] += int(entry.get('bout', 0) or 0)

        return stats

    except FileNotFoundError:
        return {'error': f'HAProxy socket not found at {socket_path}'}
    except PermissionError:
        return {'error': f'Permission denied to access HAProxy socket at {socket_path}'}
    except Exception as e:
        return {'error': f'Failed to read HAProxy stats: {str(e)}'}

def parse_haproxy_config():
    """Parse HAProxy configuration file"""
    config_path = get_haproxy_config_path()

    try:
        with open(config_path, 'r') as f:
            content = f.read()

        config = {
            'frontends': [],
            'backends': [],
            'global': '',
            'defaults': ''
        }

        # Extract global section
        global_match = re.search(r'global\s+(.*?)(?=\n\S|\Z)', content, re.DOTALL)
        if global_match:
            config['global'] = global_match.group(1).strip()

        # Extract defaults section
        defaults_match = re.search(r'defaults\s+(.*?)(?=\nfrontend|\nbackend|\nlisten|\Z)', content, re.DOTALL)
        if defaults_match:
            config['defaults'] = defaults_match.group(1).strip()

        # Extract frontends
        frontend_pattern = r'frontend\s+(\S+)\s+(.*?)(?=\nfrontend|\nbackend|\nlisten|\Z)'
        for match in re.finditer(frontend_pattern, content, re.DOTALL):
            name = match.group(1)
            body = match.group(2).strip()

            # Parse bind addresses
            binds = re.findall(r'bind\s+([^\n]+)', body)

            # Parse default backend
            default_backend = ''
            backend_match = re.search(r'default_backend\s+(\S+)', body)
            if backend_match:
                default_backend = backend_match.group(1)

            config['frontends'].append({
                'name': name,
                'binds': binds,
                'default_backend': default_backend,
                'config': body
            })

        # Extract backends
        backend_pattern = r'backend\s+(\S+)\s+(.*?)(?=\nfrontend|\nbackend|\nlisten|\Z)'
        for match in re.finditer(backend_pattern, content, re.DOTALL):
            name = match.group(1)
            body = match.group(2).strip()

            # Parse balance algorithm
            balance = 'roundrobin'
            balance_match = re.search(r'balance\s+(\S+)', body)
            if balance_match:
                balance = balance_match.group(1)

            # Parse servers
            servers = []
            server_pattern = r'server\s+(\S+)\s+([^:\s]+):(\d+)(.*)$'
            for server_match in re.finditer(server_pattern, body, re.MULTILINE):
                servers.append({
                    'name': server_match.group(1),
                    'host': server_match.group(2),
                    'port': server_match.group(3),
                    'options': server_match.group(4).strip()
                })

            config['backends'].append({
                'name': name,
                'balance': balance,
                'servers': servers,
                'config': body
            })

        return config

    except FileNotFoundError:
        return {'error': f'HAProxy config not found at {config_path}'}
    except PermissionError:
        return {'error': f'Permission denied to read HAProxy config at {config_path}'}
    except Exception as e:
        return {'error': f'Failed to parse HAProxy config: {str(e)}'}

def write_haproxy_config(config_data):
    """Write HAProxy configuration file"""
    config_path = get_haproxy_config_path()

    try:
        # Create backup
        backup_path = f'{config_path}.backup.{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                backup_content = f.read()
            with open(backup_path, 'w') as f:
                f.write(backup_content)

        # Build configuration
        config_lines = []

        # Global section
        config_lines.append('global')
        if 'global' in config_data and config_data['global']:
            for line in config_data['global'].split('\n'):
                if line.strip():
                    config_lines.append(f'    {line.strip()}')
        else:
            # Default global config
            config_lines.extend([
                '    log /dev/log local0',
                '    log /dev/log local1 notice',
                '    chroot /var/lib/haproxy',
                '    stats socket /run/haproxy/admin.sock mode 660 level admin',
                '    stats timeout 30s',
                '    user haproxy',
                '    group haproxy',
                '    daemon'
            ])

        config_lines.append('')

        # Defaults section
        config_lines.append('defaults')
        if 'defaults' in config_data and config_data['defaults']:
            for line in config_data['defaults'].split('\n'):
                if line.strip():
                    config_lines.append(f'    {line.strip()}')
        else:
            # Default defaults config
            config_lines.extend([
                '    log     global',
                '    mode    http',
                '    option  httplog',
                '    option  dontlognull',
                '    timeout connect 5000',
                '    timeout client  50000',
                '    timeout server  50000'
            ])

        config_lines.append('')

        # Frontends
        for frontend in config_data.get('frontends', []):
            config_lines.append(f'frontend {frontend["name"]}')
            for bind in frontend.get('binds', []):
                config_lines.append(f'    bind {bind}')
            if frontend.get('default_backend'):
                config_lines.append(f'    default_backend {frontend["default_backend"]}')
            # Add any custom config lines
            if 'config' in frontend:
                for line in frontend['config'].split('\n'):
                    if line.strip() and not line.strip().startswith('bind') and not line.strip().startswith('default_backend'):
                        config_lines.append(f'    {line.strip()}')
            config_lines.append('')

        # Backends
        for backend in config_data.get('backends', []):
            config_lines.append(f'backend {backend["name"]}')
            config_lines.append(f'    balance {backend.get("balance", "roundrobin")}')
            for server in backend.get('servers', []):
                options = server.get('options', '')
                config_lines.append(f'    server {server["name"]} {server["host"]}:{server["port"]} {options}'.strip())
            # Add any custom config lines
            if 'config' in backend:
                for line in backend['config'].split('\n'):
                    if line.strip() and not line.strip().startswith('balance') and not line.strip().startswith('server'):
                        config_lines.append(f'    {line.strip()}')
            config_lines.append('')

        # Write configuration
        config_content = '\n'.join(config_lines)
        with open(config_path, 'w') as f:
            f.write(config_content)

        # Validate configuration
        result = subprocess.run(
            ['haproxy', '-c', '-f', config_path],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            # Restore backup if validation fails
            with open(backup_path, 'r') as f:
                backup_content = f.read()
            with open(config_path, 'w') as f:
                f.write(backup_content)
            return {'success': False, 'error': f'Configuration validation failed: {result.stderr}'}

        return {'success': True, 'backup': backup_path}

    except Exception as e:
        return {'success': False, 'error': f'Failed to write configuration: {str(e)}'}

def reload_haproxy():
    """Reload HAProxy service"""
    try:
        result = subprocess.run(
            ['sudo', 'systemctl', 'reload', 'haproxy'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            return {'success': False, 'error': f'Failed to reload HAProxy: {result.stderr}'}

        return {'success': True}

    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'HAProxy reload timed out'}
    except Exception as e:
        return {'success': False, 'error': f'Failed to reload HAProxy: {str(e)}'}

def toggle_server(backend_name, server_name, enable):
    """Enable or disable a server via HAProxy socket"""
    socket_path = get_haproxy_socket_path()

    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(socket_path)

        # Send command to enable/disable server
        command = f'{"enable" if enable else "disable"} server {backend_name}/{server_name}\n'
        sock.sendall(command.encode('utf-8'))

        # Read response
        response = sock.recv(4096).decode('utf-8')
        sock.close()

        return {'success': True, 'response': response.strip()}

    except Exception as e:
        return {'success': False, 'error': f'Failed to toggle server: {str(e)}'}

def apply_config_and_restart(username, ip_address):
    """Apply database configuration to HAProxy and restart service"""
    try:
        config_path = get_haproxy_config_path()

        # Create backup first
        backup_path = f'{config_path}.backup.{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                backup_content = f.read()
            with open(backup_path, 'w') as f:
                f.write(backup_content)

            # Calculate hash
            config_hash = hashlib.sha256(backup_content.encode()).hexdigest()

            # Track backup in database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO config_backups (filename, filepath, description, created_by, config_hash)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                os.path.basename(backup_path),
                backup_path,
                'Auto-backup before apply',
                username,
                config_hash
            ))
            conn.commit()
            conn.close()

        # Read configuration from database
        conn = get_db_connection()
        cursor = conn.cursor()

        config_lines = []

        # Global section (use default)
        config_lines.extend([
            'global',
            '    log /dev/log local0',
            '    log /dev/log local1 notice',
            '    chroot /var/lib/haproxy',
            '    stats socket /run/haproxy/admin.sock mode 660 level admin',
            '    stats timeout 30s',
            '    user haproxy',
            '    group haproxy',
            '    daemon',
            ''
        ])

        # Defaults section
        config_lines.extend([
            'defaults',
            '    log     global',
            '    mode    tcp',
            '    option  tcplog',
            '    option  dontlognull',
            '    timeout connect 5000',
            '    timeout client  50000',
            '    timeout server  50000',
            ''
        ])

        # Frontends from database
        cursor.execute('SELECT * FROM frontend_servers WHERE enabled = 1 ORDER BY name')
        for frontend in cursor.fetchall():
            config_lines.append(f'frontend {frontend["name"]}')
            config_lines.append(f'    bind {frontend["bind_address"]}:{frontend["bind_port"]}')
            config_lines.append(f'    mode {frontend["mode"]}')
            if frontend['default_backend']:
                config_lines.append(f'    default_backend {frontend["default_backend"]}')
            config_lines.append('')

        # Backends from database
        cursor.execute('SELECT * FROM backend_servers WHERE enabled = 1 ORDER BY name')
        for backend in cursor.fetchall():
            config_lines.append(f'backend {backend["name"]}')
            config_lines.append(f'    mode {backend["mode"]}')
            config_lines.append(f'    balance {backend["balance"]}')

            # Get servers for this backend
            cursor.execute('''
                SELECT * FROM backend_server_list
                WHERE backend_name = ? AND enabled = 1
                ORDER BY server_name
            ''', (backend['name'],))

            for server in cursor.fetchall():
                options = []
                if server['check_enabled']:
                    options.append('check')
                if server['weight'] != 1:
                    options.append(f'weight {server["weight"]}')
                if server['maxconn'] != 32:
                    options.append(f'maxconn {server["maxconn"]}')

                options_str = ' '.join(options)
                config_lines.append(f'    server {server["server_name"]} {server["address"]}:{server["port"]} {options_str}'.strip())

            config_lines.append('')

        conn.close()

        # Write configuration
        config_content = '\n'.join(config_lines)
        with open(config_path, 'w') as f:
            f.write(config_content)

        # Validate configuration
        result = subprocess.run(
            ['haproxy', '-c', '-f', config_path],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            # Restore backup if validation fails
            with open(backup_path, 'r') as f:
                backup_content = f.read()
            with open(config_path, 'w') as f:
                f.write(backup_content)
            return {'success': False, 'error': f'Configuration validation failed: {result.stderr}'}

        # Restart HAProxy
        restart_result = subprocess.run(
            ['sudo', 'systemctl', 'restart', 'haproxy'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if restart_result.returncode != 0:
            # Restore backup if restart fails
            with open(backup_path, 'r') as f:
                backup_content = f.read()
            with open(config_path, 'w') as f:
                f.write(backup_content)
            return {'success': False, 'error': f'Failed to restart HAProxy: {restart_result.stderr}'}

        log_audit(username, 'apply_config', 'haproxy', None, 'Configuration applied and service restarted', ip_address)

        return {'success': True, 'backup': backup_path, 'message': 'Configuration applied and HAProxy restarted successfully'}

    except Exception as e:
        return {'success': False, 'error': f'Failed to apply configuration: {str(e)}'}

def list_config_backups():
    """List all configuration backups"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, filename, filepath, description, created_by, config_hash, created_at
        FROM config_backups
        ORDER BY created_at DESC
    ''')

    backups = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return backups

def restore_backup(backup_id, username, ip_address):
    """Restore a configuration backup"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get backup info
        cursor.execute('SELECT * FROM config_backups WHERE id = ?', (backup_id,))
        backup = cursor.fetchone()

        if not backup:
            conn.close()
            return {'success': False, 'error': 'Backup not found'}

        backup_path = backup['filepath']

        if not os.path.exists(backup_path):
            conn.close()
            return {'success': False, 'error': 'Backup file not found on filesystem'}

        # Read backup content
        with open(backup_path, 'r') as f:
            backup_content = f.read()

        config_path = get_haproxy_config_path()

        # Create a backup of current config before restoring
        current_backup_path = f'{config_path}.backup.{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                current_content = f.read()
            with open(current_backup_path, 'w') as f:
                f.write(current_content)

        # Restore backup
        with open(config_path, 'w') as f:
            f.write(backup_content)

        # Validate configuration
        result = subprocess.run(
            ['haproxy', '-c', '-f', config_path],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            # Restore current config if validation fails
            with open(current_backup_path, 'r') as f:
                current_content = f.read()
            with open(config_path, 'w') as f:
                f.write(current_content)
            conn.close()
            return {'success': False, 'error': f'Configuration validation failed: {result.stderr}'}

        # Restart HAProxy
        restart_result = subprocess.run(
            ['sudo', 'systemctl', 'restart', 'haproxy'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if restart_result.returncode != 0:
            # Restore current config if restart fails
            with open(current_backup_path, 'r') as f:
                current_content = f.read()
            with open(config_path, 'w') as f:
                f.write(current_content)
            conn.close()
            return {'success': False, 'error': f'Failed to restart HAProxy: {restart_result.stderr}'}

        log_audit(username, 'restore_backup', 'haproxy', backup['filename'], f'Restored backup ID {backup_id}', ip_address)

        conn.close()

        return {'success': True, 'message': f'Backup restored successfully: {backup["filename"]}'}

    except Exception as e:
        return {'success': False, 'error': f'Failed to restore backup: {str(e)}'}

def track_connection_history(stats):
    """Track connection history with IP addresses from HAProxy stats"""
    # This function would be called periodically to track connections
    # For now, it's a placeholder for future implementation
    # You would need to parse HAProxy logs or use show sess command for IP tracking
    pass
