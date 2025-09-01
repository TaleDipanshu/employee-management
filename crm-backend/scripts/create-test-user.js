const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');
const mongoose = require('mongoose');
require('dotenv').config();

async function createTestUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const testUser = new User({
            name: 'Admin User',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin'
        });
        
        await testUser.save();
        console.log('Test user created successfully');
        
    } catch (error) {
        console.error('Error creating test user:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createTestUser();
