# Vercel Deployment Checklist

## Pre-Deployment Setup

### 1. Repository & Git

- [ ] Push all changes to GitHub
- [ ] Ensure `.gitignore` is properly configured
- [ ] Remove any sensitive files (`.env`, `.env.local`, etc.)

### 2. Environment Configuration

- [ ] Copy `.env.example` to `.env` for local development
- [ ] Generate a strong `SECRET_KEY`:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- [ ] Update all configuration values in `.env`

### 3. Frontend Setup

- [ ] Frontend `package.json` has build script
- [ ] Vite configuration is correct (`frontend/vite.config.js`)
- [ ] Frontend environment variables are set (`.env.example`)
- [ ] API calls use `VITE_API_URL` environment variable

### 4. Backend Setup

- [ ] `backend/requirements.txt` is up to date
- [ ] `api/requirements.txt` has all dependencies
- [ ] `api/index.py` correctly imports FastAPI app
- [ ] `backend/config.py` loads from environment variables
- [ ] CORS is configured for production domains

### 5. Database

- [ ] Choose database option:
  - [ ] SQLite (simple, single-instance only)
  - [ ] PostgreSQL on Railway/Neon (recommended for production)
- [ ] Test database connection locally
- [ ] Prepare connection string for Vercel

## Vercel Deployment

### Step 1: Connect Project

- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Add New..." → "Project"
- [ ] Select "Import Git Repository"
- [ ] Authenticate with GitHub
- [ ] Select your repository
- [ ] Vercel auto-detects from `vercel.json`

### Step 2: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_API_URL = https://your-project.vercel.app/api
DATABASE_URL = <your-database-url>
SECRET_KEY = <strong-random-key>
ENVIRONMENT = production
ALGORITHM = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
FRONTEND_URL = https://your-project.vercel.app
API_URL = https://your-project.vercel.app/api
```

### Step 3: Deploy

- [ ] Click "Deploy"
- [ ] Monitor build logs
- [ ] Verify deployment succeeds

## Post-Deployment Verification

### Health Checks

```bash
# Frontend
curl https://your-project.vercel.app

# Backend health check
curl https://your-project.vercel.app/api/health

# View logs
vercel logs <your-project.vercel.app>
```

### Testing

- [ ] Frontend loads and renders correctly
- [ ] API endpoints respond
- [ ] Database connection works
- [ ] Authentication flows work
- [ ] CORS headers are correct

### Monitoring

- [ ] Set up Vercel Analytics
- [ ] Enable Vercel Logs
- [ ] Configure error tracking (Sentry, Datadog, etc.)
- [ ] Set up uptime monitoring

## Database Options

### Option A: PostgreSQL on Railway (Recommended)

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create PostgreSQL Database**
   - New Project → PostgreSQL
   - Generate credentials
   - Copy connection string

3. **Get Connection String**
   - Replace in Vercel `DATABASE_URL`
   - Format: `postgresql://user:password@host:port/dbname`

4. **Whitelist Vercel IPs**
   - Railway automatically allows Vercel

### Option B: SQLite (Simple, but Limited)

```
DATABASE_URL=sqlite:///./test.db
```

⚠️ **Limitations:**

- Single concurrent user
- No persistence across deployments
- Not suitable for production

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Verify `package.json` has all dependencies
- Ensure Node.js version compatibility
- Check for syntax errors in JavaScript/Python

### API Not Responding

- Verify `api/index.py` exists
- Check `vercel.json` rewrites configuration
- Ensure backend dependencies in `api/requirements.txt`
- View function logs: `vercel logs <url> --tail`

### CORS Errors

- Update `FRONTEND_URL` in Vercel environment
- Check CORS origins in `backend/main.py`
- Verify API URL in frontend matches Vercel deployment

### Database Connection Fails

- Verify `DATABASE_URL` is correct
- Test connection locally first
- Check PostgreSQL IP whitelist
- Ensure database credentials are correct

### Environment Variables Not Loading

- Redeploy after setting environment variables
- Check variable names match exactly
- Verify they're in correct environment (Production/Preview)

## Custom Domain

1. **Add Domain**
   - Vercel Dashboard → Settings → Domains
   - Enter your custom domain

2. **Configure DNS**
   - Follow Vercel's DNS instructions
   - Update domain registrar DNS settings
   - Wait for DNS propagation (5-48 hours)

3. **Update Backend CORS**
   - Add custom domain to `backend/main.py` CORS origins
   - Update `FRONTEND_URL` environment variable

## Maintenance

### Regular Updates

- [ ] Update npm dependencies: `npm audit fix`
- [ ] Update Python dependencies: `pip list --outdated`
- [ ] Monitor security advisories

### Backups

- [ ] PostgreSQL: Enable Railway backups
- [ ] Database exports: Weekly backups

### Monitoring & Logs

- [ ] Check Vercel Analytics
- [ ] Review error logs regularly
- [ ] Set up alerts for failures

## Useful Commands

```bash
# Local development
npm install && cd frontend && npm install && cd ../backend && pip install -r requirements.txt

# Test build
npm run build && cd frontend && npm run build

# Vercel CLI
npm i -g vercel
vercel login
vercel

# View logs
vercel logs <project-url> --tail

# Preview deployment
vercel --prod
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Python Runtime](https://vercel.com/docs/concepts/runtimes/python)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/concepts/)
- [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)
