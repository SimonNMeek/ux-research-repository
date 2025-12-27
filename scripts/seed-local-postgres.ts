import { transaction } from '../db/postgres';
import { hashPassword } from '../lib/auth';

interface ProjectSeed {
  slug: string;
  name: string;
  description?: string;
}

interface WorkspaceSeed {
  slug: string;
  name: string;
  description?: string;
  projects?: ProjectSeed[];
}

interface MemberSeed {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  lastName?: string;
  systemRole?: 'super_admin' | 'admin' | 'contributor' | 'viewer';
  orgRole: 'owner' | 'admin' | 'member';
  workspaceRoles: Record<string, 'owner' | 'admin' | 'member' | 'viewer'>;
}

interface OrganizationSeed {
  slug: string;
  name: string;
  plan?: 'free' | 'pro' | 'enterprise';
  max_workspaces?: number;
  max_users?: number;
  max_documents?: number;
  workspaces: WorkspaceSeed[];
  members: MemberSeed[];
}

const ORGS: OrganizationSeed[] = [
  {
    slug: 'sol',
    name: 'Sol Labs',
    plan: 'enterprise',
    max_workspaces: 20,
    max_users: 100,
    max_documents: 5000,
    workspaces: [
      {
        slug: 'sol-main',
        name: 'Sol Main Workspace',
        description: 'Central workspace for Sol internal projects',
        projects: [
          { slug: 'sol-roadmap', name: 'Sol Roadmap', description: 'Company strategy and roadmap' },
          { slug: 'sol-research', name: 'Sol Research', description: 'Internal research findings' },
        ],
      },
    ],
    members: [
      {
        email: 'admin@heysol.io',
        password: 'Sol2024!SecureAdmin',
        name: 'Sol Super Admin',
        firstName: 'Sol',
        lastName: 'Admin',
        systemRole: 'super_admin',
        orgRole: 'owner',
        workspaceRoles: {
          'sol-main': 'owner',
        },
      },
      {
        email: 'admin@heysol.com',
        password: 'Sol2024!SecureAdmin',
        name: 'Sol Legacy Admin',
        firstName: 'Sol',
        lastName: 'Legacy',
        systemRole: 'super_admin',
        orgRole: 'owner',
        workspaceRoles: {
          'sol-main': 'admin',
        },
      },
      {
        email: 'admin@sol.com',
        password: 'admin123',
        name: 'Original Admin',
        firstName: 'Original',
        lastName: 'Admin',
        systemRole: 'super_admin',
        orgRole: 'owner',
        workspaceRoles: {
          'sol-main': 'admin',
        },
      },
    ],
  },
  {
    slug: 'demo-co',
    name: 'Demo Co',
    plan: 'pro',
    max_workspaces: 10,
    max_users: 40,
    max_documents: 2000,
    workspaces: [
      {
        slug: 'demo-co',
        name: 'Demo Co Research',
        description: 'Primary workspace for Demo Co research projects',
        projects: [
          { slug: 'market-research', name: 'Market Research', description: 'Competitive and market analysis' },
          { slug: 'product-research', name: 'Product Research', description: 'Product design and usability' },
        ],
      },
    ],
    members: [
      {
        email: 'maya@demo.co',
        password: 'Demo2024!',
        name: 'Maya Singh',
        firstName: 'Maya',
        lastName: 'Singh',
        orgRole: 'owner',
        workspaceRoles: {
          'demo-co': 'owner',
        },
      },
      {
        email: 'liam@demo.co',
        password: 'Demo2024!',
        name: 'Liam O’Connor',
        firstName: 'Liam',
        lastName: 'OConnor',
        orgRole: 'admin',
        workspaceRoles: {
          'demo-co': 'admin',
        },
      },
      {
        email: 'ayesha@demo.co',
        password: 'Demo2024!',
        name: 'Ayesha Khan',
        firstName: 'Ayesha',
        lastName: 'Khan',
        orgRole: 'member',
        workspaceRoles: {
          'demo-co': 'member',
        },
      },
    ],
  },
  {
    slug: 'client-x',
    name: 'Client X',
    plan: 'pro',
    max_workspaces: 10,
    max_users: 40,
    max_documents: 2000,
    workspaces: [
      {
        slug: 'client-x',
        name: 'Client X Workspace',
        description: 'Discovery and delivery projects for Client X',
        projects: [
          { slug: 'discovery', name: 'Discovery', description: 'Discovery and research phase' },
          { slug: 'alpha', name: 'Alpha Testing', description: 'Alpha testing and prototyping' },
        ],
      },
    ],
    members: [
      {
        email: 'olivia@clientx.io',
        password: 'Client2024!',
        name: 'Olivia Brown',
        firstName: 'Olivia',
        lastName: 'Brown',
        orgRole: 'owner',
        workspaceRoles: {
          'client-x': 'owner',
        },
      },
      {
        email: 'james@clientx.io',
        password: 'Client2024!',
        name: 'James Carter',
        firstName: 'James',
        lastName: 'Carter',
        orgRole: 'admin',
        workspaceRoles: {
          'client-x': 'admin',
        },
      },
    ],
  },
  {
    slug: 'sugar-llp',
    name: 'Sugar LLP',
    plan: 'pro',
    max_workspaces: 10,
    max_users: 40,
    max_documents: 2000,
    workspaces: [
      {
        slug: 'sugar-llp-workspace',
        name: 'Sugar LLP Workspace',
        description: 'Core workspace for Sugar LLP',
        projects: [
          { slug: 'llp-overview', name: 'LLP Overview', description: 'Organization-wide initiatives' },
        ],
      },
      {
        slug: 'supadupa-app',
        name: 'SupaDupa App',
        description: 'SupaDupa product research',
        projects: [
          { slug: 'supadupa-research', name: 'SupaDupa Research', description: 'Customer and product research' },
        ],
      },
      {
        slug: 'robs-workspace',
        name: "Rob's Workspace",
        description: 'Personal workspace for Rob',
        projects: [
          { slug: 'robs-project', name: "Rob's Project", description: 'Rob’s personal projects' },
        ],
      },
    ],
    members: [
      {
        email: 'rob@sugar.com',
        password: 'Sugar2024!',
        name: 'Robert Mould',
        firstName: 'Robert',
        lastName: 'Mould',
        orgRole: 'owner',
        workspaceRoles: {
          'sugar-llp-workspace': 'owner',
          'supadupa-app': 'owner',
          'robs-workspace': 'owner',
        },
      },
      {
        email: 'ops@sugar.com',
        password: 'Sugar2024!',
        name: 'Operations Sugar',
        firstName: 'Operations',
        lastName: 'Team',
        orgRole: 'admin',
        workspaceRoles: {
          'sugar-llp-workspace': 'admin',
          'supadupa-app': 'admin',
        },
      },
      {
        email: 'simonmeek@gmail.com',
        password: 'Research2024!',
        name: 'Simon Meek',
        firstName: 'Simon',
        lastName: 'Meek',
        orgRole: 'admin',
        workspaceRoles: {
          'sugar-llp-workspace': 'admin',
        },
      },
      {
        email: 'analyst@sugar.com',
        password: 'Sugar2024!',
        name: 'Sugar Analyst',
        firstName: 'Sugar',
        lastName: 'Analyst',
        orgRole: 'member',
        workspaceRoles: {
          'sugar-llp-workspace': 'member',
          'supadupa-app': 'member',
        },
      },
    ],
  },
];

