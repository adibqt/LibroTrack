// Utility to load environment variables from .env file
require("dotenv").config();

module.exports = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING,
};
