## Nitro Mock Server — YAML‑Powered Mock & Streaming (English)

English version aligned with the simplified Chinese doc. For 中文版请见：`README.zh-CN.md`.

---

### Quick Start

1) Install and run (default http://localhost:3000)
```bash
npm i
npm run dev
```

2) Upload your YAML to get a `mockId`
```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@test.yaml"
```
Response:
```json
{ "code": 200, "message": "success", "data": { "mockId": "657dc8d4" } }
```

3) Call your endpoints with `mockId`
- JSON: `GET http://localhost:3000/mock/<mockId>/xxxx`
- SSE:  `POST http://localhost:3000/mock/<mockId>/xxxx`

Optional: build and start for production
```bash
npm run build
node .output/server/index.mjs
```

---

### Minimal YAML Example (what you upload)
```yaml
"/api/user":
  method: GET
  count: 10
  fields:
    id: { type: number, min: 1, max: 100 }
    name: { type: string, locale: zh, length: 8 }
    email: { type: string, format: email }

"/api/stream":
  method: POST
  stream: true
  count: 5
  interval: 250
  fields:
    id: { type: uuid }
    content: { type: string, locale: zh, length: 3 }
    state: { type: enum, enum: [start, success, error] }
```

Notes:
- Top‑level keys are your API paths; `method` must match the request method.
- `stream: true` returns SSE stream; otherwise JSON is returned once.
- `count`: JSON → number of items; SSE → number of events.
- `interval` (ms): delay between SSE events.

---

### What Data Can Be Mocked (field `type`)
- `string`: options `format: email`, `locale: zh`, `length`
- `number`: options `min`, `max`
- `float`: options `min`, `max`, `dmin`, `dmax`
- `boolean`
- `date`: option `format` (e.g. `yyyy-MM-dd`)
- `url`
- `color`
- `image`
- `uuid`
- `cname` (Chinese name)
- `title`
- `sentence`
- `paragraph`
- `enum`: pick from list (use `type: enum` and `enum: [A, B, C]` or just `enum: [...]`)
- `object`: nested `fields`
- `array`: two ways
  - `fields + length`: object arrays
  - `item + long`: primitive arrays (e.g., strings)

Array examples:
```yaml
tags:
  type: array
  length: 3
  fields:
    item: { type: string, enum: [A, B, C] }

keywords:
  type: array
  item: { type: string, long: 10, length: 6 }
```

---

### Calling Examples

JSON:
```bash
curl "http://localhost:3000/mock/<mockId>/xxxx"
```

SSE (POST streaming):
```bash
curl -N -H "Accept: text/event-stream" -X POST \
  "http://localhost:3000/mock/<mockId>/xxxx"
```

Browser (SSE over POST via fetch):
```js
const res = await fetch(`/mock/${mockId}/xxxx`, { method: 'POST' });
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let i;
  while ((i = buf.indexOf('\n\n')) !== -1) {
    const frame = buf.slice(0, i).trim();
    buf = buf.slice(i + 2);
    const type = frame.split('\n').find(l => l.startsWith('event:'))?.slice(6).trim();
    const data = frame.split('\n').find(l => l.startsWith('data:'))?.slice(5).trim();
    if (type === 'step' && data) console.log('step:', JSON.parse(data));
  }
}
```

---

### Local DB (db: true)
Enable local persistence to reuse the same dataset instead of regenerating on every request.
- First request generates from `fields` and writes to `DB/<mockId>.db`
- Subsequent requests read from DB
- Uploading a new YAML or editing local `test.yaml` clears that `mockId` DB (regenerate)
- Independent of pagination; see next section

Example:
```yaml
"/api/users":
  method: GET
  db: true
  fields:
    type: array
    length: 100
    fields:
      id: { type: number, min: 1, max: 99999 }
      name: { type: cname }
```

---

### Pagination
Two forms of pagination, independent of whether DB is enabled.

1) Non-DB mode (in-memory, when response is an array)
- If the response is an array and the query has `currentPage` and `pageSize`, the result is wrapped as:
  `{ currentPage, count, pageSize, list }`
- Example: `GET /mock/<mockId>/api/users?currentPage=1&pageSize=20`

2) DB-mode pagination (`db: true`)
- Default query param names: `currentPage` and `numberPerPage`
- You can customize them with YAML: `page` and `size`
- If the response is an object that contains a list under a field:
  - Use `rowData` to specify the list field name
  - Use `count` to specify the total field name (kept as full total)

Example (object + inner list pagination, DB mode):
```yaml
"/api/orders":
  method: GET
  db: true
  rowData: list
  count: total
  page: currentPage
  size: pageSize
  fields:
    total: { type: number, min: 300, max: 500 }
    list:
      type: array
      length: 120
      fields:
        id: { type: number, min: 1, max: 99999 }
        title: { type: title }
        price: { type: float, min: 10, max: 500, dmin: 0, dmax: 2 }
```

---

### Common Notes
- All routes are prefixed with: `/mock/{mockId}`; the `mockId` comes from the upload response.
- The HTTP `method` must match your YAML config.
- SSE responses include `Access-Control-Allow-Origin: *` for easier cross‑origin testing.
- For large payloads, prefer `stream: true` to render progressively on the client.

### TODO
- In the future, the concept of interface association may be introduced. When using a local database for storage, the data can be saved and downloaded while the CRUD implementation modifies the mock data to complete the overall process operation