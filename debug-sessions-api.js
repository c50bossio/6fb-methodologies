// Debug script to test the sessions API directly
const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('Testing database connection...');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD || 'secure_app_password_change_in_production',
  });

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    client.release();

    // Test the exact query from the sessions API
    console.log('2. Testing workshop sessions query...');
    const query = `
      SELECT
        id, title, description, presenter, session_order,
        scheduled_start, scheduled_end, duration_minutes,
        session_type, status, is_live, objectives, key_points, tags
      FROM workshop_sessions
      WHERE is_published = true
      ORDER BY session_order ASC, scheduled_start ASC
    `;

    const result = await pool.query(query);
    console.log(`✓ Query successful, found ${result.rows.length} sessions`);

    result.rows.forEach((session, index) => {
      console.log(`  ${index + 1}. ${session.title} (${session.session_type})`);
    });

    // Test the transformation logic
    console.log('3. Testing data transformation...');
    const transformedSessions = result.rows.map((session) => ({
      id: session.id,
      title: session.title,
      description: session.description || '',
      presenter: session.presenter,
      sessionOrder: session.session_order,
      scheduledStart: session.scheduled_start?.toISOString() || new Date().toISOString(),
      scheduledEnd: session.scheduled_end?.toISOString() || new Date().toISOString(),
      durationMinutes: session.duration_minutes || 60,
      sessionType: session.session_type || 'keynote',
      status: session.status || 'scheduled',
      isLive: session.is_live || false,
      objectives: Array.isArray(session.objectives) ? session.objectives : [],
      keyPoints: Array.isArray(session.key_points) ? session.key_points : [],
      tags: Array.isArray(session.tags) ? session.tags : []
    }));

    console.log('✓ Data transformation successful');
    console.log('Sample transformed session:', JSON.stringify(transformedSessions[0], null, 2));

  } catch (error) {
    console.error('❌ Error occurred:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      where: error.where
    });
  } finally {
    await pool.end();
  }
}

testDatabaseConnection().catch(console.error);