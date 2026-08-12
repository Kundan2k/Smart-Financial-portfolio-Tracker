# Vercel Deployment Quick Start Guide

## What's Been Set Up

Your project is now configured for Vercel deployment with:

✅ **Frontend** (React + Vite)
- Auto-deployed to Vercel's global CDN
- Environment variables support
- Optimized production build

✅ **Backend** (Python FastAPI)
- Deployed as Vercel serverless functions
- Python 3.11 runtime
- Auto-scaling, no server management

✅ **Configuration Files**
- `vercel.json` - Deployment configuration
- `api/index.py` - Serverless function entry point
- `backend/config.py` - Environment-based configuration
- Environment example files for reference

---

## Quick Start (5 Minutes)

### 1. Set Up Environment Variables

Copy environment examples:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update `.env` with your values:
```bash
# Generate a strong secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Then update:
SECRET_KEY=<paste-generated-secret>
DATABASE_URL=sqlite:///./test.db  # or your PostgreSQL URL
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && pip install -r requirements.txt
```

### 3. Run Locally

```bash
# Terminal 1: Start backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Deploy to Vercel (5 Steps)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Setup Vercel deployment"
git push origin main
```

### Step 2: Create Vercel Account
- Go to https://vercel.com
- Sign up with GitHub
- Authorize Vercel

### Step 3: Import Project
1. Visit https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Choose your Smart Financial Portfolio Tracker repo
5. Click "Import"

### Step 4: Add Environment Variables
In the Vercel dashboard, go to **Settings** → **Environment Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://your-project.vercel.app/api` | Set after first deployment |
| `DATABASE_URL` | `sqlite:///./test.db` | Or PostgreSQL connection string |
| `SECRET_KEY` | Generate strong key | Use: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `ENVIRONMENT` | `production` | |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `FRONTEND_URL` | `https://your-project.vercel.app` | Update with your Vercel URL |

### Step 5: Deploy
1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Get your Vercel URL (e.g., `https://smart-portfolio-tracker-xyz.vercel.app`)

---

## Verify Deployment

```bash
# Test frontend
curl https://your-project.vercel.app

# Test backend API
curl https://your-project.vercel.app/api/health

# Should return:
# {"status": "ok", "environment": "production", "database": "connected"}
```

---

## Database Setup (Choose One)

### Option A: Simple SQLite (Development Only)
```bash
DATABASE_URL=sqlite:///./test.db
```
⚠️ Not recommended for production (no persistence across deployments)

### Option B: PostgreSQL on Railway (Recommended)

1. **Create Railway Account**
   ```
   https://railway.app → Sign up
   ```

2. **Create PostgreSQL Database**
   - Click "New Project"
   - Select "PostgreSQL"
   - Generate and copy connection string

3. **Update Vercel**
   - Set `DATABASE_URL` in Vercel environment variables
   - Redeploy

---

## File Structure Overview

```
.
├── vercel.json                    # Vercel deployment config
├── VERCEL_DEPLOYMENT.md          # Full deployment guide
├── VERCEL_CHECKLIST.md           # Pre-deployment checklist
├── .env.example                  # Environment template
├── .env.production.example       # Production environment template
│
├── api/
│   ├── index.py                  # Serverless function entry point
│   └── requirements.txt          # Backend Python dependencies
│
├── backend/
│   ├── main.py                   # FastAPI application
│   ├── config.py                 # Configuration (UPDATED)
│   ├── requirements.txt          # Dependencies
│   ├── .env.example              # Backend env template
│   ├── models/                   # SQLAlchemy models
│   ├── routers/                  # API endpoints
│   ├── db/                        # Database setup
│   └── ...
│
├── frontend/
│   ├── vite.config.js            # Vite config (UPDATED)
│   ├── package.json              # Frontend dependencies
│   ├── .env.example              # Frontend env template
│   ├── .env.production.example   # Production env template
│   ├── src/
│   │   ├── api.js                # Axios API client
│   │   ├── App.jsx               # Main component
│   │   ├── components/           # React components
│   │   └── pages/                # Page components
│   └── index.html
│
└── ...
```

