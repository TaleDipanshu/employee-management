// createAdmin.js

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./src/models/user.model'); // ✅ correct path
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const existingAdmin = await User.findOne({ email: 'admin@login.com' });

    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin@2025', 10);

    await User.create({
      name: 'Admin',
      email: 'crm_admin@login.com',
      password: hashedPassword,
      role: 'admin',
      phone:'+918383838383'
    });

    console.log('✅ Admin user created successfully');
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin();
