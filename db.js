const { Sequelize } = require('sequelize');

// Setup Database Connection (MySQL)
const sequelize = new Sequelize('url_shortener', 'akash', 'akash', {
  host: 'localhost',
  port: 3306, // Specify the port on which MySQL is running
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
