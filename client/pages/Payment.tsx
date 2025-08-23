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
import { useDocuments } from "@/contexts/DocumentsContext";
import { usePricing } from "@/contexts/PricingContext";
import { usePayment } from "@/contexts/PaymentContext";

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFileUploadDialog, setShowFileUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Handle the payment and file upload flow
  const handlePayNow = async () => {
    try {
      // Simulating payment processing
      //const result = await paymentActions.processRazorpayPayment();
      if (true) {
        // Once payment is successful, show the success dialog
        setShowSuccessDialog(true);

        // Show file upload dialog and simulate file upload
        setShowFileUploadDialog(true);
        setTimeout(() => {
          // Simulate file upload process
          simulateFileUpload();
        }, 2000); // 2-second delay before starting the upload
      } else {
        console.error("Payment failed:", paymentState.error);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
    }
  };

  const simulateFileUpload = async () => {
    const files = documentsActions.getValidFiles(); // Fetch the files
    let progress = 0;

    for (let i = 0; i < files.length; i++) {
      // Simulate file upload progress
      while (progress < 100) {
        setUploadProgress(progress);
        progress += 10; // Update the progress
        await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate time delay for file upload
      }
    }

    // Once upload is complete, show success dialog and redirect to login
    setShowFileUploadDialog(false);
    setTimeout(() => {
      setShowSuccessDialog(true);
    }, 1000); // Show the success dialog after a short delay

    setTimeout(() => {
      navigate("/login"); // Redirect to login after success
    }, 4000); // 4 seconds delay before redirecting
  };

  // Get current calculation and order summary
  const calculation = pricingState.calculation;
  const orderSummary = pricingActions.getOrderSummary();
  const validFiles = documentsActions.getValidFiles();

  // Show loading if payment is processing or documents are loading
  if (paymentState.isProcessing || documentsState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg text-muted-foreground mb-4">
            {paymentState.isProcessing
              ? "Preparing your payment..."
              : "Loading your documents..."}
          </p>
          <p className="text-sm text-gray-500">Please wait while we set up your order</p>
        </div>
      </div>
    );
  }

  // Show error if payment initialization failed
  if (paymentState.error && !paymentState.currentPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-4">Payment Setup Failed</p>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{paymentState.error}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              Go to Upload
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
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

      {/* Payment Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Payment Summary Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-6 bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
              <div className="mx-auto mb-4 p-3 rounded-full bg-white/20">
                <IndianRupee className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Payment Summary</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* Order Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Order Details</h3>
                  <Badge variant="outline">
                    {orderSummary.totalDocuments} document
                    {orderSummary.totalDocuments > 1 ? "s" : ""}
                  </Badge>
                </div>
                {/* Display order details */}
                {validFiles.map((file) => (
                  <div key={file.id} className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{file.name}</h4>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">₹{file.price}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{calculation.subtotal}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{calculation.totalAmount}
                    </div>
                    <div className="text-sm text-gray-500">(Including all taxes)</div>
                  </div>
                </div>
              </div>

              {/* Pay Now Button */}
              <Button
                onClick={handlePayNow}
                disabled={paymentState.isProcessing}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-6 text-lg"
                size="lg"
              >
                {paymentState.isProcessing ? (
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <IndianRupee className="h-5 w-5 mr-2" />
                )}
                Pay ₹{calculation.totalAmount} Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* File Upload Progress Dialog */}
      <Dialog open={showFileUploadDialog} onOpenChange={setShowFileUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploading Files...</DialogTitle>
          </DialogHeader>
          <div className="text-center">
            <div className="text-xl font-semibold">Uploading {uploadProgress}%</div>
            <div className="w-full bg-gray-300 rounded-full h-2 my-4">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="bg-green-500 h-2 rounded-full"
              />
            </div>
            <div className="text-sm">Please wait while we upload your files.</div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
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
              ₹{calculation.totalAmount}
            </div>
            <div className="text-sm text-gray-500 mt-1">Transaction completed</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
