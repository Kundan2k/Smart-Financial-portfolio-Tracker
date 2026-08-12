# Vercel Deployment Guide

This guide explains how to deploy the Smart Financial Portfolio Tracker to Vercel.

## Project Structure

- **Frontend**: React + Vite (auto-deployed to Vercel)
- **Backend**: Python FastAPI (deployed as serverless functions)

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Set up secrets in Vercel dashboard

## Step 1: Prepare Your Project

### Update API URLs in Frontend

Update `frontend/src/api.js` to use environment variable for API URL:

```javascript
const API_URL = import.meta.env.VITE_API_URL || '/api';
```

### Configure CORS in Backend

Update `backend/main.py` to accept Vercel frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-vercel-domain.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 2: Connect to GitHub

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Connect your GitHub repository
5. Vercel will auto-detect the configuration from `vercel.json`

## Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_API_URL=https://your-project.vercel.app/api
DATABASE_URL=<your-database-url>
JWT_SECRET=<generate-a-strong-secret>
ENVIRONMENT=production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Database Setup Options

**Option A: PostgreSQL on Railway/Neon** (Recommended)
- Sign up at https://railway.app or https://neon.tech
- Create a PostgreSQL database
- Use connection string in `DATABASE_URL`

**Option B: SQLite** (Simpler, limited)
- Uses `sqlite:///./test.db` (stored on filesystem)
- Good for testing, not recommended for production

## Step 4: Deploy

1. Make sure all files are pushed to GitHub
2. Vercel will automatically deploy on push
3. Frontend builds and deploys to Vercel's CDN
4. Backend serverless functions are deployed to Vercel

## Step 5: Testing Deployment

```bash
# Test frontend
curl https://your-project.vercel.app

# Test backend health check
curl https://your-project.vercel.app/api/health

# View logs
vercel logs <url>
```

## Database Migrations (if using PostgreSQL)

If your FastAPI app needs database migrations:

1. Create a migration setup in `api/migrations.py`:

```python
from backend.db.database import Base, engine

def run_migrations():
    Base.metadata.create_all(bind=engine)
```

2. Add to `api/index.py` on first deployment

## Troubleshooting

### Logs
View real-time logs in Vercel Dashboard or CLI:
```bash
vercel logs <deployment-url>
```

### CORS Issues
- Ensure CORS is configured with your Vercel domain
- Check `Access-Control-Allow-Origin` headers

### Database Connection
- Verify `DATABASE_URL` environment variable is set
- For PostgreSQL, ensure your IP/firewall allows Vercel IPs
- Check database credentials

### Python Import Errors
- Ensure `backend/` is added to `sys.path` in `api/index.py`
- All dependencies in `api/requirements.txt` match `backend/requirements.txt`

## Local Development

```bash
# Install dependencies
npm install
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# Run with env file
cp .env.example .env
# Edit .env with local values

# Start backend (one terminal)
cd backend
python -m uvicorn main:app --reload

# Start frontend (another terminal)
cd frontend
npm run dev
```

## Production Best Practices

1. **Use strong JWT_SECRET**: Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`
2. **Enable HTTPS**: Vercel does this automatically
3. **Set up monitoring**: Use Vercel Analytics and Logs
4. **Database backups**: If using PostgreSQL, enable automated backups
5. **Rate limiting**: Consider adding rate limiting middleware
6. **Security headers**: Vercel's `vercel.json` can configure these

## Custom Domain

1. In Vercel Dashboard → Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update CORS in backend with new domain

## CI/CD Pipeline

Vercel automatically:
- ✅ Builds on every push to main
- ✅ Runs preview deployments for PRs
- ✅ Deploys to production on merge
- ✅ Rollback to previous deployments

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Python Support](https://vercel.com/docs/concepts/runtimes/python)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Vite Documentation](https://vitejs.dev)
