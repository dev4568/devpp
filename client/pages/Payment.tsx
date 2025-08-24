import { useState, useEffect, useMemo } from "react";
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
  FileText,
} from "lucide-react";

import { DOCUMENT_TYPES } from "@shared/pricing";
import { useDocuments } from "@/contexts/DocumentsContext";
import { usePricing } from "@/contexts/PricingContext";
import { usePayment } from "@/contexts/PaymentContext";
import {
  uploadFilesToServer,
  getFilesFromIndexedDB,
  clearIndexedDBFiles,
} from "@/api/api";

/* =============================================================================
   Helpers: currency formatting
============================================================================= */
const formatINR = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      })
    : "—";

/* =============================================================================
   Tier & price helpers
============================================================================= */
type Tier = "Standard" | "Express" | "Premium";

const tierMultiplier = (tier?: Tier) => {
  if (tier === "Express") return 1.5;
  if (tier === "Premium") return 2.0;
  return 1.0; // Standard / undefined
};

const computeFilePriceINR = (file: any, fallbackUnitPrice = 0) => {
  const doc = DOCUMENT_TYPES?.find((d) => d.id === file.documentTypeId);
  if (!doc?.basePrice) return fallbackUnitPrice;
  return Math.round(doc.basePrice * tierMultiplier(file.tier));
};

/* =============================================================================
   IndexedDB helpers - simplified since we now use API functions
============================================================================= */

type IndexedFile = {
  id: string;
  name: string;
  size?: number;
  type?: string;
  documentTypeId?: string;
  tier?: string;
  file?: Blob;
};

/* =============================================================================
   Razorpay loader + API helpers
============================================================================= */

declare global {
  interface Window {
    Razorpay: any;
  }
}

async function loadRazorpayScript(
  src = "https://checkout.razorpay.com/v1/checkout.js",
) {
  if (window.Razorpay) return; // already loaded
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

/** Small fetch helper with JSON + error bubbling */
async function jsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Retry helper */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 600,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 1.5);
  }
}

/* =============================================================================
   Razorpay popup (frontend-controlled)
============================================================================= */

type RazorpayOpenArgs = {
  key: string; // publishable key_id from backend
  orderId: string; // Razorpay order id from backend
  amountPaise: number; // amount in paise
  currency: string; // "INR"
  customer?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
};

function openRazorpayCheckout({
  key,
  orderId,
  amountPaise,
  currency,
  customer,
  notes,
}: RazorpayOpenArgs): Promise<{
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}> {
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key,
      order_id: orderId,
      amount: amountPaise,
      currency,
      name: "Your Company Pvt Ltd",
      description: "Document Processing",
      notes,
      prefill: {
        name: customer?.name || "",
        email: customer?.email || "",
        contact: customer?.contact || "",
      },
      theme: { color: "#4f46e5" },
      retry: { enabled: true, max_count: 1 },
      handler: (resp: any) => resolve(resp),
      modal: {
        ondismiss: () => reject(new Error("Payment popup dismissed by user")),
        confirm_close: true,
        animation: true,
      },
    });

    rzp.on("payment.failed", (resp: any) => {
      const msg =
        resp?.error?.description ||
        resp?.error?.reason ||
        "Payment failed in Razorpay popup";
      reject(new Error(msg));
    });

    rzp.open();
  });
}

/* =============================================================================
   Upload handled via API functions now
============================================================================= */

