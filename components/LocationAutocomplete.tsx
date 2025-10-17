'use client'

import { useState, useEffect, useRef } from 'react'

interface LocationSuggestion {
  place_id: string
  description: string
  lat: number
  lng: number
}

interface LocationAutocompleteProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void
  icon: 'pickup' | 'drop'
}

export default function LocationAutocomplete({
  placeholder,
  value,
  onChange,
  onLocationSelect,
  icon
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      autocompleteService.current = new google.maps.places.AutocompleteService()
      const mapDiv = document.createElement('div')
      placesService.current = new google.maps.places.PlacesService(mapDiv)
    }
  }, [])

  const getSuggestions = async (query: string) => {
    if (!query.trim() || !autocompleteService.current) return

    setIsLoading(true)
    try {
      const request = {
        input: query,
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'in' } // Restrict to India, change as needed
      }

      autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
        setIsLoading(false)
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const suggestions = predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            lat: 0, // Will be filled when selected
            lng: 0
          }))
          setSuggestions(suggestions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      })
    } catch (error) {
      console.error('Error getting suggestions:', error)
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    if (newValue.length > 2) {
      getSuggestions(newValue)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    if (!placesService.current) return

    const request = {
      placeId: suggestion.place_id,
      fields: ['geometry', 'formatted_address']
    }

    placesService.current.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        const location = place.geometry?.location
        if (location) {
          onLocationSelect({
            lat: location.lat(),
            lng: location.lng(),
            address: place.formatted_address || suggestion.description
          })
          onChange(place.formatted_address || suggestion.description)
        }
      }
      setShowSuggestions(false)
    })
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200)
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <div className={`w-2 h-2 rounded-full ${icon === 'pickup' ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#133bb7] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-[#133bb7] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors text-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                    <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.description.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.description.split(',').slice(1).join(',').trim()}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

