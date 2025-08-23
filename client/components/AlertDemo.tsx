import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  alertUtils,
  paymentAPI,
  documentsAPI,
  userAPI,
} from "@/utils/apiService";

export function AlertDemo() {
  const handleSuccessAlert = () => {
    alertUtils.success("This is a success message!", "Success Demo");
  };

  const handleErrorAlert = () => {
    alertUtils.error("This is an error message!", "Error Demo");
  };

  const handleWarningAlert = () => {
    alertUtils.warning("This is a warning message!", "Warning Demo");
  };

  const handleInfoAlert = () => {
    alertUtils.info("This is an info message!", "Info Demo");
  };

  const handleConfirmAlert = async () => {
    const confirmed = await alertUtils.confirm(
      "Are you sure you want to proceed?",
      "Confirmation Demo",
    );

    if (confirmed) {
      alertUtils.success("You confirmed the action!");
    } else {
      alertUtils.info("Action was cancelled");
    }
  };

  const handleLoadingAlert = () => {
    const loading = alertUtils.loading("Processing demo request...");

    setTimeout(() => {
      alertUtils.close();
      alertUtils.success("Demo completed!");
    }, 3000);
  };

  const handleAPITest = async () => {
    // Test API call with loading and error handling
    const result = await paymentAPI.getConfig();
    console.log("API Test Result:", result);
  };

  const handleAPIError = async () => {
    // Test API error handling
    const result = await documentsAPI.deleteDocument("non-existent-id");
    console.log("API Error Test Result:", result);
  };

  const handleLoginTest = async () => {
    // Test login API with validation
    const result = await userAPI.login({
      email: "test@example.com",
      password: "test123",
    });
    console.log("Login Test Result:", result);
  };

  return (
    <Card className="max-w-2xl mx-auto m-4">
      <CardHeader>
        <CardTitle>SweetAlert2 & API Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <h3 className="col-span-2 font-semibold mb-2">Alert Types:</h3>

          <Button onClick={handleSuccessAlert} variant="default" size="sm">
            Success Alert
          </Button>

          <Button onClick={handleErrorAlert} variant="destructive" size="sm">
            Error Alert
          </Button>

          <Button onClick={handleWarningAlert} variant="outline" size="sm">
            Warning Alert
          </Button>

          <Button onClick={handleInfoAlert} variant="secondary" size="sm">
            Info Alert
          </Button>

          <Button onClick={handleConfirmAlert} className="col-span-2" size="sm">
            Confirmation Dialog
          </Button>

          <Button onClick={handleLoadingAlert} className="col-span-2" size="sm">
            Loading Demo (3 seconds)
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6">
          <h3 className="col-span-2 font-semibold mb-2">API Tests:</h3>

          <Button onClick={handleAPITest} variant="outline" size="sm">
            Test API Success
          </Button>

          <Button onClick={handleAPIError} variant="outline" size="sm">
            Test API Error
          </Button>

          <Button
            onClick={handleLoginTest}
            className="col-span-2"
            variant="outline"
            size="sm"
          >
            Test Login API
          </Button>
        </div>

        <div className="text-sm text-gray-600 mt-4">
          <p>
            <strong>Note:</strong> This demo component showcases:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Different types of SweetAlert2 notifications</li>
            <li>API service error handling</li>
            <li>Loading states and success messages</li>
            <li>Confirmation dialogs</li>
            <li>API endpoint testing (check console for results)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
