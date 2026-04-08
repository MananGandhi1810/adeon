import { useState } from "react";

import { motion, AnimatePresence } from "motion/react";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

interface FeatureItem {
    id: number;
    title: string;
    description: string;
    gradient: "bg1" | "bg2" | "bg3";
}

interface Feature197Props {
    features: FeatureItem[];
}

const defaultFeatures: FeatureItem[] = [
    {
        id: 1,
        title: "README Generator",
        description:
            "AI-powered documentation generation that creates comprehensive README files from your codebase in seconds.",
        gradient: "bg1",
    },
    {
        id: 2,
        title: "Pull Request Analyzer",
        description:
            "Intelligent PR analysis with automated code reviews, impact assessment, and merge recommendations.",
        gradient: "bg2",
    },
    {
        id: 3,
        title: "Vulnerability Scanner",
        description:
            "Advanced security scanning that identifies vulnerabilities, OWASP compliance issues, and suggests fixes.",
        gradient: "bg3",
    },
    {
        id: 4,
        title: "Chat with Code",
        description:
            "Natural language interface to understand, debug, and modify your codebase through conversational AI.",
        gradient: "bg1",
    },
    {
        id: 5,
        title: "Deploy",
        description:
            "Conversational deployment pipeline that handles CI/CD, environment setup, and monitoring configuration.",
        gradient: "bg2",
    },
    {
        id: 6,
        title: "Code Structure Visualization",
        description:
            "Interactive dependency graphs and architecture diagrams to understand complex codebases instantly.",
        gradient: "bg3",
    },
    {
        id: 7,
        title: "Test Case Generation",
        description:
            "AI-generated test suites with edge case detection, performance testing, and coverage optimization.",
        gradient: "bg1",
    },
];

const Feature197 = ({ features = defaultFeatures }: Feature197Props) => {
    const [activeTabId, setActiveTabId] = useState<number | null>(1);

  return (
    <div className="w-full">
      <div className="mb-12 flex w-full items-start justify-between gap-16">
        <div className="w-full md:w-1/2">
          <Accordion type="single" collapsible defaultValue="item-1">
            {features.map((tab) => (
              <AccordionItem key={tab.id} value={`item-${tab.id}`}>
                <AccordionTrigger
                  onClick={() => {
                    setActiveTabId(tab.id);
                  }}
                  className="cursor-pointer py-6 no-underline! transition hover:bg-muted/50 rounded-lg px-4"
                >
                  <h6
                    className={`text-xl font-medium ${
                      tab.id === activeTabId
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab.title}
                  </h6>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 pb-4">
                    <p className="text-muted-foreground leading-relaxed">
                      {tab.description}
                    </p>
                    <Separator className="my-4" />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span>Learn more about {tab.title.toLowerCase()}</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="relative hidden md:block w-1/2 h-[600px] rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {features.map((feature) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: feature.id === activeTabId ? 1 : 0,
                  scale: feature.id === activeTabId ? 1 : 0.95,
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`absolute inset-0 ${
                  feature.id === activeTabId ? "z-10" : "z-0"
                }`}
              >
                <div className="relative h-full w-full">
                  <img
                    src={`/${feature.gradient}.png`}
                    alt={feature.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={feature.id === 1}
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/30 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <h3 className="text-4xl font-medium text-white">
                        {feature.title}
                      </h3>
                      <p className="text-white/80 max-w-md mx-auto">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export { Feature197 };
