"""HAProxy Manager - Flask Backend API"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from utils.auth import (
    init_db, authenticate_user, create_session,
    validate_session, destroy_session, require_auth,
    hash_password
)
from utils.haproxy import (
    read_haproxy_stats, parse_haproxy_config,
    write_haproxy_config, reload_haproxy, toggle_server,
    get_haproxy_config_path, apply_config_and_restart,
    list_config_backups, restore_backup, track_connection_history
)
from utils.database import (
    get_db_connection, add_user, get_all_users, delete_user,
    change_password, log_audit
)

app = Flask(__name__)

# Load environment variables
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SECRET_KEY'] = SECRET_KEY

# Configure CORS with specific origins
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=allowed_origins, supports_credentials=True)

# Initialize database
init_db()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    data = request.json

    # Input validation
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400

    username = data['username']
    password = data['password']

    # Rate limiting should be added here in production

    if authenticate_user(username, password):
        token = create_session(username)
        return jsonify({
            'success': True,
            'token': token,
            'username': username
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    token = request.headers.get('Authorization')
    if token and token.startswith('Bearer '):
        token = token[7:]
        destroy_session(token)

    return jsonify({'success': True}), 200

@app.route('/api/config', methods=['GET'])
@require_auth
def get_config():
    """Get HAProxy configuration"""
    config = parse_haproxy_config()

    if 'error' in config:
        return jsonify(config), 500

    return jsonify(config), 200

@app.route('/api/config', methods=['POST'])
@require_auth
def update_config():
    """Update HAProxy configuration"""
    config_data = request.json

    # Input validation
    if not config_data:
        return jsonify({'error': 'Configuration data required'}), 400

    # Validate structure
    if 'frontends' not in config_data or 'backends' not in config_data:
        return jsonify({'error': 'Invalid configuration structure'}), 400

    result = write_haproxy_config(config_data)

    if not result.get('success'):
        return jsonify(result), 500

    return jsonify(result), 200

@app.route('/api/reload', methods=['POST'])
@require_auth
def reload_config():
    """Reload HAProxy service"""
    result = reload_haproxy()

    if not result.get('success'):
        return jsonify(result), 500

    return jsonify(result), 200

@app.route('/api/stats', methods=['GET'])
@require_auth
def get_stats():
    """Get HAProxy statistics"""
    stats = read_haproxy_stats()

    if stats and 'error' in stats:
        return jsonify(stats), 500

    return jsonify(stats), 200

@app.route('/api/server/<backend>/<server>/toggle', methods=['POST'])
@require_auth
def toggle_server_status(backend, server):
    """Enable or disable a server"""
    data = request.json

    if not data or 'enable' not in data:
        return jsonify({'error': 'Enable flag required'}), 400

    enable = data['enable']
    result = toggle_server(backend, server, enable)

    if not result.get('success'):
        return jsonify(result), 500

    log_audit(
        request.username,
        'toggle_server',
        'server',
        f'{backend}/{server}',
        f'enabled={enable}',
        request.remote_addr
    )

    return jsonify(result), 200

# ============ User Management Endpoints ============

@app.route('/api/users', methods=['GET'])
@require_auth
def list_users():
    """List all users"""
    users = get_all_users()
    return jsonify({'users': users}), 200

@app.route('/api/users', methods=['POST'])
@require_auth
def create_user():
    """Create a new user"""
    data = request.json

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400

    username = data['username']
    password = data['password']

    # Validate username
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400

    # Validate password
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    # Hash password and add user
    password_hash = hash_password(password)
    success = add_user(username, password_hash)

    if not success:
        return jsonify({'error': 'User already exists'}), 409

    log_audit(
        request.username,
        'create_user',
        'user',
        username,
        None,
        request.remote_addr
    )

    return jsonify({'success': True, 'username': username}), 201

@app.route('/api/users/<username>', methods=['DELETE'])
@require_auth
def remove_user(username):
    """Delete a user"""
    if username == 'admin':
        return jsonify({'error': 'Cannot delete admin user'}), 403

    success = delete_user(username)

    if not success:
        return jsonify({'error': 'User not found'}), 404

    log_audit(
        request.username,
        'delete_user',
        'user',
        username,
        None,
        request.remote_addr
    )

    return jsonify({'success': True}), 200

@app.route('/api/users/<username>/password', methods=['PUT'])
@require_auth
def update_password(username):
    """Change user password"""
    data = request.json

    if not data or 'password' not in data:
        return jsonify({'error': 'Password required'}), 400

    password = data['password']

    # Validate password
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    # Hash password and update
    password_hash = hash_password(password)
    success = change_password(username, password_hash)

    if not success:
        return jsonify({'error': 'User not found'}), 404

    log_audit(
        request.username,
        'change_password',
        'user',
        username,
        None,
        request.remote_addr
    )

    return jsonify({'success': True}), 200

# ============ Frontend Server Management ============

@app.route('/api/frontends', methods=['GET'])
@require_auth
def list_frontends():
    """List all frontend servers from database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, name, bind_address, bind_port, mode, default_backend, enabled, created_at, updated_at
        FROM frontend_servers
        ORDER BY name
    ''')

    frontends = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'frontends': frontends}), 200

@app.route('/api/frontends', methods=['POST'])
@require_auth
def create_frontend():
    """Create a new frontend server"""
    data = request.json

    if not data or 'name' not in data or 'bind_address' not in data or 'bind_port' not in data:
        return jsonify({'error': 'Name, bind_address, and bind_port required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO frontend_servers (name, bind_address, bind_port, mode, default_backend, enabled)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['bind_address'],
            data['bind_port'],
            data.get('mode', 'tcp'),
            data.get('default_backend', ''),
            data.get('enabled', 1)
        ))

        conn.commit()
        frontend_id = cursor.lastrowid

        log_audit(
            request.username,
            'create_frontend',
            'frontend',
            data['name'],
            f"bind={data['bind_address']}:{data['bind_port']}",
            request.remote_addr
        )

        return jsonify({'success': True, 'id': frontend_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/frontends/<int:frontend_id>', methods=['PUT'])
@require_auth
def update_frontend(frontend_id):
    """Update a frontend server"""
    data = request.json

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Build update query dynamically
        update_fields = []
        params = []

        for field in ['name', 'bind_address', 'bind_port', 'mode', 'default_backend', 'enabled']:
            if field in data:
                update_fields.append(f'{field} = ?')
                params.append(data[field])

        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400

        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        params.append(frontend_id)

        cursor.execute(f'''
            UPDATE frontend_servers
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', params)

        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Frontend not found'}), 404

        log_audit(
            request.username,
            'update_frontend',
            'frontend',
            str(frontend_id),
            None,
            request.remote_addr
        )

        return jsonify({'success': True}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/frontends/<int:frontend_id>', methods=['DELETE'])
@require_auth
def delete_frontend(frontend_id):
    """Delete a frontend server"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT name FROM frontend_servers WHERE id = ?', (frontend_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': 'Frontend not found'}), 404

        frontend_name = row['name']

        cursor.execute('DELETE FROM frontend_servers WHERE id = ?', (frontend_id,))
        conn.commit()

        log_audit(
            request.username,
            'delete_frontend',
            'frontend',
            frontend_name,
            None,
            request.remote_addr
        )

        return jsonify({'success': True}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ============ Backend Server Management ============

@app.route('/api/backends', methods=['GET'])
@require_auth
def list_backends():
    """List all backend servers with their server lists"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, name, mode, balance, enabled, created_at, updated_at
        FROM backend_servers
        ORDER BY name
    ''')

    backends = []
    for row in cursor.fetchall():
        backend = dict(row)

        # Get servers for this backend
        cursor.execute('''
            SELECT id, server_name, address, port, enabled, weight, maxconn, check_enabled
            FROM backend_server_list
            WHERE backend_name = ?
            ORDER BY server_name
        ''', (backend['name'],))

        backend['servers'] = [dict(s) for s in cursor.fetchall()]
        backends.append(backend)

    conn.close()

    return jsonify({'backends': backends}), 200

@app.route('/api/backends', methods=['POST'])
@require_auth
def create_backend():
    """Create a new backend server"""
    data = request.json

    if not data or 'name' not in data:
        return jsonify({'error': 'Name required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO backend_servers (name, mode, balance, enabled)
            VALUES (?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('mode', 'tcp'),
            data.get('balance', 'roundrobin'),
            data.get('enabled', 1)
        ))

        conn.commit()
        backend_id = cursor.lastrowid

        log_audit(
            request.username,
            'create_backend',
            'backend',
            data['name'],
            f"mode={data.get('mode', 'tcp')}, balance={data.get('balance', 'roundrobin')}",
            request.remote_addr
        )

        return jsonify({'success': True, 'id': backend_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/backends/<int:backend_id>', methods=['PUT'])
@require_auth
def update_backend(backend_id):
    """Update a backend server"""
    data = request.json

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        update_fields = []
        params = []

        for field in ['name', 'mode', 'balance', 'enabled']:
            if field in data:
                update_fields.append(f'{field} = ?')
                params.append(data[field])

        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400

        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        params.append(backend_id)

        cursor.execute(f'''
            UPDATE backend_servers
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', params)

        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Backend not found'}), 404

        log_audit(
            request.username,
            'update_backend',
            'backend',
            str(backend_id),
            None,
            request.remote_addr
        )

        return jsonify({'success': True}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/backends/<int:backend_id>', methods=['DELETE'])
@require_auth
def delete_backend(backend_id):
    """Delete a backend server"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT name FROM backend_servers WHERE id = ?', (backend_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': 'Backend not found'}), 404

        backend_name = row['name']

        # Delete will cascade to backend_server_list
        cursor.execute('DELETE FROM backend_servers WHERE id = ?', (backend_id,))
        conn.commit()

        log_audit(
            request.username,
            'delete_backend',
            'backend',
            backend_name,
            None,
            request.remote_addr
        )

        return jsonify({'success': True}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/backends/<backend_name>/servers', methods=['POST'])
@require_auth
def add_backend_server(backend_name):
    """Add a server to a backend"""
    data = request.json

    if not data or 'server_name' not in data or 'address' not in data or 'port' not in data:
        return jsonify({'error': 'server_name, address, and port required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO backend_server_list
            (backend_name, server_name, address, port, enabled, weight, maxconn, check_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            backend_name,
            data['server_name'],
            data['address'],
            data['port'],
            data.get('enabled', 1),
            data.get('weight', 1),
            data.get('maxconn', 32),
            data.get('check_enabled', 1)
        ))

        conn.commit()
        server_id = cursor.lastrowid

        log_audit(
            request.username,
            'add_backend_server',
            'backend_server',
            f"{backend_name}/{data['server_name']}",
            f"address={data['address']}:{data['port']}",
            request.remote_addr
        )

        return jsonify({'success': True, 'id': server_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/backends/<backend_name>/servers/<int:server_id>', methods=['PUT'])
@require_auth
def update_backend_server(backend_name, server_id):
    """Update a backend server (e.g., enable/disable)"""
    data = request.json

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Build update query dynamically
        update_fields = []
        params = []

        for field in ['enabled', 'weight', 'maxconn', 'check_enabled']:
            if field in data:
                update_fields.append(f'{field} = ?')
                params.append(data[field])

        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400

        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        params.extend([server_id, backend_name])

        cursor.execute(f'''
            UPDATE backend_server_list
            SET {', '.join(update_fields)}
            WHERE id = ? AND backend_name = ?
        ''', params)

        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Server not found'}), 404

        log_audit(
            request.username,
            'update_backend_server',
            'backend_server',
            f"{backend_name}/{server_id}",
            f"enabled={data.get('enabled')}",
            request.remote_addr
        )

        return jsonify({'success': True}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/backends/<backend_name>/servers/<int:server_id>', methods=['DELETE'])
@require_auth
def remove_backend_server(backend_name, server_id):
    """Remove a server from a backend"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            SELECT server_name FROM backend_server_list
            WHERE id = ? AND backend_name = ?
        ''', (server_id, backend_name))

        row = cursor.fetchone()

        if not row:
            return jsonify({'error': 'Server not found'}), 404

        server_name = row['server_name']

        cursor.execute('DELETE FROM backend_server_list WHERE id = ?', (server_id,))
        conn.commit()

        log_audit(
            request.username,
            'remove_backend_server',
            'backend_server',
            f"{backend_name}/{server_name}",
            None,
            request.remote_addr
        )

        return jsonify({'success': True}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ============ Connection History ============

@app.route('/api/connections', methods=['GET'])
@require_auth
def get_connection_history():
    """Get connection history with optional filters"""
    server_name = request.args.get('server_name')
    server_type = request.args.get('server_type')
    limit = request.args.get('limit', 100, type=int)

    conn = get_db_connection()
    cursor = conn.cursor()

    query = 'SELECT * FROM connection_history WHERE 1=1'
    params = []

    if server_name:
        query += ' AND server_name = ?'
        params.append(server_name)

    if server_type:
        query += ' AND server_type = ?'
        params.append(server_type)

    query += ' ORDER BY connected_at DESC LIMIT ?'
    params.append(limit)

    cursor.execute(query, params)
    connections = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'connections': connections}), 200

@app.route('/api/connections/active', methods=['GET'])
@require_auth
def get_active_connections():
    """Get currently active connections (no disconnect time)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM connection_history
        WHERE disconnected_at IS NULL
        ORDER BY connected_at DESC
    ''')

    connections = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'connections': connections}), 200

# ============ HAProxy Config Management ============

@app.route('/api/haproxy/apply', methods=['POST'])
@require_auth
def apply_and_restart():
    """Apply current database config to HAProxy and restart"""
    try:
        result = apply_config_and_restart(request.username, request.remote_addr)

        if not result.get('success'):
            return jsonify(result), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/haproxy/backups', methods=['GET'])
@require_auth
def get_config_backups():
    """List all configuration backups"""
    backups = list_config_backups()
    return jsonify({'backups': backups}), 200

@app.route('/api/haproxy/backups/<int:backup_id>/restore', methods=['POST'])
@require_auth
def restore_config_backup(backup_id):
    """Restore a configuration backup"""
    try:
        result = restore_backup(backup_id, request.username, request.remote_addr)

        if not result.get('success'):
            return jsonify(result), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Development server only - use Gunicorn in production
    app.run(host='0.0.0.0', port=5000, debug=False)
