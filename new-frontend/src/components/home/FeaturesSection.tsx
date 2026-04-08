import { motion } from "motion/react";

export default function FeaturesSection({
  features,
}: {
  features: {
    id: number;
    title: string;
    description: string;
    image: string;
  }[];
}) {
  return (
    <section className="md:py-16 w-full space-y-24" id="features">
      {/* Video Frame Section */}
      <div className="w-full">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6 aspect-[16/9]">
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              <video 
              autoPlay 
              muted 
              loop 
              className="w-full h-full object-cover"
              >
              <source src="/bg.mp4" type="video/mp4" />
              Your browser does not support the video tag.
              </video>

              {/* Video placeholder overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-lg"></div>
            </div>

            {/* Corner decorations */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full" />
            <div className="absolute bottom-4 left-4 w-1 h-1 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>

      {features.map((feature, index) => {
        const isEven = index % 2 === 0;

        return (
          <div key={feature.id} className="flex flex-col gap-12 items-start">
            {/* Text Content */}
            <div className="flex-1 space-y-6 text-right ml-auto">
              <div className="inline-block">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60 font-mono">
                  {`// FEATURE_${(index + 1).toString().padStart(2, "0")}`}
                </span>
              </div>

              <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-[1.1]">
                {feature.title}
              </h3>

              <p className="text-lg text-white/80 leading-relaxed font-light max-w-2xl ml-auto">
                {feature.description}
              </p>

              <div className="flex items-center gap-2 pt-4 justify-end">
                <div className="w-1 h-1 bg-white/40 rounded-full" />
                <span className="text-white/60 text-sm font-mono">
                  Production Ready
                </span>
              </div>
            </div>{" "}
            {/* Image Content */}
            <div className="flex-1">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400/40 via-sky-300/30 to-amber-100/45 border border-white/10 shadow-2xl">
                <div className="relative p-6 aspect-[4/3] sm:aspect-[4/3] ">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="object-contain w-full h-full rounded-lg scale-110 sm:scale-100 transition-transform"
                  />

                  {/* Corner decorations */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full" />
                  <div className="absolute bottom-4 left-4 w-1 h-1 bg-white/40 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
