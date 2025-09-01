const User = require('../models/user.model'); // Assuming user model exists
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper: Generate JWT
function generateToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

// Admin registers an employee
exports.registerEmployee = async (req, res) => {
    try {
        // Only admin can register
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

        const { name, email, password, phone } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const employee = new User({ name, email, password: hashedPassword, role: 'employee', phone });
        await employee.save();
        res.status(201).json({ message: 'Employee registered' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Login (admin or employee)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token with user ID and role
        const token = jwt.sign(
            { 
                userId: user._id,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin edits employee details
exports.editEmployee = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

        const { id } = req.params;
        const { name, email } = req.body;
        const employee = await User.findByIdAndUpdate(id, { name, email }, { new: true });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json({ message: 'Employee updated', employee });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Admin resets employee password
exports.forgotPassword = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

        const { id } = req.params;
        const { newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const employee = await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add this to your existing auth controller
exports.verifyToken = async (req, res) => {
    try {
        // req.user is already set by verifyToken middleware
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};