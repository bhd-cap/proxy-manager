# HAProxy Manager - Web-Based Load Balancer Management

A complete web-based management interface for HAProxy load balancer with real-time statistics, server management, and configuration viewing.

## Features

- **Real-time Statistics**: Live monitoring of HAProxy frontends, backends, and servers
- **Server Management**: Enable/disable backend servers through the web interface
- **Configuration Viewing**: View current HAProxy configuration
- **Secure Authentication**: bcrypt password hashing with session management
- **Responsive UI**: Modern, dark-themed interface built with React
- **RESTful API**: Clean API for all management operations
- **Single Command Deployment**: Automated installation script for Debian/Ubuntu and RHEL/CentOS

## Architecture

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │ HTTP/HTTPS
         ▼
┌─────────────────┐
│  Nginx (Port 80)│ ← Reverse Proxy
├─────────────────┤
│  Static Files   │ ← React Frontend (built)
│  /api → Backend │ ← API Proxy
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Flask + Gunicorn│ ← Python Backend (Port 5000)
│  (Port 5000)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    HAProxy      │ ← Load Balancer
│  (Stats Socket) │
└─────────────────┘
```

## Prerequisites

- Debian/Ubuntu 20.04+ or RHEL/CentOS 8+
- Root access
- Internet connection (for package installation)

## Quick Start

### 1. Clone or Download

```bash
git clone <repository-url>
cd proxy-manager
```

### 2. Run Installation Script

```bash
sudo ./deploy.sh
```

The script will:
- Install all dependencies (Python, Node.js, HAProxy, Nginx)
- Create application user and directories
- Build frontend and install backend
- Configure HAProxy, Nginx, and systemd
- Start all services

### 3. Access the Application

Open your browser and navigate to:
```
http://your-server-ip
```

**Default Credentials:**
- Username: `admin`
- Password: `admin`

**⚠️ IMPORTANT: Change the default password after first login!**

## Project Structure

```
proxy-manager/
├── backend/                    # Python Flask backend
│   ├── app.py                 # Main Flask application
│   ├── gunicorn_config.py     # Gunicorn WSGI server config
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment variables template
│   └── utils/                 # Utility modules
│       ├── __init__.py
│       ├── auth.py           # Authentication (bcrypt, sessions)
│       └── haproxy.py        # HAProxy management functions
│
├── frontend/                  # React frontend
│   ├── package.json          # Node dependencies
│   ├── vite.config.ts        # Vite build configuration
│   ├── tsconfig.json         # TypeScript configuration
│   ├── index.html            # HTML entry point
│   └── src/
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Main App component
│       ├── index.css         # Global styles
│       ├── components/       # React components
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Overview.tsx
│       │   ├── Frontends.tsx
│       │   ├── Backends.tsx
│       │   └── Configuration.tsx
│       └── utils/
│           └── api.ts        # API client
│
├── deploy.sh                 # Installation script
└── README_NEW.md            # This file
```

## Development

### Backend Development

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_PATH=/tmp/users.db
export HAPROXY_CONFIG_PATH=/etc/haproxy/haproxy.cfg
export HAPROXY_SOCKET_PATH=/run/haproxy/admin.sock

# Run development server
python app.py
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The development server will start at `http://localhost:3000` with API proxy to backend.

### Building for Production

```bash
cd frontend
npm run build
```

Built files will be in `frontend/dist/` directory.

## API Endpoints

### Authentication

- `POST /api/login` - User login
  ```json
  {"username": "admin", "password": "admin"}
  ```
  Returns: `{"token": "...", "username": "admin"}`

- `POST /api/logout` - User logout (requires auth token)

### HAProxy Management

- `GET /api/config` - Get HAProxy configuration (requires auth)
- `POST /api/config` - Update HAProxy configuration (requires auth)
- `POST /api/reload` - Reload HAProxy service (requires auth)
- `GET /api/stats` - Get HAProxy statistics (requires auth)
- `POST /api/server/<backend>/<server>/toggle` - Enable/disable server (requires auth)
  ```json
  {"enable": true}
  ```

### Health Check

- `GET /api/health` - Health check endpoint

## Configuration

### Environment Variables

Backend environment variables (set in systemd service or `.env`):

```bash
SECRET_KEY=your-secret-key-here
DATABASE_PATH=/var/lib/haproxy-manager/users.db
HAPROXY_CONFIG_PATH=/etc/haproxy/haproxy.cfg
HAPROXY_SOCKET_PATH=/run/haproxy/admin.sock
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### HAProxy Configuration

The application requires HAProxy to have the stats socket enabled in the global section:

```
global
    stats socket /run/haproxy/admin.sock mode 660 level admin
```

The installation script automatically adds this if not present.

### Nginx Configuration

Nginx is configured as a reverse proxy:
- Serves static frontend files from `/opt/haproxy-manager/frontend/dist`
- Proxies `/api` requests to Flask backend at `http://127.0.0.1:5000`

Configuration file: `/etc/nginx/sites-available/haproxy-manager`

## Service Management

### Systemd Service

```bash
# Start service
sudo systemctl start haproxy-manager

# Stop service
sudo systemctl stop haproxy-manager

# Restart service
sudo systemctl restart haproxy-manager

# Check status
sudo systemctl status haproxy-manager

# View logs
sudo journalctl -u haproxy-manager -f
```

