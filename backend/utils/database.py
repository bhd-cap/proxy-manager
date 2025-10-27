"""Database schema and utilities for HAProxy Manager"""
import sqlite3
import os
from datetime import datetime

def get_db_connection():
    """Get database connection"""
    db_path = os.getenv('DATABASE_PATH', '/var/lib/haproxy-manager/users.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initialize all database tables"""
    db_path = os.getenv('DATABASE_PATH', '/var/lib/haproxy-manager/users.db')
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Users table (existing)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Frontend servers configuration
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS frontend_servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            bind_address TEXT NOT NULL,
            bind_port INTEGER NOT NULL,
            mode TEXT DEFAULT 'tcp',
            default_backend TEXT,
            enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Backend servers configuration
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS backend_servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            mode TEXT DEFAULT 'tcp',
            balance TEXT DEFAULT 'roundrobin',
            enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Individual servers within backends
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS backend_server_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backend_name TEXT NOT NULL,
            server_name TEXT NOT NULL,
            address TEXT NOT NULL,
            port INTEGER NOT NULL,
            enabled INTEGER DEFAULT 1,
            weight INTEGER DEFAULT 1,
            maxconn INTEGER DEFAULT 32,
            check_enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (backend_name) REFERENCES backend_servers(name) ON DELETE CASCADE,
            UNIQUE(backend_name, server_name)
        )
    ''')

    # Connection history tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS connection_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_name TEXT NOT NULL,
            server_type TEXT NOT NULL,
            client_ip TEXT NOT NULL,
            session_id TEXT,
            status TEXT,
            bytes_in INTEGER DEFAULT 0,
            bytes_out INTEGER DEFAULT 0,
            connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            disconnected_at TIMESTAMP
        )
    ''')

    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_connection_history_server
        ON connection_history(server_name, server_type)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_connection_history_time
        ON connection_history(connected_at DESC)
    ''')

    # HAProxy config backups tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS config_backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            description TEXT,
            created_by TEXT,
            config_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Audit log for tracking changes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_name TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

def log_audit(username, action, resource_type, resource_name=None, details=None, ip_address=None):
    """Log an audit entry"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO audit_log (username, action, resource_type, resource_name, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (username, action, resource_type, resource_name, details, ip_address))

    conn.commit()
    conn.close()

def add_user(username, password_hash):
    """Add a new user to the database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            (username, password_hash)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_all_users():
    """Get all users (without password hashes)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT id, username, created_at FROM users ORDER BY username')
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return users

def delete_user(username):
    """Delete a user"""
    if username == 'admin':
        return False  # Protect admin user

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('DELETE FROM users WHERE username = ?', (username,))
    deleted = cursor.rowcount > 0

    conn.commit()
    conn.close()

    return deleted

def change_password(username, new_password_hash):
    """Change user password"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        (new_password_hash, username)
    )
    updated = cursor.rowcount > 0

    conn.commit()
    conn.close()

    return updated
