import { createFileRoute } from '@tanstack/react-router';

import PricingSection from "@/components/home/PricingSection";

function PricingDemo() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            Updated Pricing with Currency Converter
          </h1>
          <p className="text-muted-foreground mb-6">
            The Pro plan is now set to ₹1200/month (₹12,000/year) and Enterprise
            remains as contact sales. Use the currency dropdown to convert
            prices to your preferred currency.
          </p>
          <div className="bg-muted p-4 rounded-lg max-w-2xl mx-auto">
            <h3 className="font-semibold mb-2">Key Features:</h3>
            <ul className="text-sm text-left space-y-1">
              <li>• Pro Plan: ₹1200/month or ₹12,000/year (saves 2 months)</li>
              <li>• Currency converter with 10 supported currencies</li>
              <li>• Real-time exchange rate display</li>
              <li>• Monthly/Yearly billing toggle</li>
              <li>• Enterprise plan shows "Custom" pricing</li>
            </ul>
          </div>
        </div>
        <PricingSection />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/pricing-demo/')({ component: PricingDemo });
