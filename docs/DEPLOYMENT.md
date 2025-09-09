# BirdSphere Deployment Guide

## Overview

This guide covers deploying the BirdSphere API server in production environments.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- MongoDB 5+ (optional, for chat features)
- Nginx (recommended for reverse proxy)
- SSL certificates

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/birdsphere
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-session-secret-here

# File Uploads
UPLOAD_PATH=/var/www/birdsphere/uploads
MAX_FILE_SIZE=10485760

# Optional: MongoDB for Chat
USE_MONGODB_CHAT=true
MONGODB_URI=mongodb://localhost:27017/birdsphere-chat

# Security
ALLOWED_ORIGINS=https://birdsphere.com,https://www.birdsphere.com
```

### Optional Environment Variables

```bash
# Email (if implementing notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@birdsphere.com
SMTP_PASS=your-email-password

# External Services
GEOCODING_API_KEY=your-geocoding-api-key
ANALYTICS_KEY=your-analytics-key
```

## Database Setup

### PostgreSQL

1. Create database and user:
```sql
CREATE DATABASE birdsphere;
CREATE USER birdsphere_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE birdsphere TO birdsphere_user;
```

2. Run initialization scripts:
```bash
psql -U birdsphere_user -d birdsphere -f database/schema.sql
psql -U birdsphere_user -d birdsphere -f database/seed.sql
```

### Redis

1. Install and configure Redis:
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

2. Secure Redis (edit `/etc/redis/redis.conf`):
```
bind 127.0.0.1
requirepass your-redis-password
```

## Application Deployment

### Using PM2 (Recommended)

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Create PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'birdsphere-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

3. Start the application:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Using Docker

1. Build the image:
```bash
docker build -t birdsphere-api .
```

2. Run with docker-compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Nginx Configuration

Create `/etc/nginx/sites-available/birdsphere`:

```nginx
server {
    listen 80;
    server_name api.birdsphere.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.birdsphere.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static file serving for uploads
    location /uploads/ {
        alias /var/www/birdsphere/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Security Considerations

### File Permissions
```bash
# Set proper ownership
chown -R www-data:www-data /var/www/birdsphere

# Set secure permissions
chmod 755 /var/www/birdsphere
chmod -R 644 /var/www/birdsphere/uploads
chmod 600 /var/www/birdsphere/.env
```

### Firewall Configuration
```bash
# Allow only necessary ports
ufw allow 22   # SSH
ufw allow 80   # HTTP
ufw allow 443  # HTTPS
ufw deny 3000  # Block direct app access
ufw enable
```

### Regular Security Updates
```bash
# Setup automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Monitoring

### Log Management
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/birdsphere
```

```
/var/www/birdsphere/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### Health Monitoring
- Use `/health` endpoint for health checks
- Monitor database connections
- Set up alerts for error rates
- Monitor disk space for uploads

## Backup Strategy

### Database Backups
```bash
# Daily PostgreSQL backup
pg_dump -U birdsphere_user birdsphere > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U birdsphere_user birdsphere | gzip > "$BACKUP_DIR/birdsphere_$DATE.sql.gz"
find $BACKUP_DIR -name "birdsphere_*.sql.gz" -mtime +7 -delete
```

### File Backups
```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## Performance Optimization

### Database Optimization
- Add appropriate indexes
- Configure PostgreSQL for production
- Enable query logging for optimization
- Regular VACUUM and ANALYZE

### Caching Strategy
- Redis for session storage
- Application-level caching for listings
- CDN for static assets
- Browser caching headers

### Scaling Considerations
- Use PM2 cluster mode
- Database read replicas
- Load balancer for multiple instances
- Separate file storage service

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check network connectivity

2. **Redis Connection Issues**
   - Verify Redis server status
   - Check REDIS_URL configuration
   - Ensure Redis password is correct

3. **File Upload Problems**
   - Check UPLOAD_PATH permissions
   - Verify disk space
   - Check MAX_FILE_SIZE configuration

### Log Analysis
```bash
# View application logs
pm2 logs birdsphere-api

# Check specific error patterns
grep "ERROR" logs/combined.log | tail -50

# Monitor real-time logs
tail -f logs/combined.log
```

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate logs
- Monitor disk usage
- Database maintenance
- Security patches
- SSL certificate renewal

### Update Procedure
1. Test updates in staging environment
2. Create database backup
3. Stop application gracefully
4. Deploy new code
5. Run database migrations if needed
6. Start application
7. Verify functionality
8. Monitor for issues