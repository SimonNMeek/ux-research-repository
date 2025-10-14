import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: "DEPLOYMENT TEST - This should update when deployed",
    timestamp: new Date().toISOString(),
    version: "v1.4"
  });
}
