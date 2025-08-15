const yaml = require('js-yaml');
const { generateMockData, generateMockStream } = require('../utils/generateMockData');
const { v4: uuidv4 } = require('uuid');

const mockStore = new Map();

exports.uploadYAML = (req, res) => {
  let mockId = req.body['mockId'];
  if (!mockId) mockId = uuidv4().replace(/-/g, '').slice(0, 8)
  if (!req.file) return res.status(400).send({
    code: 400,
    message: 'No file uploaded'
  });

  try {
    const doc = yaml.load(req.file.buffer.toString());
    mockStore.set(mockId, doc);
    res.json({
      code: 200,
      data: mockId,
      message: '上传成功'
    });
  } catch (err) {
    res.status(400).send({
      code: 400,
      message: 'YAML parse error: ' + err.message
    });
  }
};

exports.handleMockRequest = (req, res) => {
  const { mockId } = req.params;
  const path = '/' + req.params[0];
  const method = req.method.toUpperCase();
  const workspace = mockStore.get(mockId);
  if (!workspace) return res.status(404).send({
    message: 'mockId Not Found',
    code: 404
  });
  const apiConfig = workspace[path];
  if (!apiConfig || apiConfig.method.toUpperCase() !== method)
    return res.status(404).send({
      message: 'API Not Found',
      code: 404
    });
  const { stream, fields, count = 10, interval = 0 } = apiConfig;
  if (stream)
    generateMockStream(fields || {}, count || 10, interval || 0, res)
  else {
    const mockData = generateMockData(fields || {}, count || 1);
    res.json({
      code: 200,
      data: mockData,
      message: 'success',
    });
  }

};

