"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

interface OAuthPopupProps {
  provider: "google" | "outlook" | "apple";
  onSuccess: (email: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

export default function OAuthPopup({ provider, onSuccess, onError, onClose }: OAuthPopupProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generateGoogleOAuthUrl = useAction(api.googleCalendar.generateGoogleOAuthUrl);

  useEffect(() => {
    const handleOAuth = async () => {
      try {
        setIsLoading(true);
        
        if (provider === "google") {
          const authUrl = await generateGoogleOAuthUrl();
          
          // Open popup window
          const popup = window.open(
            authUrl,
            "oauth-popup",
            "width=500,height=600,scrollbars=yes,resizable=yes"
          );

          if (!popup) {
            throw new Error("Popup blocked. Please allow popups for this site.");
          }

          // Listen for messages from the popup
          const handleMessage = (event: MessageEvent) => {
            // Only accept messages from our own origin
            if (event.origin !== window.location.origin) {
              return;
            }

            if (event.data.type === "OAUTH_SUCCESS") {
              onSuccess(event.data.email);
              popup.close();
              window.removeEventListener("message", handleMessage);
            } else if (event.data.type === "OAUTH_ERROR") {
              onError(event.data.error);
              popup.close();
              window.removeEventListener("message", handleMessage);
            }
          };

          window.addEventListener("message", handleMessage);

          // Check if popup was closed manually
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              window.removeEventListener("message", handleMessage);
              onClose();
            }
          }, 1000);

        } else {
          // For other providers, show placeholder
          onError(`OAuth for ${provider} is not implemented yet.`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
        onError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuth();
  }, [provider, generateGoogleOAuthUrl, onSuccess, onError, onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Connecting to {provider}</h3>
            <p className="text-gray-600 text-sm">
              A popup window will open for authorization. Please complete the process there.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-4">❌</div>
            <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 