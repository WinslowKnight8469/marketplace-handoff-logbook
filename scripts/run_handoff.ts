import { recordHandoff, searchOrderAudit } from "../src/order_handoff.js";

const input = {
  orderId: "ord_1042",
  sellerId: "seller_studio_7",
  buyerId: "buyer_28",
  assetIds: ["cover-final.png", "source-files.zip"],
  readyAssetIds: ["cover-final.png", "source-files.zip"],
  buyerMessage: "Final files are ready for download.",
};

const decision = await recordHandoff(input);
const audit = await searchOrderAudit(input.orderId);
console.log(JSON.stringify({ decision, audit }, null, 2));
