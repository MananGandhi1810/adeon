import { cn } from "@/lib/utils";
import React from "react";

interface DotsBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function DotsBackground({ children, className }: DotsBackgroundProps) {
  return (
    <div
      className={cn("relative min-h-screen w-full bg-background", className)}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-35 ",
          "[background-size:40px_40px]",
          "[background-image:radial-gradient(#e5e5e5_1px,transparent_1px)]",
          "dark:[background-image:radial-gradient(#262626_1px,transparent_1px)]",
        )}
      />
      {/* Radial gradient for the container to give a faded look */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_35%,black)]"></div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
