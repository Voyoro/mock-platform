import generateMockData from "./generateMockData";
import { ApiConfig } from "./type";

/**
 * 延迟生成 Mock 数据流（支持超大数据量）
 * @param {object} fields - mock 数据 fields
 * @param {number} count - 生成数量
 * @param {number} delay - 每条数据的延迟(ms)
 */



export function generateMockStream(apiConfig: ApiConfig) {
  const { fields, count = 5, delay = 0, method = 'GET' } = apiConfig;

  let index = 0;
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      sendNext();
    },
    cancel() {
      console.log('客户端关闭连接');
    }
  });

  function sendNext() {
    if (index >= count) {
      controller.enqueue(`event: end\ndata: {"message": "stream ended"}\n\n`);
      controller.close();
      return;
    }

    try {
      const item = generateMockData({ fields, count: 1, method });
      controller.enqueue(`event: step\ndata: ${JSON.stringify(item)}\n\n`);
      index++;
      if (index < count) {
        let wait = 0;
        if (typeof delay === 'number') {
          wait = delay;
        } else if (typeof delay === 'object' && delay.min !== undefined && delay.max !== undefined) {
          wait = Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
        }
        setTimeout(sendNext, wait);
      } else {
        controller.enqueue(`event: end\ndata: {"message": "stream ended"}\n\n`);
        controller.close();
      }
    } catch (err: any) {
      controller.enqueue(`event: error\ndata: {"error": "${err.message}"}\n\n`);
      controller.close();
    }
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    }
  });
}