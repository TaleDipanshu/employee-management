const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/login', authCtrl.login);
router.post('/register', authCtrl.registerEmployee);
router.put('/reset-password', verifyToken, authCtrl.forgotPassword);
// Add verify endpoint
router.get('/verify', verifyToken, authCtrl.verifyToken);

module.exports = router;