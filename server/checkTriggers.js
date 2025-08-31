const { getConnection } = require('./db');

async function checkTriggers() {
  try {
    const conn = await getConnection();
    const result = await conn.execute(`
      SELECT trigger_name, status, table_name
      FROM user_triggers 
      WHERE table_name IN ('BOOKS', 'BOOK_STOCK', 'LOANS')
      ORDER BY table_name, trigger_name
    `);
    
    console.log('Triggers on BOOKS, BOOK_STOCK, and LOANS tables:');
    result.rows.forEach(row => {
      console.log(`${row[2]}.${row[0]}: ${row[1]}`);
    });
    
    await conn.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTriggers();
