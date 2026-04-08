import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { motion } from "motion/react";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar: string;
}

interface Testimonial14Props {
  title?: string;
  description?: string;
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    name: "Sarah Chen",
    role: "Engineering Manager",
    company: "TechCorp",
    content:
      "CodeAI has transformed our development workflow. The automated code review and documentation features have increased our team's velocity by 40%.",
    rating: 5,
    avatar: "https://github.com/shadcn.png",
  },
  {
    name: "Michael Rodriguez",
    role: "Senior Full-Stack Developer",
    company: "TechCorp",
    content:
      "The vulnerability scanner is incredibly effective. It caught several security issues in our codebase that we would have missed otherwise.",
    rating: 5,
    avatar: "https://github.com/shadcn.png",
  },
  {
    name: "Emily Watson",
    role: "CTO",
    company: "StartupXYZ",
    content:
      "The 'Chat with Code' feature is revolutionary. Our junior developers can now understand and modify complex codebases with confidence.",
    rating: 5,
    avatar: "https://github.com/shadcn.png",
  },
];

const Testimonial14 = ({
  title = "Trusted by Developers Worldwide",
  description = "Join thousands of developers who are shipping better code, faster with AI-powered development tools.",
  testimonials = defaultTestimonials,
}: Testimonial14Props) => {
  return (
    <section className="py-24">
      <div className="container mx-auto">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-medium tracking-tight mb-4">{title}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {description}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative bg-card rounded-2xl p-8 shadow-lg border border-border/40 hover:border-border/60 transition-colors duration-300"
            >
              <div className="absolute -top-4 left-8">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Quote className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-border/40 transition-transform duration-300 group-hover:scale-110">
                    <AvatarImage
                      src={testimonial.avatar}
                      alt={testimonial.name}
                    />
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-transform duration-300 group-hover:scale-110"
                    />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {testimonial.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Testimonial14 };