---

## Common Customizations

### Update Backend CORS Origins

Edit `backend/main.py`:
```python
def get_allowed_origins():
    """Get allowed CORS origins based on environment."""
    if settings.ENVIRONMENT == "production":
        return [
            settings.FRONTEND_URL,
            "https://your-custom-domain.com",
            "https://www.your-custom-domain.com",
        ]
    else:
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            settings.FRONTEND_URL,
        ]
```

### Update Frontend API URL

Edit `frontend/.env.production.example`:
```
VITE_API_URL=https://your-vercel-project.vercel.app/api
```

### Add Custom Domain

1. **In Vercel Dashboard**
   - Project Settings → Domains
   - Add your custom domain
   - Follow DNS instructions

2. **Update Backend**
   - Add domain to CORS origins in `backend/main.py`
   - Update `FRONTEND_URL` environment variable

---

## Troubleshooting

### ❌ Build Fails
```bash
# Check logs in Vercel dashboard
# Verify dependencies:
npm list
cd frontend && npm list
cd ../backend && pip list
```

### ❌ API Returns 503
- Check `api/index.py` exists
- Verify `vercel.json` rewrites configuration
- View function logs: `vercel logs --tail`

### ❌ CORS Errors
```javascript
// Frontend sees: 
// Access to XMLHttpRequest blocked by CORS policy
```
Solution:
- Update `FRONTEND_URL` in Vercel environment
- Add domain to `backend/main.py` CORS origins
- Redeploy

### ❌ Database Connection Error
```
psycopg2.OperationalError: could not connect to server
```
Solution:
- Verify `DATABASE_URL` is correct
- For PostgreSQL: Check IP whitelist in database settings
- Test connection locally first

### ❌ Environment Variables Not Applied
- Environment variables need redeploy to take effect
- After updating in dashboard, trigger redeploy:
  ```bash
  git commit --allow-empty -m "trigger redeploy"
  git push
  ```

---

## Next Steps

### 1. **Monitor Your Deployment**
   - Enable Vercel Analytics
   - Set up error tracking (Sentry, LogRocket)
   - Configure uptime monitoring

### 2. **Set Up CI/CD**
   - Vercel auto-deploys on `git push`
   - Configure preview deployments for PRs
   - Set up branch protection rules

### 3. **Database Backups**
   - If using PostgreSQL, enable automated backups
   - Set up regular exports

### 4. **Security**
   - Use strong `SECRET_KEY`
   - Enable HTTPS (automatic with Vercel)
   - Keep dependencies updated
   - Run `npm audit` and `pip audit` regularly

### 5. **Performance**
   - Use Vercel Analytics
   - Optimize images in frontend
   - Consider caching strategies for API responses

---

## Useful Commands

```bash
# Local development
npm install && cd frontend && npm install && cd ../backend && pip install -r requirements.txt

# Test production build
npm run build && cd frontend && npm run build

# Vercel CLI
npm i -g vercel
vercel login
vercel           # Deploy preview
vercel --prod    # Deploy production

# View deployment logs
vercel logs <your-project.vercel.app>

# View function logs (tail mode)
vercel logs <your-project.vercel.app> --tail

# Redeploy without changes
git commit --allow-empty -m "redeploy"
git push
```

---

## Support & Resources

- 📚 [Vercel Documentation](https://vercel.com/docs)
- 🐍 [Vercel Python Support](https://vercel.com/docs/concepts/runtimes/python)
- ⚡ [FastAPI Documentation](https://fastapi.tiangolo.com)
- ⚙️ [Vite Documentation](https://vitejs.dev)
- 🐘 [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)

---

## Questions?

1. Check **VERCEL_DEPLOYMENT.md** for detailed setup information
2. Check **VERCEL_CHECKLIST.md** for pre-deployment verification
3. Review Vercel dashboard logs for specific errors
4. Check framework documentation links above

Happy deploying! 🚀
