import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import axios from "axios";
import posthog from "posthog-js"; // 👈 import posthog

// Add interface for the response data
interface TokenResponse {
  accessToken: string;
  token_type: string;
  scope: string;
}

// Add error type
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

function TokenPage() {
  const router = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAccessTokenAndUser = async (requestToken: string) => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/auth/get-access-token`,
          {},
          {
            headers: {
              Authorization: `Bearer ${requestToken}`,
            },
          }
        );

        const data: TokenResponse = response.data.data;

        if (!data.accessToken) throw new Error("No access token in response");

        const token = data.accessToken;
        localStorage.setItem("accessToken", token);
        console.log("Access token retrieved successfully:", data);

        const userResponse = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/auth/user`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("User data response:", userResponse);
        const user = userResponse.data.data.user;
        console.log("User data retrieved successfully:", user);

        posthog.identify(user.id, {
          email: user.email,
          name: user.name,
        });
        console.log("User identified in PostHog:", user.id);


        router({ to: "/dashboard" });
      } catch (err: unknown) {
        const error = err as ApiError;
        console.error("Error during login process:", error);
        setError(
          error.response?.data?.message ||
          error.message ||
          "Login process failed"
        );
        setTimeout(() => {
          router({ to: "/signup" });
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const token = params.get("requestToken");

    if (token) {
      fetchAccessTokenAndUser(token);
    } else {
      setError("Missing requestToken in URL");
      setIsLoading(false);
      setTimeout(() => {
        router({ to: "/signup" });
      }, 3000);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <p className="text-muted-foreground">Redirecting back to signup...</p>
        </div>
      </div>
    );
  }

  return null;
}

export const Route = createFileRoute('/token/')({ component: TokenPage });
