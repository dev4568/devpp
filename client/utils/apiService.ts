import Swal from "sweetalert2";

// API Response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API Request options
interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  showLoading?: boolean;
  showSuccess?: boolean;
  showError?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

class ApiService {
  private baseURL: string;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(baseURL: string = "") {
    this.baseURL = baseURL;
  }

  /**
   * Generic API call method with comprehensive error handling
   */
  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.defaultTimeout,
      showLoading = false,
      showSuccess = false,
      showError = true,
      successMessage,
      errorMessage,
    } = options;

    let loadingSwal: any = null;

    try {
      // Show loading if requested
      if (showLoading) {
        loadingSwal = Swal.fire({
          title: "Please wait...",
          text: "Processing your request",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
      }

      // Setup abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Prepare request options
      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        signal: controller.signal,
      };

      // Add body for non-GET requests
      if (body && method !== "GET") {
        fetchOptions.body = JSON.stringify(body);
      }

      // Make the API call
      const response = await fetch(`${this.baseURL}${endpoint}`, fetchOptions);
      clearTimeout(timeoutId);

      // Close loading if it was shown
      if (loadingSwal) {
        Swal.close();
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      let responseData: any;

      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Handle successful response
      if (response.ok) {
        const result: ApiResponse<T> = {
          success: true,
          data: responseData,
          message: responseData.message || "Request successful",
        };

        // Show success notification if requested
        if (showSuccess) {
          Swal.fire({
            icon: "success",
            title: "Success!",
            text: successMessage || result.message,
            timer: 3000,
            showConfirmButton: false,
          });
        }

        return result;
      } else {
        // Handle HTTP errors
        throw new Error(
          responseData.error ||
            responseData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      // Close loading if it was shown
      if (loadingSwal) {
        Swal.close();
      }

      console.error("API Error:", error);

      let finalErrorMessage = errorMessage;

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          finalErrorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("Failed to fetch")) {
          finalErrorMessage = "Network error. Please check your connection.";
        } else {
          finalErrorMessage = finalErrorMessage || error.message;
        }
      } else {
        finalErrorMessage = finalErrorMessage || "An unexpected error occurred";
      }

      // Show error notification if requested
      if (showError) {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: finalErrorMessage,
          confirmButtonText: "OK",
        });
      }

      return {
        success: false,
        error: finalErrorMessage,
      };
    }
  }

  /**
   * Convenience methods for different HTTP verbs
   */
  async get<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, "method"> = {},
  ) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, "method" | "body"> = {},
  ) {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, "method" | "body"> = {},
  ) {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async delete<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, "method"> = {},
  ) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, "method" | "body"> = {},
  ) {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export specific API methods that can be easily replaced
export const paymentAPI = {
  createOrder: async (orderData: any) => {
    return apiService.post("/api/payment/create-order", orderData, {
      showLoading: true,
      showError: true,
      errorMessage: "Failed to create payment order",
    });
  },

  verifyPayment: async (paymentData: any) => {
    return apiService.post("/api/payment/verify", paymentData, {
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "Payment verified successfully!",
      errorMessage: "Payment verification failed",
    });
  },

  getPaymentStatus: async (paymentId: string) => {
    return apiService.get(`/api/payment/status/${paymentId}`, {
      showError: true,
      errorMessage: "Failed to get payment status",
    });
  },

  getConfig: async () => {
    return apiService.get("/api/payment/config", {
      showError: false, // Don't show error for config calls
    });
  },
};

export const documentsAPI = {
  uploadDocuments: async (formData: FormData) => {
    return apiService.request("/api/documents/upload", {
      method: "POST",
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "Documents uploaded successfully!",
      errorMessage: "Failed to upload documents",
    });
  },

  getDocuments: async () => {
    return apiService.get("/api/documents", {
      showError: true,
      errorMessage: "Failed to load documents",
    });
  },

  deleteDocument: async (documentId: string) => {
    return apiService.delete(`/api/documents/${documentId}`, {
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "Document deleted successfully!",
      errorMessage: "Failed to delete document",
    });
  },

  updateDocument: async (documentId: string, updates: any) => {
    return apiService.put(`/api/documents/${documentId}`, updates, {
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "Document updated successfully!",
      errorMessage: "Failed to update document",
    });
  },
};

export const userAPI = {
  login: async (credentials: any) => {
    return apiService.post("/api/auth/login", credentials, {
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "Login successful!",
      errorMessage: "Login failed",
    });
  },

  signup: async (userData: any) => {
    return apiService.post("/api/auth/signup", userData, {
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "Account created successfully!",
      errorMessage: "Signup failed",
    });
  },

  verifyOTP: async (otpData: any) => {
    return apiService.post("/api/auth/verify-otp", otpData, {
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "OTP verified successfully!",
      errorMessage: "OTP verification failed",
    });
  },

  getUserProfile: async () => {
    return apiService.get("/api/user/profile", {
      showError: true,
      errorMessage: "Failed to load profile",
    });
  },

  updateProfile: async (profileData: any) => {
    return apiService.put("/api/user/profile", profileData, {
      showLoading: true,
      showSuccess: true,
      showError: true,
      successMessage: "Profile updated successfully!",
      errorMessage: "Failed to update profile",
    });
  },
};

// Utility functions for common alert patterns
export const alertUtils = {
  success: (message: string, title: string = "Success!") => {
    Swal.fire({
      icon: "success",
      title,
      text: message,
      timer: 3000,
      showConfirmButton: false,
    });
  },

  error: (message: string, title: string = "Error!") => {
    Swal.fire({
      icon: "error",
      title,
      text: message,
      confirmButtonText: "OK",
    });
  },

  warning: (message: string, title: string = "Warning!") => {
    Swal.fire({
      icon: "warning",
      title,
      text: message,
      confirmButtonText: "OK",
    });
  },

  info: (message: string, title: string = "Information") => {
    Swal.fire({
      icon: "info",
      title,
      text: message,
      confirmButtonText: "OK",
    });
  },

  confirm: async (
    message: string,
    title: string = "Are you sure?",
    confirmText: string = "Yes",
    cancelText: string = "Cancel",
  ): Promise<boolean> => {
    const result = await Swal.fire({
      icon: "question",
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: "#8B5CF6",
      cancelButtonColor: "#64748B",
    });

    return result.isConfirmed;
  },

  loading: (message: string = "Please wait...") => {
    return Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  close: () => {
    Swal.close();
  },
};

export default apiService;
