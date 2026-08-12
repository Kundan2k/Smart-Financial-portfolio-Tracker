#!/bin/bash

# Pre-deployment script for Vercel
# Installs dependencies and runs migrations if needed

echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

echo "Setting up database..."
python -c "
import sys
sys.path.insert(0, '.')
from db.database import Base, engine
Base.metadata.create_all(bind=engine)
print('Database tables created successfully')
"

echo "Vercel pre-deployment setup complete!"
