import { c as defineEventHandler, g as getRouterParam, e as getMockConfig, f as setResponseStatus, h as getQuery, i as setHeader, m as mockDB } from '../../../_/nitro.mjs';
import Mock from 'mockjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'fs';
import 'js-yaml';
import 'node:fs';
import 'node:path';
import 'chokidar';
import 'nedb';
import 'path';
import 'node:url';

function getMockValue(fieldConfig) {
  var _a, _b, _c, _d, _e, _f;
  if (fieldConfig == null ? void 0 : fieldConfig.enum) return `@pick(${JSON.stringify(fieldConfig.enum)})`;
  switch (fieldConfig == null ? void 0 : fieldConfig.type) {
    case "string":
      if (fieldConfig.format === "email") return "@email";
      if (fieldConfig.locale === "zh") return `@cword(${fieldConfig.length || 3})`;
      return `@string(${fieldConfig.length || 5})`;
    case "number":
      return `@integer(${(_a = fieldConfig.min) != null ? _a : -9999}, ${(_b = fieldConfig.max) != null ? _b : 9999})`;
    case "float":
      return `@float(${(_c = fieldConfig.min) != null ? _c : 0}, ${(_d = fieldConfig.max) != null ? _d : 100}, ${(_e = fieldConfig.dmin) != null ? _e : 0}, ${(_f = fieldConfig.dmax) != null ? _f : 2})`;
    case "boolean":
      return "@boolean";
    case "date":
      return `@date("${fieldConfig.format || "yyyy-MM-dd"}")`;
    case "url":
      return "@url";
    case "color":
      return "@color";
    case "image":
      return "@image";
    case "id":
      return "@guid";
    case "name":
      if (fieldConfig.locale === "en") return "name";
      return "@cname";
    case "title":
      if (fieldConfig.locale === "en") return "title";
      return "@ctitle";
    case "sentence":
      return "@sentence";
    case "paragraph":
      return "@paragraph";
    case "object":
      return generateMockTemplate(fieldConfig.fields || {}, 1);
    case "phone":
      return '@string("1[3-9]\\d{9}")';
    // 改为使用 Mock.js 语法
    case "idcard":
      return '@string("\\d{17}[0-9X]")';
    case "ip":
      return "@ip";
    case "mac":
      return '@string("([A-Fa-f0-9]{2}:){5}[A-Fa-f0-9]{2}")';
    case "array":
      if (fieldConfig.fields) {
        return generateMockTemplate(fieldConfig.fields || {}, fieldConfig.length || 1);
      } else if (fieldConfig.item) {
        const long = fieldConfig.item.long || 1;
        let arr = [];
        for (let i = 0; i < long; i++) {
          arr.push(generateMockTemplate(fieldConfig.item || {}, 1, true));
        }
        return arr;
      } else {
        return [];
      }
    default:
      return null;
  }
}
async function generateMockTemplate(fields, count = 1, isArray = false) {
  if (isArray) return await getMockValue(fields);
  const template = await generateSingleTemplate(fields);
  if (count > 1) {
    return await generateMultipleTemplates(template, count);
  }
  return template;
}
async function generateSingleTemplate(fields) {
  const template = {};
  for (const key in fields) {
    const config = fields[key];
    const fieldConfig = config === null || config === void 0 ? { type: key } : typeof config === "string" ? { type: config } : config;
    template[key] = await getMockValue(fieldConfig);
  }
  return template;
}
function generateMultipleTemplates(template, count) {
  const templates = Array(count).fill(null).map(() => ({ ...template }));
  return Mock.mock(templates);
}
async function generateMockData(apiConfig) {
  const { fields, count, delay } = apiConfig;
  let wait = 0;
  if (typeof delay === "number") {
    wait = delay;
  } else if (typeof delay === "object" && delay.min !== void 0 && delay.max !== void 0) {
    wait = Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
  }
  return new Promise(async (resolve) => {
    setTimeout(async () => {
      var _a, _b;
      const template = await generateMockTemplate(fields, count || 1);
      if (((_a = apiConfig == null ? void 0 : apiConfig.query) == null ? void 0 : _a.currentPage) && ((_b = apiConfig == null ? void 0 : apiConfig.query) == null ? void 0 : _b.pageSize) && Array.isArray(template)) {
        const result = {
          currentPage: apiConfig.query.currentPage,
          count: template.length,
          pageSize: apiConfig.query.pageSize,
          list: []
        };
        const start = (apiConfig.query.currentPage - 1) * apiConfig.query.pageSize;
        const end = start + Number(apiConfig.query.pageSize);
        result.list = template.slice(start, end);
        resolve(Mock.mock(result));
        return;
      }
      resolve(Mock.mock(template));
    }, wait);
  });
}

