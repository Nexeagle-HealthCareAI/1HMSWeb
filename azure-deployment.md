# Azure Deployment Guide for EasyHMS Web App

## 🚀 Quick Fix for Routing Issues

If you're experiencing routing issues in Azure (like `/user-onboarding` not working), follow these steps:

### 1. **Immediate Fix - Azure Portal Configuration**

1. Go to your Azure App Service in the Azure Portal
2. Navigate to **Configuration** → **Application settings**
3. Add these settings:

```
WEBSITE_NODE_DEFAULT_VERSION = 18.x
SCM_DO_BUILD_DURING_DEPLOYMENT = false
WEBSITE_RUN_FROM_PACKAGE = 1
```

### 2. **Verify web.config is Deployed**

Make sure your `web.config` file is in the root of your deployed application. It should contain:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

### 3. **Alternative: Use Azure Static Web Apps**

If the above doesn't work, consider migrating to Azure Static Web Apps which handles SPA routing automatically.

## 🔧 Troubleshooting Steps

### **Issue: Direct URL access returns 404**

**Symptoms:**
- `https://easyhmsweb-b6brgshrgqdtc9ep.centralindia-01.azurewebsites.net/user-onboarding` returns 404
- `http://localhost:3000/user-onboarding` works fine

**Solutions:**

1. **Check if web.config is deployed:**
   ```bash
   # In Azure App Service Kudu console
   dir
   # Should show web.config in the list
   ```

2. **Verify URL Rewrite module is installed:**
   - Go to Azure Portal → App Service → Extensions
   - Install "URL Rewrite" if not present

3. **Test with a simple route:**
   - Try accessing `/login` directly
   - If that works, the issue is specific to `/user-onboarding`

### **Issue: Build fails in Azure**

**Solutions:**

1. **Use local build:**
   ```bash
   npm run build:prod
   # Upload the dist folder contents to Azure
   ```

2. **Set build configuration:**
   ```
   SCM_DO_BUILD_DURING_DEPLOYMENT = false
   ```

### **Issue: Assets not loading**

**Solutions:**

1. **Check base path in vite.config.ts:**
   ```typescript
   base: '/',
   ```

2. **Verify all assets are in dist folder:**
   ```bash
   ls -la dist/
   ```

## 📋 Deployment Checklist

- [ ] `web.config` is in the root of deployed files
- [ ] `_redirects` file is present (backup)
- [ ] All static assets are in `dist/` folder
- [ ] Azure App Service is configured for Node.js
- [ ] URL Rewrite module is installed
- [ ] Application settings are configured correctly

## 🎯 Testing Routes

After deployment, test these routes:

1. **Home route:** `https://your-app.azurewebsites.net/`
2. **Login route:** `https://your-app.azurewebsites.net/login`
3. **User onboarding:** `https://your-app.azurewebsites.net/user-onboarding`
4. **Admin dashboard:** `https://your-app.azurewebsites.net/admin`
5. **Doctor dashboard:** `https://your-app.azurewebsites.net/dashboard`

## 📞 Support

If issues persist:

1. Check Azure App Service logs in the portal
2. Use Kudu console for debugging
3. Verify all files are properly deployed
4. Test with a minimal React app first

## 🔄 Alternative Deployment Methods

### **Option 1: Azure Static Web Apps**
```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./dist
```

### **Option 2: Azure Storage with CDN**
- Upload to Azure Blob Storage
- Configure static website hosting
- Use Azure CDN for better performance

### **Option 3: GitHub Actions**
```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:prod
      - uses: azure/webapps-deploy@v2
        with:
          app-name: 'your-app-name'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./dist
```

