import assert from "node:assert/strict";
import { verifyWebhookSignature } from "./domain_onboarding.ts";
import { createHmac } from "node:crypto";

const body = JSON.stringify({ event: "dns.domain.verified", domain: "studio.example" });
const secret = "webhook-secret";
const signature = createHmac("sha256", secret).update(body).digest("hex");
assert.equal(verifyWebhookSignature(body, signature, secret), true);
assert.equal(verifyWebhookSignature(body + " ", signature, secret), false);
console.log("webhook signature decision passed");
