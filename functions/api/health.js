export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    if (!context.env.DB) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Database binding (DB) not found in context.env'
      }), { status: 500, headers: corsHeaders });
    }

    const res = await context.env.DB.prepare('SELECT COUNT(*) as count FROM user_sync').first();
    return new Response(JSON.stringify({
      ok: true,
      database: 'emi-reminder-db',
      table: 'user_sync',
      recordsCount: res ? res.count : 0,
      timestamp: Date.now()
    }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err.message
    }), { status: 500, headers: corsHeaders });
  }
}