function generateMockStream(apiConfig) {
  const { fields, count = 5, delay = 0, method = "GET" } = apiConfig;
  let index = 0;
  let controller;
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      sendNext();
    },
    cancel() {
      console.log("\u5BA2\u6237\u7AEF\u5173\u95ED\u8FDE\u63A5");
    }
  });
  function sendNext() {
    if (index >= count) {
      controller.enqueue(`event: end
data: {"message": "stream ended"}

`);
      controller.close();
      return;
    }
    try {
      const item = generateMockData({ fields, count: 1, method });
      controller.enqueue(`event: step
data: ${JSON.stringify(item)}

`);
      index++;
      if (index < count) {
        let wait = 0;
        if (typeof delay === "number") {
          wait = delay;
        } else if (typeof delay === "object" && delay.min !== void 0 && delay.max !== void 0) {
          wait = Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
        }
        setTimeout(sendNext, wait);
      } else {
        controller.enqueue(`event: end
data: {"message": "stream ended"}

`);
        controller.close();
      }
    } catch (err) {
      controller.enqueue(`event: error
data: {"error": "${err.message}"}

`);
      controller.close();
    }
  }
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

const ____slug_ = defineEventHandler(async (event) => {
  const method = event.method;
  const mockId = getRouterParam(event, "mockId");
  if (!mockId) {
    return {
      code: 500,
      message: "mockId is required"
    };
  }
  const slug = getRouterParam(event, "slug");
  const workspace = getMockConfig(mockId);
  if (!workspace) {
    setResponseStatus(event, 500);
    return {
      code: 500,
      slug,
      message: "mockId not found"
    };
  }
  const path = slug ? `/${slug}` : "/";
  const apiConfig = workspace[path];
  const apiMethod = apiConfig.method || "GET";
  if (!apiConfig || apiMethod !== method) {
    setResponseStatus(event, 500);
    return {
      code: 500,
      message: "api not found"
    };
  }
  const query = getQuery(event);
  const { stream } = apiConfig;
  if (stream) {
    setHeader(event, "Content-Type", "text/event-stream");
    setHeader(event, "Cache-Control", "no-cache");
    setHeader(event, "Connection", "keep-alive");
    setHeader(event, "Access-Control-Allow-Origin", "*");
    return generateMockStream(apiConfig);
  }
  try {
    let mockData;
    if (apiConfig.db) {
      const existingMockData = await mockDB.findOne(mockId, { path });
      if (!existingMockData || !existingMockData.mockData) {
        let mock = await generateMockData({ ...apiConfig, query });
        await mockDB.insert(mockId, { path, query, mockData: mock, method });
      }
      mockData = await mockDB.list(mockId, { path, ...query }, apiConfig);
    } else {
      mockData = await generateMockData({ ...apiConfig, query });
    }
    setResponseStatus(event, 200);
    return {
      code: 200,
      data: mockData,
      message: "success",
      success: true
    };
  } catch (error) {
    console.error("Error handling mock data:", error);
    setResponseStatus(event, 500);
    return {
      code: 500,
      message: "Internal server error"
    };
  }
});

export { ____slug_ as default };
//# sourceMappingURL=_...slug_.mjs.map
