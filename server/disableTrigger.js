const { getConnection } = require('./db');

async function disableTrigger() {
  try {
    const conn = await getConnection();
    
    console.log('Disabling TRG_AUTO_FULFILL_RESERVATION trigger...');
    await conn.execute('ALTER TRIGGER TRG_AUTO_FULFILL_RESERVATION DISABLE');
    
    console.log('Trigger disabled successfully!');
    
    await conn.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

disableTrigger();