/* =============================================================================
   Component
============================================================================= */
export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Customer info
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  // Upload UX state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isFetchingIndexed, setIsFetchingIndexed] = useState(false);
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Final success modal
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Errors
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Contexts
  const { state: documentsState, actions: documentsActions } = useDocuments();
  const { state: pricingState, actions: pricingActions } = usePricing();
  const { state: paymentState } = usePayment();

  useEffect(() => {
    const userData = localStorage.getItem("udin_user_data");
    if (userData) {
      try {
        setCustomerInfo(JSON.parse(userData));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  /* ---------- Price & items (robust) ---------- */
  const validFiles = useMemo(() => {
    try {
      return documentsActions.getValidFiles();
    } catch {
      return [];
    }
  }, [documentsActions]);

  const orderSummary = pricingActions.getOrderSummary();
  // Get items from current order in state instead of from summary
  const itemsFromOrder = pricingState?.currentOrder || [];

  // Use a default unit price since these properties don't exist
  const unitPrice = 100; // Default fallback price

  // Normalize order items; compute price when missing
  const normalizedOrderItems =
    itemsFromOrder.length > 0
      ? itemsFromOrder.map((it: any) => ({
          id:
            it.fileId ??
            (typeof crypto !== "undefined"
              ? crypto.randomUUID()
              : String(Math.random())),
          name:
            DOCUMENT_TYPES.find((d) => d.id === it.documentTypeId)?.name ??
            "Document",
          subtitle: it.fileName ?? undefined,
          price: computeFilePriceINR(
            {
              documentTypeId: it.documentTypeId,
              tier: it.tier,
            },
            unitPrice,
          ),
          tier: it.tier,
          udinRequired: !!DOCUMENT_TYPES.find((d) => d.id === it.documentTypeId)
            ?.udinRequired,
        }))
      : [];

  // Build items from files if order items are not present
  const items =
    normalizedOrderItems.length > 0
      ? normalizedOrderItems
      : validFiles.map((f: any) => {
          const doc = DOCUMENT_TYPES.find((d) => d.id === f.documentTypeId);
          return {
            id: f.id,
            name: doc?.name ?? f.name ?? "Document",
            subtitle: f.name,
            price: computeFilePriceINR(f, unitPrice),
            tier: f.tier,
            udinRequired: !!doc?.udinRequired,
          };
        });

  const subtotal =
    typeof pricingState?.calculation?.subtotal === "number"
      ? pricingState.calculation.subtotal
      : items.reduce((s: number, it: any) => s + (Number(it.price) || 0), 0);

  const taxRate = 0.18; // 18% GST - fixed rate

  const gstAmount =
    pricingState?.calculation?.gstAmount || Math.round(subtotal * taxRate);

  const totalAmount =
    typeof pricingState?.calculation?.totalAmount === "number"
      ? pricingState.calculation.totalAmount
      : subtotal + gstAmount;

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  /* ---------- Real payment flow (with frontend popup) ---------- */
  /* ---------- Real payment flow (with frontend popup) ---------- */
  const handlePayNow = async () => {
    setFatalError(null);

    try {
      // Load Razorpay SDK
      await loadRazorpayScript();

      // 1) Create Razorpay order

      /*     const { orderId, amount, currency, razorpayKeyId } = await jsonFetch<{
      orderId: string;
      amount: number;   // paise
      currency: string; // "INR"
      razorpayKeyId: string;
    }>(`${BASE_URL}/api/payments/order`, {
      method: "POST",
      body: JSON.stringify({
        amount: totalAmount, 
        notes: {
          customerEmail: customerInfo?.email,
          customerName: customerInfo?.name,
        },
        items,
      }),
    });
 */
      // 2) Create a pending transaction
      /*     const { transactionId } = await jsonFetch<{ transactionId: string }>(
      `${BASE_URL}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          orderId,
          amount: totalAmount,
          currency,
          status: "pending",
          items,
          customer: customerInfo,
          tax: { rate: taxRate, gstAmount },
          subtotal,
        }),
      }
    );
 */
      // 3) Open Razorpay popup
      /*     const resp = await openRazorpayCheckout({
      key: razorpayKeyId,
      orderId,
      amountPaise: amount,
      currency,
      customer: {
        name: customerInfo?.name,
        email: customerInfo?.email,
        contact: customerInfo?.phone,
      },
      notes: { transactionId },
    });
 */
      // 4) Verify payment on backend
      /*     const verify = await jsonFetch<{ verified: boolean }>(`${BASE_URL}/payments/verify`, {
      method: "POST",
      body: JSON.stringify({
        orderId: resp.razorpay_order_id,
        paymentId: resp.razorpay_payment_id,
        signature: resp.razorpay_signature,
      }),
    });
    if (!verify.verified) throw new Error("Payment verification failed");
 */
      // 5) Mark transaction as paid
      /*     await jsonFetch(`${BASE_URL}/transactions/${transactionId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "paid",
        paymentId: resp.razorpay_payment_id,
      }),
    });
 */
      // 6) Upload files
      setShowUploadDialog(true);
      setIsFetchingIndexed(true);

      // Get files from IndexedDB using the new API function
      const idbFilesFetched = await getFilesFromIndexedDB();
      setIndexedFiles(idbFilesFetched);
      setIsFetchingIndexed(false);

      // Get files from document context
      const contextFiles = (() => {
        try {
          return documentsActions.getValidFiles();
        } catch {
          return [];
        }
      })();

      // Combine all files for upload
      const allFiles = [
        ...contextFiles.map((f: any) => ({
          id: f.id,
          name: f.name,
          file: f.file || new File([], f.name),
          size: f.size,
          type: f.type,
          documentTypeId: f.documentTypeId,
          tier: f.tier,
        })),
        ...idbFilesFetched,
      ];

      // Upload files to server with progress tracking
      const uploadResult = await uploadFilesToServer(
        allFiles,
        customerInfo?.userId || customerInfo?.email || "anonymous",
        customerInfo,
        {
          items,
          subtotal,
          gstAmount,
          totalAmount,
          taxRate,
        },
        {}, // metadata
        (progress) => setUploadProgress(progress),
      );

      console.log("Upload completed:", uploadResult);

      // 7) Clear IndexedDB after successful upload
      await clearIndexedDBFiles();

      // Success
      setShowUploadDialog(false);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Payment/upload error:", error);
      setFatalError(error?.message || "Payment could not be completed.");
      setShowUploadDialog(false);
    }
  };

  /* ---------- Loading / error screens ---------- */
  if (paymentState.isProcessing || documentsState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
        </div>
      </div>
    );
  }

  /* ---------- Main UI ---------- */
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
              Payment Summary
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">Powered by Razorpay</span>
          </div>
        </div>
      </div>

      {/* Payment Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="text-center pb-6 bg-gradient-to-r from-primary to-primary/80 text-white">
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
                    {items.length} document{items.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs text-gray-600">{item.subtitle}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {item.tier && (
                          <Badge variant="outline" className="text-xs">
                            {item.tier}
                          </Badge>
                        )}
                        {item.udinRequired && (
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
                        {formatINR(Number(item.price))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    GST ({Math.round(taxRate * 100)}%)
                  </span>
                  <span className="font-medium">{formatINR(gstAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Total Amount
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatINR(totalAmount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      (Including all taxes)
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Alerts */}
              {(paymentState.error || fatalError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {fatalError || paymentState.error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Pay Now */}
              <Button
                onClick={handlePayNow}
                disabled={paymentState.isProcessing}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-6 text-lg rounded-xl"
                size="lg"
              >
                {paymentState.isProcessing ? (
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <IndianRupee className="h-5 w-5 mr-2" />
                )}
                Pay {formatINR(totalAmount)} Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Progress (auto after payment) */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploading Files...</DialogTitle>
            <DialogDescription>
              {isFetchingIndexed
                ? "Fetching your documents and details..."
                : "Please keep this window open while we upload your files."}
            </DialogDescription>
          </DialogHeader>

          {/* Once fetched, list files briefly */}
          {!isFetchingIndexed && (
            <div className="bg-gray-50 rounded-md p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-900">Files</span>
                <Badge variant="outline">
                  {validFiles.length + indexedFiles.length} total
                </Badge>
              </div>
              <div className="max-h-40 overflow-auto pr-1 space-y-2">
                {[...validFiles, ...indexedFiles].map((f: any) => (
                  <div
                    key={f.id || f.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    {typeof f.size === "number" && (
                      <span className="text-muted-foreground">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="text-center">
            <div className="text-sm font-medium">
              Uploading {uploadProgress}%
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2 my-4">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="bg-green-500 h-2 rounded-full transition-all"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Success */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Files Uploaded
            </DialogTitle>
            <DialogDescription>
              Your files were uploaded successfully. Login to your dashboard to
              see the status.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-green-600">
              {formatINR(totalAmount)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Payment and upload completed
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                navigate("/login");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
