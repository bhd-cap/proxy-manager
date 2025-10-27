# Migration Guide - Version 1.0 to 2.0

This guide helps you migrate from the old proof-of-concept version to the new production-ready version.

## Major Changes

### Architecture
- **Old**: Single files at root level, mock data
- **New**: Proper directory structure, real HAProxy integration

### Frontend
- **Old**: Single 742-line TSX file, hardcoded data
- **New**: Modular components, API integration, real-time updates

### Backend
- **Old**: Hardcoded stats, weak password hashing
- **New**: Real HAProxy socket communication, bcrypt hashing

### Security
- **Old**: SHA256 without salt, unlimited login attempts
- **New**: bcrypt with salt, CORS restrictions, input validation

## Before Migration

### 1. Backup Current Data

```bash
# Backup database
sudo cp /var/lib/haproxy-manager/users.db /backup/users.db.backup

# Backup HAProxy config
sudo cp /etc/haproxy/haproxy.cfg /backup/haproxy.cfg.backup
```

### 2. Note Your Customizations

If you made any changes to:
- HAProxy configuration
- User credentials
- Network settings

Document them before migration.

## Migration Steps

### Option A: Fresh Installation (Recommended)

This is the cleanest approach:

```bash
# 1. Uninstall old version
sudo systemctl stop haproxy-manager
sudo systemctl disable haproxy-manager

# 2. Remove old files (keep backups!)
sudo mv /opt/haproxy-manager /opt/haproxy-manager.old

# 3. Pull new version
cd /path/to/repo
git pull origin main

# 4. Run new installer
sudo ./deploy.sh

# 5. Restore any custom HAProxy configs
# Edit /etc/haproxy/haproxy.cfg if needed

# 6. Restart services
sudo systemctl restart haproxy-manager
```

### Option B: In-Place Upgrade

If you need to preserve data:

```bash
# 1. Stop services
sudo systemctl stop haproxy-manager

# 2. Backup everything
sudo cp -r /opt/haproxy-manager /opt/haproxy-manager.old
sudo cp /var/lib/haproxy-manager/users.db /var/lib/haproxy-manager/users.db.backup

# 3. Remove old application files
sudo rm -rf /opt/haproxy-manager/*

# 4. Copy new files
cd /path/to/repo
sudo cp -r backend frontend /opt/haproxy-manager/

# 5. Install backend dependencies
cd /opt/haproxy-manager/backend
sudo -u haproxy-manager python3 -m venv venv
sudo -u haproxy-manager venv/bin/pip install -r requirements.txt

# 6. Install and build frontend
cd /opt/haproxy-manager/frontend
sudo -u haproxy-manager npm install
sudo -u haproxy-manager npm run build

# 7. Update systemd service
sudo cp /path/to/repo/deploy/haproxy-manager.service /etc/systemd/system/
sudo systemctl daemon-reload

# 8. Update Nginx config
sudo cp /path/to/repo/deploy/nginx.conf /etc/nginx/sites-available/haproxy-manager
sudo nginx -t
sudo systemctl reload nginx

# 9. Start service
sudo systemctl start haproxy-manager
```

## Post-Migration Tasks

### 1. Verify Services

```bash
# Check application
sudo systemctl status haproxy-manager

# Check Nginx
sudo systemctl status nginx

# Check HAProxy
sudo systemctl status haproxy
```

### 2. Test Web Interface

1. Open `http://your-server-ip`
2. Login with credentials (admin/admin if fresh install)
3. Verify all tabs load correctly
4. Check that statistics are showing real data

### 3. Test Server Toggle

1. Go to Backends tab
2. Try enabling/disabling a server
3. Verify the action works

### 4. Password Migration

**Important**: Old passwords used SHA256 and are incompatible with the new bcrypt hashing.

If you migrated the database, you'll need to reset passwords:

