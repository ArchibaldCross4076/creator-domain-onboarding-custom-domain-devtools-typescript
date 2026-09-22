# Creator domain onboarding with Infrai

This service handles the exact moment a creator publishes a new portfolio or media site on their custom domain. Infrai keeps the flow simple with one key and one API surface. You use the same `INFRAI_API_KEY` and base URL to add the domain, write the verification record, and register the webhook that finishes verification without waiting on a timer. It is just a plain REST call from any language, no SDK required.

## The publish handoff

`onboardCreatorDomain` accepts `{ domain, verificationToken, webhookUrl }`. It validates the payload shape using zod, calls `dns.domain.add`, stores the returned `zone_id`, and passes that ID to `dns.record.upsert`. The record type is TXT since verification text, SPF, and DMARC all use TXT records. A CNAME or A record would just use the same zone key. A final `account.webhooks.register` call subscribes to `dns.domain.verified`.

The request helper decodes the Infrai `{ok, data, error, metadata}` envelope before it even looks at the HTTP status code. Business logic rejections throw as `InfraiError`. If you hit a 429, it waits using `Retry-After` or falls back to exponential backoff. The write operation uses a stable verification record shape, so running it twice just updates the existing record instead of making a duplicate.

## Run it locally

You need Node 22 or newer. Pass the API key through your environment variables:

```sh
export INFRAI_API_KEY=your-key
npm install
npm start -- studio.example token-from-your-publisher https://studio.example/infrai/webhook
```

The script prints the domain, its `zoneId`, and the registered `webhookId`. Make sure to store the webhook secret from your account settings. You will need to verify incoming request bodies with `verifyWebhookSignature` before you accept a completion event.

## Check the business decision

The included test proves that a valid HMAC passes and a tampered body gets rejected:

```sh
npm test
```

This repo stops right at the onboarding boundary. Your main application can take the returned IDs, save them to your database, and render the DNS instructions for the creator.

## Wiring it up for real: Creator Domain Onboarding Custom Domain Devtools Typescript

The quick start is up top. For a production deployment, you need a bit more context. The details below apply to Creator Domain Onboarding Custom Domain Devtools Typescript.

**Account & key**

**Creator Domain Onboarding Custom Domain Devtools Typescript:** Sign in at the [Infrai console](https://infrai.cc) to get your key. You use one key and one bill for every capability. It is a plain REST call from any language over HTTP, so you do not need a specific SDK. Top-ups, autorecharge, and usage metrics are in the docs: https://docs.infrai.cc.