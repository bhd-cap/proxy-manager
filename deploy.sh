#!/bin/bash
#
# HAProxy Manager - Installation Script
# This script installs and configures the HAProxy Manager web application
# on Debian/Ubuntu or RHEL/CentOS systems
#

set -e

# Save the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="haproxy-manager"
APP_USER="haproxy-manager"
APP_DIR="/opt/$APP_NAME"
DATA_DIR="/var/lib/$APP_NAME"
LOG_DIR="/var/log/$APP_NAME"
RUN_DIR="/var/run/$APP_NAME"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        log_error "Cannot detect OS"
        exit 1
    fi

    log_info "Detected OS: $OS $VER"
}

install_nodejs() {
    log_info "Installing Node.js 20.x LTS..."

    case $OS in
        ubuntu|debian)
            # Install curl if not present
            apt-get install -y curl

            # Install Node.js 20.x from NodeSource
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
            ;;
        rhel|centos|rocky)
            # Install curl if not present
            yum install -y curl

            # Install Node.js 20.x from NodeSource
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
            ;;
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_success "Node.js $NODE_VERSION and npm $NPM_VERSION installed"
}

install_dependencies() {
    log_info "Installing system dependencies..."

    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y \
                python3 \
                python3-pip \
                python3-venv \
                haproxy \
                nginx \
                socat \
                sudo
            ;;
        rhel|centos|rocky)
            yum install -y epel-release
            yum install -y \
                python3 \
                python3-pip \
                haproxy \
                nginx \
                socat \
                sudo
            ;;
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    # Install Node.js after other dependencies
    install_nodejs

    log_success "System dependencies installed"
}

create_user() {
    if ! id -u $APP_USER > /dev/null 2>&1; then
        log_info "Creating application user: $APP_USER"
        useradd -r -s /bin/bash -d $APP_DIR -m $APP_USER
        log_success "User $APP_USER created"
    else
        log_info "User $APP_USER already exists"
    fi
}

create_directories() {
    log_info "Creating application directories..."

    mkdir -p $APP_DIR/{backend,frontend}
    mkdir -p $DATA_DIR
    mkdir -p $LOG_DIR
    mkdir -p $RUN_DIR

    log_success "Directories created"
}

