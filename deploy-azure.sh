#!/bin/bash

# Azure Deployment Script for EasyHMS Web App

echo "🚀 Starting Azure deployment..."

# Build the application
echo "📦 Building application..."
npm run build:prod

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Copy web.config to dist folder (in case it's not copied automatically)
echo "📋 Copying web.config..."
cp public/web.config dist/

# Copy _redirects to dist folder
echo "📋 Copying _redirects..."
cp public/_redirects dist/

echo "🎉 Deployment package ready!"
echo "📁 Files in dist folder:"
ls -la dist/

echo ""
echo "📝 Next steps:"
echo "1. Upload the contents of the 'dist' folder to your Azure App Service"
echo "2. Make sure your Azure App Service is configured for Node.js"
echo "3. Set the following Application Settings in Azure:"
echo "   - WEBSITE_NODE_DEFAULT_VERSION: 18.x"
echo "   - SCM_DO_BUILD_DURING_DEPLOYMENT: false"
echo "   - WEBSITE_RUN_FROM_PACKAGE: 1"
echo ""
echo "🔗 Your app should be accessible at:"
echo "https://easyhmsweb-b6brgshrgqdtc9ep.centralindia-01.azurewebsites.net"

