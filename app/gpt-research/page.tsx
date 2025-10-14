import { NextRequest } from 'next/server';

export default function GptResearchPage() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Sol Research - GPT Accessible Data</h1>
      
      <h2>Farm to Fork Workspace</h2>
      <p><strong>Organization:</strong> SOL Demo Organization</p>
      <p><strong>Created:</strong> October 12, 2025</p>
      
      <h3>Projects:</h3>
      <ul>
        <li>
          <strong>User Research</strong> (3 documents)
          <p>Interviews, surveys etc</p>
        </li>
      </ul>
      
      <h3>Research Documents:</h3>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h4>checkout_interview1.txt</h4>
        <p><strong>Created:</strong> October 12, 2025</p>
        <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '3px', fontSize: '14px' }}>
          <h5>Farm to Fork – User Interviews (Conversational)</h5>
          <h6>Persona 1 – Busy Parent</h6>
          <p><strong>Name:</strong> Sarah Thompson</p>
          <p><strong>Occupation:</strong> HR Manager</p>
          <p><strong>Location:</strong> Bristol, UK</p>
          
          <h6>Key Insights:</h6>
          <ul>
            <li>Shops online at Tesco/Sainsbury's for convenience</li>
            <li>Concerned about freshness of supermarket produce</li>
            <li>Motivated by supporting local farms and nostalgia</li>
            <li>Likes farm profiles and seasonal highlights</li>
            <li>Checkout issues: loyalty points unclear, delivery slot confusion</li>
            <li>Wants Apple Pay integration</li>
            <li>Would recommend to other parents</li>
          </ul>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h4>checkout_interview2.txt</h4>
        <p><strong>Created:</strong> October 12, 2025</p>
        <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '3px', fontSize: '14px' }}>
          <h6>Persona 2 – Young Professional</h6>
          <p><strong>Name:</strong> David (anonymized)</p>
          <p><strong>Occupation:</strong> Consultant at Accenture</p>
          <p><strong>Location:</strong> London, UK</p>
          
          <h6>Key Insights:</h6>
          <ul>
            <li>Irregular shopping habits, uses Deliveroo frequently</li>
            <li>Discovered via Instagram sponsored post</li>
            <li>Motivated by sustainability and early adopter mindset</li>
            <li>Likes impact tracker and gamification</li>
            <li>Checkout issues: address re-entry, unclear referral code placement</li>
            <li>Prefers curated selection over overwhelming choice</li>
            <li>Would recommend to colleagues</li>
          </ul>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h4>checkout_interview3.md</h4>
        <p><strong>Created:</strong> October 12, 2025</p>
        <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '3px', fontSize: '14px' }}>
          <h6>Persona 3 – Retired Couple</h6>
          <p><strong>Name:</strong> Margaret Wilson</p>
          <p><strong>Occupation:</strong> Retired primary school teacher</p>
          <p><strong>Location:</strong> York, UK</p>
          
          <h6>Key Insights:</h6>
          <ul>
            <li>Usually shops at farmers' market on Saturdays</li>
            <li>Values personal connection over corporate experience</li>
            <li>Text size too small on mobile/tablet</li>
            <li>Loves farm stories and recipes</li>
            <li>Checkout issues: unclear confirmation, quick flash</li>
            <li>Wants larger buttons and clearer confirmation</li>
            <li>Would recommend to older friends</li>
          </ul>
        </div>
      </div>
      
      <h3>Summary of Research Findings:</h3>
      <div style={{ backgroundColor: '#e8f4fd', padding: '15px', borderRadius: '5px' }}>
        <h4>Common Checkout Issues:</h4>
        <ul>
          <li>Loyalty points application unclear</li>
          <li>Delivery slot selection confusing</li>
          <li>Address re-entry required despite GPS location</li>
          <li>Referral code placement not obvious</li>
          <li>Confirmation screen too brief/unclear</li>
        </ul>
        
        <h4>User Requests:</h4>
        <ul>
          <li>Apple Pay integration</li>
          <li>Saved addresses and auto-fill</li>
          <li>Larger buttons for accessibility</li>
          <li>Clearer confirmation messages</li>
          <li>Better mobile text sizing</li>
        </ul>
        
        <h4>Positive Feedback:</h4>
        <ul>
          <li>Fresh produce quality</li>
          <li>Farm profiles and stories</li>
          <li>Impact tracker gamification</li>
          <li>Curated selection</li>
          <li>Supporting local farmers</li>
        </ul>
      </div>
      
      <p style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        Last updated: {new Date().toLocaleString()}
      </p>
    </div>
  );
}
