## Nitro Mock Server — YAML 驱动的 Mock 与流式返回（中文）

这个项目让你通过一份 YAML 文件，快速生成可用的 Mock 接口（JSON 批量返回）或 SSE 流式返回，便于前端快速联调与演示。

---

### 快速开始

1) 安装依赖并启动开发服务（默认 http://localhost:3000）
```bash
npm i
npm run dev
```

2) 上传 YAML 配置获取 `mockId`
```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@test.yaml"
```
响应示例：
```json
{ "code": 200, "message": "success", "data": { "mockId": "657dc8d4" } }
```

3) 用 `mockId` 调用你的接口
- JSON：`GET http://localhost:3000/mock/<mockId>/xxxx`
- SSE： `POST http://localhost:3000/mock/<mockId>/xxxx`

（可选）生产构建与启动：
```bash
npm run build
node .output/server/index.mjs
```

---

### YAML 最小示例（你需要上传的文件）
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

说明：
- 顶层 key 是你的接口路径；`method` 必须与请求方法匹配。
- `stream: true` 表示走 SSE 流式返回；否则为一次性 JSON 返回。
- `count`：JSON 模式为数据条数；SSE 模式为事件次数。
- `interval`（毫秒）：SSE 事件的发送间隔。

---

### 可 Mock 的数据类型（字段 `type`）
- `string`：可选 `format: email`，`locale: zh`，`length`
- `number`：可选 `min`，`max`
- `float`：可选 `min`，`max`，`dmin`，`dmax`
- `boolean`
- `date`：可选 `format`（如 `yyyy-MM-dd`）
- `url`
- `color`
- `image`
- `uuid`
- `cname`（中文姓名）
- `title`（标题）
- `sentence`（句子）
- `paragraph`（段落）
- `enum`：从给定枚举中随机取值（写法：`type: enum`, `enum: [A, B, C]` 或直接 `enum: [...]`）
- `object`：嵌套 `fields`
- `array`：两种写法
  - `fields + length`：生成对象数组
  - `item + long`：生成基础类型数组（如一组字符串）

示例（数组两种方式）：
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

### 调用示例

JSON：
```bash
curl "http://localhost:3000/mock/<mockId>/api/user"
```

SSE（POST 流式）：
```bash
curl -N -H "Accept: text/event-stream" -X POST \
  "http://localhost:3000/mock/<mockId>/api/stream"
```

浏览器中处理 SSE（POST 用 fetch 流读取）：
```js
const res = await fetch(`/mock/${mockId}/api/stream`, { method: 'POST' });
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

### 常见说明
- 请求前缀固定为：`/mock/{mockId}`，`{mockId}` 来源于上传 YAML 的返回值。
- 同一路径需用不同 HTTP 方法区分（`method` 必须匹配）。
- SSE 已设置 `Access-Control-Allow-Origin: *`，跨域调试更方便。
- 大数据建议用 `stream: true`，前端可边接收边渲染。


