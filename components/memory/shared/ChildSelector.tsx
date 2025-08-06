'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Users, 
  Baby,
  Heart
} from 'lucide-react'
import type { Child } from '@/lib/types'

interface ChildSelectorProps {
  children: Child[]
  value?: string
  onValueChange: (childId?: string) => void
  className?: string
}

export function ChildSelector({
  children,
  value,
  onValueChange,
  className
}: ChildSelectorProps) {
  const selectedChild = value ? children.find(child => child.id === value) : undefined

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate)
    const now = new Date()
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + 
                        (now.getMonth() - birth.getMonth())
    
    if (ageInMonths < 12) {
      return `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}`
    } else {
      const years = Math.floor(ageInMonths / 12)
      const months = ageInMonths % 12
      
      if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`
      } else {
        return `${years}y ${months}m`
      }
    }
  }

  const getChildIcon = (child: Child) => {
    const age = calculateAge(child.birth_date)
    if (age.includes('month') || parseInt(age) < 2) {
      return <Baby className="h-4 w-4" />
    }
    return <User className="h-4 w-4" />
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Family Memory Option */}
        <Button
          type="button"
          variant={!value ? "default" : "outline"}
          onClick={() => onValueChange(undefined)}
          className="w-full justify-start h-auto p-4"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Family Memory</div>
              <div className="text-sm text-muted-foreground">
                This memory involves the whole family
              </div>
            </div>
            {!value && (
              <Badge variant="default" className="ml-auto">
                Selected
              </Badge>
            )}
          </div>
        </Button>

        {/* Separator */}
        {children.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or select a child
              </span>
            </div>
          </div>
        )}

        {/* Children Options */}
        {children.length > 0 ? (
          <div className="space-y-2">
            {children.map(child => (
              <Button
                key={child.id}
                type="button"
                variant={value === child.id ? "default" : "outline"}
                onClick={() => onValueChange(child.id)}
                className="w-full justify-start h-auto p-4"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary">
                    {child.profile_image_url ? (
                      <img 
                        src={child.profile_image_url} 
                        alt={child.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      getChildIcon(child)
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{child.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {calculateAge(child.birth_date)} old
                      {child.gender && (
                        <span> • {child.gender}</span>
                      )}
                    </div>
                  </div>
                  {value === child.id && (
                    <Badge variant="default" className="ml-auto">
                      Selected
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted">
              <Baby className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2">No children added yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add children to your family to organize memories by child
            </p>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Add Child
            </Button>
          </div>
        )}

        {/* Selection Summary */}
        {selectedChild && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">
                This memory will be added to {selectedChild.name}'s collection
              </span>
            </div>
          </div>
        )}

        {!value && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                This memory will be shared with all family members
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 