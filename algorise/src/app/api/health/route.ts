import { NextResponse } from "next/server";
import { authReadiness } from "@/lib/auth";
import { loadGatewayConfig } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const llm = loadGatewayConfig();
  const configuredSlots = Object.values(llm.slots).filter((slot) => slot.modelId).map((slot) => slot.name);

  return NextResponse.json({
    status: "healthy",
    service: "algorise-web",
    auth: authReadiness(),
    llm: {
      killSwitch: llm.killSwitch,
      primaryConfigured: Boolean(llm.providers.primary),
      secondaryConfigured: Boolean(llm.providers.secondary),
      configuredSlots,
    },
    integrations: {
      databaseConnectionStringPresent: Boolean(process.env.DATABASE_URL),
      redisConnectionStringPresent: Boolean(process.env.REDIS_URL),
      judgeBaseUrlPresent: Boolean(process.env.JUDGE_BASE_URL),
      reachabilityVerified: false,
    },
    timestamp: new Date().toISOString(),
  });
}
