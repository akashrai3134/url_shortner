const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db'); // Import the Sequelize instance

// Define the UrlMapping model
const UrlMapping = sequelize.define('UrlMapping', {
  shortUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  longUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'url_mapping',
  timestamps: true,
});

module.exports = UrlMapping;
