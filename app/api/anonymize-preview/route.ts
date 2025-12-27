import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const configData = formData.get('config') as string;
    
    if (!text || !configData) {
      return NextResponse.json({ error: 'Missing text or config' }, { status: 400 });
    }
    
    const config = JSON.parse(configData);
    
    // Import anonymization engine
    const { anonymizeText } = await import('@sol/anonymizer');
    
    console.log('Anonymizing preview text with config:', config);
    
    // Anonymize the text
    const result = await anonymizeText(text, config);
    
    console.log('Anonymization result:', result.summary);
    
    return NextResponse.json({
      anonymizedText: result.anonymizedText,
      matches: result.matches,
      summary: result.summary
    });
    
  } catch (error: any) {
    console.error('Anonymization preview error:', error);
    return NextResponse.json({ 
      error: error.message || 'Anonymization failed' 
    }, { status: 500 });
  }
}