install_backend() {
    log_info "Installing backend..."

    # Copy backend files
    cp -r $SCRIPT_DIR/backend/* $APP_DIR/backend/

    # Create virtual environment
    cd $APP_DIR/backend
    python3 -m venv venv
    source venv/bin/activate

    # Install Python dependencies
    pip install --upgrade pip
    pip install -r requirements.txt

    deactivate

    # Return to script directory
    cd $SCRIPT_DIR

    log_success "Backend installed"
}

install_frontend() {
    log_info "Installing frontend..."

    # Copy frontend files
    cp -r $SCRIPT_DIR/frontend/* $APP_DIR/frontend/

    # Install Node dependencies and build
    cd $APP_DIR/frontend
    npm install

    # Build production version
    npm run build

    # Return to script directory
    cd $SCRIPT_DIR

    log_success "Frontend built"
}

configure_haproxy() {
    log_info "Configuring HAProxy..."

    # Backup existing config
    if [ -f /etc/haproxy/haproxy.cfg ]; then
        cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Ensure HAProxy stats socket is enabled
    if ! grep -q "stats socket" /etc/haproxy/haproxy.cfg; then
        # Add stats socket to global section
        sed -i '/^global/a\    stats socket /run/haproxy/admin.sock mode 660 level admin' /etc/haproxy/haproxy.cfg
        log_info "Added stats socket to HAProxy config"
    fi

    # Create socket directory
    mkdir -p /run/haproxy
    chown haproxy:haproxy /run/haproxy

    # Add haproxy-manager user to haproxy group for socket access
    usermod -a -G haproxy $APP_USER

    # Enable and start HAProxy
    systemctl enable haproxy
    systemctl restart haproxy

    log_success "HAProxy configured"
}

configure_nginx() {
    log_info "Configuring Nginx..."

    # Create Nginx configuration
    cat > /etc/nginx/sites-available/$APP_NAME <<'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    location / {
        root /opt/haproxy-manager/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/haproxy-manager-access.log;
    error_log /var/log/nginx/haproxy-manager-error.log;
}
EOF

    # Enable site
    if [ -d /etc/nginx/sites-enabled ]; then
        ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    else
        # For RHEL/CentOS, include the config directly
        echo "include /etc/nginx/sites-available/$APP_NAME;" >> /etc/nginx/nginx.conf
    fi

    # Remove default site if exists
    if [ -f /etc/nginx/sites-enabled/default ]; then
        rm -f /etc/nginx/sites-enabled/default
    fi

    # Test Nginx configuration
    nginx -t

    # Enable and restart Nginx
    systemctl enable nginx
    systemctl restart nginx

    log_success "Nginx configured"
}

create_systemd_service() {
    log_info "Creating systemd service..."

    cat > /etc/systemd/system/$APP_NAME.service <<EOF
[Unit]
Description=HAProxy Manager Backend
After=network.target haproxy.service

[Service]
Type=notify
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
Environment="DATABASE_PATH=$DATA_DIR/users.db"
Environment="HAPROXY_CONFIG_PATH=/etc/haproxy/haproxy.cfg"
Environment="HAPROXY_SOCKET_PATH=/run/haproxy/admin.sock"
Environment="ALLOWED_ORIGINS=http://localhost,http://127.0.0.1"
ExecStart=$APP_DIR/backend/venv/bin/gunicorn -c gunicorn_config.py app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $APP_NAME.service

    log_success "Systemd service created"
}

configure_sudoers() {
    log_info "Configuring sudoers..."

    cat > /etc/sudoers.d/$APP_NAME <<EOF
# Allow haproxy-manager to reload HAProxy
$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload haproxy
$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart haproxy
$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl status haproxy
$APP_USER ALL=(ALL) NOPASSWD: /usr/sbin/haproxy -c -f /etc/haproxy/haproxy.cfg
EOF

    chmod 0440 /etc/sudoers.d/$APP_NAME

    log_success "Sudoers configured"
}

set_permissions() {
    log_info "Setting permissions..."

    chown -R $APP_USER:$APP_USER $APP_DIR
    chown -R $APP_USER:$APP_USER $DATA_DIR
    chown -R $APP_USER:$APP_USER $LOG_DIR
    chown -R $APP_USER:$APP_USER $RUN_DIR

    # Make sure NGINX can traverse parent directories and read frontend files
    # Set execute permission on parent directories so NGINX can traverse them
    chmod 755 $APP_DIR
    chmod 755 $APP_DIR/frontend

    # Make frontend dist directory and all contents readable by nginx
    if [ -d "$APP_DIR/frontend/dist" ]; then
        chmod -R 755 $APP_DIR/frontend/dist
        log_info "Frontend dist permissions set to 755"
    else
        log_warning "Frontend dist directory not found, skipping dist permissions"
    fi

    # Set SELinux context if SELinux is enabled (RHEL/CentOS)
    if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
        log_info "Setting SELinux contexts for NGINX..."
        chcon -R -t httpd_sys_content_t $APP_DIR/frontend/dist 2>/dev/null || log_warning "Could not set SELinux context"
    fi

    log_success "Permissions set"
}

configure_firewall() {
    log_info "Configuring firewall..."

    # Check if firewalld is available (RHEL/CentOS)
    if command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log_success "Firewalld configured"
    # Check if ufw is available (Ubuntu/Debian)
    elif command -v ufw &> /dev/null; then
        ufw allow 80/tcp
        ufw allow 443/tcp
        log_success "UFW configured"
    else
        log_warning "No firewall found, skipping firewall configuration"
    fi
}

start_services() {
    log_info "Starting services..."

    systemctl start $APP_NAME
    systemctl status $APP_NAME --no-pager

    log_success "Services started"
}

print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  HAProxy Manager Installation Complete${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Application URL: ${BLUE}http://$(hostname -I | awk '{print $1}')${NC}"
    echo -e "Default username: ${BLUE}admin${NC}"
    echo -e "Default password: ${BLUE}admin${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Change the default password after first login!${NC}"
    echo ""
    echo "Service commands:"
    echo "  - Start:   systemctl start $APP_NAME"
    echo "  - Stop:    systemctl stop $APP_NAME"
    echo "  - Restart: systemctl restart $APP_NAME"
    echo "  - Status:  systemctl status $APP_NAME"
    echo "  - Logs:    journalctl -u $APP_NAME -f"
    echo ""
    echo "Files:"
    echo "  - Application: $APP_DIR"
    echo "  - Data: $DATA_DIR"
    echo "  - Logs: $LOG_DIR"
    echo "  - HAProxy Config: /etc/haproxy/haproxy.cfg"
    echo ""
}

# Main installation process
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  HAProxy Manager Installation Script${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    check_root
    detect_os
    install_dependencies
    create_user
    create_directories
    install_backend
    install_frontend
    configure_haproxy
    configure_nginx
    create_systemd_service
    configure_sudoers
    set_permissions
    configure_firewall
    start_services
    print_summary

    log_success "Installation completed successfully!"
}

# Run main function
main
