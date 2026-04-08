import { motion } from "motion/react";
import { MagicCard } from "../magicui/magic-card";
export default function SocialProofSection() {
  const devMetrics = [
    {
      id: 1,
      metric: "Deploy Frequency",
      value: "47x",
      description: "Faster than industry average",
      tech: "CI/CD Pipeline",
    },
    {
      id: 2,
      metric: "MTTR",
      value: "< 5min",
      description: "Mean time to recovery",
      tech: "Auto Rollback",
    },
    {
      id: 3,
      metric: "Code Coverage",
      value: "94.7%",
      description: "Automated test generation",
      tech: "AI Testing",
    },
    {
      id: 4,
      metric: "Security Score",
      value: "A+",
      description: "Zero critical vulnerabilities",
      tech: "SAST/DAST",
    },
  ];

  const testimonials = [
    {
      id: 1,
      company: "NotesPortal",
      role: "Lead Engineer",
      quote:
        "The application's diverse features are highly appreciated, as they provide an immediate solution to mundane, everyday tasks. I am eager to integrate this product into my daily routine upon its full release.",
      author: "Arhaan Bhiwandkar",
    },
    {
      id: 2,
      company: "Captr",
      role: "Backend Engineer",
      quote:
        "The Readme Generator produces better Readme files than the other AIs that I have used. All of the features help me to make the code better by checking the test cases, checking for vulnerabilities, deployment and even understanding the code structure visually. Loved it",
      author: "Shashank Goel",
    },
    {
      id: 3,
      company: "Proxima",
      role: "Founder",
      quote:
        "Quite a useful piece of tech, scanning for vulnerabilities, visualising code structure and generating READMEs are a pain for every developer. Even as tools like cursor become capable, there is a lack of an integrated environment to analyze PRs, create diagrams and do automated testing.",
      author: "Akshay Kriplani",
    },
    {
      id: 4,
      company: "ManPost",
      role: "Lead Backend Engineer",
      quote:
        "Developer velocity increased 340%. Team ships features daily instead of weekly sprints.",
      author: "Kartik Jain",
    },
  ];

  return (
    <div className="relative z-10 my-24 max-w-[1400px] mx-auto px-5 md:px-10" id="social-proof">
      {/* Section Header */}
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <motion.div
          className="inline-block mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          viewport={{ once: true }}
        >
          <span className="text-xs uppercase tracking-[0.2em] text-white/60 font-mono">
            {"// PRODUCTION_METRICS"}
          </span>
        </motion.div>
        <motion.h2
          className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 tracking-tighter leading-tight text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeInOut" }}
          viewport={{ once: true }}
        >
          Performance that speaks in code
        </motion.h2>
        <motion.p
          className="text-white/70 text-base max-w-2xl font-mono leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeInOut" }}
          viewport={{ once: true }}
        >
          Real metrics from engineering teams shipping at scale
        </motion.p>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        {" "}
        {devMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className="group relative overflow-hidden rounded-lg shadow-lg h-[140px] bg-card border border-white/10"
          >
            <motion.div
              className="p-4 h-full flex flex-col justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.4 + index * 0.1,
                ease: "easeInOut",
              }}
              viewport={{ once: true }}
            >
              <div>
                <div className="text-xs text-white/60 font-mono mb-1">
                  {metric.tech}
                </div>
                <div className="text-lg md:text-xl font-bold text-white font-mono tracking-tight">
                  {metric.value}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/80 font-medium mb-1">
                  {metric.metric}
                </div>
                <div className="text-xs text-white/60 leading-tight">
                  {metric.description}
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </motion.div>

      {/* Testimonials Grid */}
      <motion.div
        className="grid md:grid-cols-2 gap-6 mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        {" "}
        {testimonials.map((testimonial, index) => (
          <MagicCard
            key={testimonial.id}
            className="group relative overflow-hidden rounded-xl shadow-xl bg-[#0f1013]"
          >
            <motion.div
              className="p-6 h-full"
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.6 + index * 0.1,
                ease: "easeInOut",
              }}
              viewport={{ once: true }}
            >
              {/* Company Badge */}
              <div className="inline-block mb-4">
                <span className="text-xs font-mono px-2 py-1 rounded bg-white/10 text-white/80 border border-white/20">
                  {testimonial.company}
                </span>
              </div>

              {/* Quote */}
              <p className="text-white/90 text-sm leading-relaxed mb-6 font-light">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium text-sm">
                    {testimonial.author}
                  </div>
                  <div className="text-white/60 text-xs font-mono">
                    {testimonial.role}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white/60 rounded-full" />
                </div>
              </div>

              {/* Floating indicator */}
              <motion.div
                className="absolute top-4 right-4 w-1 h-1 bg-white/40 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.5,
                }}
              />
            </motion.div>
          </MagicCard>
        ))}
        {/* Spacer for uneven grid items */}
        <div className="hidden md:block md:col-span-2" />
      </motion.div>

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 hidden md:block">
        <motion.div
          className="w-1 h-1 bg-white/30 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="absolute bottom-20 right-16 hidden md:block">
        <motion.div
          className="w-2 h-2 border border-white/30 rotate-45"
          animate={{
            rotate: [45, 225, 45],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
}
