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
import { PricingCalculator, DOCUMENT_TYPES } from "@shared/pricing";

interface PaymentDetails {
  documentTypeId: string;
  tier: string;
  quantity: number;
}

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null,
  );
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Get payment details from temporary storage (UDIN flow)
    const tempCostData = localStorage.getItem("udin_temp_cost");

    if (tempCostData) {
      const costData = JSON.parse(tempCostData);
      // Use the first document for demo (in real app, handle multiple documents)
      const firstDoc = costData.files[0];
      if (firstDoc) {
        setPaymentDetails({
          documentTypeId: firstDoc.documentTypeId,
          tier: firstDoc.tier,
          quantity: 1,
        });
        return;
      }
    }

    // Fallback to URL params if no temp data
    const documentId = searchParams.get("document") || "cert-net-worth";
    const tier = searchParams.get("tier") || "Standard";
    const quantity = parseInt(searchParams.get("quantity") || "1");

    setPaymentDetails({
      documentTypeId: documentId,
      tier,
      quantity,
    });
  }, [searchParams]);

  const calculateOrderTotal = () => {
    if (!paymentDetails) {
      return {
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        breakdown: [],
      };
    }

    return PricingCalculator.calculateOrderTotal([paymentDetails]);
  };

  const orderTotal = calculateOrderTotal();
  const documentType = DOCUMENT_TYPES.find(
    (dt) => dt.id === paymentDetails?.documentTypeId,
  );

  const handlePayNow = async () => {
    setProcessing(true);
    setError("");

    try {
      // Simulate Razorpay payment processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Save Payment Detailed Information to database (localStorage for demo)
      const userData = JSON.parse(
        localStorage.getItem("udin_user_data") || "{}",
      );
      const paymentData = {
        paymentId: `PAY_${Date.now()}`,
        userId: userData.userId,
        amount: orderTotal.totalAmount,
        breakdown: orderTotal,
        documentDetails: paymentDetails,
        paymentMethod: "razorpay",
        status: "completed",
        timestamp: new Date().toISOString(),
        transactionId: `TXN_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Save to localStorage (in real app, this would be API call)
      localStorage.setItem("udin_payment_data", JSON.stringify(paymentData));

      // Payment Confirmation to Email & Mobile (simulation)
      const confirmationMessage = `UDIN Payment Confirmed! Amount: ₹${orderTotal.totalAmount.toFixed(2)}, Transaction ID: ${paymentData.transactionId}. Your documents are being processed.`;
      console.log(
        "Payment confirmation sent via SMS/Email:",
        confirmationMessage,
      );

      setProcessing(false);
      setShowSuccessDialog(true);

      // Auto-redirect after success
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setProcessing(false);
      setError("Payment failed. Please try again.");
    }
  };

  if (!paymentDetails || !documentType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-4">
            Invalid payment details. Please start from the upload page.
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
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {documentType.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {documentType.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {paymentDetails.tier}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Qty: {paymentDetails.quantity}
                      </Badge>
                      {documentType.udinRequired && (
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
                    <div className="font-medium">
                      ₹{orderTotal.breakdown[0]?.totalPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      ₹{orderTotal.breakdown[0]?.unitPrice.toFixed(2)} per
                      document
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    ₹{orderTotal.subtotal.toFixed(2)}
                  </span>
                </div>
                {orderTotal.bulkDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Bulk Discount</span>
                    <span>-₹{orderTotal.bulkDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (18%)</span>
                  <span className="font-medium">
                    ₹{orderTotal.gstAmount.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Total Amount
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{orderTotal.totalAmount.toFixed(2)}
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
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
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
                    // Fallback if image doesn't load
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
                disabled={processing}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-6 text-lg"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <IndianRupee className="h-5 w-5 mr-2" />
                    Pay ₹{orderTotal.totalAmount.toFixed(2)} Now
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
              ₹{orderTotal.totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Transaction completed
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
