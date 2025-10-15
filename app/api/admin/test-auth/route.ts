import { NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { authenticateUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Test direct authentication
    const user = await authenticateUser(email, password);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        system_role: user.system_role
      }
    });
    
  } catch (error: any) {
    console.error('Error testing auth:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
