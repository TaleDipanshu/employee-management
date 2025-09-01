const express = require('express');
const router = express.Router();
const whatsappCtrl = require('../controllers/whatsapp.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/log', verifyToken, whatsappCtrl.logMessage);
router.get('/lead/:leadId', verifyToken, whatsappCtrl.getLogsForLead);

// MSG91 WhatsApp messaging endpoints
router.post('/send', verifyToken, whatsappCtrl.sendDirectMessage);
router.post('/send-bulk', verifyToken, whatsappCtrl.sendBulkMessages);
router.get('/templates/:number', whatsappCtrl.getTemplates);
router.post('/send-template', verifyToken, whatsappCtrl.sendTemplateMessage);


module.exports = router;