import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    // OTP is already verified by the client before calling this API

    // Check if user exists in our users table
    let { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, name, phone, role, lat, lng')
      .eq('phone', phone)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // If user doesn't exist, create them
    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ phone, role: 'user', lat: 0, lng: 0 }])
        .select('id, name, phone, role, lat, lng')
        .single()

      if (insertError) {
        console.error('Error creating user:', insertError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      existingUser = newUser
    }

    // Check if this is a first-time user (no name set)
    const isFirstTime = !existingUser.name || existingUser.name.trim() === ''

    // Create a simple session token for the user
    const sessionToken = Buffer.from(JSON.stringify({
      user_id: existingUser.id,
      phone: existingUser.phone,
      role: existingUser.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    })).toString('base64')

    return NextResponse.json({
      success: true,
      user: existingUser,
      sessionToken: sessionToken,
      isFirstTime: isFirstTime
    })

  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
