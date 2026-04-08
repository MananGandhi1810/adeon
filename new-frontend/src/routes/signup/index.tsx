import { createFileRoute } from '@tanstack/react-router';

import { Github, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/navbar";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { MagicCard } from "@/components/magicui/magic-card";
import posthog from "posthog-js";

function SignupPage() {
  const router = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
          const response = await axios.get(
            `${import.meta.env.VITE_SERVER_URL}/auth/user`,
            { headers: { authorization: `Bearer ${accessToken}` } },
          );
          if (response.data.data.user) {
            const user = response.data.data.user;
            console.log("User is authenticated:", user);
            posthog.identify(user.id, {
              email: user.email,
              name: user.name,
            })
            router({ to: "/dashboard", replace: true });
          }
        }
      } catch (error) {
        console.error("Error during signup:", error);
        setError(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="relative z-10 flex min-h-[80vh] max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-xl">
          {/* Left side - Image skeleton */}
          <div className="hidden lg:block lg:w-1/2">
            <Skeleton className="w-full h-full rounded-l-3xl" />
          </div>

          {/* Right side - Auth Card skeleton */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
            <div className="w-full max-w-md space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-px w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) return <p>{error}</p>;

  return (
    <>
      <Navbar />
      <div className="relative z-10 flex min-h-[100vh] w-screen mx-auto rounded-3xl overflow-hidden shadow-xl bgg">
        {/* Left side - Image */}
        <div
          className="hidden lg:block lg:w-1/2 bg-cover bg-center "
          style={{ backgroundImage: "url('/bg.png')" }}
        />

        {/* Right side - Auth Card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <MagicCard
              gradientFrom="#A07CFE"
              gradientTo="#FE8FB5"
              gradientOpacity={0.9}
              className="backdrop-blur-xl border border-white/10 w-full shadow-xl rounded-2xl p-10"
            >
              <CardHeader className="space-y-4 py-10">
                <CardTitle className="text-3xl font-bold tracking-tight text-white">
                  Create an account
                </CardTitle>
                <CardDescription className="text-base text-white/80">
                  Sign up with GitHub to get started in seconds
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                <a
                  href={`https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GH_CLIENT_ID}&scope=user%20repo`}
                  className="block"
                >
                  <Button
                    className="w-full h-14 bg-white text-black hover:bg-white/90 border border-black/10 shadow-md group"
                    size="lg"
                  >
                    <Github className="mr-3 h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                    Continue with GitHub
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </a>

                <Separator className="my-6 bg-white/20" />

                <div className="space-y-4 text-left text-sm text-white/70">
                  <p>
                    By creating an account, you agree to our{" "}
                    <a href="/terms" className="text-white hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-white hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </p>
                  <p>
                    Already have an account?{" "}
                    <a href="/signup" className="text-white hover:underline">
                      Sign in
                    </a>
                  </p>
                </div>
              </CardContent>
            </MagicCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute('/signup/')({ component: SignupPage });
