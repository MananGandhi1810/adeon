"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import Navbar from "@/components/navbar";
import HeroParallaxSection from "@/components/home/HeroParallaxSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import DescriptionBlock from "@/components/home/DescriptionBlock";
import SocialProofSection from "@/components/home/SocialProofSection";
import PricingSection from "@/components/home/PricingSection";
import Footer from "@/components/home/Footer";

const features = [
  {
    id: 1,
    title: "Environment Provisioning",
    description:
      "Automated infrastructure setup with containerized environments, dependency management, and scalable deployment configurations.",
    image: "/env.jpg",
  },
  {
    id: 2,
    title: "Test Case Generation",
    description:
      "AI-powered test suite creation with intelligent edge case detection, comprehensive coverage analysis, and automated regression testing.",
    image: "/test.jpg",
  },
  {
    id: 3,
    title: "Vulnerability Scanner",
    description:
      "Advanced security scanning that identifies vulnerabilities, OWASP compliance issues, and suggests automated fixes with real-time monitoring.",
    image: "/vun.jpg",
  },
];

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });
  const parallaxX = useTransform(springX, [-0.5, 0.5], [20, -20]);
  const parallaxY = useTransform(springY, [-0.5, 0.5], [20, -20]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (event.clientX - centerX) / rect.width;
    const y = (event.clientY - centerY) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <>
      <Navbar />
      <section className="min-h-screen  w-full px-4 md:px-10 pt-16 overflow-hidden">
        <div className="space-y-10 md:space-y-32">
          <HeroParallaxSection
            refObj={ref}
            parallaxX={parallaxX}
            parallaxY={parallaxY}
            handleMouseMove={handleMouseMove}
            handleMouseLeave={handleMouseLeave}
          />
          <div className="relative z-10 flex flex-col md:gap-8 text-left max-w-[1400px] mx-auto px-5">
            <DescriptionBlock />
            <FeaturesSection features={features} />
          </div>
          {/* <ProblemSection
            parallaxX={parallaxX}
            parallaxY={parallaxY}
            handleMouseMove={handleMouseMove}
            handleMouseLeave={handleMouseLeave}
          />{" "} */}
          <SocialProofSection /> <PricingSection />{" "}
          <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative z-10 rounded-3xl overflow-hidden w-full bg-[#0f1013] py-16 md:py-24 px-8 md:px-16 text-white text-center flex flex-col items-center justify-center max-w-[2160px] mx-auto border border-white/10 shadow-2xl"
          >
            <motion.img
              src="/cta.png"
              className="absolute inset-0 object-cover w-full h-full -z-20 opacity-20"
              style={{ x: parallaxX, y: parallaxY, scale: 1.05 }}
              alt="CTA Background"
            />
            <div className="absolute inset-0 bg-black/30 -z-10" />{" "}
            <div className="inline-block mb-6">
              <span className="text-xs uppercase tracking-[0.2em] text-white/60 font-mono">
                {"// READY_TO_START"}
              </span>
            </div>{" "}
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tighter leading-[1.1] px-4 max-w-4xl">
              {" "}
              Built by developers,for developers{" "}
            </h2>{" "}
            <p className="text-lg md:text-xl mb-10 max-w-3xl font-light leading-relaxed text-white/80 px-4">
              We understand the pain of broken workflows because we've lived it.
              Let us help you build better software, faster, with less friction.
            </p>{" "}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="px-10 py-4 rounded-full bg-white text-black text-base font-semibold shadow-2xl transition-all duration-300 hover:bg-gray-100 hover:shadow-3xl transform hover:scale-105 min-w-[200px]">
                Lets Get Started!
              </button>
            </div>{" "}
            <div className="mt-8  items-center gap-4 text-sm text-white/60 hidden md:flex">
              {" "}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>No credit card required</span>
              </div>
              <span>•</span>
              <span>14-day free trial</span>
              <span>•</span>
              <span>Cancel anytime</span>
            </div>
          </motion.div>
          <Footer />
        </div>
      </section>
    </>
  );
}
