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
    const uName = username || userId;

    // Load the existing snapshot so a stale/empty device cannot erase tasks it
    // has never seen. Deletions are authoritative only when represented by a
    // task tombstone sent by the client.
    const existing = await context.env.DB.prepare(
      'SELECT updated_at, data FROM user_sync WHERE user_id = ?'
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

    let incomingData = data;
    let existingData = null;
    try {
      if (typeof incomingData === 'string') incomingData = JSON.parse(incomingData);
    } catch (_) {
      incomingData = null;
    }
    try {
      existingData = existing && existing.data ? JSON.parse(existing.data) : null;
    } catch (_) {
      existingData = null;
    }

    if (incomingData && !Array.isArray(incomingData) && Array.isArray(incomingData.tasks) &&
        existingData && !Array.isArray(existingData) && Array.isArray(existingData.tasks)) {
      const tombstones = new Set([
        ...(Array.isArray(existingData.deletedTaskIds) ? existingData.deletedTaskIds : []),
        ...(Array.isArray(incomingData.deletedTaskIds) ? incomingData.deletedTaskIds : [])
      ].map(String));
      const mergedById = new Map();
      const unkeyedTasks = [];
      for (const task of existingData.tasks) {
        if (!task || task.id == null) {
          unkeyedTasks.push(task);
        } else if (!tombstones.has(String(task.id))) {
          mergedById.set(String(task.id), task);
        }
      }
      for (const task of incomingData.tasks) {
        if (!task || task.id == null) {
          unkeyedTasks.push(task);
        } else if (!tombstones.has(String(task.id))) {
          mergedById.set(String(task.id), task);
        }
      }
      incomingData = {
        ...existingData,
        ...incomingData,
        tasks: [...mergedById.values(), ...unkeyedTasks],
        deletedTaskIds: [...tombstones]
      };
    }
    const dataString = typeof data === 'string' && incomingData == null
      ? data
      : JSON.stringify(incomingData);

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
