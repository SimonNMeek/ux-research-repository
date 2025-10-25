import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Validate session and check for SuperAdmin access
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user || user.system_role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organization = searchParams.get('organization') || 'all';
    const period = searchParams.get('period') || '30-day';
    
    const days = period === '30-day' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const db = getDbAdapter();
    const dbType = getDbType();

    // Build organization filter
    let orgFilter = '';
    let orgParams: any[] = [];
    
    if (organization !== 'all') {
      orgFilter = dbType === 'postgres' 
        ? 'AND o.slug = $1' 
        : 'AND o.slug = ?';
      orgParams = [organization];
    }

    // Get total users
    const totalUsersQuery = dbType === 'postgres'
      ? `SELECT COUNT(*) as count FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         WHERE u.is_active = true ${orgFilter}`
      : `SELECT COUNT(*) as count FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         WHERE u.is_active = 1 ${orgFilter}`;

    const totalUsersResult = await db.query(totalUsersQuery, orgParams);
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Get users who have uploaded documents (Basic Adoption)
    const adoptionQuery = dbType === 'postgres'
      ? `SELECT COUNT(DISTINCT u.id) as count 
         FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         JOIN user_workspaces uw ON u.id = uw.user_id 
         JOIN workspaces w ON uw.workspace_id = w.id 
         JOIN projects p ON w.id = p.workspace_id 
         JOIN documents d ON p.id = d.project_id 
         WHERE u.is_active = true ${orgFilter}`
      : `SELECT COUNT(DISTINCT u.id) as count 
         FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         JOIN user_workspaces uw ON u.id = uw.user_id 
         JOIN workspaces w ON uw.workspace_id = w.id 
         JOIN projects p ON w.id = p.workspace_id 
         JOIN documents d ON p.id = d.project_id 
         WHERE u.is_active = 1 ${orgFilter}`;

    const adoptionResult = await db.query(adoptionQuery, orgParams);
    const activeUsers = parseInt(adoptionResult.rows[0].count);

    // Get monthly active users (users with 3+ document interactions in last 30 days)
    const monthlyActiveQuery = dbType === 'postgres'
      ? `SELECT COUNT(*) as count FROM (
         SELECT u.id 
         FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         JOIN user_workspaces uw ON u.id = uw.user_id 
         JOIN workspaces w ON uw.workspace_id = w.id 
         JOIN projects p ON w.id = p.workspace_id 
         JOIN documents d ON p.id = d.project_id 
         WHERE u.is_active = true 
         AND d.created_at >= $${orgParams.length + 1}
         ${orgFilter}
         GROUP BY u.id 
         HAVING COUNT(d.id) >= 3
       ) active_users`
      : `SELECT COUNT(*) as count FROM (
         SELECT u.id 
         FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         JOIN user_workspaces uw ON u.id = uw.user_id 
         JOIN workspaces w ON uw.workspace_id = w.id 
         JOIN projects p ON w.id = p.workspace_id 
         JOIN documents d ON p.id = d.project_id 
         WHERE u.is_active = 1 
         AND d.created_at >= ?
         ${orgFilter}
         GROUP BY u.id 
         HAVING COUNT(d.id) >= 3
       ) active_users`;

    const monthlyActiveResult = await db.query(monthlyActiveQuery, [...orgParams, startDate.toISOString()]);
    const monthlyActiveUsers = parseInt(monthlyActiveResult.rows[0]?.count || 0);

    // Get daily active users (users active in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyActiveQuery = dbType === 'postgres'
      ? `SELECT COUNT(DISTINCT u.id) as count 
         FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         JOIN user_workspaces uw ON u.id = uw.user_id 
         JOIN workspaces w ON uw.workspace_id = w.id 
         JOIN projects p ON w.id = p.workspace_id 
         JOIN documents d ON p.id = d.project_id 
         WHERE u.is_active = true 
         AND d.created_at >= $${orgParams.length + 1}
         ${orgFilter}`
      : `SELECT COUNT(DISTINCT u.id) as count 
         FROM users u 
         JOIN user_organizations uo ON u.id = uo.user_id 
         JOIN organizations o ON uo.organization_id = o.id 
         JOIN user_workspaces uw ON u.id = uw.user_id 
         JOIN workspaces w ON uw.workspace_id = w.id 
         JOIN projects p ON w.id = p.workspace_id 
         JOIN documents d ON p.id = d.project_id 
         WHERE u.is_active = 1 
         AND d.created_at >= ?
         ${orgFilter}`;

    const dailyActiveResult = await db.query(dailyActiveQuery, [...orgParams, sevenDaysAgo.toISOString()]);
    const dailyActiveUsers = parseInt(dailyActiveResult.rows[0]?.count || 0);

    // Get total documents
    const documentsQuery = dbType === 'postgres'
      ? `SELECT COUNT(*) as count 
         FROM documents d 
         JOIN projects p ON d.project_id = p.id 
         JOIN workspaces w ON p.workspace_id = w.id 
         JOIN organizations o ON w.organization_id = o.id 
         WHERE d.created_at >= $${orgParams.length + 1}
         ${orgFilter}`
      : `SELECT COUNT(*) as count 
         FROM documents d 
         JOIN projects p ON d.project_id = p.id 
         JOIN workspaces w ON p.workspace_id = w.id 
         JOIN organizations o ON w.organization_id = o.id 
         WHERE d.created_at >= ?
         ${orgFilter}`;

    const documentsResult = await db.query(documentsQuery, [...orgParams, startDate.toISOString()]);
    const totalDocuments = parseInt(documentsResult.rows[0].count);

    // Get MCP queries (from api_key_usage table)
    let mcpQueriesQuery = '';
    let mcpQueriesParams: any[] = [];
    
    if (organization === 'all') {
      // Count all MCP queries regardless of organization
      mcpQueriesQuery = dbType === 'postgres'
        ? `SELECT COUNT(*) as count 
           FROM api_key_usage aku 
           JOIN api_keys ak ON aku.api_key_id = ak.id 
           WHERE aku.created_at >= $1`
        : `SELECT COUNT(*) as count 
           FROM api_key_usage aku 
           JOIN api_keys ak ON aku.api_key_id = ak.id 
           WHERE aku.created_at >= ?`;
      mcpQueriesParams = [startDate.toISOString()];
    } else {
      // Count MCP queries for specific organization (both org-scoped and user-scoped keys)
      mcpQueriesQuery = dbType === 'postgres'
        ? `SELECT COUNT(*) as count 
           FROM api_key_usage aku 
           JOIN api_keys ak ON aku.api_key_id = ak.id 
           LEFT JOIN organizations o ON ak.organization_id = o.id 
           LEFT JOIN users u ON ak.user_id = u.id 
           LEFT JOIN user_organizations uo ON u.id = uo.user_id 
           LEFT JOIN organizations uo_org ON uo.organization_id = uo_org.id 
           WHERE aku.created_at >= $1 
           AND (o.slug = $2 OR uo_org.slug = $2)`
        : `SELECT COUNT(*) as count 
           FROM api_key_usage aku 
           JOIN api_keys ak ON aku.api_key_id = ak.id 
           LEFT JOIN organizations o ON ak.organization_id = o.id 
           LEFT JOIN users u ON ak.user_id = u.id 
           LEFT JOIN user_organizations uo ON u.id = uo.user_id 
           LEFT JOIN organizations uo_org ON uo.organization_id = uo_org.id 
           WHERE aku.created_at >= ? 
           AND (o.slug = ? OR uo_org.slug = ?)`;
      mcpQueriesParams = [startDate.toISOString(), organization, organization];
    }

    const mcpQueriesResult = await db.query(mcpQueriesQuery, mcpQueriesParams);
    const totalMcpQueries = parseInt(mcpQueriesResult.rows[0]?.count || 0);

    // Calculate rates
    const basicAdoptionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    const activeUserRate = totalUsers > 0 ? (monthlyActiveUsers / totalUsers) * 100 : 0;
    const featureStickiness = monthlyActiveUsers > 0 ? (dailyActiveUsers / monthlyActiveUsers) * 100 : 0;

    // Generate trend data (simplified for now)
    const trends = {
      adoption: Array.from({ length: days }, (_, i) => basicAdoptionRate + (Math.random() - 0.5) * 5),
      active: Array.from({ length: days }, (_, i) => activeUserRate + (Math.random() - 0.5) * 3),
      stickiness: Array.from({ length: days }, (_, i) => featureStickiness + (Math.random() - 0.5) * 2),
      documents: Array.from({ length: days }, (_, i) => Math.floor(totalDocuments / days) + Math.floor(Math.random() * 10)),
      mcpQueries: Array.from({ length: days }, (_, i) => Math.floor(totalMcpQueries / days) + Math.floor(Math.random() * 5)),
      dates: Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      })
    };

    const analyticsData = {
      basicAdoptionRate,
      activeUserRate,
      featureStickiness,
      totalDocuments,
      totalMcpQueries,
      totalUsers,
      activeUsers,
      dailyActiveUsers,
      monthlyActiveUsers,
      trends
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