```bash
sudo su - haproxy-manager
cd /opt/haproxy-manager/backend
source venv/bin/activate
python3

# In Python shell:
from utils.auth import hash_password, get_db_connection

# Update password for admin user
new_hash = hash_password('your-new-password')
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute('UPDATE users SET password_hash = ? WHERE username = ?', (new_hash, 'admin'))
conn.commit()
conn.close()
```

## Breaking Changes

### API Changes

#### Authentication Response
**Old:**
```json
{
  "success": true
}
```

**New:**
```json
{
  "success": true,
  "token": "abc123...",
  "username": "admin"
}
```

#### Stats Response Structure
**Old:** Mock data with hardcoded values

**New:** Real HAProxy stats with complete data:
```json
{
  "frontends": [...],
  "backends": [...],
  "servers": [...],
  "summary": {...}
}
```

#### Server Toggle Endpoint
**Old:** `/api/server/<id>/toggle`

**New:** `/api/server/<backend>/<server>/toggle`

### Configuration Changes

#### Environment Variables
New required environment variables in systemd service:

```ini
Environment="DATABASE_PATH=/var/lib/haproxy-manager/users.db"
Environment="HAPROXY_CONFIG_PATH=/etc/haproxy/haproxy.cfg"
Environment="HAPROXY_SOCKET_PATH=/run/haproxy/admin.sock"
Environment="ALLOWED_ORIGINS=http://localhost"
```

## Rollback

If something goes wrong:

```bash
# Stop new version
sudo systemctl stop haproxy-manager

# Restore old version
sudo rm -rf /opt/haproxy-manager
sudo mv /opt/haproxy-manager.old /opt/haproxy-manager

# Restore database
sudo cp /backup/users.db.backup /var/lib/haproxy-manager/users.db

# Restart
sudo systemctl start haproxy-manager
```

## Troubleshooting Migration Issues

### Issue: Frontend shows "Loading..." forever

**Cause**: Backend not responding or CORS issue

**Fix:**
```bash
# Check backend logs
sudo journalctl -u haproxy-manager -n 50

# Verify backend is running
sudo systemctl status haproxy-manager

# Check CORS settings
# Ensure ALLOWED_ORIGINS includes your domain
```

### Issue: "Permission denied" accessing HAProxy socket

**Cause**: User not in haproxy group

**Fix:**
```bash
sudo usermod -a -G haproxy haproxy-manager
sudo systemctl restart haproxy-manager
```

### Issue: Stats showing "No data available"

**Cause**: HAProxy socket not accessible

**Fix:**
```bash
# Check socket exists
ls -la /run/haproxy/admin.sock

# Test socket
echo "show info" | sudo socat stdio /run/haproxy/admin.sock

# Ensure HAProxy config has stats socket enabled
sudo grep "stats socket" /etc/haproxy/haproxy.cfg
```

### Issue: Old password doesn't work

**Cause**: Password hashing algorithm changed from SHA256 to bcrypt

**Fix:**
Reset password using the Python script in "Post-Migration Tasks" section above.

## Testing Checklist

After migration, verify:

- [ ] Web interface loads
- [ ] Login works
- [ ] Overview shows real statistics
- [ ] Frontends tab shows configured frontends
- [ ] Backends tab shows servers
- [ ] Server enable/disable works
- [ ] Configuration tab shows HAProxy config
- [ ] Stats update every 5 seconds
- [ ] No errors in browser console
- [ ] No errors in application logs

## Performance Notes

The new version:
- ✅ Uses real HAProxy data (no more mock data)
- ✅ Better error handling
- ✅ Faster frontend with Vite
- ✅ Modular code for easier maintenance
- ✅ Production-ready with Gunicorn

## Support

If you encounter issues during migration:

1. Check logs: `sudo journalctl -u haproxy-manager -f`
2. Review the [README_NEW.md](README_NEW.md) documentation
3. Create an issue in the repository with:
   - OS version
   - Error messages
   - Steps to reproduce

## Conclusion

The new version provides:
- Real-time statistics
- Better security
- Cleaner architecture
- Production readiness

Take your time with the migration and test thoroughly before deploying to production.
