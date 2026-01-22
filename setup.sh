#!/bin/bash

echo "🚀 Setting up Email Scheduler..."

# Start Docker services
echo "📦 Starting Docker services (PostgreSQL and Redis)..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Setup backend
echo "🔧 Setting up backend..."
cd backend
npm install

# Generate Prisma client
echo "📊 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

cd ..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend
npm install

cd ..

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy backend/.env.example to backend/.env and configure it"
echo "2. Copy frontend/.env.local.example to frontend/.env.local and add your Google OAuth credentials"
echo "3. Start backend: cd backend && npm run dev"
echo "4. Start frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Frontend will be available at http://localhost:3000"
echo "🔌 Backend API will be available at http://localhost:3001"
