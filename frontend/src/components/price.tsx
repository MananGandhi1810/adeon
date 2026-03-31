"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PricingPlan {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: string[];
  badge?: string;
  isPopular?: boolean;
}

interface Currency {
  code: string;
  symbol: string;
  rate: number; // Rate relative to INR
}

interface Pricing4Props {
  title: string;
  description: string;
  plans: PricingPlan[];
}

const currencies: Currency[] = [
  { code: "INR", symbol: "₹", rate: 1 },
  { code: "USD", symbol: "$", rate: 0.012 }, // 1 INR = 0.012 USD
  { code: "EUR", symbol: "€", rate: 0.011 }, // 1 INR = 0.011 EUR
  { code: "GBP", symbol: "£", rate: 0.0096 }, // 1 INR = 0.0096 GBP
  { code: "JPY", symbol: "¥", rate: 1.83 }, // 1 INR = 1.83 JPY
  { code: "CAD", symbol: "C$", rate: 0.017 }, // 1 INR = 0.017 CAD
  { code: "AUD", symbol: "A$", rate: 0.019 }, // 1 INR = 0.019 AUD
  { code: "CNY", symbol: "¥", rate: 0.087 }, // 1 INR = 0.087 CNY
  { code: "SGD", symbol: "S$", rate: 0.016 }, // 1 INR = 0.016 SGD
  { code: "AED", symbol: "د.إ", rate: 0.044 }, // 1 INR = 0.044 AED
];

const Pricing4 = ({ title, description, plans }: Pricing4Props) => {
  const [isAnnually, setIsAnnually] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    currencies[0],
  ); // Default to INR
  const convertPrice = (priceInINR: number): string => {
    if (priceInINR === 0) return "Custom";
    const convertedPrice = priceInINR * selectedCurrency.rate;

    // Format based on currency
    if (selectedCurrency.code === "JPY" || selectedCurrency.code === "CNY") {
      // No decimal places for these currencies
      return Math.round(convertedPrice).toLocaleString();
    } else if (convertedPrice < 1) {
      // Show more decimal places for very small amounts
      return convertedPrice.toFixed(3);
    } else if (convertedPrice < 10) {
      // Show 2 decimal places for small amounts
      return convertedPrice.toFixed(2);
    } else {
      // Round to nearest whole number for larger amounts
      return Math.round(convertedPrice).toLocaleString();
    }
  };

  return (
    <section className="py-24">
      <div className="container mx-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-medium tracking-tight lg:text-5xl">
              {title}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {description}
            </p>
          </div>{" "}
          <div className="flex flex-col items-center justify-center gap-8">
            {/* Currency Selector */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <Label htmlFor="currency" className="text-sm font-medium">
                  Currency:
                </Label>
                <Select
                  value={selectedCurrency.code}
                  onValueChange={(value) => {
                    const currency = currencies.find((c) => c.code === value);
                    if (currency) setSelectedCurrency(currency);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCurrency.code !== "INR" && (
                <p className="text-xs text-muted-foreground">
                  Exchange rate: 1 INR = {selectedCurrency.rate.toFixed(4)}{" "}
                  {selectedCurrency.code}
                </p>
              )}
            </div>

            {/* Monthly/Yearly Toggle */}
            <div className="flex h-12 w-fit items-center rounded-full bg-muted p-1 text-lg">
              <RadioGroup
                defaultValue="monthly"
                className="h-full grid-cols-2"
                onValueChange={(value: string) => {
                  setIsAnnually(value === "annually");
                }}
              >
                <div className="h-full rounded-full transition-all has-[button[data-state='checked']]:bg-white">
                  <RadioGroupItem
                    value="monthly"
                    id="monthly"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="monthly"
                    className="flex h-full cursor-pointer items-center justify-center px-8 font-medium text-muted-foreground peer-data-[state=checked]:text-primary"
                  >
                    Monthly
                  </Label>
                </div>
                <div className="h-full rounded-full transition-all has-[button[data-state='checked']]:bg-white">
                  <RadioGroupItem
                    value="annually"
                    id="annually"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="annually"
                    className="flex h-full cursor-pointer items-center justify-center gap-1 px-8 font-medium text-muted-foreground peer-data-[state=checked]:text-primary"
                  >
                    Yearly
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="ml-2">
                            Save 20%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Get 2 months free with annual billing</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group relative flex w-full flex-col rounded-2xl border p-8 text-left transition-all duration-300 hover:border-border/60 ${
                  plan.isPopular ? "bg-muted/50" : ""
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-8 mb-8 block w-fit">
                    {plan.badge}
                  </Badge>
                )}
                <div className="space-y-4">
                  <h3 className="text-2xl font-medium">{plan.name}</h3>
                  <p className="text-muted-foreground">
                    {plan.description}
                  </p>{" "}
                  {plan.price.monthly > 0 ? (
                    <div className="space-y-1">
                      <span className="text-4xl font-medium">
                        {selectedCurrency.symbol}
                        {convertPrice(
                          isAnnually ? plan.price.yearly : plan.price.monthly,
                        )}
                      </span>
                      <p className="text-muted-foreground">
                        Per {isAnnually ? "year" : "month"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-4xl font-medium">Custom</span>
                  )}
                </div>
                <Separator className="my-6" />
                <ul className="space-y-4 text-muted-foreground">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 group/item"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover/item:bg-primary/20">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span className="group-hover:item:text-foreground transition-colors duration-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button className="w-full group" size="lg">
                    {plan.price.monthly > 0 ? "Get Started" : "Contact Sales"}
                    <Sparkles className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Pricing4 };
