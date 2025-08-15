import { defineEventHandler, getRouterParam, setHeader, setResponseStatus } from "h3"
import { generateMockStream, generateMockData } from "../../../../utils/generateMockData"
import {getMockConfig} from '../../../../utils/mockStore'


export default defineEventHandler(async (event) => {
  const method = event.method // GET / POST / PUT / DELETE ...
  const mockId = getRouterParam(event, 'mockId')
  if(!mockId) {
    return {
      code: 500,
      message: 'mockId is required'
    }
  }
  const slug = getRouterParam(event, 'slug')     // 剩余路径部分
  const workspace = getMockConfig(mockId);
  if (!workspace) {
    setResponseStatus(event, 500)
    return {
      code: 500,
      slug,
      message: 'mockId not found'
    }
  }
  const path = slug ? `/${slug}` : '/'

  const apiConfig = workspace[path]

  if (!apiConfig || apiConfig.method !== method) {
    setResponseStatus(event, 500)
    return {
      code: 500,
      message: 'api not found'
    }
  }

  const { stream, fields, count = 10, interval = 0 } = apiConfig;

  if (stream) {
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    return generateMockStream(fields || {}, count || 10, interval || 0,)
  }
  else {
    const mockData = generateMockData(fields || {}, count || 1);
    setResponseStatus(event, 200)
    return {
      code: 200,
      data: mockData,
      message: 'success',
    }
  }
})