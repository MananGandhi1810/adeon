import { motion } from "motion/react";
export default function DescriptionBlock() {
  return (
    <motion.div
      className="flex flex-col md:flex-row items-start justify-between w-full gap-12"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      viewport={{ once: true }}
    >
      <div className="flex-1">
        <motion.div
          className="inline-block mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          viewport={{ once: true }}
        >
          <span className="text-xs uppercase tracking-[0.2em] text-white/60 font-mono">
            {"// OUR_PRODUCT"}
          </span>
        </motion.div>{" "}
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-12 tracking-tight leading-[1.2]">
          The Complete Developer Experience Platform
        </h1>
        <p className="text-base md:text-lg text-white/70 max-w-2xl leading-relaxed font-light mb-6">
          Developers face tool overload, slow feedback loops, and integration
          headaches. We unify your workflow, automate the tedious parts, and
          provide instant insights—so you can focus on building, not battling
          your tools.
        </p>
        <p className="text-sm md:text-base text-white/70 max-w-2xl leading-relaxed font-light mb-12">
          And its super easy to get started with, just log in with your Github
          account, and add your repositories and we are ready to go!
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-white/50 font-mono mb-8">
          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">
            Zero Configuration
          </span>
          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">
            AI-Powered
          </span>
          <span className="bg-white/5 px-2 py-1 rounded border border-white/10">
            Enterprise Ready
          </span>
        </div>
      </div>{" "}
    </motion.div>
  );
}
