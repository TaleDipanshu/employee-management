// File: src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const empCtrl = require('../controllers/employee.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// ✅ Register a new employee (Admin only)
router.post('/register-employee', verifyToken, isAdmin, authCtrl.registerEmployee);

// ✅ Reset any employee's password (Admin only)
router.put('/reset-password', verifyToken, isAdmin, authCtrl.forgotPassword);

// ✅ Get all employees
router.get('/employees', verifyToken, isAdmin, empCtrl.getAllEmployees);

// ✅ Get specific employee by ID
router.get('/employees/:id', verifyToken, isAdmin, empCtrl.getEmployeeById);

// ✅ Update employee details (name, email, phone, password)
router.put('/employees/:id', verifyToken, isAdmin, empCtrl.updateEmployee);

// ✅ Delete employee
router.delete('/employees/:id', verifyToken, isAdmin, empCtrl.deleteEmployee);

module.exports = router;

