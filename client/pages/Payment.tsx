import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle,
  Loader2,
  IndianRupee,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { DOCUMENT_TYPES } from "@shared/pricing";
import { useDocuments } from "@/contexts/DocumentsContext";
import { usePricing } from "@/contexts/PricingContext";
import { usePayment } from "@/contexts/PaymentContext";

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  const { state: documentsState, actions: documentsActions } = useDocuments();
  const { state: pricingState, actions: pricingActions } = usePricing();
  const { state: paymentState, actions: paymentActions } = usePayment();

  // Initialize customer info once
  useEffect(() => {
    const userData = localStorage.getItem("udin_user_data");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCustomerInfo(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Initialize payment flow only when we have customer info and haven't already initialized
  useEffect(() => {
    if (!customerInfo || paymentState.currentPayment) {
      return; // Don't initialize if no customer info or already initialized
    }

    const initializePaymentFlow = async () => {
      try {
        const validFiles = documentsActions.getValidFiles();

        if (validFiles.length > 0) {
          // Update pricing calculation
          pricingActions.updateOrderFromFiles(validFiles);

          // Get the latest calculation
          const calculation = pricingActions.calculateFromFiles(validFiles);

          // Create order items for payment
          const orderItems = validFiles.map(file => ({
            documentTypeId: file.documentTypeId,
            tier: file.tier,
            quantity: 1,
            fileName: file.name,
            fileId: file.id,
          }));

          // Initialize payment with the customer info
          if (calculation.totalAmount > 0 && orderItems.length > 0) {
            await paymentActions.initializePayment(orderItems, calculation, customerInfo);
          }
        } else {
          // Fallback: try to get payment details from URL params or localStorage
          handleFallbackPaymentInitialization();
        }
      } catch (error) {
        console.error('Error in payment initialization:', error);
      }
    };

    initializePaymentFlow();
  }, [customerInfo]); // Only depend on customerInfo

  const handleFallbackPaymentInitialization = async () => {
    // Check for temp cost data
    const tempCostData = localStorage.getItem("udin_temp_cost");
    
    if (tempCostData) {
      try {
        const costData = JSON.parse(tempCostData);
        // This is simplified - in real implementation, you'd reconstruct the order items
        console.log('Using temp cost data:', costData);
      } catch (error) {
        console.error('Error parsing temp cost data:', error);
      }
      return;
    }

    // Fallback to URL params
    const documentId = searchParams.get("document") || "cert-net-worth";
    const tier = searchParams.get("tier") || "Standard";
    const quantity = parseInt(searchParams.get("quantity") || "1");

    const orderItems = [{
      documentTypeId: documentId,
      tier,
      quantity,
    }];

    const calculation = pricingActions.calculateFromFiles([{
      id: 'temp',
      name: 'Fallback Document',
      size: 0,
      type: 'application/pdf',
      status: 'completed' as const,
      progress: 100,
      documentTypeId: documentId,
      tier,
      file: new File([], 'temp.pdf'),
    }]);

    if (calculation.totalAmount > 0) {
      await paymentActions.initializePayment(orderItems, calculation, customerInfo);
    }
  };

  const handlePayNow = async () => {
    try {
      const result = await paymentActions.processRazorpayPayment();
      
      if (result.success) {
        // Save payment data
        paymentActions.savePaymentData(result);
        
        // Show success dialog
        setShowSuccessDialog(true);
        
        // Auto-redirect after success
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } else {
        console.error('Payment failed:', result.error);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
    }
  };

  // Get current calculation and order summary
  const calculation = pricingState.calculation;
  const orderSummary = pricingActions.getOrderSummary();
  const validFiles = documentsActions.getValidFiles();

  // Show loading if no payment is initialized or files are loading
  if (!paymentState.currentPayment || documentsState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg text-muted-foreground mb-4">
            Preparing your payment...
          </p>
          <p className="text-sm text-gray-500">
            Please wait while we set up your order
          </p>
        </div>
      </div>
    );
  }

  // Show error if no valid order
  if (!orderSummary.hasValidOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-4">
            No valid order found. Please start from the upload page.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go to Upload
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="hidden sm:block w-px h-6 bg-gray-300" />
            <h1 className="hidden sm:block text-lg font-semibold text-gray-900">
              Complete UDIN Payment
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">Secured by Razorpay</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Payment Summary Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-6 bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
              <div className="mx-auto mb-4 p-3 rounded-full bg-white/20">
                <IndianRupee className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Payment Summary
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* Order Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Order Details</h3>
                  <Badge variant="outline">
                    {orderSummary.totalDocuments} document{orderSummary.totalDocuments > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {validFiles.map((file) => {
                  const docType = DOCUMENT_TYPES.find(dt => dt.id === file.documentTypeId);
                  return (
                    <div key={file.id} className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {docType?.name}
                        </h4>
                        <p className="text-xs text-gray-600">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {file.tier}
                          </Badge>
                          {docType?.udinRequired && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 text-green-700"
                            >
                              UDIN Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          ₹{docType ? (docType.basePrice * (file.tier === 'Express' ? 1.5 : file.tier === 'Premium' ? 2.0 : 1.0)).toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    ₹{calculation.subtotal.toFixed(2)}
                  </span>
                </div>
                {calculation.bulkDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Bulk Discount (5+ documents)</span>
                    <span>-₹{calculation.bulkDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (18%)</span>
                  <span className="font-medium">
                    ₹{calculation.gstAmount.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Total Amount
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{calculation.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      (Including all taxes)
                    </div>
                  </div>
                </div>
              </div>

              {/* What's Included */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-3">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-semibold text-sm">
                    What's included:
                  </span>
                </div>
                <ul className="text-xs text-green-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Professional CA document processing with UDIN
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Digital signatures and legal validation
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Secure document storage for 12 months
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Expert CA consultation support
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Compliance certificate download
                  </li>
                </ul>
              </div>

              {/* Error Alert */}
              {paymentState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{paymentState.error}</AlertDescription>
                </Alert>
              )}

              {/* Razorpay Logo */}
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">Powered by</div>
                <img
                  src="https://razorpay.com/assets/razorpay-logo.svg"
                  alt="Razorpay"
                  className="h-8 mx-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="text-lg font-semibold text-primary">Razorpay</div>
                    `;
                  }}
                />
              </div>

              {/* Pay Now Button */}
              <Button
                onClick={handlePayNow}
                disabled={paymentState.isProcessing}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-6 text-lg"
                size="lg"
              >
                {paymentState.isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <IndianRupee className="h-5 w-5 mr-2" />
                    Pay ₹{calculation.totalAmount.toFixed(2)} Now
                  </>
                )}
              </Button>

              {/* Security & Trust */}
              <div className="text-center space-y-3">
                <div className="flex justify-center items-center gap-3">
                  <Badge variant="outline" className="text-xs bg-white">
                    <Shield className="h-3 w-3 mr-1" />
                    256-bit SSL
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-white">
                    PCI DSS Compliant
                  </Badge>
                </div>

                <div className="flex justify-center items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    Visa
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Mastercard
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    RuPay
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    UPI
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Net Banking
                  </Badge>
                </div>
              </div>

              {/* Terms */}
              <div className="text-center">
                <p className="text-xs text-gray-500 leading-relaxed">
                  By completing this payment, you agree to our{" "}
                  <a href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  . Amount charged is inclusive of applicable taxes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Payment Successful
            </DialogTitle>
            <DialogDescription>
              Your payment has been processed successfully. You will be
              redirected to your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-green-600">
              ₹{calculation.totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Transaction completed
            </div>
            {paymentState.lastPaymentResult?.paymentId && (
              <div className="text-xs text-gray-400 mt-2">
                Payment ID: {paymentState.lastPaymentResult.paymentId}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
