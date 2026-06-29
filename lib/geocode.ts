interface AddressParts {
  address?: string
  city?: string
  state?: string
  zip?: string
}

export async function geocodeAddress(parts: AddressParts): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null

  const query = [parts.address, parts.city, parts.state, parts.zip].filter(Boolean).join(', ')
  if (!query) return null

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=US&limit=1`
  const res = await fetch(url)
  if (!res.ok) return null

  const json = await res.json()
  const feature = json.features?.[0]
  if (!feature) return null

  const [lng, lat] = feature.center as [number, number]
  return { lat, lng }
}
