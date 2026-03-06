// Debug each step of the sessions API manually
const { Pool } = require('pg');

async function debugSessionsStepByStep() {
  console.log('=== Debugging Sessions API Step by Step ===\n');

  // Step 1: Test database connection
  console.log('1. Testing database connection...');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD || 'secure_app_password_change_in_production',
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return;
  }

  // Step 2: Test workbook_users table access
  console.log('\n2. Testing workbook_users table access...');
  try {
    const userResult = await pool.query('SELECT COUNT(*) FROM workbook_users');
    console.log(`✅ workbook_users accessible, count: ${userResult.rows[0].count}`);
  } catch (error) {
    console.error('❌ workbook_users access failed:', error.message);
  }

  // Step 3: Test workshop_sessions table access
  console.log('\n3. Testing workshop_sessions table access...');
  try {
    const sessionResult = await pool.query('SELECT COUNT(*) FROM workshop_sessions WHERE is_published = true');
    console.log(`✅ workshop_sessions accessible, published count: ${sessionResult.rows[0].count}`);
  } catch (error) {
    console.error('❌ workshop_sessions access failed:', error.message);
  }

  // Step 4: Test user creation/verification logic
  console.log('\n4. Testing user creation/verification logic...');
  const testSession = {
    userId: 'test-user-12345',
    email: 'test@6fbmethodologies.com',
    name: 'Test User Workshop',
    role: 'basic'
  };

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM workbook_users WHERE email = $1',
      [testSession.email]
    );

    if (existingUser.rows.length === 0) {
      console.log('User doesn\'t exist, attempting to create...');

      // Try to create user (similar to ensureUserExists function)
      await pool.query(
        `
        INSERT INTO workbook_users (
          id, email, first_name, last_name, subscription_tier,
          workshop_access_granted, daily_transcription_limit_minutes,
          monthly_cost_limit_cents, preferences
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO NOTHING
      `,
        [
          testSession.userId,
          testSession.email,
          testSession.name?.split(' ')[0] || 'Workshop',
          testSession.name?.split(' ').slice(1).join(' ') || 'Participant',
          testSession.role || 'basic',
          true,
          testSession.role === 'vip' ? 240 : testSession.role === 'premium' ? 120 : 60,
          testSession.role === 'vip' ? 10000 : testSession.role === 'premium' ? 5000 : 2500,
          JSON.stringify({}),
        ]
      );
      console.log('✅ User creation successful');
    } else {
      console.log('✅ User already exists');
    }
  } catch (error) {
    console.error('❌ User creation/verification failed:', error.message);
    console.error('Error details:', error);
  }

  // Step 5: Test the exact sessions query
  console.log('\n5. Testing the exact sessions query...');
  try {
    const sessionsQuery = `
      SELECT
        id, title, description, presenter, session_order,
        scheduled_start, scheduled_end, duration_minutes,
        session_type, status, is_live, objectives, key_points, tags
      FROM workshop_sessions
      WHERE is_published = true
      ORDER BY session_order ASC, scheduled_start ASC
    `;

    const sessions = await pool.query(sessionsQuery);
    console.log(`✅ Sessions query successful, found ${sessions.rows.length} sessions`);

    // Test transformation
    const transformedSessions = sessions.rows.map((session) => ({
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

    console.log('✅ Data transformation successful');
    console.log('First session:', JSON.stringify(transformedSessions[0], null, 2));

  } catch (error) {
    console.error('❌ Sessions query failed:', error.message);
    console.error('Error details:', error);
  }

  await pool.end();
  console.log('\n=== Debug Complete ===');
}

debugSessionsStepByStep().catch(console.error);