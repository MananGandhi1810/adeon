import { motion } from "motion/react";
export default function Footer() {
  const footerLinks = {
    product: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
      { name: "Social Proof", href: "#social-proof" },
    ],
  };

  return (
    <motion.footer
      className="relative mt-24 bg-background"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      viewport={{ once: true }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 "
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />{" "}
        <motion.div
          className="absolute bottom-20 right-20 w-24 h-24 bg-white/5 rounded-full blur-3xl"
          animate={{
            x: [0, -25, 0],
            y: [0, 15, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      <div className="relative max-w-6xl mx-auto px-4 md:px-10 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand Section */}
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeInOut" }}
            viewport={{ once: true }}
          >
            <div className="mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3 tracking-tight">
                Zen.
              </h3>
              <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-md">
                The developer experience platform that brings clarity to chaos.
                Ship faster, break less, sleep better.
              </p>
            </div>
          </motion.div>

          {/* Product Links */}
          <motion.div
            className="md:col-span-1 md:justify-self-end"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeInOut" }}
            viewport={{ once: true }}
          >
            <h4 className="text-white font-medium mb-3 md:mb-4 text-xs md:text-sm uppercase tracking-wide">
              Product
            </h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.product.map((link, index) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.3 + index * 0.05,
                    ease: "easeInOut",
                  }}
                  viewport={{ once: true }}
                >
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white text-xs md:text-sm transition-colors font-mono"
                  >
                    {link.name}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>{" "}
        {/* Bottom Section */}
        <motion.div
          className="border-t border-[#3f4042] pt-6 md:pt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: "easeInOut" }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Copyright */}
            <div className="flex flex-col sm:flex-row items-start md:items-center gap-2 text-left">
              <p className="text-white/60 text-xs md:text-sm font-mono">
                © 2024 Adeon. All rights reserved.
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                <span>Built with care for developers</span>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Floating decorative elements */}
        <div className="absolute top-10 right-10 hidden lg:block">
          <motion.div
            className="w-1 h-1 bg-white/20 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="absolute bottom-20 left-10 hidden lg:block">
          <motion.div
            className="w-2 h-2 border border-white/20 rotate-45"
            animate={{
              rotate: [45, 225, 45],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>
      </div>
    </motion.footer>
  );
}
