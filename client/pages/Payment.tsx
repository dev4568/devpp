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
import { getFilesFromIndexedDB, clearIndexedDBFiles } from "@/api/api";

/* =============================================================================
   Config: your backend endpoints
============================================================================= */
const PRESIGN_URL = "http://locahost:5000/api/upload/presigned-url";      // <-- maps to UploadController.getPresignedUrl
const DOC_UPLOAD_URL = "locahost:5000/api/documents/upload";       // <-- maps to DocumentController.uploadDocument

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
  return 1.0;
};

const toNumber = (v: unknown, def = 0) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : def;
};

const computeFilePriceINR = (file: any, fallbackUnitPrice = 0) => {
  const doc = DOCUMENT_TYPES?.find((d) => d.id === file.documentTypeId);
  const base = toNumber(doc?.basePrice, fallbackUnitPrice);
  if (base <= 0) return fallbackUnitPrice;
  return Math.round(base * tierMultiplier(file.tier));
};

/* =============================================================================
   Razorpay (client-only)
============================================================================= */
declare global {
  interface Window {
    Razorpay: any;
  }
}

const RZP_KEY = import.meta.env.VITE_RZP_KEY_ID ?? "rzp_test_R93byKz54qIzaa";

async function loadRazorpayScript(
  src = "https://checkout.razorpay.com/v1/checkout.js",
) {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

type RazorpayClientOnlyArgs = {
  key: string;
  amountPaise: number;
  currency?: string;
  name?: string;
  description?: string;
  customer?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
};

function openRazorpayCheckoutClientOnly({
  key,
  amountPaise,
  currency = "INR",
  name = "UDIN",
  description = "Document Processing",
  customer,
  notes,
}: RazorpayClientOnlyArgs): Promise<{ razorpay_payment_id: string }> {
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key,
      amount: amountPaise,
      currency,
      name,
      description,
      notes,
      prefill: {
        name: customer?.name || "",
        email: customer?.email || "",
        contact: customer?.contact || "",
      },
      theme: { color: "#4f46e5" },
      retry: { enabled: true, max_count: 1 },
      handler: (resp: any) => {
        resolve({ razorpay_payment_id: resp.razorpay_payment_id });
      },
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
   Transactions + backend helpers
============================================================================= */

function getAuthHeaders() {
  const token =
    (() => {
      try {
        const auth = JSON.parse(localStorage.getItem("udin_auth") || "{}");
        return auth?.token;
      } catch {
        return null;
      }
    })() || localStorage.getItem("udin_token");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type TxCreatePayload = {
  provider: "razorpay";
  status: "initiated";
  userId?: string;
  currency: "INR";
  amount: number; // rupees
  amountPaise: number; // paise
  items: any[];
  amounts: {
    subtotal: number;
    gstAmount: number;
    totalAmount: number;
    taxRate: number;
  };
  notes?: Record<string, any>;
};

type TxUpdatePayload = Partial<{
  status: "paid" | "failed" | "cancelled";
  paymentId: string;
  failureReason: string;
  paidAt: string;
  meta: Record<string, any>;
  documentIds: string[];
}>;

function getTxId(tx: any): string | null {
  return (
    tx?.id ??
    tx?._id ??
    tx?.data?.id ??
    tx?.transactionId ??
    tx?.transaction?.id ??
    (typeof tx?._id?.$oid === "string" ? tx._id.$oid : null) ??
    null
  );
}

async function createTransaction(payload: TxCreatePayload) {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to create transaction");
  return text ? JSON.parse(text) : {};
}

async function updateTransaction(id: string, payload: TxUpdatePayload) {
  const res = await fetch(`/api/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(text || `Failed to update transaction (${res.status})`);
  return text ? JSON.parse(text) : {};
}

/* =============================================================================
   S3 presign + PUT + Document save (using your controllers)
============================================================================= */

/** Normalize `fileType` (extension) expected by your DocumentController */
function pickFileTypeExt(file: File): string {
  // Prefer extension from name
  const namePart = (file.name || "").split(".").pop()?.toLowerCase();
  if (namePart) return namePart;
  // Fallback rough mime→ext (optional)
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
    "image/png": "png",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[file.type] || "bin";
}

/** Ask backend for a presigned URL (UploadController.getPresignedUrl) */
async function getBackendPresignedUrl(params: {
  fileName: string;
  fileType: string; // extension (controller expects 'pdf','jpg', etc.)
  userId?: string | number;
}) {
  const res = await fetch(PRESIGN_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  const payload = await res.json();
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to create presigned url");
  }
  const data = payload.data || {};

  // Be flexible about keys your util returns:
  // prefer 'uploadUrl' for PUT, and 'fileUrl' (public) to store in DB
  const uploadUrl =
    data.uploadUrl || data.url || data.presignedUrl || data.putUrl;
  const fileUrl =
    data.fileUrl || data.publicUrl || data.urlWithoutQuery || data.cdnUrl;
  const key = data.key || data.objectKey || undefined;

  if (!uploadUrl) throw new Error("Presigned uploadUrl missing from backend response");
  return { uploadUrl, fileUrl, key };
}

/** PUT to S3 presigned URL */
async function putToS3(url: string, file: File) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      // Presign was created using extension; S3 still wants a MIME here for correct metadata
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`S3 upload failed: ${res.status} ${t}`);
  }
}

/** Save document record using DocumentController.uploadDocument */
async function saveDocumentRecord(params: {
  fileName: string;       // stored file name (usually same as original)
  originalName: string;   // original name shown to user
  fileType: string;       // extension string ('pdf','jpeg',...)
  fileSize: number;
  fileUrl: string;        // S3 https url
  documenttype: string;   // your document type id
  paymentId: string;      // razorpay id
  userId?: string | number;
}) {
  const res = await fetch(DOC_UPLOAD_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  const payload = await res.json();
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to save document");
  }
  // Expecting payload.data with an id; support a few shapes
  const id =
    payload?.data?.id ||
    payload?.data?._id ||
    payload?.data?.documentId ||
    payload?.documentId;
  return { id, data: payload?.data };
}

/* =============================================================================
   Component
============================================================================= */
export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // reserved for future use

  // Customer info
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  // Upload UX state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isFetchingIndexed, setIsFetchingIndexed] = useState(false);
  const [indexedFiles, setIndexedFiles] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Final success modal
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Errors
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Contexts
  const { state: documentsState, actions: documentsActions } = useDocuments();
  const { state: pricingState } = usePricing();
  const { state: paymentState } = usePayment(); // just used for loading/disable state

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

  /* ---------- Build items ---------- */

  const stableItemKey = (
    source: "order" | "file",
    parts: Array<string | number | undefined>,
  ) => `${source}:${parts.filter(Boolean).join("|")}`;

  const unitPrice = 100; // fallback price in INR
  const taxRate = 0.18; // 18% GST

  const validFilesFromCtx = useMemo(() => {
    try {
      return documentsActions.getValidFiles();
    } catch {
      return [];
    }
  }, [documentsActions]);

  const itemsFromOrder = pricingState?.currentOrder || [];

  const normalizedOrderItems = useMemo(() => {
    if (!itemsFromOrder?.length) return [] as any[];
    return itemsFromOrder.map((it: any, i: number) => {
      const identity =
        it.fileId ||
        `${it.documentTypeId || "doc"}|${it.fileName || i}|${it.tier || "Standard"}`;

      const id = stableItemKey("order", [identity]);

      const doc = DOCUMENT_TYPES.find((d) => d.id === it.documentTypeId);
      return {
        id,
        name: doc?.name ?? "Document",
        subtitle: it.fileName ?? undefined,
        price: computeFilePriceINR(
          { documentTypeId: it.documentTypeId, tier: it.tier },
          unitPrice,
        ),
        tier: it.tier,
        udinRequired: !!doc?.udinRequired,
        documentTypeId: it.documentTypeId,
      };
    });
  }, [itemsFromOrder]);

  const fallbackItemsFromFiles = useMemo(() => {
    if (!validFilesFromCtx.length) return [] as any[];

    return validFilesFromCtx.map((f: any, i: number) => {
      const doc = DOCUMENT_TYPES.find((d) => d.id === f.documentTypeId);
      const identity = f.id || f.name || i;
      return {
        id: stableItemKey("file", [identity]),
        name: doc?.name ?? f.name ?? "Document",
        subtitle: f.name,
        price: computeFilePriceINR(f, unitPrice),
        tier: f.tier,
        udinRequired: !!doc?.udinRequired,
        documentTypeId: f.documentTypeId,
      };
    });
  }, [validFilesFromCtx]);

  const items = useMemo(
    () => (normalizedOrderItems.length > 0 ? normalizedOrderItems : fallbackItemsFromFiles),
    [normalizedOrderItems, fallbackItemsFromFiles],
  );

  // Amounts
  const subtotal = useMemo(() => {
    const computed = items.reduce((s: number, it: any) => s + (Number(it.price) || 0), 0);
    const override = pricingState?.calculation?.subtotal;
    return Number.isFinite(override) && (override as number) > 0 ? (override as number) : computed;
  }, [pricingState?.calculation?.subtotal, items]);

  const gstAmount = useMemo(() => {
    const computed = Math.round(subtotal * taxRate);
    const override = pricingState?.calculation?.gstAmount;
    return Number.isFinite(override) && (override as number) > 0 ? (override as number) : computed;
  }, [pricingState?.calculation?.gstAmount, subtotal]);

  const totalAmount = useMemo(() => {
    const computed = subtotal + gstAmount;
    const override = pricingState?.calculation?.totalAmount;
    return Number.isFinite(override) && (override as number) > 0 ? (override as number) : computed;
  }, [pricingState?.calculation?.totalAmount, subtotal, gstAmount]);

  /* ---------- Upload list (de-duped) ---------- */
  const uploadRenderList = useMemo(() => {
    const ctx = validFilesFromCtx.map((f: any, i: number) => ({
      _renderKey: `ctx:${f.id ?? f.name ?? i}`,
      _identity: `${f.id ?? f.name ?? i}`,
      name: f.name,
      size: f.size,
    }));

    const idb = indexedFiles.map((f: any, i: number) => ({
      _renderKey: `idb:${f.id ?? f.name ?? i}`,
      _identity: `${f.id ?? f.name ?? i}`,
      name: f.name,
      size: f.size,
    }));

    const seen = new Set<string>();
    const merged = [...ctx, ...idb].filter((f) => {
      if (seen.has(f._identity)) return false;
      seen.add(f._identity);
      return true;
    });

    return merged;
  }, [validFilesFromCtx, indexedFiles]);

  /* ---------- Payment -> S3 uploads -> Document save -> Tx update ---------- */

  const handlePayNow = async () => {
    setFatalError(null);
    let txId: string | null = null;

    try {
      // compute & guard amount
      const rupees = Number.isFinite(totalAmount) ? Number(totalAmount) : 0;
      const amountPaise = Math.max(100, Math.round(rupees * 100)); // >= ₹1.00
      if (amountPaise < 100) {
        throw new Error("Amount must be at least ₹1.00");
      }

      // 1) Create a transaction record
      try {
        const tx = await createTransaction({
          provider: "razorpay",
          status: "initiated",
          userId: customerInfo?.userId,
          currency: "INR",
          amount: rupees,
          amountPaise,
          items,
          amounts: { subtotal, gstAmount, totalAmount: rupees, taxRate },
          notes: {
            email: customerInfo?.email,
            phone: customerInfo?.phone,
          },
        });
        txId = getTxId(tx);
        console.debug("Created transaction:", tx, "Resolved txId:", txId);
      } catch (e) {
        console.warn("Transaction create failed, continuing to payment:", e);
      }

      // 2) Razorpay popup
      await loadRazorpayScript();
      const customer = {
        name:
          customerInfo?.name ||
          `${customerInfo?.firstName ?? ""} ${customerInfo?.lastName ?? ""}`.trim(),
        email: customerInfo?.email || "",
        contact: customerInfo?.phone || "",
      };

      const rzpResp = await openRazorpayCheckoutClientOnly({
        key: RZP_KEY,
        amountPaise,
        currency: "INR",
        name: "UDIN",
        description: "Document Processing",
        customer,
        notes: {
          userId: String(customerInfo?.userId ?? ""),
          txId: txId ?? "",
        },
      });

      // 3) Show upload modal & collect files
      setShowUploadDialog(true);
      setIsFetchingIndexed(true);

      const idbFilesFetched = await getFilesFromIndexedDB();
      setIndexedFiles(idbFilesFetched);
      setIsFetchingIndexed(false);

      const contextFiles = (() => {
        try {
          return documentsActions.getValidFiles();
        } catch {
          return [];
        }
      })();

      const allFiles: Array<{
        id?: string;
        name: string;
        file: File;
        size: number;
        type: string;
        documentTypeId?: string;
        tier?: Tier;
      }> = [
        ...contextFiles.map((f: any) => ({
          id: f.id,
          name: f.name,
          file: f.file || new File([], f.name || "untitled"),
          size: f.size,
          type: f.type || "application/octet-stream",
          documentTypeId: f.documentTypeId,
          tier: f.tier,
        })),
        ...idbFilesFetched,
      ];

      // 4) For each file: get presign -> PUT -> call /documents/upload
      const documentIds: string[] = [];
      const totalFiles = allFiles.length || 1;
      let completed = 0;
      const CONCURRENCY = 3;

      async function processOne(f: (typeof allFiles)[number]) {
        // a) presign from backend (expects extension in fileType)
        const fileTypeExt = pickFileTypeExt(f.file); // e.g., 'pdf', 'jpeg'
        const presign = await getBackendPresignedUrl({
          fileName: f.name,
          fileType: fileTypeExt,
          userId: customerInfo?.userId,
        });

        // b) upload to S3
        await putToS3(presign.uploadUrl, f.file);

        // c) save the document in DB
        const saved = await saveDocumentRecord({
          fileName: f.name,             // stored display name
          originalName: f.name,         // original name
          fileType: fileTypeExt,        // extension as your API expects
          fileSize: f.size,
          fileUrl: presign.fileUrl || presign.uploadUrl.split("?")[0], // persist clean URL
          documenttype: f.documentTypeId || "generic",
          paymentId: rzpResp.razorpay_payment_id,
          userId: customerInfo?.userId,
        });

        if (saved.id) documentIds.push(saved.id);

        // progress
        completed += 1;
        setUploadProgress(Math.round((completed / totalFiles) * 100));
      }

      // simple concurrency pool
      const pool: Promise<void>[] = [];
      for (const file of allFiles) {
        const run = async () => processOne(file);
        if (pool.length >= CONCURRENCY) {
          await Promise.race(pool);
          for (let i = pool.length - 1; i >= 0; i--) {
            if ((pool[i] as any).settled) pool.splice(i, 1);
          }
        }
        const p = run().finally(() => ((p as any).settled = true));
        pool.push(p);
      }
      await Promise.all(pool);

      // 5) Mark transaction as paid with doc ids (best-effort)
      if (txId) {
        try {
          await updateTransaction(txId, {
            status: "paid",
            paymentId: rzpResp.razorpay_payment_id,
            paidAt: new Date().toISOString(),
            meta: { flow: "client-only", storage: "s3-presigned+backend" },
            documentIds,
          });
        } catch (e) {
          console.warn("Transaction update (paid) failed:", e);
        }
      }

      // 6) Cleanup & success
      await clearIndexedDBFiles();
      documentsActions.clearAllFiles();

      setShowUploadDialog(false);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Payment/upload error:", error);

      // best-effort: mark transaction failed if we have an id
      try {
        // if you want to store txId in a ref to ensure visibility here, you can
      } catch {}

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
              <CardTitle className="text-2xl font-bold">Payment Summary</CardTitle>
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
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
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
                  <span className="text-gray-600">GST ({Math.round(taxRate * 100)}%)</span>
                  <span className="font-medium">{formatINR(gstAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatINR(totalAmount)}
                    </div>
                    <div className="text-sm text-gray-500">(Including all taxes)</div>
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

          {!isFetchingIndexed && (
            <div className="bg-gray-50 rounded-md p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-900">Files</span>
                <Badge variant="outline">{uploadRenderList.length} total</Badge>
              </div>
              <div className="max-h-40 overflow-auto pr-1 space-y-2">
                {uploadRenderList.map((f) => (
                  <div
                    key={f._renderKey}
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
            <div className="text-sm font-medium">Uploading {uploadProgress}%</div>
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
