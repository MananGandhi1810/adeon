import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Cta4Props {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  items?: string[];
}

const defaultItems = [
  "Easy Integration",
  "24/7 Support",
  "Customizable Design",
  "Scalable Performance",
  "Hundreds of Blocks",
];

const Cta4 = ({
  title = "Call to Action",
  description = "Let's build something amazing together",
  buttonText = "Get Started",
  buttonUrl = "https://shadcnblocks.com",
  items = defaultItems,
}: Cta4Props) => {
  return (
    <section className="py-24">
      <div className="container w-full mx-auto">
        <div className="flex justify-center">
          <div className="flex flex-col items-start justify-between gap-12 rounded-2xl bg-muted/50 px-8 py-12 md:flex-row lg:px-24 lg:py-16 backdrop-blur-sm border border-border/20">
            <div className="md:w-1/2 space-y-6">
              <div className="space-y-4">
                <h4 className="text-3xl font-medium tracking-tight md:text-4xl">
                  {title}
                </h4>
                <p className="text-lg text-muted-foreground">{description}</p>
              </div>
              <Button size="lg" className="group" asChild>
                <a href={buttonUrl} target="_blank">
                  {buttonText}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Button>
            </div>
            <div className="md:w-1/3">
              <Separator className="my-6 md:hidden" />
              <div className="space-y-6">
                <h5 className="text-lg font-medium">What&apos;s included:</h5>
                <ul className="flex flex-col space-y-4 text-base">
                  {items.map((item, idx) => (
                    <li className="flex items-center gap-3 group" key={idx}>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Cta4 };
