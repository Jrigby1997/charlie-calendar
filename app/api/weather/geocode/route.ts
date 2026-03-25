import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')

  if (!city || city.trim().length === 0) {
    return NextResponse.json({ error: 'city parameter is required' }, { status: 400 })
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', city.trim())
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const response = await fetch(url.toString(), { next: { revalidate: 86400 } })

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to geocode location' }, { status: 502 })
  }

  const data = await response.json()
  const result = data.results?.[0]

  if (!result) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  return NextResponse.json({
    lat: result.latitude,
    lon: result.longitude,
    name: [result.name, result.admin1, result.country_code].filter(Boolean).join(', '),
  })
}
