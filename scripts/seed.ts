import { WorkspaceRepo } from '../src/server/repo/workspace';
import { ProjectRepo } from '../src/server/repo/project';
import { DocumentRepo } from '../src/server/repo/document';
import { TagRepo } from '../src/server/repo/tag';

const workspaceRepo = new WorkspaceRepo();
const projectRepo = new ProjectRepo();
const documentRepo = new DocumentRepo();
const tagRepo = new TagRepo();

// Sample documents for demo-co
const demoCoDocuments = [
  {
    project: 'market-research',
    title: 'User Interview: E-commerce Checkout Flow',
    body: `Interview with Sarah, 32, frequent online shopper.

Key findings:
- Checkout process takes too long (5+ steps)
- Users abandon cart when forced to create account
- Payment options are limited
- Mobile experience is frustrating

Quote: "I just want to buy something quickly, not fill out a form for 10 minutes."

Recommendations:
- Implement guest checkout
- Reduce checkout steps to 3 maximum
- Add more payment options (Apple Pay, Google Pay)
- Optimize mobile checkout flow`,
    tags: ['checkout', 'usability', 'mobile', 'persona']
  },
  {
    project: 'market-research',
    title: 'Competitive Analysis: Payment Flows',
    body: `Analysis of 5 major e-commerce sites and their payment flows.

Amazon: 1-click checkout, multiple payment options
Shopify stores: Varied, but generally 3-4 steps
Target: Guest checkout available, clean mobile UI
Walmart: Account required, but fast process
Best Buy: Good mobile experience, clear progress indicators

Key insights:
- Guest checkout is becoming standard
- Mobile-first design is critical
- Progress indicators reduce abandonment
- Multiple payment options increase conversion`,
    tags: ['competitive-analysis', 'checkout', 'benchmarking']
  },
  {
    project: 'product-research',
    title: 'Usability Test: New Dashboard Design',
    body: `Usability testing session with 8 participants testing the new dashboard design.

Task success rates:
- Find recent orders: 87.5%
- Update profile: 75%
- Navigate to support: 62.5%
- Use search function: 50%

Main issues:
- Search icon not prominent enough
- Support link buried in footer
- Profile settings scattered across multiple pages

Positive feedback:
- Clean, modern design
- Fast loading times
- Clear navigation hierarchy`,
    tags: ['usability', 'dashboard', 'navigation', 'testing']
  },
  {
    project: 'product-research',
    title: 'User Persona: Tech-Savvy Millennial',
    body: `Persona: Alex Chen, 28, Software Developer

Demographics:
- Age: 28
- Location: San Francisco
- Income: $120k
- Education: Computer Science degree

Behaviors:
- Shops online 3-4 times per week
- Uses mobile for 80% of purchases
- Values speed and efficiency
- Reads reviews before buying
- Uses ad blockers and privacy tools

Goals:
- Quick, frictionless shopping experience
- Detailed product information
- Fast shipping options
- Easy returns process

Pain points:
- Slow loading websites
- Complicated checkout processes
- Poor mobile experiences
- Lack of product details`,
    tags: ['persona', 'millennial', 'tech-savvy', 'mobile']
  },
  {
    project: 'market-research',
    title: 'Survey Results: Customer Satisfaction Q3',
    body: `Customer satisfaction survey results for Q3 2024.

Response rate: 23% (2,300 responses)

Overall satisfaction: 7.2/10 (up from 6.8 in Q2)

Top satisfaction drivers:
1. Product quality (8.1/10)
2. Shipping speed (7.8/10)
3. Customer service (7.5/10)

Areas for improvement:
1. Website usability (6.2/10)
2. Mobile app experience (5.9/10)
3. Return process (6.0/10)

Key insights:
- Mobile app needs significant improvement
- Return process is a major pain point
- Product quality remains our strongest asset
- Customer service improvements are paying off`,
    tags: ['survey', 'satisfaction', 'mobile', 'returns']
  }
];

