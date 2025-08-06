import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      connection: {
        supabase_url: supabaseUrl,
        has_anon_key: hasAnonKey,
        has_service_key: hasServiceKey,
        connected_to: supabaseUrl?.includes('ahggunjqfvlmvgycisgc') ? 'remote' : 'unknown'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}