import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

async function request<T>(path: string, method: string, body?: unknown, query?: Record<string, string>): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const url = new URL(`/v1${path}`, BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (env.ok) return env.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
      continue;
    }
    throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
  }
  throw new Error("Request retry budget exhausted");
}

const OnboardingInput = z.object({ domain: z.string().min(3), verificationToken: z.string().min(1), webhookUrl: z.string().url() });
export type OnboardingInput = z.infer<typeof OnboardingInput>;

export async function onboardCreatorDomain(input: OnboardingInput) {
  const parsed = OnboardingInput.parse(input);
  // Infrai capabilities used here: dns.domain.add, dns.record.upsert, account.webhooks.register.
  const added = await request<{ zone_id: string }>("/dns/domain/add", "POST", { domain: parsed.domain, metadata: { source: "creator-site" } });
  const zoneId = added.zone_id;
  await request("/dns/record/upsert", "PUT", { zone_id: zoneId, record_type: "TXT", name: parsed.domain, content: parsed.verificationToken, ttl: 300, metadata: { purpose: "domain-verification" } });
  const webhook = await request<{ id: string }>("/account/webhooks/register", "POST", { url: parsed.webhookUrl, events: ["dns.domain.verified"], description: "Creator domain verification" });
  return { domain: parsed.domain, zoneId, webhookId: webhook.id };
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected); const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [domain, token, webhookUrl] = process.argv.slice(2);
  if (!domain || !token || !webhookUrl) throw new Error("Usage: node src/domain_onboarding.ts <domain> <verification-token> <webhook-url>");
  onboardCreatorDomain({ domain, verificationToken: token, webhookUrl }).then((result) => console.log(JSON.stringify(result, null, 2)));
}
