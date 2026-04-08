import { FcGoogle } from "react-icons/fc";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Login2Props {
  heading?: string;
  subheading?: string;
  logo: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  buttonText?: string;
  googleText?: string;
  signupText?: string;
  signupUrl?: string;
}

const Login2 = ({
  heading = "Login",
  subheading = "Welcome back to your account",
  logo = {
    url: "https://www.shadcnblocks.com",
    src: "https://shadcnblocks.com/images/block/block-1.svg",
    alt: "logo",
    title: "shadcnblocks.com",
  },
  googleText = "Sign up with Google",
  buttonText = "Login",
  signupText = "Don't have an account?",
  signupUrl = "https://shadcnblocks.com",
}: Login2Props) => {
  return (
    <section className="h-screen bg-muted">
      <div className="flex h-full items-center justify-center">
        <div className="flex w-full max-w-sm flex-col items-center gap-y-8">
          <div className="flex flex-col items-center gap-y-2">
            {/* Logo */}
            <div className="flex items-center gap-1 lg:justify-start">
              <a href={logo.url}>
                <div className="relative h-12 w-12">
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    title={logo.title}
                    fill
                    className="object-contain"
                  />
                </div>
              </a>
            </div>
            <h1 className="text-3xl font-semibold">{heading}</h1>
            <p className="text-sm text-muted-foreground">{subheading}</p>
          </div>
          <div className="flex w-full flex-col gap-8 rounded-md border border-muted bg-white px-6 py-12 shadow-md">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="bg-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  required
                  className="bg-white"
                />
              </div>
              <div className="flex flex-col gap-4">
                <Button type="submit" className="mt-2 w-full">
                  {buttonText}
                </Button>
                <Button variant="outline" className="w-full">
                  <FcGoogle className="mr-2 size-5" />
                  {googleText}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-1 text-sm text-muted-foreground">
            <p>{signupText}</p>
            <a
              href={signupUrl}
              target="_blank"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Login2 };
