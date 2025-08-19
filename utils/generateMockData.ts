import Mock from 'mockjs';
import { ApiConfig } from './type'

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
    case 'id':
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

    case 'phone':
      return '@string("1[3-9]\\d{9}")'; // 改为使用 Mock.js 语法
    case 'idcard':
      return '@string("\\d{17}[0-9X]")';
    case 'ipv4':
      return '@ip';
    case 'ipv6':
      return '@ip';
    case 'mac':
      return '@string("([A-Fa-f0-9]{2}:){5}[A-Fa-f0-9]{2}")';
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



async function generateMockTemplate(fields: Record<string, any>, count = 1, isArray = false) {
  if (isArray) return await getMockValue(fields);

  const template = await generateSingleTemplate(fields);

  if (count > 1) {
    return await generateMultipleTemplates(template, count);
  }

  return template;
}

async function generateSingleTemplate(fields: Record<string, any>) {
  const template: Record<string, any> = {};
  for (const key in fields) {
    const config = fields[key];
    const fieldConfig = typeof config === 'string' ? { type: config } : config;
    template[key] = await getMockValue(fieldConfig);
  }
  return template;
}

function generateMultipleTemplates(template: Record<string, any>, count: number) {
  const templates = Array(count).fill(null).map(() => ({ ...template }));
  return Mock.mock(templates);
}

/**
 * 根据字段配置生成 Mock 数据
 * @param {object} fields - YAML 配置
 * @param {number} count - 数组数量
 * @returns {object|array} Mock 数据
 */
export async function generateMockData(apiConfig: ApiConfig): Promise<object | any[]> {
  const { fields, count, delay } = apiConfig;
  let wait = 0;
  if (typeof delay === 'number') {
    wait = delay;
  } else if (typeof delay === 'object' && delay.min !== undefined && delay.max !== undefined) {
    wait = Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
  }
  return new Promise(async (resolve) => {
    setTimeout(async () => {
      const template = await generateMockTemplate(fields, count || 1);
      if (apiConfig?.query?.currentPage && apiConfig?.query?.pageSize && Array.isArray(template)) {
        const result: {
          currentPage: number;
          count: number;
          pageSize: number;
          list: any[];
        } = {
          currentPage: apiConfig.query.currentPage,
          count: template.length,
          pageSize: apiConfig.query.pageSize,
          list: [],
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

export default generateMockData;