// Sample documents for client-x
const clientXDocuments = [
  {
    project: 'discovery',
    title: 'Stakeholder Interview: Product Vision',
    body: `Interview with Product VP about vision for new platform.

Current challenges:
- Legacy system limitations
- Poor user experience
- Scalability issues
- Integration problems

Vision for new platform:
- Modern, intuitive interface
- Mobile-first approach
- API-first architecture
- Real-time collaboration features

Success metrics:
- 50% reduction in task completion time
- 90% user satisfaction score
- 99.9% uptime
- 10x improvement in performance`,
    tags: ['stakeholder', 'vision', 'platform', 'performance']
  },
  {
    project: 'discovery',
    title: 'User Journey Mapping: Current State',
    body: `Current state user journey for the main workflow.

Phases:
1. Login (2-3 minutes) - Multiple authentication steps
2. Navigation (1-2 minutes) - Complex menu structure
3. Data entry (10-15 minutes) - Multiple forms, validation issues
4. Review (3-5 minutes) - No preview functionality
5. Submission (1-2 minutes) - Unclear success indicators

Pain points:
- Too many authentication steps
- Confusing navigation
- Form validation errors not clear
- No way to save progress
- Unclear what happens after submission

Opportunities:
- Single sign-on integration
- Simplified navigation
- Better form design
- Auto-save functionality
- Clear progress indicators`,
    tags: ['journey-mapping', 'workflow', 'forms', 'navigation']
  },
  {
    project: 'alpha',
    title: 'Prototype Testing: New Interface',
    body: `Testing results for the new interface prototype.

Participants: 12 users (mix of new and existing)

Key findings:
- 83% found new interface more intuitive
- Task completion time reduced by 40%
- Error rate decreased by 60%
- 92% would prefer new interface

Specific improvements:
- Clearer button labels
- Better visual hierarchy
- Consistent interaction patterns
- Improved error messages

Areas still needing work:
- Advanced features discoverability
- Help documentation integration
- Keyboard navigation
- Accessibility compliance`,
    tags: ['prototype', 'testing', 'interface', 'accessibility']
  }
];

async function createWorkspaceWithData(
  workspaceData: { slug: string; name: string },
  projectsData: Array<{ slug: string; name: string; description?: string }>,
  documentsData: Array<{ project: string; title: string; body: string; tags: string[] }>
) {
  console.log(`Creating workspace: ${workspaceData.name}`);
  
  // Create workspace
  const workspace = workspaceRepo.create(workspaceData);
  
  // Create projects
  const projects = new Map();
  for (const projectData of projectsData) {
    const project = projectRepo.create(workspace.id, projectData);
    projects.set(project.slug, project);
    console.log(`  Created project: ${project.name}`);
  }
  
  // Create documents with tags
  for (const docData of documentsData) {
    const project = projects.get(docData.project);
    if (!project) {
      console.warn(`  Warning: Project ${docData.project} not found for document ${docData.title}`);
      continue;
    }
    
    // Create document
    const document = documentRepo.create(project.id, {
      title: docData.title,
      body: docData.body
    });
    
    // Create and attach tags
    if (docData.tags.length > 0) {
      const tagIds = tagRepo.upsertMany(workspace.id, docData.tags);
      tagRepo.attach(document.id, tagIds);
    }
    
    console.log(`    Created document: ${document.title} (${docData.tags.length} tags)`);
  }
  
  return workspace;
}

async function seed() {
  console.log('🌱 Seeding database with demo data...\n');
  
  try {
    // Create demo-co workspace
    const demoCo = await createWorkspaceWithData(
      { slug: 'demo-co', name: 'Demo Co' },
      [
        { slug: 'market-research', name: 'Market Research', description: 'Customer insights and market analysis' },
        { slug: 'product-research', name: 'Product Research', description: 'User experience and product validation' }
      ],
      demoCoDocuments
    );
    
    console.log('');
    
    // Create client-x workspace
    const clientX = await createWorkspaceWithData(
      { slug: 'client-x', name: 'Client X' },
      [
        { slug: 'discovery', name: 'Discovery', description: 'Initial research and requirements gathering' },
        { slug: 'alpha', name: 'Alpha Testing', description: 'Early prototype testing and validation' }
      ],
      clientXDocuments
    );
    
    console.log('\n✅ Seeding completed successfully!\n');
    
    // Print helpful URLs
    console.log('🔗 Access your workspaces:');
    console.log(`   Demo Co: http://localhost:3001/w/demo-co/search`);
    console.log(`   Client X: http://localhost:3001/w/client-x/search`);
    
    console.log('\n📊 API endpoints:');
    console.log(`   Demo Co workspace: GET /w/demo-co/api/workspace`);
    console.log(`   Demo Co projects: GET /w/demo-co/api/projects`);
    console.log(`   Demo Co search: POST /w/demo-co/api/search`);
    console.log(`   Client X workspace: GET /w/client-x/api/workspace`);
    console.log(`   Client X projects: GET /w/client-x/api/projects`);
    console.log(`   Client X search: POST /w/client-x/api/search`);
    
    console.log('\n🧪 Test cross-workspace isolation:');
    console.log(`   Try searching "checkout" in both workspaces - should return different results`);
    console.log(`   Try accessing /w/demo-co/api/search with client-x project slugs - should fail`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

export { seed };
