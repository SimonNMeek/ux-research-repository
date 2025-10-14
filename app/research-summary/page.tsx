export default function ResearchSummaryPage() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Farm to Fork User Research Summary</h1>
      
      <h2>Research Overview</h2>
      <p><strong>Workspace:</strong> Farm to Fork</p>
      <p><strong>Project:</strong> User Research (3 interviews)</p>
      <p><strong>Focus:</strong> Checkout experience and user feedback</p>
      
      <h2>Key Findings</h2>
      
      <h3>Common Checkout Issues</h3>
      <ul>
        <li><strong>Loyalty Points:</strong> Users unclear if points are automatically applied</li>
        <li><strong>Delivery Slots:</strong> Confusing slot selection, incorrect confirmation display</li>
        <li><strong>Address Entry:</strong> Required re-entry despite GPS location detection</li>
        <li><strong>Referral Codes:</strong> Placement not obvious, hidden at bottom of page</li>
        <li><strong>Confirmation:</strong> Screen flashes too quickly, unclear success message</li>
      </ul>
      
      <h3>User Requests</h3>
      <ul>
        <li><strong>Payment:</strong> Apple Pay integration for mobile users</li>
        <li><strong>Addresses:</strong> Saved addresses and auto-fill functionality</li>
        <li><strong>Accessibility:</strong> Larger buttons for older users</li>
        <li><strong>Mobile:</strong> Better text sizing for small screens</li>
        <li><strong>Confirmation:</strong> Clearer, more reassuring success messages</li>
      </ul>
      
      <h3>Positive Feedback</h3>
      <ul>
        <li><strong>Quality:</strong> Fresh produce significantly better than supermarkets</li>
        <li><strong>Stories:</strong> Farm profiles and farmer stories highly valued</li>
        <li><strong>Impact:</strong> Gamification through impact tracker appreciated</li>
        <li><strong>Selection:</strong> Curated products preferred over overwhelming choice</li>
        <li><strong>Values:</strong> Supporting local farmers resonates with users</li>
      </ul>
      
      <h2>User Personas</h2>
      
      <h3>Persona 1: Busy Parent (Sarah Thompson)</h3>
      <p><strong>Profile:</strong> 38, HR Manager, Bristol, 2 kids (7 & 4)</p>
      <p><strong>Shopping Habits:</strong> Online at Tesco/Sainsbury's for convenience</p>
      <p><strong>Motivations:</strong> Freshness, supporting local farms, nostalgia</p>
      <p><strong>Pain Points:</strong> Loyalty points unclear, delivery slot confusion</p>
      <p><strong>Requests:</strong> Apple Pay integration</p>
      <p><strong>Recommendation:</strong> Would recommend to other parents</p>
      
      <h3>Persona 2: Young Professional (David)</h3>
      <p><strong>Profile:</strong> 27, Consultant at Accenture, London</p>
      <p><strong>Shopping Habits:</strong> Irregular, uses Deliveroo frequently</p>
      <p><strong>Motivations:</strong> Sustainability, early adopter, Instagram discovery</p>
      <p><strong>Pain Points:</strong> Address re-entry, unclear referral placement</p>
      <p><strong>Requests:</strong> Saved addresses, auto-fill</p>
      <p><strong>Recommendation:</strong> Would recommend to colleagues</p>
      
      <h3>Persona 3: Retired Couple (Margaret Wilson)</h3>
      <p><strong>Profile:</strong> 73, Retired teacher, York</p>
      <p><strong>Shopping Habits:</strong> Farmers' market on Saturdays</p>
      <p><strong>Motivations:</strong> Personal connection, convenience without losing human touch</p>
      <p><strong>Pain Points:</strong> Text too small, unclear confirmation</p>
      <p><strong>Requests:</strong> Larger buttons, clearer confirmation</p>
      <p><strong>Recommendation:</strong> Would recommend to older friends</p>
      
      <h2>Recommendations</h2>
      
      <h3>Immediate Fixes</h3>
      <ul>
        <li>Clarify loyalty points application process</li>
        <li>Fix delivery slot confirmation display</li>
        <li>Make referral code placement more obvious</li>
        <li>Improve confirmation screen clarity and duration</li>
      </ul>
      
      <h3>Feature Enhancements</h3>
      <ul>
        <li>Implement Apple Pay for mobile checkout</li>
        <li>Add saved addresses and auto-fill</li>
        <li>Improve mobile text sizing and button sizes</li>
        <li>Enhance confirmation messaging</li>
      </ul>
      
      <h3>Strategic Insights</h3>
      <ul>
        <li>Users value quality and personal connection over convenience</li>
        <li>Farm stories and impact tracking are key differentiators</li>
        <li>Checkout friction is the main barrier to conversion</li>
        <li>Word-of-mouth recommendations are strong</li>
      </ul>
      
      <p style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        Research conducted: October 2025 | Farm to Fork User Research Project
      </p>
    </div>
  );
}