### HAProxy Service

```bash
# Reload configuration (no downtime)
sudo systemctl reload haproxy

# Restart service
sudo systemctl restart haproxy

# Check status
sudo systemctl status haproxy

# Validate configuration
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
```

## Security Considerations

### Default Setup

1. **Change Default Password**: The default `admin/admin` credentials should be changed immediately
2. **HTTPS**: Configure SSL/TLS in Nginx for production use
3. **Firewall**: Only expose necessary ports (80, 443)
4. **Network Access**: Consider restricting access to trusted networks

### Password Management

Passwords are hashed using bcrypt with automatic salt generation. To change the admin password:

```bash
# SSH into server
sudo su - haproxy-manager
cd /opt/haproxy-manager/backend
source venv/bin/activate
python3

# In Python shell:
from utils.auth import hash_password, get_db_connection
import sqlite3

new_password = "your-new-secure-password"
password_hash = hash_password(new_password)

conn = get_db_connection()
cursor = conn.cursor()
cursor.execute('UPDATE users SET password_hash = ? WHERE username = ?', (password_hash, 'admin'))
conn.commit()
conn.close()
print("Password updated successfully")
```

### CORS Configuration

CORS origins can be configured via the `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Sudoers Configuration

The application user has passwordless sudo access for specific HAProxy operations:
- `systemctl reload haproxy`
- `systemctl restart haproxy`
- `systemctl status haproxy`
- `haproxy -c -f /etc/haproxy/haproxy.cfg` (config validation)

Configuration file: `/etc/sudoers.d/haproxy-manager`

## Troubleshooting

### Backend Not Starting

```bash
# Check service status
sudo systemctl status haproxy-manager

# View logs
sudo journalctl -u haproxy-manager -n 50

# Check if port 5000 is in use
sudo netstat -tlnp | grep 5000
```

### Frontend Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/haproxy-manager-error.log
```

### HAProxy Stats Not Working

```bash
# Check if HAProxy socket exists
ls -la /run/haproxy/admin.sock

# Check socket permissions
# Should be owned by haproxy:haproxy with mode 660

# Test socket connection
echo "show info" | sudo socat stdio /run/haproxy/admin.sock

# Verify user is in haproxy group
groups haproxy-manager
```

### Permission Errors

```bash
# Fix application directory permissions
sudo chown -R haproxy-manager:haproxy-manager /opt/haproxy-manager
sudo chown -R haproxy-manager:haproxy-manager /var/lib/haproxy-manager
sudo chown -R haproxy-manager:haproxy-manager /var/log/haproxy-manager

# Add user to haproxy group
sudo usermod -a -G haproxy haproxy-manager

# Restart services
sudo systemctl restart haproxy-manager
```

## Backup and Restore

### Backup

```bash
# Backup configuration
sudo tar -czf haproxy-manager-backup-$(date +%Y%m%d).tar.gz \
    /etc/haproxy/haproxy.cfg \
    /var/lib/haproxy-manager/users.db \
    /opt/haproxy-manager/backend/.env

# Backup HAProxy configuration history
sudo cp -r /etc/haproxy/*.backup.* /path/to/backup/
```

### Restore

```bash
# Extract backup
sudo tar -xzf haproxy-manager-backup-YYYYMMDD.tar.gz -C /

# Restart services
sudo systemctl restart haproxy haproxy-manager
```

## Uninstallation

```bash
# Stop and disable services
sudo systemctl stop haproxy-manager
sudo systemctl disable haproxy-manager
sudo systemctl stop nginx
sudo systemctl disable nginx

# Remove service file
sudo rm /etc/systemd/system/haproxy-manager.service
sudo systemctl daemon-reload

# Remove application files
sudo rm -rf /opt/haproxy-manager
sudo rm -rf /var/lib/haproxy-manager
sudo rm -rf /var/log/haproxy-manager
sudo rm -rf /var/run/haproxy-manager

# Remove Nginx configuration
sudo rm /etc/nginx/sites-available/haproxy-manager
sudo rm /etc/nginx/sites-enabled/haproxy-manager

# Remove user
sudo userdel -r haproxy-manager

# Remove sudoers file
sudo rm /etc/sudoers.d/haproxy-manager
```

## Upgrading

```bash
# Stop service
sudo systemctl stop haproxy-manager

# Backup current version
sudo cp -r /opt/haproxy-manager /opt/haproxy-manager.backup

# Pull new version
cd /path/to/repo
git pull

# Run deployment script (will preserve data)
sudo ./deploy.sh

# Restart service
sudo systemctl restart haproxy-manager
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Specify your license here]

## Support

For issues, questions, or contributions:
- Create an issue in the repository
- Contact the maintainers

## Changelog

### Version 2.0 (Current)
- Complete rewrite with proper project structure
- Real HAProxy stats integration via admin socket
- Improved security with bcrypt password hashing
- Modern React frontend with TypeScript
- RESTful API design
- Vite build system for faster development
- Comprehensive error handling
- Production-ready deployment script

### Version 1.0
- Initial proof-of-concept
- Mock data implementation
- Single-file frontend
