import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { driver_id, order_id, lat, lng, accuracy, heading, speed } = body

    if (!driver_id || !lat || !lng) {
      return NextResponse.json({ error: 'Driver ID, latitude, and longitude are required' }, { status: 400 })
    }

    // Insert driver location
    const { data: location, error } = await supabase
      .from('driver_locations')
      .insert([{
        driver_id,
        order_id: order_id || null,
        lat,
        lng,
        accuracy: accuracy || null,
        heading: heading || null,
        speed: speed || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error inserting driver location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update driver's current location in users table
    await supabase
      .from('users')
      .update({ lat, lng })
      .eq('id', driver_id)

    return NextResponse.json({ location })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const driver_id = searchParams.get('driver_id')

    if (!order_id && !driver_id) {
      return NextResponse.json({ error: 'Order ID or Driver ID is required' }, { status: 400 })
    }

    let query = supabase
      .from('driver_locations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (order_id) {
      query = query.eq('order_id', order_id)
    } else if (driver_id) {
      query = query.eq('driver_id', driver_id)
    }

    const { data: locations, error } = await query

    if (error) {
      console.error('Error fetching driver location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ locations: locations || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
