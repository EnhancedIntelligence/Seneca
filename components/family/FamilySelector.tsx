'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"
import { supabase } from "@/lib/supabase"
import { Family, FamilyMembership } from "@/lib/types"

interface FamilySelectorProps {
  onFamilyChange?: (family: Family | null) => void
  className?: string
}

interface FamilyWithMembership extends Family {
  memberCount: number
  userRole: string
}

export function FamilySelector({ onFamilyChange, className }: FamilySelectorProps) {
  const [families, setFamilies] = useState<FamilyWithMembership[]>([])
  const [selectedFamily, setSelectedFamily] = useState<FamilyWithMembership | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadUserFamilies()
  }, [])

  const loadUserFamilies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use the efficient function to get families with counts in a single query
      const { data: familiesData, error } = await supabase
        .rpc('get_user_families_with_counts', { user_id: user.id })

      if (error) {
        console.error('Error loading families:', error)
        return
      }

      if (familiesData) {
        const familiesWithCounts = familiesData.map((family: any) => ({
          id: family.id,
          name: family.name,
          description: family.description,
          created_by: family.created_by || user.id, // Fallback to current user if not provided
          created_at: family.created_at,
          updated_at: family.updated_at,
          memberCount: family.member_count,
          userRole: family.user_role,
        }))

        setFamilies(familiesWithCounts)
        
        // Auto-select first family if none selected
        if (familiesWithCounts.length > 0 && !selectedFamily) {
          const defaultFamily = familiesWithCounts[0]
          setSelectedFamily(defaultFamily)
          onFamilyChange?.(defaultFamily)
        }
      }
    } catch (error) {
      console.error('Error loading families:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFamilySelect = (family: FamilyWithMembership) => {
    setSelectedFamily(family)
    setIsOpen(false)
    onFamilyChange?.(family)
  }

  if (isLoading) {
    return (
      <div className={cn("w-64", className)}>
        <Card className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-slate-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("w-64", className)}>
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedFamily ? (
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-3 w-3 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {selectedFamily.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedFamily.memberCount} member{selectedFamily.memberCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Select family...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {isOpen && (
          <Card className="absolute top-full mt-1 w-full z-50 p-1">
            <div className="max-h-64 overflow-auto">
              {families.map((family) => (
                <button
                  key={family.id}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md hover:bg-accent",
                    selectedFamily?.id === family.id && "bg-accent"
                  )}
                  onClick={() => handleFamilySelect(family)}
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {family.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {family.memberCount} member{family.memberCount !== 1 ? 's' : ''} • {family.userRole}
                    </div>
                  </div>
                  {selectedFamily?.id === family.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
              
              <div className="border-t mt-1 pt-1">
                <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <ModalTrigger asChild>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md hover:bg-accent text-sm">
                      <div className="w-8 h-8 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center flex-shrink-0">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span>Create new family</span>
                    </button>
                  </ModalTrigger>
                  <ModalContent>
                    <ModalHeader>
                      <ModalTitle>Create New Family</ModalTitle>
                      <ModalDescription>
                        Create a new family to start tracking memories together.
                      </ModalDescription>
                    </ModalHeader>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Family creation form will be implemented here.
                      </p>
                    </div>
                  </ModalContent>
                </Modal>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}