# PowerShell setup script for Windows

Write-Host "🚀 Setting up Email Scheduler..." -ForegroundColor Cyan

# Start Docker services
Write-Host "📦 Starting Docker services (PostgreSQL and Redis)..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Setup backend
Write-Host "🔧 Setting up backend..." -ForegroundColor Yellow
Set-Location backend
npm install

# Generate Prisma client
Write-Host "📊 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

Set-Location ..

# Setup frontend
Write-Host "🎨 Setting up frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install

Set-Location ..

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy backend\.env.example to backend\.env and configure it"
Write-Host "2. Copy frontend\.env.local.example to frontend\.env.local and add your Google OAuth credentials"
Write-Host "3. Start backend: cd backend && npm run dev"
Write-Host "4. Start frontend: cd frontend && npm run dev"
Write-Host ""
Write-Host "🌐 Frontend will be available at http://localhost:3000" -ForegroundColor Green
Write-Host "🔌 Backend API will be available at http://localhost:3001" -ForegroundColor Green
