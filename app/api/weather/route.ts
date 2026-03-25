import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const units = searchParams.get('units') === 'celsius' ? 'celsius' : 'fahrenheit'

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (isNaN(latNum) || isNaN(lonNum)) {
    return NextResponse.json({ error: 'lat and lon must be valid numbers' }, { status: 400 })
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', latNum.toString())
  url.searchParams.set('longitude', lonNum.toString())
  url.searchParams.set('temperature_unit', units)
  url.searchParams.set('wind_speed_unit', 'mph')
  url.searchParams.set('forecast_days', '10')
  url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_sum,snowfall_sum')
  url.searchParams.set('hourly', 'temperature_2m,weathercode,windspeed_10m,precipitation_probability')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } })

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 502 })
  }

  const data = await response.json()

  // Reshape daily data into array of objects
  const daily = (data.daily?.time ?? []).map((date: string, i: number) => ({
    date,
    weathercode: data.daily.weathercode[i],
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    wind: data.daily.windspeed_10m_max[i],
    precipitation: data.daily.precipitation_sum[i],
    snowfall: data.daily.snowfall_sum[i],
  }))

  // Reshape hourly data into array of objects
  const hourly = (data.hourly?.time ?? []).map((time: string, i: number) => ({
    time,
    temp: data.hourly.temperature_2m[i],
    weathercode: data.hourly.weathercode[i],
    wind: data.hourly.windspeed_10m[i],
    precipitationProbability: data.hourly.precipitation_probability[i],
  }))

  return NextResponse.json({ daily, hourly, units })
}
