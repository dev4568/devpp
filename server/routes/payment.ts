import { RequestHandler } from "express";
import crypto from "crypto";

// In production, these should come from environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_your_key_here";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "your_secret_here";

interface CreateOrderRequest {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

interface VerifyPaymentRequest {
  paymentId: string;
  orderId: string;
  signature: string;
}

// Create Razorpay order
export const createOrder: RequestHandler = async (req, res) => {
  try {
    const { amount, currency, receipt, notes }: CreateOrderRequest = req.body;

    // Validate required fields
    if (!amount || !currency || !receipt) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: amount, currency, receipt"
      });
    }

    // Validate amount (should be positive integer in paise)
    if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      return res.status(400).json({
        success: false,
        error: "Amount should be a positive integer in paise"
      });
    }

    // Validate currency
    if (currency !== 'INR') {
      return res.status(400).json({
        success: false,
        error: "Only INR currency is supported"
      });
    }

    // In a real application, you would use the Razorpay SDK
    // For now, we'll simulate the order creation
    
    // Mock Razorpay order response
    const order = {
      id: `order_${crypto.randomBytes(16).toString('hex')}`,
      entity: "order",
      amount: amount,
      amount_paid: 0,
      amount_due: amount,
      currency: currency,
      receipt: receipt,
      offer_id: null,
      status: "created",
      attempts: 0,
      notes: notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };

    // Store order details in database/storage (for demo, we'll use in-memory)
    // In production, store this in your database
    console.log('Created Razorpay order:', order);

    res.json({
      success: true,
      ...order
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      error: "Failed to create payment order"
    });
  }
};

// Verify Razorpay payment
export const verifyPayment: RequestHandler = async (req, res) => {
  try {
    const { paymentId, orderId, signature }: VerifyPaymentRequest = req.body;

    // Validate required fields
    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: paymentId, orderId, signature"
      });
    }

    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isSignatureValid = expectedSignature === signature;

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment signature"
      });
    }

    // In a real application, you would:
    // 1. Fetch the order details from your database
    // 2. Update the order status to 'paid'
    // 3. Trigger any post-payment workflows (email notifications, etc.)

    console.log('Payment verified successfully:', {
      paymentId,
      orderId,
      signature,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId,
      orderId
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: "Failed to verify payment"
    });
  }
};

// Get payment status
export const getPaymentStatus: RequestHandler = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: "Payment ID is required"
      });
    }

    // In a real application, you would fetch this from Razorpay API
    // For demo, we'll return a mock status
    const paymentStatus = {
      id: paymentId,
      entity: "payment",
      amount: 50000, // Example amount in paise
      currency: "INR",
      status: "captured",
      method: "card",
      description: "UDIN Document Processing",
      captured: true,
      email: "customer@example.com",
      contact: "+919999999999",
      created_at: Math.floor(Date.now() / 1000)
    };

    res.json({
      success: true,
      payment: paymentStatus
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment status"
    });
  }
};

// Webhook handler for Razorpay events
export const handleWebhook: RequestHandler = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        error: "Invalid webhook signature"
      });
    }

    const event = req.body;

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        console.log('Payment captured:', event.payload.payment.entity);
        // Handle successful payment
        break;
      
      case 'payment.failed':
        console.log('Payment failed:', event.payload.payment.entity);
        // Handle failed payment
        break;

      case 'order.paid':
        console.log('Order paid:', event.payload.order.entity);
        // Handle order completion
        break;

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: "Webhook processing failed"
    });
  }
};

// Get Razorpay configuration for frontend
export const getConfig: RequestHandler = async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        keyId: RAZORPAY_KEY_ID,
        currency: 'INR',
        companyName: 'UDIN Professional Services',
        companyLogo: '/logo.png', // Add your logo URL
        theme: {
          color: '#8B5CF6' // Primary color
        }
      }
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      error: "Failed to get configuration"
    });
  }
};
