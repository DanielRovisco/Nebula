import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { NextRequest } from "next/server";
import { createPracaMcpServer } from "@/mcp/server";
import { authenticate, errorResponse } from "@/server/api/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Remote MCP endpoint (Streamable HTTP, stateless). Authenticated with the same `prk_` API keys as /api/v1, so plan
 * entitlements, the per-key rate limit and the monthly quota apply. One HTTP request counts as one API call.
 */
async function handle(req: NextRequest): Promise<Response> {
  try {
    await authenticate(req);
  } catch (e) {
    return errorResponse(e);
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = createPracaMcpServer();
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    void transport.close();
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
