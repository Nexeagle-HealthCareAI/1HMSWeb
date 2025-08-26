# Azure Deployment Script for EasyHMS Web Application
# This script ensures proper build and deployment to Azure

Write-Host "🚀 Starting Azure deployment process..." -ForegroundColor Green

# Step 1: Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✅ Previous dist folder removed" -ForegroundColor Green
}

if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "✅ Vite cache cleared" -ForegroundColor Green
}

# Step 2: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Step 3: Build for production
Write-Host "🔨 Building for production..." -ForegroundColor Yellow
npm run build:prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Production build completed" -ForegroundColor Green

# Step 4: Copy web.config to dist folder
Write-Host "📋 Copying web.config..." -ForegroundColor Yellow
if (Test-Path "web.config") {
    Copy-Item "web.config" "dist\web.config" -Force
    Write-Host "✅ web.config copied to dist folder" -ForegroundColor Green
} else {
    Write-Host "⚠️  web.config not found, skipping..." -ForegroundColor Yellow
}

# Step 5: Verify build output
Write-Host "🔍 Verifying build output..." -ForegroundColor Yellow
if (Test-Path "dist\index.html") {
    Write-Host "✅ index.html found" -ForegroundColor Green
} else {
    Write-Host "❌ index.html not found in dist folder" -ForegroundColor Red
    exit 1
}

# Check for React vendor chunk
$reactVendorFiles = Get-ChildItem "dist" -Filter "*react-vendor*" -Recurse
if ($reactVendorFiles.Count -gt 0) {
    Write-Host "✅ React vendor chunk found: $($reactVendorFiles[0].Name)" -ForegroundColor Green
} else {
    Write-Host "⚠️  React vendor chunk not found, this might cause loading issues" -ForegroundColor Yellow
}

# Step 6: Display build summary
Write-Host "📊 Build Summary:" -ForegroundColor Cyan
$distSize = (Get-ChildItem "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "   Total build size: $([math]::Round($distSize, 2)) MB" -ForegroundColor White
Write-Host "   Files in dist: $((Get-ChildItem "dist" -Recurse | Measure-Object).Count)" -ForegroundColor White

# Step 7: List main chunks
Write-Host "📁 Main chunks:" -ForegroundColor Cyan
Get-ChildItem "dist" -Filter "*.js" | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "   $($_.Name) - $size KB" -ForegroundColor White
}

Write-Host "🎉 Deployment package ready!" -ForegroundColor Green
Write-Host "📁 Dist folder location: $(Resolve-Path "dist")" -ForegroundColor Cyan
Write-Host "🚀 Ready to deploy to Azure!" -ForegroundColor Green

# Optional: Open dist folder in explorer
$openFolder = Read-Host "Would you like to open the dist folder? (y/n)"
if ($openFolder -eq "y" -or $openFolder -eq "Y") {
    Start-Process "explorer.exe" -ArgumentList "dist"
}
