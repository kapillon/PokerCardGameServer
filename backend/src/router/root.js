
const express = require('express');
const router = express.Router();
const rootController = require('../controllers/root')


router.get('/',rootController.main );



module.exports = router;