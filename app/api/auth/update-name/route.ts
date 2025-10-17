import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get the session token from the request
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    // Decode the session token to get user info
    let tokenData
    try {
      tokenData = JSON.parse(Buffer.from(sessionToken, 'base64').toString())
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 })
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (tokenData.exp < now) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Update the user's name in the database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ name: name.trim() })
      .eq('id', tokenData.user_id)
      .select('id, name, phone, role, lat, lng')
      .single()

    if (updateError) {
      console.error('Error updating user name:', updateError)
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Name update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
