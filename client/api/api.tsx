//@ts-nocheck
// src/api/udin.ts
import axios from 'axios';

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

const API_URL = 'http://localhost:5000'; // Replace with your actual API URL

// Helper function to handle API calls with axios
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Send OTP to email
 */
export async function sendEmailOtp(email: string) {
  try {
    const response = await axiosInstance.post('/api/auth/send-otp', { email });
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
    const response = await axiosInstance.post('/send-phone-otp', { phone });
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
    const response = await axiosInstance.post('/api/auth/verify-email', { email, otp });
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
    const response = await axiosInstance.post('/verify-phone-otp', { phone, otp });
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
    const response = await axiosInstance.post('/api/auth/register', formData);
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
    throw new Error(error.response?.data?.message || 'Failed to log in');
  }
};

// API Call for Forgot Password (send reset email)
export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/forgot-password`, { email });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to send password reset link');
  }
};


export const uploadFilesToServer  = async (files, userId, token) => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file.file);
    });

    const response = await axios.post(`${API_URL}/upload-files`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "Authorization": `Bearer ${token}`, // Include the token for authorization
        "User-ID": userId, // Include the user ID
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "File upload failed");
  }
};