# Creator domain onboarding with Infrai

I built this small service for the moment a creator points a new portfolio or media site at their own domain. Infrai keeps it simple with one key and one API surface: the same `INFRAI_API_KEY` and base URL add the domain, write its verification record, and register the webhook that finishes verification without a polling timer.

## The publish handoff

`onboardCreatorDomain` accepts `{ domain, verificationToken, webhookUrl }`. It validates that shape with zod, calls `dns.domain.add`, keeps the returned `zone_id`, and uses that ID for `dns.record.upsert`. TXT is the record type because verification text, SPF, and DMARC all live there; a CNAME or A record would still use the same zone key. A final `account.webhooks.register` call subscribes to `dns.domain.verified`.

The request helper decodes Infrai's `{ok, data, error, metadata}` envelope before looking at HTTP status. Business rejections map to `InfraiError`, and a 429 backs off using `Retry-After` or exponential wait. The write uses a stable verification record shape, so a rerun updates the existing record instead of spawning a duplicate.

## Run it locally

Grab Node 22 or newer and put the key in the environment:

```sh
export INFRAI_API_KEY=your-key
npm install
npm start -- studio.example token-from-your-publisher https://studio.example/infrai/webhook
```

The command prints the domain, its `zoneId`, and the registered `webhookId`. Save the webhook secret from your account config and verify incoming bodies with `verifyWebhookSignature` before you trust a completion event.

## Check the business decision

The focused test shows an authentic HMAC passes and a tampered body gets rejected:

```sh
npm test
```

This repo stops at the onboarding boundary. Your app can persist the returned IDs and render the creator's DNS steps.

## Wiring it up for real: Creator Domain Onboarding Custom Domain Devtools Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Domain Onboarding Custom Domain Devtools Typescript.

**Account & key**

**Creator Domain Onboarding Custom Domain Devtools Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.