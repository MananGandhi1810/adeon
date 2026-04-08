import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useInView } from "motion/react";

function TallyFormWithBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://tally.so/widgets/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Script
        id="tally-js"
        src="https://tally.so/widgets/embed.js"
        strategy="lazyOnload"
      />
      <div
        ref={containerRef}
        className="relative h-screen w-full overflow-hidden"
        style={{
          opacity: isInView ? 1 : 0,
          transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.5s",
        }}
      >
        <div
          className="absolute top-0 left-0 min-h-full min-w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/bg.png')",
            filter: isInView ? "brightness(0.2)" : "brightness(0)",
            transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.5s",
          }}
        />
        <div
          className="absolute inset-0 bg-black"
          style={{
            opacity: isInView ? 0.5 : 0,
            transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.5s",
          }}
        />
        <div
          className="absolute inset-0 z-10"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.8s",
          }}
        >
          <iframe
            data-tally-src="https://tally.so/r/nGjovQ?transparentBackground=1"
            width="100%"
            height="100%"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
            title="Survey"
            style={{ border: "none", maxWidth: "100%", maxHeight: "100vh" }}
          ></iframe>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute('/survey/')({ component: TallyFormWithBackground });
