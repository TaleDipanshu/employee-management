const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('-password')
      .lean();
    res.status(200).json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newEmployee = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'employee'
    });

    res.status(201).json({
      _id: newEmployee._id,
      name: newEmployee.name,
      email: newEmployee.email,
      role: newEmployee.role
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password } = req.body;
    const updates = {};
    
    // Validate input fields - email is no longer allowed to be updated
    if (!name && !phone && !password) {
      return res.status(400).json({ error: 'At least one field (name, phone, password) is required for update' });
    }
    
    // Add fields to updates object if they exist
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    
    // Email updates are not allowed for security reasons
    // This prevents potential security issues with changing login credentials
    
    // Hash password if it's being updated
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const updatedEmployee = await User.findByIdAndUpdate(id, updates, { new: true })
      .select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

// Keep existing functions but improve error handling
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.status(200).json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const deletedEmployee = await User.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};