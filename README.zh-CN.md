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

### 本地数据库（db: true）
启用本地持久化以复用同一份数据，避免每次都重新生成。
- 首次访问会根据 `fields` 生成数据并写入 `DB/<mockId>.db`
- 后续访问从库读取同一份数据
- 上传新 YAML 或本地 `test.yaml` 变更，会自动清空该 `mockId` 的库（重新生成）

示例：
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

### 分页
支持两类分页，且与是否启用本地数据库相互独立：

1) 非 DB 模式（内存分页，返回数组时生效）
- 当响应为数组，且查询串带上 `currentPage` 与 `pageSize` 时，会包装为：
  `{ currentPage, count, pageSize, list }`
- 示例调用：`GET /mock/<mockId>/api/users?currentPage=1&pageSize=20`

2) DB 模式分页（当 `db: true` 时）
- 默认查询参数名：`currentPage` 与 `numberPerPage`
- 可在 YAML 中自定义 `page` 与 `size`（分别对应页码和每页数量的参数名）
- 当响应为对象且列表位于某字段时：
  - 用 `rowData` 指定列表字段名
  - 用 `count` 指定“总数”字段名（保留为完整总数）

示例（对象 + 内部列表分页，DB 模式）：
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

### 常见说明
- 请求前缀固定为：`/mock/{mockId}`，`{mockId}` 来源于上传 YAML 的返回值。
- 同一路径需用不同 HTTP 方法区分（`method` 必须匹配）。
- SSE 已设置 `Access-Control-Allow-Origin: *`，跨域调试更方便。
- 大数据建议用 `stream: true`，前端可边接收边渲染。


### 后续计划
- 后续可能会引入接口关联概念 使用本地数据库存储时，能够将数据保存下载的同时 后续CRUD实现对mock的数据进行修改 完成整体的流程运转