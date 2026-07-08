import { createServerFn } from "@tanstack/react-start";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { priceId: string; environment: "sandbox" | "live" }) => data,
  )
  .handler(async ({ data }) => {
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const result: { data?: Array<{ id: string }> } = await response.json();
    if (!result.data?.length) throw new Error(`Price not found: ${data.priceId}`);
    return result.data[0].id;
  });
