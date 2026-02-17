import { Image, ImageSourcePropType } from 'react-native';

// Helper function to resolve image sources, handling both local requires and URIs.
// This was added to app/login/company.tsx and is now needed in admin.tsx.
const resolveImageSource = (source: ImageSourcePropType): ImageSourcePropType => {
  return source;
};

// ... rest of your AdminLoginScreen component
