# API Configuration Guide

This file explains how to easily replace API endpoints in the application.

## Quick Endpoint Replacement

All API calls are centralized in `client/utils/apiService.ts`. To replace endpoints:

### 1. Payment APIs

Replace these endpoints in the `paymentAPI` object:

```typescript
export const paymentAPI = {
  createOrder: async (orderData: any) => {
    return apiService.post("/api/payment/create-order", orderData, {
      // Replace '/api/payment/create-order' with your endpoint
    });
  },

  verifyPayment: async (paymentData: any) => {
    return apiService.post("/api/payment/verify", paymentData, {
      // Replace '/api/payment/verify' with your endpoint
    });
  },

  // Add more endpoints as needed...
};
```

### 2. Document APIs

Replace these endpoints in the `documentsAPI` object:

```typescript
export const documentsAPI = {
  uploadDocuments: async (formData: FormData) => {
    return apiService.request("/api/documents/upload", {
      // Replace '/api/documents/upload' with your endpoint
    });
  },

  getDocuments: async () => {
    return apiService.get("/api/documents", {
      // Replace '/api/documents' with your endpoint
    });
  },

  // Add more endpoints as needed...
};
```

### 3. User APIs

Replace these endpoints in the `userAPI` object:

```typescript
export const userAPI = {
  login: async (credentials: any) => {
    return apiService.post("/api/auth/login", credentials, {
      // Replace '/api/auth/login' with your endpoint
    });
  },

  signup: async (userData: any) => {
    return apiService.post("/api/auth/signup", userData, {
      // Replace '/api/auth/signup' with your endpoint
    });
  },

  // Add more endpoints as needed...
};
```

## API Service Configuration

### Base URL

Change the base URL in the ApiService constructor:

```typescript
// In apiService.ts
const apiService = new ApiService("https://your-api-domain.com");
```

### Default Options

Modify default behavior in each API call:

```typescript
return apiService.post("/your-endpoint", data, {
  showLoading: true, // Show loading spinner
  showSuccess: true, // Show success message
  showError: true, // Show error message
  successMessage: "Custom success message",
  errorMessage: "Custom error message",
  timeout: 30000, // Request timeout in ms
});
```

## Error Handling

All API calls automatically handle:

- Network errors
- Timeout errors
- HTTP status errors
- Loading states
- Success/error notifications via SweetAlert2

## Custom API Calls

For new endpoints, use the base apiService:

```typescript
// GET request
const result = await apiService.get("/your-endpoint", {
  showError: true,
});

// POST request
const result = await apiService.post("/your-endpoint", data, {
  showLoading: true,
  showSuccess: true,
});

// Custom request
const result = await apiService.request("/your-endpoint", {
  method: "PATCH",
  body: data,
  headers: { "Custom-Header": "value" },
  showLoading: true,
});
```

## Response Format

All API responses follow this format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

Your backend should return responses in this format for best compatibility.

## Environment Variables

For production, set these environment variables on your server:

```bash
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

## Testing

Visit `/demo` to test SweetAlert2 functionality and API error handling.