async function ensureOrganization(client: any, org: OrganizationSeed): Promise<number> {
  const existing = await client.query('SELECT id FROM organizations WHERE slug = $1', [org.slug]);
  if (existing.rowCount > 0) {
    const id = existing.rows[0].id as number;
    await client.query(
      `UPDATE organizations
         SET name = $2,
             plan = COALESCE($3, plan),
             max_workspaces = COALESCE($4, max_workspaces),
             max_users = COALESCE($5, max_users),
             max_documents = COALESCE($6, max_documents),
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, org.name, org.plan ?? null, org.max_workspaces ?? null, org.max_users ?? null, org.max_documents ?? null]
    );
    return id;
  }

  const inserted = await client.query(
    `INSERT INTO organizations (slug, name, plan, max_workspaces, max_users, max_documents)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
    [org.slug, org.name, org.plan ?? 'free', org.max_workspaces ?? 3, org.max_users ?? 5, org.max_documents ?? 100]
  );
  return inserted.rows[0].id as number;
}

async function ensureWorkspace(client: any, orgId: number, workspace: WorkspaceSeed): Promise<number> {
  const existing = await client.query('SELECT id FROM workspaces WHERE slug = $1', [workspace.slug]);
  if (existing.rowCount > 0) {
    const id = existing.rows[0].id as number;
    await client.query(
      `UPDATE workspaces
         SET name = $2,
             organization_id = $3,
             metadata = $4::jsonb,
             created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
       WHERE id = $1`,
      [id, workspace.name, orgId, JSON.stringify({ description: workspace.description ?? '' })]
    );
    return id;
  }

  const inserted = await client.query(
    `INSERT INTO workspaces (slug, name, organization_id, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
    [workspace.slug, workspace.name, orgId, JSON.stringify({ description: workspace.description ?? '' })]
  );
  return inserted.rows[0].id as number;
}

async function ensureProject(client: any, workspaceId: number, project: ProjectSeed): Promise<number> {
  const existing = await client.query(
    'SELECT id FROM projects WHERE workspace_id = $1 AND slug = $2',
    [workspaceId, project.slug]
  );
  if (existing.rowCount > 0) {
    const id = existing.rows[0].id as number;
    await client.query(
      `UPDATE projects
         SET name = $3,
             description = $4,
             metadata = COALESCE(metadata, '{}'::jsonb)
       WHERE workspace_id = $1 AND slug = $2`,
      [workspaceId, project.slug, project.name, project.description ?? '']
    );
    return id;
  }

  const inserted = await client.query(
    `INSERT INTO projects (workspace_id, slug, name, description, metadata)
       VALUES ($1, $2, $3, $4, '{}'::jsonb)
       RETURNING id`,
    [workspaceId, project.slug, project.name, project.description ?? '']
  );
  return inserted.rows[0].id as number;
}

async function ensureUser(client: any, member: MemberSeed): Promise<number> {
  const systemRole = member.systemRole ?? 'contributor';
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [member.email]);
  const passwordHash = hashPassword(member.password);

  const name = member.name;
  const firstName = member.firstName ?? name.split(' ')[0] ?? name;
  const lastNameSource = name.split(' ').slice(1).join(' ');
  const lastName = member.lastName ?? (lastNameSource !== '' ? lastNameSource : null);

  if (existing.rowCount > 0) {
    const id = existing.rows[0].id as number;
    await client.query(
      `UPDATE users
         SET name = $2,
             first_name = $3,
             last_name = $4,
             password_hash = $5,
             system_role = $6,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, name, firstName, lastName, passwordHash, systemRole]
    );
    return id;
  }

  const inserted = await client.query(
    `INSERT INTO users (email, name, first_name, last_name, password_hash, system_role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
    [member.email, name, firstName, lastName, passwordHash, systemRole]
  );
  return inserted.rows[0].id as number;
}

async function ensureUserOrganization(
  client: any,
  userId: number,
  orgId: number,
  role: 'owner' | 'admin' | 'member'
): Promise<void> {
  await client.query(
    `INSERT INTO user_organizations (user_id, organization_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, organization_id)
       DO UPDATE SET role = EXCLUDED.role, joined_at = CURRENT_TIMESTAMP`,
    [userId, orgId, role]
  );
}

async function ensureUserWorkspace(
  client: any,
  userId: number,
  workspaceId: number,
  role: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<void> {
  await client.query(
    `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
       VALUES ($1, $2, $3, $1)
       ON CONFLICT (user_id, workspace_id)
       DO UPDATE SET role = EXCLUDED.role, granted_at = CURRENT_TIMESTAMP`,
    [userId, workspaceId, role]
  );
}

async function seed() {
  console.log('🌱 Seeding local PostgreSQL database with demo data...');

  await transaction(async (client) => {
    for (const org of ORGS) {
      const orgId = await ensureOrganization(client, org);
      const workspaceIds = new Map<string, number>();

      for (const workspace of org.workspaces) {
        const workspaceId = await ensureWorkspace(client, orgId, workspace);
        workspaceIds.set(workspace.slug, workspaceId);

        if (workspace.projects && workspace.projects.length > 0) {
          for (const project of workspace.projects) {
            await ensureProject(client, workspaceId, project);
          }
        }
      }

      for (const member of org.members) {
        const userId = await ensureUser(client, member);
        await ensureUserOrganization(client, userId, orgId, member.orgRole);

        for (const [workspaceSlug, role] of Object.entries(member.workspaceRoles)) {
          const workspaceId = workspaceIds.get(workspaceSlug);
          if (!workspaceId) {
            console.warn(`⚠️  Workspace ${workspaceSlug} not found for ${member.email}`);
            continue;
          }
          await ensureUserWorkspace(client, userId, workspaceId, role);
        }
      }
    }
  });

  console.log('✅ Seeding completed!');
  console.log('• Super admin: admin@heysol.io / Sol2024!SecureAdmin');
  console.log('• Super admin (legacy): admin@heysol.com / Sol2024!SecureAdmin');
  console.log('• Super admin (fallback): admin@sol.com / admin123');
  console.log('• Demo Co owner: maya@demo.co / Demo2024!');
  console.log('• Client X owner: olivia@clientx.io / Client2024!');
  console.log('• Sugar LLP owner: rob@sugar.com / Sugar2024!');
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}
