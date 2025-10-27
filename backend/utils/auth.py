"""Authentication utilities with secure password hashing"""
import sqlite3
import secrets
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import os

# Session store (consider Redis for production)
sessions = {}

def get_db_connection():
    """Get database connection"""
    db_path = os.getenv('DATABASE_PATH', '/var/lib/haproxy-manager/users.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with users table"""
    db_path = os.getenv('DATABASE_PATH', '/var/lib/haproxy-manager/users.db')
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create default admin user if not exists
    cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', ('admin',))
    if cursor.fetchone()[0] == 0:
        password_hash = hash_password('admin')
        cursor.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            ('admin', password_hash)
        )

    conn.commit()
    conn.close()

def hash_password(password):
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, password_hash):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_session(username):
    """Create a new session for user"""
    token = secrets.token_hex(32)
    sessions[token] = {
        'username': username,
        'expires': datetime.now() + timedelta(hours=24)
    }
    return token

def validate_session(token):
    """Validate session token"""
    if token not in sessions:
        return None

    session = sessions[token]
    if datetime.now() > session['expires']:
        del sessions[token]
        return None

    return session['username']

def destroy_session(token):
    """Destroy a session"""
    if token in sessions:
        del sessions[token]

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No authorization token provided'}), 401

        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        username = validate_session(token)
        if not username:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Add username to request context
        request.username = username
        return f(*args, **kwargs)

    return decorated_function

def authenticate_user(username, password):
    """Authenticate user credentials"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT password_hash FROM users WHERE username = ?', (username,))
    result = cursor.fetchone()
    conn.close()

    if not result:
        return False

    return verify_password(password, result['password_hash'])
