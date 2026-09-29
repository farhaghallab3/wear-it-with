# YouCam account, units, privacy, and test assets

Research checked 2026-09-28. Public documentation only; no account access, account change, upload, API invocation, purchase, or message was performed. The existing user account/form completion is user-reported; key and balance remain unverified.

## How should the existing account be prepared safely?

### Takeaway
Open the official API Keys page while signed into the user's existing account, generate a key there, and retain it locally. Completing the account form is not proof that a usable key or hackathon balance exists.

### Cited Findings
- Exact non-India key page: [API Keys](https://yce.perfectcorp.com/api-console/en/api-keys/). The hackathon's “First API Call” resource links to this page. Its public HTML is client-rendered, so the current create-button label was not independently observed. [Hackathon resources](https://youcam-api-skin-ai-ecommerce.devpost.com/resources)
- The official getting-started guide instructs users to log in, navigate to API Console, generate a key, select it in Playground Authorization, then choose input and parameters. [API Playground guide](https://docs.perfectcorp.com/develop/api_playground)
- The provider requires keeping API keys confidential; the account owner is responsible for their use. [API Terms §3.1](https://www.perfectcorp.com/perfectbeauty/youcam/terms-of-service-api)
- Hackathon onboarding: join/register on Devpost, receive the exclusive redeem code by email, verify the YouCam email, then open Account > Redeem Code and enter the code. Resources say the 1,000 units are added immediately. [Hackathon resources](https://youcam-api-skin-ai-ecommerce.devpost.com/resources)
- Rules describe a Starter Kit/request path, with codes per registrant, nontransferable, and validity stated as 90 days from redemption. [Rules §4](https://youcam-api-skin-ai-ecommerce.devpost.com/rules)

### Inferences
- Practical local steps: confirm email verification; visit API Keys; generate one project key using the console's actual controls; save it in a password manager/local environment; never paste it into chat, commit it, or put it into frontend variables. Report only “key ready” and the balance/expiry numbers with secrets hidden. This implements the provider's confidentiality requirement. [API Terms §3.1](https://www.perfectcorp.com/perfectbeauty/youcam/terms-of-service-api)
- With no observed balance, treat available units as unknown. Verify the credited amount and expiry in the account before setting a live-call budget. If the Starter Kit is absent, checking the registration email/spam is a reasonable next manual step; no organizer outreach was performed. [Resources](https://youcam-api-skin-ai-ecommerce.devpost.com/resources)

### Gaps
- No signed-in console inspection, API key validation, or credit balance verification was authorized/performed. Do not claim the key or 1,000 units are already present.
- Current exact key-creation button label and any key-name field are not verified; avoid inventing UI labels beyond the documented API Keys destination.
- The rules' wording attaches “90 days from redemption” to redeem codes, although redemption consumes a code. Preserve that wording and verify the actual resulting unit-expiry date in the account.

## What does Clothes V4 cost and what credits are available?

### Takeaway
The official V4 release confirms 2 units per generated image, including outerwear. Budget by completed generated images, not by the number of upload or polling HTTP requests.

### Cited Findings
- Official V4 announcement dated September 16, 2026 lists 2 units/image for V4 and V3. A base outfit followed by an outerwear layer uses two successive generation requests. [V4 release](https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear)
- The general technical reference's unit table currently lists only V2 and V3 at 2 units. It omits V4; the newer official release supplies the explicit V4 statement. [Clothes unit table](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/unit-consumption)
- “Unit” is the platform billing currency; API documentation may use the code term “Credit” for the same thing. [Unit system](https://docs.perfectcorp.com/reference/unit_system)
- Official pricing article dated August 8, 2026 states: free registration gives 40 trial units without a card; 500 subscription units cost USD 24/month, yielding USD 0.096 per two-unit result; 500 pay-as-you-go units cost USD 27.50, yielding USD 0.11 per result. It explicitly says pricing may change and refers readers to the live pricing page. [Pricing article](https://www.perfectcorp.com/business/blog/ai-clothes/virtual-try-on-api-pricing)
- Subscription units stack for 60 days while the subscription remains active; pay-as-you-go units expire one year from purchase, with expiry displayed in the profile API tab. [API Terms §5](https://www.perfectcorp.com/perfectbeauty/youcam/terms-of-service-api)
- Hackathon award: 1,000 free units; validity described as 90 days from redemption. Optional social sharing: 500 units per qualifying platform, maximum two; reviewed only after the November 2, 2026 submission deadline, with approved codes emailed subsequently. This is not immediately available development credit. [Rules §§4, 8(F)](https://youcam-api-skin-ai-ecommerce.devpost.com/rules)

### Inferences
- Arithmetic: 40 trial units support at most 20 two-unit renders; a verified 1,000-unit hackathon award supports at most 500 two-unit renders if spent solely on Clothes. Ten single-stage test renders have an expected ceiling of 20 generation units; five base-plus-outer pairs also require 20 units. These are arithmetic budgets, not proof of current balance or a provider guarantee about unsuccessful tasks. [V4 unit cost](https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear)
- Use trial/hackathon units before considering paid credits; do not count the social bonus in a pre-submission development budget. [Rules §8(F)](https://youcam-api-skin-ai-ecommerce.devpost.com/rules)
- The dollar figures above are a dated published benchmark, not a checkout quote. Live [API pricing](https://yce.perfectcorp.com/ai-api/api-pricing) did not expose prices in the fetched HTML, so verify in the signed-in console before any purchase.

### Gaps
- No Clothes V4-specific official statement about charging failed/rejected tasks or whether all polling errors are free was located. Do not generalize a “no units for query/engine errors” statement from the separate Makeup API to Clothes V4. A timed-out client is not proof the server generation failed; avoid blind retries.
- Trial-unit expiry was not established. Do not assign the paid-unit or hackathon validity period to the free 40-unit trial.
- Free trial/hackathon stacking on this particular account is not verified; do not promise 1,040 usable units.

## What may be uploaded and what retention may the app promise?

### Takeaway
Use self-photographed garments and photos of the user or consenting adults for the first test. Make the external processing clear: the provider documents 30-day image retention, and its broader privacy policy includes exceptions to ordinary data retention.

### Cited Findings
- The technical retention guide says uploaded files and file IDs last 30 days; task IDs remain valid 30 days; result download links last 2 hours and can be refreshed with the task ID. It states uploaded/generated images and videos are automatically removed after 30 days. [File retention guide](https://docs.perfectcorp.com/develop/file_retention_period)
- The API-specific policy, effective August 2026, states USA server storage; generally 30-day retention after a service session, with legal/business/dispute exceptions; deletion via API where applicable or on request, subject to legal retention. It describes Perfect as the processor of API inputs/outputs, with the API customer responsible for a lawful basis/necessary consent. It promises no personal information/User Content use beyond policy purposes, including model training as its example. [API Privacy Policy §§2, 4–5](https://www.perfectcorp.com/perfectbeauty/youcam/privacy-policy-api)
- API terms require consent from pictured persons for relevant facial processing and lawful inputs/outputs that respect third-party rights. Provider-supplied content/resources are not broadly granted for redistribution. [API Terms §§3.4, 8.1, 8.3–8.4](https://www.perfectcorp.com/perfectbeauty/youcam/terms-of-service-api)
- The Playground guide offers local files, URLs, and samples as test sources; that is a testing workflow, not an explicit general redistribution license. [Playground guide](https://docs.perfectcorp.com/develop/api_playground)

### Inferences
- Suggested first assets: a front-facing adult photo made/owned by the tester, with clear consent for transmission to Perfect and use in this demo; two or three garment photos made by the tester. Keep consent for public demo/video use separate from consent for private testing. This supports the provider's input-rights/consent obligations. [API Terms §§3.4, 8.3–8.4](https://www.perfectcorp.com/perfectbeauty/youcam/terms-of-service-api)
- Do not promise “photos never leave your device,” “deleted immediately,” or guaranteed deletion of every category of provider data exactly at day 30. Use wording such as: “Your selected photos are sent to YouCam for processing. Its documentation describes 30-day image retention; its privacy policy governs retention exceptions.” [Retention guide](https://docs.perfectcorp.com/develop/file_retention_period); [API Privacy Policy §5](https://www.perfectcorp.com/perfectbeauty/youcam/privacy-policy-api)
- A two-hour signed download URL is an access-link lifetime, not an image deletion time. [File retention guide](https://docs.perfectcorp.com/develop/file_retention_period)

### Gaps
- No explicit reusable/public-demo license was established for official sample photos. Samples appearing publicly in documentation do not establish permission to bundle them into a public repository or promotional video. Use owned/consented assets unless a specific asset license is verified.
- No application-level storage/deletion implementation exists in this research. The future app's own retention policy must be stated separately from Perfect's and must match its actual implementation.
