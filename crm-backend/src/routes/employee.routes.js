const express = require('express');
const router = express.Router();
const empCtrl = require('../controllers/employee.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, isAdmin, empCtrl.getAllEmployees);
router.get('/:id', verifyToken, isAdmin, empCtrl.getEmployeeById);
router.delete('/:id', verifyToken, isAdmin, empCtrl.deleteEmployee);

// Changed to use proper employee endpoint
router.get('/all/employees', verifyToken, empCtrl.getAllEmployees);

module.exports = router;