"""HAProxy Manager - Flask Backend API"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from utils.auth import (
    init_db, authenticate_user, create_session,
    validate_session, destroy_session, require_auth
)
from utils.haproxy import (
    read_haproxy_stats, parse_haproxy_config,
    write_haproxy_config, reload_haproxy, toggle_server
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

    return jsonify(result), 200

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
