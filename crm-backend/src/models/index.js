const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.User = require('./user.model')(sequelize, Sequelize);
db.Lead = require('./lead.model')(sequelize, Sequelize);
db.Task = require('./task.model')(sequelize, Sequelize);
db.WhatsappLog = require('./whatsappLog.model')(sequelize, Sequelize);

module.exports = db;