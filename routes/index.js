const express = require('express');
const router = express.Router();
const mockController = require('../controllers/mockController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), mockController.uploadYAML);

router.all('/mock/:mockId/*', mockController.handleMockRequest);

module.exports = router;
