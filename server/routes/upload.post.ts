import { defineEventHandler, readBody, readMultipartFormData, setResponseStatus } from "h3";
import { v4 } from "uuid";
import yaml from 'js-yaml';
import { setMockConfig } from '../../utils/mockStore'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData) {
    setResponseStatus(event, 400)
    return {
      code: 400,
      message: "No form data received"
    }
  }
  let mockId: string | undefined
  let file: Buffer | undefined

  for (const item of formData) {
    if (item.name === 'mockId') {
      mockId = item.data.toString()
    } else if (item.name === 'file') {
      file = item.data
    }
  }
  if (!mockId) mockId = v4().replace(/-/g, '').slice(0, 8)
  if (!file) {
    setResponseStatus(event, 500)
    return {
      code: 500,
      message: "file is required"
    }
  }
  try {
    const doc = yaml.load(file.toString());
    setMockConfig(mockId, doc as any)
    setResponseStatus(event, 200)
    return {
      code: 200,
      message: "success",
      success: true,
      data: {
        mockId
      }
    }
  } catch (error) {
    setResponseStatus(event, 500)
    return {
      code: 500,
      message: "file write error"
    }
  }
});