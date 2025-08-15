const Mock = require('mockjs');

/**
 * 根据字段配置生成 Mock.js 值
 * @param {object} fieldConfig
 * @returns {any} Mock.js 模板
 */
function getMockValue(fieldConfig) {
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



function generateMockTemplate(fields, count = 1, isArray = false) {
  const template = {};
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
function generateMockStream(schema, count = 5, delay = 0, res) {
  let index = 0;
  let isDestroyed = false;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const generateNextItem = () => {
    if (isDestroyed || index >= count) {
      if (!isDestroyed) {
        res.write('event: end\n');
        res.write('data: {"message": "stream ended"}\n\n');
        res.end();
        isDestroyed = true;
      }
      return;
    }

    try {
      // 生成一条数据
      const item = generateMockData(schema, 1);

      // 按照 SSE 格式发送数据
      res.write('event: step\n');
      res.write(`data: ${JSON.stringify(item)}\n\n`);

      index++;

      // 安排生成下一条数据
      if (index < count) {
        if (delay > 0) {
          setTimeout(generateNextItem, delay);
        } else {
          setImmediate(generateNextItem);
        }
      } else {
        // 所有数据已生成完毕
        res.write('event: end\n');
        res.write('data: {"message": "stream ended"}\n\n');
        res.end();
        isDestroyed = true;
      }
    } catch (err) {
      isDestroyed = true;
      if (!res.headersSent) {
        res.status(500).send('Stream error: ' + err.message);
      } else {
        res.write('event: error\n');
        res.write(`data: {"error": "${err.message}"}\n\n`);
        res.end();
      }
    }
  };

  // 客户端断开时停止生成
  res.on('close', () => {
    isDestroyed = true;
  });

  // 开始生成数据
  generateNextItem();
}/**
 * 根据字段配置生成 Mock 数据
 * @param {object} fields - YAML 配置
 * @param {number} count - 数组数量
 * @returns {object|array} Mock 数据
 */
function generateMockData(fields, count = 1) {
  const template = generateMockTemplate(fields, count);
  return Mock.mock(template);
}

module.exports = { generateMockData, generateMockStream };
