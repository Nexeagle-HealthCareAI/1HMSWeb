# Shared Components

This folder contains shared components that are used across multiple features of the application.

## Components

### NotFoundPage

A beautiful and user-friendly 404 error page that handles cases when users access non-existent routes or routes they don't have access to.

**Features:**
- **Smart Authentication Detection**: Automatically shows different actions based on user authentication status
- **Login Redirect**: For unauthenticated users, provides a prominent "Go to Login" button
- **Dashboard Redirect**: For authenticated users, provides a "Go to Dashboard" button
- **Modern Design**: Beautiful gradient background, animations, and responsive layout
- **Help Section**: Includes contact information and support details
- **Navigation Options**: Multiple ways to navigate back (Go Back, Quick Links)

**Usage:**
- Automatically displayed for any route that doesn't exist (`path="*"`)
- Can be accessed directly at `/404`
- Handles both authenticated and unauthenticated users appropriately

**Design Elements:**
- Animated 404 number with gradient text
- Bouncing alert triangle icon
- Search icon for visual appeal
- Gradient buttons with hover effects
- Help section with contact information
- Quick navigation links

**Behavior:**
- **Unauthenticated Users**: See "Go to Login" button that navigates to `/`
- **Authenticated Users**: See "Go to Dashboard" button that navigates to `/dashboard`
- **All Users**: Can use "Go Back" button to return to previous page
- **All Users**: Can access quick links for Home, Help Center, and Contact

### Other Shared Components

- **SharedMobileVerification**: Reusable mobile verification component used in registration and forgot password flows
