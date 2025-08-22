import { c as defineEventHandler, j as readMultipartFormData, f as setResponseStatus, k as setMockConfig, m as mockDB } from '../_/nitro.mjs';
import { v4 } from 'uuid';
import yaml from 'js-yaml';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'fs';
import 'node:fs';
import 'node:path';
import 'chokidar';
import 'nedb';
import 'path';
import 'node:url';

const upload_post = defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData) {
    setResponseStatus(event, 400);
    return {
      code: 400,
      message: "No form data received"
    };
  }
  let mockId;
  let file;
  for (const item of formData) {
    if (item.name === "mockId") {
      mockId = item.data.toString();
    } else if (item.name === "file") {
      file = item.data;
    }
  }
  if (!mockId) mockId = v4().replace(/-/g, "").slice(0, 8);
  if (!file) {
    setResponseStatus(event, 500);
    return {
      code: 500,
      message: "file is required"
    };
  }
  try {
    const doc = yaml.load(file.toString());
    setMockConfig(mockId, doc);
    mockDB.clear(mockId);
    setResponseStatus(event, 200);
    return {
      code: 200,
      message: "success",
      success: true,
      data: {
        mockId
      }
    };
  } catch (error) {
    setResponseStatus(event, 500);
    return {
      code: 500,
      message: "file write error"
    };
  }
});

export { upload_post as default };
//# sourceMappingURL=upload.post.mjs.map
