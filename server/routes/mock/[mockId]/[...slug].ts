import { defineEventHandler, getQuery, getRouterParam, setHeader, setResponseStatus } from "h3"
import generateMockData from "../../../../utils/generateMockData"
import { getMockConfig } from '../../../../store/mockStore'
import { generateMockStream } from "../../../../utils/generateStreamMock"
import { mockDB } from '../../../../memoryDB'

export default defineEventHandler(async (event) => {
  const method = event.method  // GET / POST / PUT / DELETE ...
  const mockId = getRouterParam(event, 'mockId')
  if (!mockId) {
    return {
      code: 500,
      message: 'mockId is required'
    }
  }
  const slug = getRouterParam(event, 'slug')
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
  const apiMethod = apiConfig.method || 'GET'
  if (!apiConfig || apiMethod !== method) {
    setResponseStatus(event, 500)
    return {
      code: 500,
      message: 'api not found'
    }
  }

  const query = getQuery(event)

  const { stream } = apiConfig;

  if (stream) {
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    return generateMockStream(apiConfig)
  }
  try {
    let mockData
    if (apiConfig.db) {
      const existingMockData = await mockDB.findOne(mockId, { path })
      if (!existingMockData || !existingMockData.mockData) {
        let mock = await generateMockData({ ...apiConfig, query })
        await mockDB.insert(mockId, { path, query, mockData: mock, method })
      }
      mockData = await mockDB.list(mockId, { path, ...query }, apiConfig)
    } else {
      mockData = await generateMockData({ ...apiConfig, query })
    }

    setResponseStatus(event, 200)
    return {
      code: 200,
      data: mockData,
      message: 'success',
      success: true
    }
  } catch (error) {
    console.error('Error handling mock data:', error)
    setResponseStatus(event, 500)
    return {
      code: 500,
      message: 'Internal server error'
    }
  }
})