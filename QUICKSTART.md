# Quick Start Guide - HAProxy Manager

## Installation (5 minutes)

### 1. Prerequisites
- Fresh Debian/Ubuntu 20.04+ or RHEL/CentOS 8+ installation
- Root access
- Internet connection

### 2. Install

```bash
# Clone or download the repository
git clone <your-repo-url>
cd proxy-manager

# Make script executable (if not already)
chmod +x deploy.sh

# Run installation
sudo ./deploy.sh
```

The script will automatically:
- ✅ Install Python 3, Node.js, HAProxy, Nginx
- ✅ Create application user and directories
- ✅ Build React frontend
- ✅ Install Python backend with dependencies
- ✅ Configure all services
- ✅ Start the application

### 3. Access

Open your browser:
```
http://YOUR_SERVER_IP
```

**Login with:**
- Username: `admin`
- Password: `admin`

⚠️ **Change this password immediately after login!**

## What You Can Do

### 1. View Statistics
- Navigate to the **Overview** tab
- See real-time metrics for:
  - Total and current sessions
  - Data transfer (in/out)
  - Server status (up/down)

### 2. Manage Frontends
- Click the **Frontends** tab
- View all frontend configurations
- See bind addresses and default backends
- Monitor request rates and sessions

### 3. Manage Backends
- Click the **Backends** tab
- View all backend servers
- **Enable/Disable servers** with one click
- Monitor server health and traffic

### 4. View Configuration
- Click the **Configuration** tab
- See current HAProxy configuration
- Download configuration file

## Example HAProxy Configuration

To test the application, you can use this sample HAProxy config:

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Add:

```
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend http_front
    bind *:8080
    default_backend web_servers

backend web_servers
    balance roundrobin
    server web1 192.168.1.10:80 check
    server web2 192.168.1.11:80 check
    server web3 192.168.1.12:80 check backup
```

Then reload HAProxy:
```bash
sudo systemctl reload haproxy
```

Now you'll see:
- 1 frontend: `http_front`
- 1 backend: `web_servers`
- 3 servers: `web1`, `web2`, `web3`

## Managing Services

```bash
# Check application status
sudo systemctl status haproxy-manager

# View application logs
sudo journalctl -u haproxy-manager -f

# Restart application
sudo systemctl restart haproxy-manager

# Check HAProxy status
sudo systemctl status haproxy

# View HAProxy logs
sudo journalctl -u haproxy -f
```

## Common Tasks

### Enable/Disable a Backend Server

1. Go to **Backends** tab
2. Find the server you want to manage
3. Click the **Enable** or **Disable** button
4. Server status updates immediately

### Monitor Traffic

1. Go to **Overview** tab
2. View real-time statistics
3. Statistics refresh every 5 seconds automatically

### Download Configuration

1. Go to **Configuration** tab
2. Click **Download Config** button
3. Save the `haproxy.cfg` file

## Troubleshooting

### Can't Access the Web Interface

```bash
# Check if services are running
sudo systemctl status haproxy-manager
sudo systemctl status nginx

# Check firewall
sudo ufw status  # Ubuntu/Debian
sudo firewall-cmd --list-all  # RHEL/CentOS

# Allow HTTP traffic
sudo ufw allow 80/tcp  # Ubuntu/Debian
sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload  # RHEL/CentOS
```

### Stats Not Showing

```bash
# Check HAProxy socket
ls -la /run/haproxy/admin.sock

# Test socket access
echo "show info" | sudo socat stdio /run/haproxy/admin.sock

# Ensure user is in haproxy group
sudo usermod -a -G haproxy haproxy-manager
sudo systemctl restart haproxy-manager
```

### Login Not Working

```bash
# Check database
sudo ls -la /var/lib/haproxy-manager/users.db

# Reset to default (admin/admin)
sudo rm /var/lib/haproxy-manager/users.db
sudo systemctl restart haproxy-manager
```

## Next Steps

1. **Secure Your Installation**
   - Change the default password
   - Configure HTTPS in Nginx
   - Restrict network access

2. **Customize HAProxy**
   - Edit `/etc/haproxy/haproxy.cfg`
   - Add your backends and servers
   - Configure health checks
   - Set up SSL termination

3. **Monitor Performance**
   - Watch the Overview dashboard
   - Monitor server health
   - Track request rates

4. **Automate**
   - Use the API for automation
   - Integrate with monitoring tools
   - Script common tasks

## Getting Help

- Check the full [README_NEW.md](README_NEW.md) for detailed documentation
- Review logs: `sudo journalctl -u haproxy-manager -f`
- Test HAProxy config: `sudo haproxy -c -f /etc/haproxy/haproxy.cfg`

## Security Reminder

🔒 **Before using in production:**
1. Change default password
2. Configure HTTPS/SSL
3. Restrict network access
4. Regular backups
5. Update regularly

---

**Happy Load Balancing! 🚀**
