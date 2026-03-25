const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Map routes to controller functions
router.post('/', serviceController.createService);
router.get('/', serviceController.getServices);
router.put('/:id', serviceController.updateService);

module.exports = router;
