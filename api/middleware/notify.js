const supabase = require('../db/supabase');

async function notify(userId, message, type = 'info') {
  await supabase.from('notifications').insert({ user_id: userId, message, type });
}

module.exports = { notify };
