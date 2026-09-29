# YouCam Clothes V4 technical contract — verified 2026-09-28

## What is the smallest documented upload → generate → poll workflow?

### Takeaway
Use the current V4 endpoint and one garment. The public documentation supplies enough information for a controlled smoke test, but the generated OpenAPI contains response-shape defects; runtime responses still need verification. No API calls or credential access occurred during this research.

### Cited Findings
- Base: `https://yce-api-01.makeupar.com`. API authentication: `Authorization: Bearer <API_KEY>`; JSON requests use `Content-Type: application/json`. This is the API key itself, with a space after Bearer; no token exchange appears in the current quick start. [Quick start](https://docs.perfectcorp.com/develop/quick_start_guide)
- Register each image through `POST /s2s/v2.0/file`. Payload shape (illustrative values):

```json
{"files":[{"content_type":"image/jpg","file_name":"person.jpg","file_size":50000}]}
```

`file_size` is the actual integer byte count. The File API accepts an array; the required per-file fields are the three shown. [File schema](https://docs.perfectcorp.com/_bundle/reference/file.json?download=)
- Registration returns `status:200`, `data.files[]` with `file_id` and `requests[]`. Upload raw bytes via returned `method`, `url`, `headers`; the example uses PUT, Content-Length, Content-Type, without Bearer authentication. [Clothes integration](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/integration-guide)
- `POST /s2s/v2.0/task/cloth-v4` accepts one source and one reference, each specified by file ID or publicly accessible URL, plus `garment_category`. Success returns `{"status":200,"data":{"task_id":"..."}}`. [V4 reference](https://docs.perfectcorp.com/reference/ai_clothes/v4.0)
- Minimal ID-based body, assembled from the documented V4 schema:

```json
{"src_file_id":"<uploaded-person-id>","ref_file_id":"<uploaded-garment-id>","garment_category":"upper_body"}
```

URL alternatives are `src_file_url` and `ref_file_url`. V4 has no documented `template_id`, seed, prompt, variant count, multi-reference array, or preservation-strength field. The overview mentions templates, but the V4 schema provides only four source/reference ID/URL combinations; templates are represented for V2. [Clothes OpenAPI](https://docs.perfectcorp.com/_bundle/reference/ai_clothes.json?download=)
- Poll `GET /s2s/v2.0/task/cloth-v4/{task_id}` with Bearer authentication. Guide success shape:

```json
{"status":200,"data":{"error":null,"results":{"url":"<signed-result-url>"},"task_status":"success"}}
```

[Clothes integration](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/integration-guide)
- Schema states are `running`, `success`, `error`; it also defines `data.error` and `data.error_message`. Result URL validity is 2 hours; the task ID can query results for 24 hours. [Clothes OpenAPI](https://docs.perfectcorp.com/_bundle/reference/ai_clothes.json?download=)

### Inferences
- Recommended smoke-test sequence: validate two local PNG/JPEG files, upload each, create exactly one task, preserve its ID, poll that task, download the result promptly, and visually compare source/reference/output. Stop before automatic task resubmission after an ambiguous POST timeout: the server may already have accepted it. This is an engineering recommendation, not documented idempotency behavior.
- For `upper_body`, omit optional controls for the smallest request. Optional `filter_multi_person:"strict"` can be added later after the first successful request to reject any extra person.

### Gaps
- OpenAPI response declarations are inconsistent: `FileResponseV2` has `data:null` and a root `$ref` to a `files` object; `TaskStatusResponseV2` has `results:null` and a root `$ref` to a `url` object. The guide explicitly nests them at `data.files` and `data.results.url`. Do not treat generated clients as validated. [File schema](https://docs.perfectcorp.com/_bundle/reference/file.json?download=); [Clothes OpenAPI](https://docs.perfectcorp.com/_bundle/reference/ai_clothes.json?download=)
- No live API response, measured latency, upload URL expiry, idempotency key, or variation control was verified.

## Which images and clothing capabilities are actually supported?

### Takeaway
One upper-body garment is a defensible MVP starting point. Keep the outfit board separate; neither the contract nor an untested generated image establishes fit accuracy or exact preservation of other garments.

### Cited Findings
- Source/reference: JPG/PNG, <10 MB, recommended 1024×768, minimum 512×384, maximum side 4096px. Human references: front-facing, standing, unobstructed face/clothes, complete target region. Product references: front-facing single garment, no composites. Lower-body needs worn clothing, not standalone product photos. [File specifications](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/integration-guide)
- Contradictions: workflow requests full-body photos; source specs say chest-up. Minimum dimensions conflict with the preprocessing threshold of 128px longest side. [File specifications](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/integration-guide)
- V4 categories: `full_body`, `lower_body`, `upper_body`, `shoes`, `auto`, `outer`. `change_shoes` defaults true and affects full/lower-body references containing shoes. `filter_multi_person` defaults `off`; `off` selects the largest person, `normal` rejects prominent nearby additional people, and `strict` rejects all visible additional people. Polling example interval: 10 seconds. [V4 reference](https://docs.perfectcorp.com/reference/ai_clothes/v4.0)
- Official September 16, 2026 V4 announcement introduces jackets/coats/vests through `outer`, says each request handles one garment category, and describes sequential base-outfit then outerwear requests. It says V4 costs 2 units per result. That establishes the vendor's intended layering workflow, not measured garment-preservation fidelity. Short excerpt: “Each request handles one garment category at a time.” [V4 announcement](https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear)

### Inferences
- Use one front-facing, standing person with visible face/shoulders and a clearly visible target clothing region; for the first smoke test, use an uncomplicated upper-body garment. Avoid lower-body product photos and layered outfit composites.
- Conservatively enforce at least 512×384 and a longest side no larger than 4096; keep files below 10,000,000 bytes until the provider clarifies its MB definition. Prefer well-sized images instead of testing boundary values.
- Treat `outer` as a later candidate requiring output inspection. A sequential second rendering can alter the first result; a vendor workflow description does not guarantee exact preservation.

### Gaps
- File schema examples use `image/jpg`; `content_type` is an unconstrained string, and the reviewed docs do not explicitly confirm `image/jpeg`. PNG with `image/png` avoids that JPEG MIME ambiguity; JPG with documented `image/jpg` follows examples. The exact decimal/binary MB boundary is unspecified. [File schema](https://docs.perfectcorp.com/_bundle/reference/file.json?download=)
- No documented body measurements, size recommendation, physical fit guarantee, return-rate guarantee, independent garment masks, or controlled multi-garment rendering was found in the reviewed V4 contract. [V4 reference](https://docs.perfectcorp.com/reference/ai_clothes/v4.0)

## How should the smoke test handle limits, failures, and uncertainty?

### Takeaway
Use bounded polling and a single submitted task. Surface provider errors and preserve diagnostic codes without exposing keys or signed URLs.

### Cited Findings
- The rate-limit page states 250 requests per 300 seconds for each IP and each access token; both limits apply, and excess receives HTTP 429. It recommends backoff/retry. The same page's approximate 5 QPS advice is mathematically inconsistent with sustaining 250 per 300 seconds. [Rate limits](https://docs.perfectcorp.com/develop/rate_limit)
- Task creation documents 400, 401, 429; polling documents 400 invalid task ID, 401, and 500 task timeout. Creation error schema includes `CreditInsufficiency`, `InvalidParameters`, `BadRequest`, `InvalidStyleGroup`, `InvalidStyle`. [Clothes OpenAPI](https://docs.perfectcorp.com/_bundle/reference/ai_clothes.json?download=)
- Image errors include pose/reference/source issues, region mismatch, size, download, content rejection, and editing failure. [Clothes file errors](https://docs.perfectcorp.com/reference/ai_clothes/section/overview/integration-guide)

### Inferences
- Suggested local policy: poll every 10 seconds with a finite deadline; on polling 429/temporary network errors, wait with bounded exponential backoff and honor Retry-After if present. Never retry authentication, credit, validation, or content errors automatically. No reviewed source guarantees Retry-After headers.
- Do not repeat the generate POST after losing its response without checking whether a task was accepted. No documented idempotency facility was found.
- Store a compact sanitized diagnostic containing stage, HTTP status, task status, error code, and timing. Treat a successful download as transport success; the user-visible result still needs visual quality review.

### Gaps
- Live rate behavior, V4 latency, failure refunds, polling billing, webhook availability for this particular endpoint, and usable credit balance were not tested. Pricing/account/privacy research is being handled separately.
