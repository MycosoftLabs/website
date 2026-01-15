# Mycosoft Production Deployment Checklist

> **Last Updated**: 2026-01-15T14:30:00Z  
> **Version**: 2.0.0

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] All API endpoints tested
- [ ] Browser UI/UX tested

### Environment Configuration
- [ ] `.env.production` configured with all required variables
- [ ] Database credentials secured
- [ ] API keys validated
- [ ] SSL certificates ready

### Infrastructure
- [ ] Proxmox VM provisioned (8 cores, 32GB RAM, 500GB storage)
- [ ] Network configured (VLAN, firewall rules)
- [ ] DNS records configured in Cloudflare
- [ ] NAS mounts configured for backups

### Docker
- [ ] All images built successfully
- [ ] Images pushed to registry
- [ ] docker-compose.yml validated
- [ ] Volume mounts verified

---

## Deployment Steps

### 1. Create Snapshot
```powershell
.\scripts\deploy-to-proxmox.ps1 -SnapshotOnly
```

### 2. Backup Current Production
```bash
# On Proxmox VM
cd /opt/mycosoft
docker-compose exec postgres pg_dump -U mycosoft mycosoft > /backup/pre-deploy-$(date +%Y%m%d).sql
docker-compose down
```

### 3. Deploy New Version
```powershell
.\scripts\deploy-to-proxmox.ps1
```

### 4. Verify Deployment
- [ ] Website loads: https://mycosoft.com
- [ ] API health: https://api.mycosoft.com/api/health
- [ ] CREP dashboard: https://mycosoft.com/dashboard/crep
- [ ] NatureOS dashboard: https://mycosoft.com/natureos
- [ ] MycoBrain devices connecting

### 5. Monitor
- [ ] Check Grafana dashboards
- [ ] Review Prometheus alerts
- [ ] Monitor error logs

---

## Rollback Procedure

### Quick Rollback
```bash
# On Proxmox VM
cd /opt/mycosoft
docker-compose down
docker-compose -f docker-compose.rollback.yml up -d
```

### Database Rollback
```bash
docker-compose exec postgres psql -U mycosoft -d mycosoft < /backup/pre-deploy-YYYYMMDD.sql
```

---

## Post-Deployment Tasks

- [ ] Update CHANGELOG.md
- [ ] Create GitHub release
- [ ] Notify team
- [ ] Update status page
- [ ] Archive deployment logs

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | devops@mycosoft.io |
| Platform Lead | platform@mycosoft.io |
| On-Call | oncall@mycosoft.io |
