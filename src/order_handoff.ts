import { createHash } from "node:crypto";
import { z } from "zod";
import { infrai } from "./infrai.js";

export const handoffRequestSchema = z.object({
  orderId: z.string().min(1),
  sellerId: z.string().min(1),
  buyerId: z.string().min(1),
  assetIds: z.array(z.string().min(1)).min(1),
  readyAssetIds: z.array(z.string().min(1)),
  buyerMessage: z.string().min(1).max(500),
});

export type HandoffRequest = z.infer<typeof handoffRequestSchema>;
export type HandoffDecision =
  | { state: "handed_off"; missingAssetIds: [] }
  | { state: "awaiting_assets"; missingAssetIds: string[] };

export function decideHandoff(input: HandoffRequest): HandoffDecision {
  const ready = new Set(input.readyAssetIds);
  const missingAssetIds = input.assetIds.filter((assetId) => !ready.has(assetId));
  return missingAssetIds.length === 0
    ? { state: "handed_off", missingAssetIds: [] }
    : { state: "awaiting_assets", missingAssetIds };
}

export async function recordHandoff(input: HandoffRequest): Promise<HandoffDecision> {
  const decision = decideHandoff(input);
  const idempotencyKey = createHash("sha256")
    .update(`${input.orderId}:${decision.state}:${input.readyAssetIds.slice().sort().join(",")}`)
    .digest("hex");

  await infrai.logs.ingest([
    {
      timestamp: new Date().toISOString(),
      level: "info",
      service: "marketplace-handoff",
      environment: process.env.NODE_ENV ?? "development",
      message: "Marketplace order handoff evaluated",
      order_id: input.orderId,
      seller_id: input.sellerId,
      buyer_id: input.buyerId,
      asset_ids: input.assetIds,
      ready_asset_ids: input.readyAssetIds,
      buyer_update: input.buyerMessage,
      handoff_state: decision.state,
      missing_asset_ids: decision.missingAssetIds,
    },
  ], idempotencyKey);

  return decision;
}

export async function searchOrderAudit(orderId: string) {
  const query = new URLSearchParams({
    q: orderId,
    service: "marketplace-handoff",
    limit: "50",
  });
  const [logs, credential, keys] = await Promise.all([
    infrai.logs.search<unknown>(query),
    infrai.account.whoami<unknown>(),
    infrai.account.keys.list<unknown>(),
  ]);
  return { orderId, credential, keys, logs };
}
