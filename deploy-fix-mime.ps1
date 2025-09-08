# PowerShell script to fix MIME type issues in Azure Static Web Apps deployment

Write-Host "🔧 Fixing MIME type issues for Azure Static Web Apps..." -ForegroundColor Green

# Clean previous build
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the project
Write-Host "🏗️ Building project..." -ForegroundColor Yellow
npm run build

# Verify build output
Write-Host "✅ Verifying build output..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    # Check if _headers file exists in dist
    if (Test-Path "dist/_headers") {
        Write-Host "✅ _headers file found in dist" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Copying _headers file to dist..." -ForegroundColor Yellow
        Copy-Item "public/_headers" "dist/_headers"
    }
    
    # Check if _redirects file exists in dist
    if (Test-Path "dist/_redirects") {
        Write-Host "✅ _redirects file found in dist" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Copying _redirects file to dist..." -ForegroundColor Yellow
        Copy-Item "public/_redirects" "dist/_redirects"
    }
    
    # List CSS files in assets
    $cssFiles = Get-ChildItem -Path "dist/assets" -Filter "*.css" -Recurse
    if ($cssFiles.Count -gt 0) {
        Write-Host "✅ Found $($cssFiles.Count) CSS files in dist/assets:" -ForegroundColor Green
        foreach ($file in $cssFiles) {
            Write-Host "   - $($file.Name)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️ No CSS files found in dist/assets" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Ready for deployment!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Deploy to Azure Static Web Apps" -ForegroundColor White
Write-Host "   2. Verify CSS files are served with correct MIME type" -ForegroundColor White
Write-Host "   3. Check browser console for any remaining errors" -ForegroundColor White
