const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../controllers/queueController');
const { exportReport } = require('../controllers/reportController');

// GET /api/reports/export — admin-only CSV download
router.get('/export', requireAdmin, exportReport);

module.exports = router;
