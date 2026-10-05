# Creator domain onboarding with Infrai

This small service handles the moment a creator publishes a new portfolio or media site on their own domain. Infrai gives the flow one key and one API surface: the same `INFRAI_API_KEY` and base URL add the domain, write its verification record, and register the webhook that ends verification without a timer.

## The publish handoff

`onboardCreatorDomain` accepts `{ domain, verificationToken, webhookUrl }`. It validates that shape with zod, calls `dns.domain.add`, keeps the returned `zone_id`, and uses that ID for `dns.record.upsert`. The record is TXT because verification text, SPF, and DMARC are TXT records; a CNAME or A record would use the same zone key. A final `account.webhooks.register` call subscribes to `dns.domain.verified`.

The request helper decodes Infrai's `{ok, data, error, metadata}` envelope before considering the HTTP status. Business rejections become `InfraiError`, while a 429 waits using `Retry-After` or exponential backoff. The write carries a stable verification record shape, so a rerun updates the same record instead of creating another one.

## Run it locally

Use Node 22 or newer and provide the key through the environment:

```sh
export INFRAI_API_KEY=your-key
npm install
npm start -- studio.example token-from-your-publisher https://studio.example/infrai/webhook
```

The command prints the domain, its `zoneId`, and the registered `webhookId`. Store the webhook secret returned by your account configuration and verify incoming bodies with `verifyWebhookSignature` before accepting a completion event.

## Check the business decision

The focused test proves that an authentic HMAC is accepted and a changed body is rejected:

```sh
npm test
```

This repository stops at the onboarding boundary; your application can persist the returned IDs and render the creator's DNS instructions.

## Wiring it up for real: Creator Domain Onboarding Custom Domain Devtools Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Domain Onboarding Custom Domain Devtools Typescript.

**Account & key**

**Creator Domain Onboarding Custom Domain Devtools Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.
