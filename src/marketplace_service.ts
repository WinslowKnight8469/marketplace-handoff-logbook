import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai.js";
import { handoffRequestSchema, recordHandoff, searchOrderAudit } from "./order_handoff.js";

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "POST" && url.pathname === "/jobs/handoff") {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const input = handoffRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      return json(response, 200, await recordHandoff(input));
    }
    if (request.method === "GET" && url.pathname === "/logs/search") {
      const orderId = url.searchParams.get("orderId");
      if (!orderId) return json(response, 400, { error: "orderId is required" });
      return json(response, 200, await searchOrderAudit(orderId));
    }
    return json(response, 404, { error: "route not found" });
  } catch (error) {
    if (error instanceof ZodError) return json(response, 400, { error: "invalid request", issues: error.issues });
    if (error instanceof SyntaxError) return json(response, 400, { error: "request body must be JSON" });
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return json(response, status, { error: error.code, message: error.message });
    }
    console.error(error);
    return json(response, 500, { error: "internal error" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Marketplace handoff service listening on http://localhost:${port}`));
