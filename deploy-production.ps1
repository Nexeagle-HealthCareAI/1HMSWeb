# Production Deployment Script for EasyHMS Web App
# Run this script before deploying to production

Write-Host "🚀 Starting production deployment preparation..." -ForegroundColor Green

# Step 1: Clean previous builds
Write-Host "📦 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
}

# Step 2: Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Build for production
Write-Host "🔨 Building for production..." -ForegroundColor Yellow
npm run build:prod

# Step 4: Copy web.config to dist
Write-Host "📋 Copying web.config..." -ForegroundColor Yellow
if (Test-Path "public\web.config") {
    Copy-Item "public\web.config" "dist\web.config"
    Write-Host "✅ web.config copied successfully" -ForegroundColor Green
} else {
    Write-Host "❌ web.config not found in public folder" -ForegroundColor Red
}

# Step 5: Verify build
Write-Host "🔍 Verifying build..." -ForegroundColor Yellow
if (Test-Path "dist\index.html") {
    Write-Host "✅ Production build completed successfully!" -ForegroundColor Green
    Write-Host "📁 Build files are ready in the 'dist' folder" -ForegroundColor Cyan
    Write-Host "🚀 Ready for deployment to Azure App Service" -ForegroundColor Cyan
} else {
    Write-Host "❌ Build failed - index.html not found" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment preparation completed!" -ForegroundColor Green
