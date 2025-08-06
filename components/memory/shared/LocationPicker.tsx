'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Search, 
  Navigation, 
  X,
  Check,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Location {
  name: string
  lat?: number
  lng?: number
}

interface LocationPickerProps {
  value: Location
  onChange: (location: Location) => void
  className?: string
}

interface LocationSuggestion {
  name: string
  display_name: string
  lat: string
  lon: string
  type: string
}

export function LocationPicker({
  value,
  onChange,
  className
}: LocationPickerProps) {
  const { toast } = useToast()
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize search query with current value
  useEffect(() => {
    if (value.name && !searchQuery) {
      setSearchQuery(value.name)
    }
  }, [value.name, searchQuery])

  // Debounced search function
  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    
    try {
      // Using OpenStreetMap Nominatim API (free geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FamilyMemoryApp/1.0'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const results: LocationSuggestion[] = await response.json()
      setSuggestions(results)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Location search error:', error)
      toast({
        title: "Search failed",
        description: "Unable to search for locations. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }, [toast])

  // Handle search input changes with debouncing
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(query)
    }, 300)
  }, [searchLocations])

  // Handle location selection from suggestions
  const selectLocation = useCallback((suggestion: LocationSuggestion) => {
    const location: Location = {
      name: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    }
    
    onChange(location)
    setSearchQuery(suggestion.display_name)
    setShowSuggestions(false)
    setSuggestions([])
  }, [onChange])

  // Handle manual location entry
  const handleManualEntry = useCallback(() => {
    if (searchQuery.trim()) {
      onChange({
        name: searchQuery.trim(),
        lat: undefined,
        lng: undefined
      })
      setShowSuggestions(false)
      setSuggestions([])
    }
  }, [searchQuery, onChange])

  // Get current location using browser geolocation
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      })
      return
    }

    setIsGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'FamilyMemoryApp/1.0'
              }
            }
          )
          
          if (response.ok) {
            const result = await response.json()
            const location: Location = {
              name: result.display_name || 'Current Location',
              lat: latitude,
              lng: longitude
            }
            
            onChange(location)
            setSearchQuery(location.name)
            
            toast({
              title: "Location found",
              description: "Current location has been set."
            })
          } else {
            throw new Error('Reverse geocoding failed')
          }
        } catch (error) {
          // Fallback to coordinates only
          const location: Location = {
            name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            lat: latitude,
            lng: longitude
          }
          
          onChange(location)
          setSearchQuery(location.name)
          
          toast({
            title: "Location set",
            description: "Using coordinates as location name."
          })
        } finally {
          setIsGettingLocation(false)
        }
      },
      (error) => {
        setIsGettingLocation(false)
        
        let message = "Unable to get your location."
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable location services."
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable."
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out."
        }
        
        toast({
          title: "Location error",
          description: message,
          variant: "destructive"
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [onChange, toast])

  // Clear location
  const clearLocation = useCallback(() => {
    onChange({ name: '', lat: undefined, lng: undefined })
    setSearchQuery('')
    setShowSuggestions(false)
    setSuggestions([])
    inputRef.current?.focus()
  }, [onChange])

  // Format display name for suggestions
  const formatDisplayName = (displayName: string): string => {
    const parts = displayName.split(',')
    if (parts.length > 3) {
      return parts.slice(0, 3).join(',') + '...'
    }
    return displayName
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {/* Search Input */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search for a location or enter manually..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleManualEntry()
                }
                if (e.key === 'Escape') {
                  setShowSuggestions(false)
                }
              }}
              className="pl-10 pr-20"
            />
            {isSearching && (
              <Loader2 className="absolute right-12 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearLocation}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Location Actions */}
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="flex-1"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Use Current Location
            </Button>
            
            {searchQuery && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualEntry}
              >
                <Check className="h-4 w-4 mr-2" />
                Use "{searchQuery.substring(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
              </Button>
            )}
          </div>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="border shadow-lg">
            <CardContent className="p-0">
              <div className="max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                    type="button"
                    onClick={() => selectLocation(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatDisplayName(suggestion.display_name)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Selection Display */}
        {value.name && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm flex-1">{value.name}</span>
            {value.lat && value.lng && (
              <Badge variant="secondary" className="text-xs">
                📍 {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 