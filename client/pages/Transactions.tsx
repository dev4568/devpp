import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Download,
  MoreHorizontal,
  Filter,
  X,
  Receipt,
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  type: "document_processing" | "subscription" | "refund" | "credit";
  paymentMethod: "credit_card" | "paypal" | "bank_transfer";
  invoiceId: string;
  documents?: string[];
}

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [transactions] = useState<Transaction[]>([
    {
      id: "txn_001",
      date: "2024-01-15T10:30:00Z",
      description: "Document Processing - Contract Analysis",
      amount: 2950.0,
      status: "completed",
      type: "document_processing",
      paymentMethod: "credit_card",
      invoiceId: "INV-2024-001",
      documents: ["Contract_Agreement.pdf", "Terms_Conditions.pdf"],
    },
    {
      id: "txn_002",
      date: "2024-01-14T15:45:00Z",
      description: "Premium Subscription - Monthly",
      amount: 1770.0,
      status: "completed",
      type: "subscription",
      paymentMethod: "credit_card",
      invoiceId: "INV-2024-002",
    },
    {
      id: "txn_003",
      date: "2024-01-12T09:15:00Z",
      description: "Document Processing - Financial Statement",
      amount: 15.0,
      status: "completed",
      type: "document_processing",
      paymentMethod: "paypal",
      invoiceId: "INV-2024-003",
      documents: ["Financial_Statement.docx"],
    },
    {
      id: "txn_004",
      date: "2024-01-10T14:20:00Z",
      description: "Refund - Processing Error",
      amount: -10.0,
      status: "completed",
      type: "refund",
      paymentMethod: "credit_card",
      invoiceId: "REF-2024-001",
    },
    {
      id: "txn_005",
      date: "2024-01-08T11:30:00Z",
      description: "Document Processing - Legal Review",
      amount: 35.0,
      status: "pending",
      type: "document_processing",
      paymentMethod: "bank_transfer",
      invoiceId: "INV-2024-004",
      documents: ["Legal_Document.pdf", "Contract_v2.pdf"],
    },
    {
      id: "txn_006",
      date: "2024-01-05T16:45:00Z",
      description: "Account Credit Bonus",
      amount: 5.0,
      status: "completed",
      type: "credit",
      paymentMethod: "credit_card",
      invoiceId: "CRD-2024-001",
    },
    {
      id: "txn_007",
      date: "2024-01-03T13:20:00Z",
      description: "Document Processing - Invoice Analysis",
      amount: 20.0,
      status: "failed",
      type: "document_processing",
      paymentMethod: "credit_card",
      invoiceId: "INV-2024-005",
      documents: ["Invoice_2024.pdf"],
    },
  ]);

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.invoiceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || txn.status === statusFilter;
    const matchesType = typeFilter === "all" || txn.type === typeFilter;

    let matchesDate = true;
    if (dateFilter !== "all") {
      const txnDate = new Date(txn.date);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      switch (dateFilter) {
        case "today":
          matchesDate = daysDiff === 0;
          break;
        case "week":
          matchesDate = daysDiff <= 7;
          break;
        case "month":
          matchesDate = daysDiff <= 30;
          break;
        case "year":
          matchesDate = daysDiff <= 365;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFilter("all");
    setSearchTerm("");
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    dateFilter !== "all" ||
    searchTerm !== "";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <TrendingDown className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "document_processing":
        return <Badge variant="outline">Document Processing</Badge>;
      case "subscription":
        return (
          <Badge className="bg-purple-100 text-purple-800">Subscription</Badge>
        );
      case "refund":
        return <Badge className="bg-orange-100 text-orange-800">Refund</Badge>;
      case "credit":
        return <Badge className="bg-green-100 text-green-800">Credit</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "credit_card":
        return <CreditCard className="h-4 w-4" />;
      case "paypal":
        return <DollarSign className="h-4 w-4" />;
      case "bank_transfer":
        return <Receipt className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return (
      <span className={isNegative ? "text-red-600" : "text-green-600"}>
        {isNegative ? "-" : "+"}₹{absAmount.toFixed(2)}
      </span>
    );
  };

  const calculateTotals = () => {
    const total = filteredTransactions.reduce(
      (sum, txn) => sum + txn.amount,
      0,
    );
    const completed = filteredTransactions
      .filter((txn) => txn.status === "completed")
      .reduce((sum, txn) => sum + txn.amount, 0);
    const pending = filteredTransactions
      .filter((txn) => txn.status === "pending")
      .reduce((sum, txn) => sum + txn.amount, 0);

    return { total, completed, pending };
  };

  const { total, completed, pending } = calculateTotals();

  const handleDownloadInvoice = (transaction: Transaction) => {
    console.log("Downloading invoice:", transaction.invoiceId);
    // Simulate download
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  };

  return (
    <Layout title="Transaction History">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">
              View and manage your payment history
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(total)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {filteredTransactions.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{completed.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {
                  filteredTransactions.filter((t) => t.status === "completed")
                    .length
                }{" "}
                completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ₹{pending.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {
                  filteredTransactions.filter((t) => t.status === "pending")
                    .length
                }{" "}
                pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="document_processing">
                      Document Processing
                    </SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Date Range
                </label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Transaction History
                  <Badge variant="secondary" className="text-xs">
                    {filteredTransactions.length} of {transactions.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {hasActiveFilters
                    ? "Filtered view of your transactions"
                    : "Complete history of your payments and credits"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {transaction.description}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.invoiceId}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <span className="text-sm capitalize">
                              {transaction.paymentMethod.replace("_", " ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(transaction)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDownloadInvoice(transaction)
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No transactions found
                </h3>
                <p className="text-gray-500 mb-4">
                  {hasActiveFilters
                    ? "No transactions match your current filters. Try adjusting your search criteria."
                    : "You haven't made any transactions yet."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>
                Complete information about this transaction
              </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Transaction ID
                    </label>
                    <p className="font-mono text-sm">
                      {selectedTransaction.id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Invoice ID
                    </label>
                    <p className="font-mono text-sm">
                      {selectedTransaction.invoiceId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Date
                    </label>
                    <p className="text-sm">
                      {formatDate(selectedTransaction.date)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Amount
                    </label>
                    <p className="text-sm font-medium">
                      {formatAmount(selectedTransaction.amount)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Status & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <div className="mt-1">
                      {getStatusBadge(selectedTransaction.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Type
                    </label>
                    <div className="mt-1">
                      {getTypeBadge(selectedTransaction.type)}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="mt-1">{selectedTransaction.description}</p>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Payment Method
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {getPaymentMethodIcon(selectedTransaction.paymentMethod)}
                    <span className="capitalize">
                      {selectedTransaction.paymentMethod.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Documents (if any) */}
                {selectedTransaction.documents &&
                  selectedTransaction.documents.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Related Documents
                      </label>
                      <div className="mt-1 space-y-1">
                        {selectedTransaction.documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadInvoice(selectedTransaction)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoice
                  </Button>
                  <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
