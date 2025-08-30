// Authentication controller
const bcrypt = require('bcrypt');
const db = require('../db');

// Registration handler
exports.register = async (req, res) => {
  const {
    username,
    email,
    password,
    first_name,
    last_name,
    phone,
    address,
    user_type,
    status
  } = req.body;

  // Basic validation
  if (!username || !email || !password || !first_name || !last_name) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Call PL/SQL user creation procedure
    // Example: db.execute('CALL create_user(:username, :email, ...)', [...])
    const result = await db.execute(
      `BEGIN create_user(:username, :email, :password_hash, :first_name, :last_name, :phone, :address, :user_type, :status); END;`,
      {
        username,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        address,
        user_type: user_type || 'MEMBER',
        status: status || 'ACTIVE'
      }
    );

    // TODO: Trigger email verification (if implemented)

    return res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    // Handle unique constraint errors, etc.
    if (err.errorNum === 1) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }
    return res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
};

// Login handler
exports.login = async (req, res) => {
  // TODO: Validate input, check password, call PL/SQL function
  res.status(501).json({ message: 'Not implemented yet' });
};
