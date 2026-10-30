const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

export async function onRequestGet(context) {
  try {
    if (!context.env.DB) {
      return new Response(JSON.stringify({
        success: false,
        error: 'DB binding not found'
      }), { status: 500, headers: corsHeaders });
    }

    const url = new URL(context.request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId query parameter is required'
      }), { status: 400, headers: corsHeaders });
    }

    const row = await context.env.DB.prepare(
      'SELECT user_id, username, data, updated_at FROM user_sync WHERE user_id = ?'
    ).bind(userId).first();

    if (!row) {
      return new Response(JSON.stringify({
        success: true,
        found: false,
        userId: userId,
        message: 'No remote record found for this user'
      }), { status: 200, headers: corsHeaders });
    }

    let parsedData = null;
    try {
      parsedData = JSON.parse(row.data);
    } catch (e) {
      parsedData = row.data;
    }

    return new Response(JSON.stringify({
      success: true,
      found: true,
      userId: row.user_id,
      username: row.username,
      data: parsedData,
      updatedAt: row.updated_at
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPost(context) {
  try {
    if (!context.env.DB) {
      return new Response(JSON.stringify({
        success: false,
        error: 'DB binding not found'
      }), { status: 500, headers: corsHeaders });
    }

    const body = await context.request.json();
    const { userId, username, data, updatedAt } = body;

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId is required'
      }), { status: 400, headers: corsHeaders });
    }

    const now = Number(updatedAt) || Date.now();
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const uName = username || userId;

    // Check existing record to avoid overwriting with older data
    const existing = await context.env.DB.prepare(
      'SELECT updated_at FROM user_sync WHERE user_id = ?'
    ).bind(userId).first();

    if (existing && existing.updated_at && existing.updated_at > now) {
      // Remote is strictly newer than what client attempted to push
      return new Response(JSON.stringify({
        success: false,
        stale: true,
        remoteUpdatedAt: existing.updated_at,
        message: 'Remote data is newer than client payload'
      }), {
        status: 409,
        headers: corsHeaders
      });
    }

    // UPSERT into user_sync
    await context.env.DB.prepare(`
      INSERT INTO user_sync (user_id, username, data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(userId, uName, dataString, now).run();

    return new Response(JSON.stringify({
      success: true,
      userId: userId,
      updatedAt: now
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500, headers: corsHeaders });
  }
}
