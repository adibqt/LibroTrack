const db = require('../db');

exports.processReturn = async (req, res) => {
  const { user_id, book_id, return_date } = req.body;
  if (!user_id || !book_id || !return_date) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  try {
    // Call PL/SQL procedure for book return and fine calculation
    // Example: db.execute('CALL process_return(:user_id, :book_id, :return_date, :fine)', [...])
    const result = await db.execute(
      `BEGIN process_return(:user_id, :book_id, :return_date, :fine); END;`,
      { user_id, book_id, return_date, fine: { dir: db.BIND_OUT, type: db.NUMBER } }
    );
    const fine = result.outBinds.fine;
    return res.status(200).json({ message: 'Book returned successfully.', fine });
  } catch (err) {
    return res.status(500).json({ message: 'Return processing failed.', error: err.message });
  }
};
