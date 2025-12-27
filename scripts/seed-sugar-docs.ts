import { transaction, setCurrentOrganization, setCurrentUser } from '../db/postgres';

async function seedSugarDocs() {
  await transaction(async (client) => {
    const { rows: orgRows } = await client.query('SELECT id FROM organizations WHERE slug = $1', ['sugar-llp']);
    if (orgRows.length === 0) {
      throw new Error('Sugar LLP organization not found');
    }
    const orgId = orgRows[0].id as number;

    const { rows: ownerRows } = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['rob@sugar.com']
    );

    if (ownerRows.length === 0) {
      throw new Error('Sugar LLP owner user not found');
    }

    const ownerId = ownerRows[0].id as number;

    await setCurrentUser(client, ownerId);
    await setCurrentOrganization(client, orgId);

    const { rows: workspaceRows } = await client.query(
      'SELECT id, slug FROM workspaces WHERE organization_id = $1',
      [orgId]
    );

    const workspaces = new Map<string, number>();
    workspaceRows.forEach((row) => workspaces.set(row.slug, row.id));

    const ensureProject = async (workspaceSlug: string, projectSlug: string, name: string, description: string) => {
      const workspaceId = workspaces.get(workspaceSlug);
      if (!workspaceId) throw new Error(`Workspace ${workspaceSlug} not found`);
      const { rows } = await client.query(
        'SELECT id FROM projects WHERE workspace_id = $1 AND slug = $2',
        [workspaceId, projectSlug]
      );
      if (rows.length > 0) return rows[0].id as number;
      const inserted = await client.query(
        `INSERT INTO projects (workspace_id, slug, name, description, metadata)
         VALUES ($1, $2, $3, $4, '{}'::jsonb) RETURNING id`,
        [workspaceId, projectSlug, name, description]
      );
      return inserted.rows[0].id as number;
    };

    const ensureDoc = async (
      projectId: number,
      title: string,
      body: string,
      favorite = false,
    ) => {
      const result = await client.query(
        `INSERT INTO documents (project_id, title, body, is_favorite, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING id`,
        [projectId, title, body, favorite]
      );
      console.log(`Inserted document "${title}" into project ${projectId} (rowCount=${result.rowCount})`);
    };

    const sugarWorkspaceId = await ensureProject(
      'sugar-llp-workspace',
      'sugar-operating-model',
      'Sugar LLP Operating Model',
      'Operating model documents and stakeholder notes'
    );

    await ensureDoc(
      sugarWorkspaceId,
      'Sugar LLP Stakeholder Interview',
      `Interview date: 2025-10-18
Interviewers: Rob Mould, Ops Team

Highlights:
- Core goal is to align SupaDupa launch with upcoming board meeting
- Stakeholders want tighter alignment between research cadence and roadmap checkpoints
- Regulatory compliance is a recurring theme; need checklist integrated into workflow

Follow-ups:
1. Ops to share compliance checklist template
2. Rob to schedule walkthrough of backlog triage process
3. Analyst to summarise SupaDupa personas for wider sharing`,
      true
    );

    await ensureDoc(
      sugarWorkspaceId,
      'Sugar LLP Research Priorities Q4',
      `Context: Q4 planning session held on 2025-10-20

Priorities:
1. Validate SupaDupa onboarding flow with 8-10 pilot customers
2. Map Sugar LLP workspace usage patterns to refine permissions model
3. Prepare executive briefing for board review (due 2025-11-05)

Next steps:
- Analyst to draft research plan by 2025-10-25
- Ops team to supply latest customer segmentation deck
- Rob to confirm board meeting agenda slot`
    );

    const supadupaProjectId = await ensureProject(
      'supadupa-app',
      'supadupa-customer-insights',
      'SupaDupa Customer Insights',
      'Research outputs and artefacts for SupaDupa app'
    );

    await ensureDoc(
      supadupaProjectId,
      'SupaDupa Personas',
      `Persona: Growth Manager
- Motivations: Increase retention, launch referral campaigns, monitor cohort health
- Pain points: Fragmented analytics, manual spreadsheet workflows
- Quotes: "I spend more time cleaning data than analysing outcomes."

Persona: CX Lead
- Motivations: Improve onboarding satisfaction, reduce support tickets
- Pain points: Limited visibility into early churn triggers, no centralised feedback loop
- Quotes: "We rely on anecdotal feedback; I need structured signals."`
    );

    await ensureDoc(
      supadupaProjectId,
      'SupaDupa Tone of Voice',
      `Guiding principles:
1. Warm, confident, and pragmatic
2. Emphasise partnership and shared ownership
3. Highlight measurable outcomes without jargon

Examples:
- Instead of "activate," use "kick off"
- Frame product language around collaboration: "Let’s review this together"
- Close loops with action: "Here’s what happens next…"`
    );

    const robsProjectId = await ensureProject(
      'robs-workspace',
      'robs-product-strategy',
      "Rob's Product Strategy",
      'Personal notes and planning artefacts'
    );

    await ensureDoc(
      robsProjectId,
      'Roadmap Thoughts',
      `Working ideas for Sugar LLP backlog:
- Kanban board needs native swimlanes (target Jan release)
- Consider Postgres-only rollout for local dev to reduce adapter bugs
- MCP integration to include Claude + GPT parity checks

Action items:
- Validate swimlane data model with dev team
- Schedule Postgres migration pilot after holiday season`
    );

    await ensureDoc(
      robsProjectId,
      'Personal TODOs',
      `1. Finalise SupaDupa backlog presentation
2. Draft memo on Postgres migration lessons
3. Review analyst anonymisation pipeline outputs
4. Update productboard with latest research signals`
    );
  });
}

if (require.main === module) {
  seedSugarDocs()
    .then(() => {
      console.log('✅ Sugar LLP projects and documents seeded');
    })
    .catch((err) => {
      console.error('❌ Failed to seed Sugar LLP data:', err);
      process.exit(1);
    });
}
