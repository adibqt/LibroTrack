const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');

// Book return endpoint
router.post('/return', returnsController.processReturn);

module.exports = router;
