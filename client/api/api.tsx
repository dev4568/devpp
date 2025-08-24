//@ts-nocheck
// src/api/udin.ts
import axios from "axios";

export type SignupForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  pin: string;
  agreeToTerms: boolean;
};

const API_URL = "http://localhost:5000"; // Replace with your actual API URL

// Helper function to handle API calls with axios
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Send OTP to email
 */
export async function sendEmailOtp(email: string) {
  try {
    const response = await axiosInstance.post("/api/auth/send-otp", { email });
    return response.data;
  } catch (error) {
    throw new Error("Failed to send email OTP");
  }
}

/**
 * Send OTP to phone
 */
export async function sendPhoneOtp(phone: string) {
  try {
    const response = await axiosInstance.post("/send-phone-otp", { phone });
    return response.data;
  } catch (error) {
    throw new Error("Failed to send phone OTP");
  }
}

/**
 * Verify email OTP
 */
export async function verifyEmailOtp(email: string, otp: string) {
  try {
    const response = await axiosInstance.post("/api/auth/verify-email", {
      email,
      otp,
    });
    return response.data;
  } catch (error) {
    throw new Error("Invalid email OTP");
  }
}

/**
 * Verify phone OTP
 */
export async function verifyPhoneOtp(phone: string, otp: string) {
  try {
    const response = await axiosInstance.post("/verify-phone-otp", {
      phone,
      otp,
    });
    return response.data;
  } catch (error) {
    throw new Error("Invalid phone OTP");
  }
}

/**
 * Create new account
 */
export async function createAccount(formData: SignupForm) {
  try {
    const response = await axiosInstance.post("/api/auth/register", formData);
    return response.data;
  } catch (error) {
    throw new Error("Failed to create account");
  }
}

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to log in");
  }
};

// API Call for Forgot Password (send reset email)
export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/forgot-password`, { email });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to send password reset link",
    );
  }
};

// Updated file upload function that handles IndexedDB files and additional data
export const uploadFilesToServer = async (
  files: Array<{
    id: string;
    name: string;
    file: File | Blob;
    [key: string]: any;
  }>,
  userId: string,
  customerInfo?: any,
  pricingSnapshot?: any,
  metadata?: any,
  onProgress?: (progress: number) => void,
) => {
  try {
    const formData = new FormData();

    // Add files to form data
    files.forEach((fileItem) => {
      // Convert Blob to File if needed
      const file =
        fileItem.file instanceof File
          ? fileItem.file
          : new File([fileItem.file], fileItem.name, {
              type: fileItem.file.type || "application/octet-stream",
            });

      formData.append("files", file);
    });

    // Add additional data
    if (userId) formData.append("userId", userId);
    if (customerInfo)
      formData.append("customerInfo", JSON.stringify(customerInfo));
    if (pricingSnapshot)
      formData.append("pricingSnapshot", JSON.stringify(pricingSnapshot));
    if (metadata) formData.append("metadata", JSON.stringify(metadata));

    const response = await axios.post(
      `${API_URL}/api/uploads/files`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(percentCompleted);
          }
        },
      },
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || error.message || "File upload failed",
    );
  }
};

// Function to get files from IndexedDB and convert them to uploadable format
export const getFilesFromIndexedDB = async (): Promise<
  Array<{
    id: string;
    name: string;
    file: Blob;
    size?: number;
    type?: string;
    documentTypeId?: string;
    tier?: string;
  }>
> => {
  const DB_NAME = "udin_files_db";
  const STORE_NAME = "uploaded_files";

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve([]);
        return;
      }

      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const getAllRequest = store.getAll();

      getAllRequest.onerror = () => reject(getAllRequest.error);

      getAllRequest.onsuccess = () => {
        const files = getAllRequest.result || [];
        resolve(
          files.map((file: any) => ({
            id: file.id,
            name: file.name,
            file: file.file,
            size: file.size,
            type: file.type,
            documentTypeId: file.documentTypeId,
            tier: file.tier,
          })),
        );
      };
    };
  });
};

// Function to clear IndexedDB after successful upload
export const clearIndexedDBFiles = async (): Promise<void> => {
  const DB_NAME = "udin_files_db";
  const STORE_NAME = "uploaded_files";

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve();
        return;
      }

      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const clearRequest = store.clear();

      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    };
  });
};

// Get upload status
export const getUploadStatus = async (uploadId: string) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/uploads/status/${uploadId}`,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || "Failed to get upload status",
    );
  }
};

// Get user uploads
export const getUserUploads = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/api/uploads/user/${userId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || "Failed to get user uploads",
    );
  }
};
