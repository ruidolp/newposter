import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const tenant = await db
      .selectFrom('tenants')
      .select(['id', 'slug', 'name', 'active'])
      .where('slug', '=', slug)
      .where('active', '=', true)
      .executeTakeFirst()

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
