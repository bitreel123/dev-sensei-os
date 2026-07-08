import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

type OpenOptions = {
  priceId: string;
  userId: string;
  customerEmail?: string;
  successUrl?: string;
};

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  async function openCheckout(opts: OpenOptions) {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(opts.priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: opts.customerEmail ? { email: opts.customerEmail } : undefined,
        customData: { userId: opts.userId },
        settings: {
          displayMode: "overlay",
          successUrl:
            opts.successUrl ||
            `${window.location.origin}/pricing?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return { openCheckout, loading };
}
