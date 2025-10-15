'use client'

import { useEffect } from 'react'

interface GoogleMapsScriptProps {
  onLoad: () => void
}

export default function GoogleMapsScript({ onLoad }: GoogleMapsScriptProps) {
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        onLoad()
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = onLoad
      script.onerror = () => {
        console.error('Failed to load Google Maps API')
      }
      
      document.head.appendChild(script)
    }

    loadGoogleMaps()
  }, [onLoad])

  return null
}

