"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FaGoogle,
  FaMicrosoft,
  FaAmazon,
  FaFacebook,
  FaApple,
} from "react-icons/fa";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Hero3Props {
  heading: string;
  description: string;
  buttons: {
    primary: {
      text: string;
      url: string;
    };
    secondary: {
      text: string;
      url: string;
    };
  };
  reviews: {
    count: number;
    rating: number;
    avatars: {
      src: string;
      alt: string;
    }[];
  };
}

const Hero3 = ({ heading, description, buttons, reviews }: Hero3Props) => {
  const companyIcons = [
    { icon: FaGoogle, color: "#4285F4", name: "Google" },
    { icon: FaMicrosoft, color: "#00A4EF", name: "Microsoft" },
    { icon: FaAmazon, color: "#FF9900", name: "Amazon" },
    { icon: FaFacebook, color: "#1877F2", name: "Meta" },
    { icon: FaApple, color: "#000000", name: "Apple" },
  ];

  return (
    <section className="relative py-24">
      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-medium tracking-tight md:text-6xl lg:text-7xl">
                {heading}
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {buttons.primary && (
                <Button size="lg" className="group" asChild>
                  <a href={buttons.primary.url}>
                    {buttons.primary.text}
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                </Button>
              )}
              {buttons.secondary && (
                <Button size="lg" variant="outline" className="group" asChild>
                  <a href={buttons.secondary.url}>
                    {buttons.secondary.text}
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                </Button>
              )}
            </div>

            <div className="flex flex-col items-center lg:items-start space-y-4 w-full">
              <Separator className="w-full max-w-md" />
              <div className="flex items-center gap-6">
                <div className="flex -space-x-2">
                  <TooltipProvider>
                    {companyIcons.map(({ icon: Icon, color, name }, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <div className="relative w-10 h-10 rounded-full border-2 border-background overflow-hidden bg-white flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:z-10">
                            <Icon className="w-6 h-6" style={{ color }} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-medium">
                    {reviews.count.toLocaleString()} developers trust us
                  </p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.floor(reviews.rating) }).map(
                      (_, i) => (
                        <span key={i} className="text-yellow-400">
                          ★
                        </span>
                      ),
                    )}
                    <span className="text-muted-foreground">
                      {reviews.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-[600px] w-full group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-3xl transition-opacity duration-500 group-hover:opacity-75" />
            <Image
              src="/hero.png"
              alt="AI-powered development tools"
              fill
              className="object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export { Hero3 };
