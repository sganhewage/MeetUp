"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authorization...");
  
  const handleGoogleOAuthCallback = useAction(api.googleCalendar.handleGoogleOAuthCallback);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage(`Authorization failed: ${error}`);
          
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: "OAUTH_ERROR",
              error: `Authorization failed: ${error}`
            }, window.location.origin);
          }
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setMessage("Missing authorization code or state parameter");
          
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: "OAUTH_ERROR",
              error: "Missing authorization code or state parameter"
            }, window.location.origin);
          }
          return;
        }

        setMessage("Exchanging authorization code for access token...");
        
        const result = await handleGoogleOAuthCallback({
          code,
          state,
        });

        if (result.success) {
          setStatus("success");
          setMessage(`Successfully connected ${result.email} to your account!`);
          
          // Send success message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: "OAUTH_SUCCESS",
              email: result.email
            }, window.location.origin);
          }
          
          // Close popup after a short delay
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          setStatus("error");
          setMessage("Failed to complete authorization");
          
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: "OAUTH_ERROR",
              error: "Failed to complete authorization"
            }, window.location.origin);
          }
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "An unexpected error occurred");
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: "OAUTH_ERROR",
            error: error instanceof Error ? error.message : "An unexpected error occurred"
          }, window.location.origin);
        }
      }
    };

    processCallback();
  }, [searchParams, handleGoogleOAuthCallback]);

  return (
    <div className="min-h-screen bg-[#EDEDED] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === "loading" && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          )}
          
          {status === "success" && (
            <div className="text-green-600 text-4xl mb-4">✅</div>
          )}
          
          {status === "error" && (
            <div className="text-red-600 text-4xl mb-4">❌</div>
          )}
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {status === "loading" && "Connecting Calendar"}
            {status === "success" && "Calendar Connected!"}
            {status === "error" && "Connection Failed"}
          </h1>
          
          <p className="text-gray-600 mb-6">{message}</p>
          
          {status === "error" && (
            <button
              onClick={() => router.push("/sync")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          )}
          
          {status === "success" && (
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 