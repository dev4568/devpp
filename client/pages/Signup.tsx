import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UserPlus, ArrowLeft, Mail, Phone, Shield } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    state: "",
    pin: "",
    agreeToTerms: false,
  });

  const [otpStep, setOtpStep] = useState<"form" | "email" | "phone">("form");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendEmailOtp = () => {
    if (!formData.email) {
      alert("Please enter your email address");
      return;
    }
    // Simulate sending OTP
    setOtpStep("email");
    setOtpSent(true);
    alert("OTP sent to your email address");
  };

  const sendPhoneOtp = () => {
    if (!formData.phone) {
      alert("Please enter your phone number");
      return;
    }
    // Simulate sending OTP
    setOtpStep("phone");
    setOtpSent(true);
    alert("OTP sent to your phone number");
  };

  const verifyEmailOtp = () => {
    if (emailOtp === "123456") {
      // Mock verification
      setEmailVerified(true);
      setOtpStep("form");
      alert("Email verified successfully!");
    } else {
      alert("Invalid OTP. Please try again.");
    }
  };

  const verifyPhoneOtp = () => {
    if (phoneOtp === "123456") {
      // Mock verification
      setPhoneVerified(true);
      setOtpStep("form");
      alert("Phone verified successfully!");
    } else {
      alert("Invalid OTP. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailVerified && !phoneVerified) {
      alert("Please verify either your email or phone number");
      return;
    }

    if (!formData.agreeToTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }

    // Allocation of USER ID and Temporary Password
    const userId = `UDIN${Date.now().toString().slice(-6)}`;
    const tempPassword = Math.random().toString(36).slice(-8);

    // Save user data with ID
    const userData = {
      ...formData,
      userId,
      tempPassword,
      createdAt: new Date().toISOString(),
      isFirstLogin: true,
    };

    // Save to localStorage (in real app, this would be API call)
    localStorage.setItem("udin_user_data", JSON.stringify(userData));

    // Retrieve uploaded documents from temporary memory
    const tempUpload = localStorage.getItem("udin_temp_upload");
    const tempCost = localStorage.getItem("udin_temp_cost");

    if (tempUpload) {
      // Save uploaded document from temporary memory
      const uploadData = JSON.parse(tempUpload);
      const userUploadData = {
        ...uploadData,
        userId,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("udin_user_uploads", JSON.stringify(userUploadData));
    }

    // Welcome message simulation (in real app, this would send actual SMS/Email)
    const welcomeMessage = `Welcome to UDIN! Your User ID: ${userId}, Temporary Password: ${tempPassword}. Please login to complete your document processing.`;
    console.log("SMS/Email sent:", welcomeMessage);
    alert(
      `Account created! User ID: ${userId}, Temp Password: ${tempPassword}`,
    );

    // Auto Login First Time to Dashboard (simulate login)
    localStorage.setItem(
      "udin_session",
      JSON.stringify({
        userId,
        isLoggedIn: true,
        loginTime: new Date().toISOString(),
        isFirstLogin: true,
      }),
    );

    // Payment Screen Open - Navigate to payment
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="hidden sm:block w-px h-6 bg-gray-300" />
            <h1 className="hidden sm:block text-lg font-semibold text-gray-900">
              Create Account
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
              className="text-sm"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin-login")}
              className="text-sm"
            >
              Admin Login
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                Create Your UDIN Account
              </CardTitle>
              <CardDescription>
                Complete your registration to process your documents and receive
                your unique UDIN User ID
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Main Registration Form */}
              {otpStep === "form" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@company.com"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant={emailVerified ? "secondary" : "outline"}
                        onClick={sendEmailOtp}
                        disabled={emailVerified}
                        className="shrink-0"
                      >
                        {emailVerified ? (
                          <>
                            <Shield className="h-4 w-4 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+91 9876543210"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant={phoneVerified ? "secondary" : "outline"}
                        onClick={sendPhoneOtp}
                        disabled={phoneVerified}
                        className="shrink-0"
                      >
                        {phoneVerified ? (
                          <>
                            <Shield className="h-4 w-4 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="123 Main Street, City"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        type="text"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Maharashtra"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pin">PIN Code *</Label>
                      <Input
                        id="pin"
                        name="pin"
                        type="text"
                        required
                        pattern="[0-9]{6}"
                        value={formData.pin}
                        onChange={handleInputChange}
                        placeholder="400001"
                      />
                    </div>
                  </div>

                  {!emailVerified && !phoneVerified && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        <Shield className="h-4 w-4 inline mr-1" />
                        Please verify either your email or phone number to
                        continue.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          agreeToTerms: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <a href="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </a>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!emailVerified && !phoneVerified}
                  >
                    Create UDIN Account & Proceed to Payment
                  </Button>
                </form>
              )}

              {/* Email OTP Verification */}
              {otpStep === "email" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100">
                      <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Verify Your Email
                    </h3>
                    <p className="text-gray-600">
                      We've sent a 6-digit code to{" "}
                      <strong>{formData.email}</strong>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailOtp">Enter OTP</Label>
                      <Input
                        id="emailOtp"
                        type="text"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        placeholder="123456"
                        className="text-center text-lg tracking-wider"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={verifyEmailOtp}
                        disabled={emailOtp.length !== 6}
                        className="flex-1"
                      >
                        Verify Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setOtpStep("form")}
                      >
                        Back
                      </Button>
                    </div>

                    <p className="text-center text-sm text-gray-500">
                      Didn't receive the code?{" "}
                      <button
                        type="button"
                        onClick={sendEmailOtp}
                        className="text-primary hover:underline"
                      >
                        Resend OTP
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* Phone OTP Verification */}
              {otpStep === "phone" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-green-100">
                      <Phone className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Verify Your Phone
                    </h3>
                    <p className="text-gray-600">
                      We've sent a 6-digit code to{" "}
                      <strong>{formData.phone}</strong>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneOtp">Enter OTP</Label>
                      <Input
                        id="phoneOtp"
                        type="text"
                        maxLength={6}
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        placeholder="123456"
                        className="text-center text-lg tracking-wider"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={verifyPhoneOtp}
                        disabled={phoneOtp.length !== 6}
                        className="flex-1"
                      >
                        Verify Phone
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setOtpStep("form")}
                      >
                        Back
                      </Button>
                    </div>

                    <p className="text-center text-sm text-gray-500">
                      Didn't receive the code?{" "}
                      <button
                        type="button"
                        onClick={sendPhoneOtp}
                        className="text-primary hover:underline"
                      >
                        Resend OTP
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
