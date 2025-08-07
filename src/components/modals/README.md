# Modals

This folder contains reusable modal components for the application.

## Structure

```
src/components/modals/
├── index.ts                    # Exports all modal components
├── README.md                   # This documentation file
└── PasswordResetSuccessModal.tsx # Password reset success modal
```

## Components

### PasswordResetSuccessModal

A modal that displays when password reset is successful.

**Props:**
- `onLogin: () => void` - Callback when user clicks "Login Now"
- `onResetAnother: () => void` - Callback when user clicks "Reset Another Password"

**Usage:**
```tsx
import { PasswordResetSuccessModal } from '@/components/modals';

<PasswordResetSuccessModal
  onLogin={() => handleLogin()}
  onResetAnother={() => handleResetAnother()}
/>
```

## Adding New Modals

1. Create a new modal component in this folder
2. Export it from `index.ts`
3. Add documentation here
4. Follow the naming convention: `[Purpose]Modal.tsx`

## Design Guidelines

- Use consistent styling with the existing modals
- Include proper TypeScript interfaces for props
- Ensure accessibility features (focus management, keyboard navigation)
- Use the same backdrop and z-index patterns
- Follow the established button styling patterns
