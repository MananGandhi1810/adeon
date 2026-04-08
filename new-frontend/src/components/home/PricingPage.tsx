import { Pricing4 } from "@/components/price";

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: {
        monthly: 0,
        yearly: 0,
      },
      description: "Perfect for getting started",
      features: [
        "1 User",
        "Basic Support",
        "Limited Features",
        "Community Access",
        "Basic Templates",
      ],
      badge: "Free Forever",
      isPopular: false,
    },
    {
      name: "Pro",
      price: {
        monthly: 1200, // ₹1200 in INR
        yearly: 12000, // ₹12,000 in INR (save 2 months)
      },
      description: "For growing teams and businesses",
      features: [
        "Up to 10 Users",
        "Priority Support",
        "Advanced Features",
        "All Integrations",
        "Custom Templates",
        "Analytics Dashboard",
        "API Access",
      ],
      badge: "Most Popular",
      isPopular: true,
    },
    {
      name: "Enterprise",
      price: {
        monthly: 0, // This will show as "Custom"
        yearly: 0,
      },
      description: "For large organizations with custom needs",
      features: [
        "Unlimited Users",
        "24/7 Dedicated Support",
        "All Features",
        "Dedicated Account Manager",
        "Custom Integrations",
        "Advanced Security",
        "SLA Guarantee",
        "On-premise Deployment",
      ],
      isPopular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Pricing4
        title="Choose Your Plan"
        description="Start free and scale as you grow. All plans include our core features with different limits and support levels."
        plans={plans}
      />
    </div>
  );
}
