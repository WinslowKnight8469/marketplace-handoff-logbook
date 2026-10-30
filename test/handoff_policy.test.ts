import assert from "node:assert/strict";
import test from "node:test";
import { decideHandoff } from "../src/order_handoff.js";

test("an order waits when a promised seller asset is missing", () => {
  const result = decideHandoff({
    orderId: "ord_1042",
    sellerId: "seller_studio_7",
    buyerId: "buyer_28",
    assetIds: ["cover-final.png", "source-files.zip"],
    readyAssetIds: ["cover-final.png"],
    buyerMessage: "The cover is ready; source files are exporting.",
  });

  assert.deepEqual(result, {
    state: "awaiting_assets",
    missingAssetIds: ["source-files.zip"],
  });
});
