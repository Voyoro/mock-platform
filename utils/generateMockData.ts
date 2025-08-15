import Mock from 'mockjs';
/**
 * 根据字段配置生成 Mock.js 值
 * @param {object} fieldConfig
 * @returns {any} Mock.js 模板
 */
function getMockValue(fieldConfig: Record<string, any>): any {
  // 优先处理枚举
  if (fieldConfig.enum) return `@pick(${JSON.stringify(fieldConfig.enum)})`;

  switch (fieldConfig.type) {
    case 'string':
      if (fieldConfig.format === 'email') return '@email';
      if (fieldConfig.locale === 'zh') return `@cword(${fieldConfig.length || 3})`;
      return `@string(${fieldConfig.length || 5})`;

    case 'number':
      return `@integer(${fieldConfig.min ?? -9999}, ${fieldConfig.max ?? 9999})`;

    case 'float':
      return `@float(${fieldConfig.min ?? 0}, ${fieldConfig.max ?? 100}, ${fieldConfig.dmin ?? 0}, ${fieldConfig.dmax ?? 2})`;

    case 'boolean':
      return '@boolean';

    case 'date':
      return `@date("${fieldConfig.format || 'yyyy-MM-dd'}")`;

    case 'url':
      return '@url';

    case 'color':
      return '@color';

    case 'image':
      return '@image';

    case 'uuid':
      return '@guid';

    case 'cname':
      return '@cname';

    case 'title':
      return '@title';

    case 'sentence':
      return '@sentence';

    case 'paragraph':
      return '@paragraph';

    case 'object':
      return generateMockTemplate(fieldConfig.fields || {}, 1);

    case 'array':
      if (fieldConfig.fields) {
        return generateMockTemplate(fieldConfig.fields || {}, fieldConfig.length || 1);
      } else if (fieldConfig.item) {
        const long = fieldConfig.item.long || 1;
        let arr = []
        for (let i = 0; i < long; i++) {
          arr.push(generateMockTemplate(fieldConfig.item || {}, 1, true));
        }
        return arr
      } else {
        return [];
      }

    default:
      return null;
  }
}



function generateMockTemplate(fields: Record<string, any>, count = 1, isArray = false) {
  const template: Record<string, any> = {};
  if (isArray) return getMockValue(fields)
  for (const key in fields) {
    const config = fields[key];
    const fieldConfig = typeof config === 'string' ? { type: config } : config;
    template[key] = getMockValue(fieldConfig);
  }

  if (count > 1) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push(generateMockData(fields, 1));
    }
    return arr;
  }
  return template;
}


/**
 * 延迟生成 Mock 数据流（支持超大数据量）
 * @param {object} schema - mock 数据 schema
 * @param {number} count - 生成数量
 * @param {number} delay - 每条数据的延迟(ms)
 * @param {object} res - express response 对象
 */
/**
 * 延迟生成 Mock 数据流（支持超大数据量）
 * @param {object} schema - mock 数据 schema
 * @param {number} count - 生成数量
 * @param {number} delay - 每条数据的延迟(ms)
 * @param {object} res - express response 对象
 */
export function generateMockStream(schema: Record<string, any>, count = 5, delay = 0) {
  let index = 0
  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      sendNext()
    },
    cancel() {
      console.log('客户端关闭连接')
    }
  })

  function sendNext() {
    if (index >= count) {
      controller.enqueue(`event: end\ndata: {"message": "stream ended"}\n\n`)
      controller.close()
      return
    }

    try {
      const item = generateMockData(schema, 1)
      controller.enqueue(`event: step\ndata: ${JSON.stringify(item)}\n\n`)
      index++
      if (index < count) {
        setTimeout(sendNext, delay)
      } else {
        controller.enqueue(`event: end\ndata: {"message": "stream ended"}\n\n`)
        controller.close()
      }
    } catch (err: any) {
      controller.enqueue(`event: error\ndata: {"error": "${err.message}"}\n\n`)
      controller.close()
    }
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
/**
 * 根据字段配置生成 Mock 数据
 * @param {object} fields - YAML 配置
 * @param {number} count - 数组数量
 * @returns {object|array} Mock 数据
 */
export function generateMockData(fields: Record<string, any>, count = 1): object | any[] {
  const template = generateMockTemplate(fields, count);
  return Mock.mock(template);
}

export default { generateMockData, generateMockStream };
