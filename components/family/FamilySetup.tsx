'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Users, 
  Baby, 
  Plus,
  Trash2,
  Calendar,
  Camera,
  Sparkles
} from 'lucide-react'
import type { FamilyInsert, ChildInsert } from '@/lib/types'

interface FamilySetupProps {
  onComplete: (familyData: {
    family: FamilyInsert
    children: ChildInsert[]
  }) => void
  onSkip?: () => void
  className?: string
}

interface ChildFormData {
  id: string
  name: string
  birthDate: string
  gender: string
  notes: string
  profileImageUrl?: string
}

const SETUP_STEPS = [
  { id: 'family', title: 'Create Family', icon: Users },
  { id: 'children', title: 'Add Children', icon: Baby },
  { id: 'review', title: 'Review & Finish', icon: Check }
]

export function FamilySetup({ onComplete, onSkip, className = '' }: FamilySetupProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  // Family data
  const [familyData, setFamilyData] = useState<FamilyInsert>({
    name: '',
    description: '',
    created_by: '' // Will be set from auth
  })
  
  // Children data
  const [children, setChildren] = useState<ChildFormData[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      birthDate: '',
      gender: '',
      notes: ''
    }
  ])
  
  const currentStepData = SETUP_STEPS[currentStep]
  const progressPercentage = ((currentStep + 1) / SETUP_STEPS.length) * 100
  
  const addChild = () => {
    if (children.length < 10) { // Reasonable limit
      setChildren(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: '',
          birthDate: '',
          gender: '',
          notes: ''
        }
      ])
    }
  }
  
  const removeChild = (id: string) => {
    if (children.length > 1) {
      setChildren(prev => prev.filter(child => child.id !== id))
    }
  }
  
  const updateChild = (id: string, field: keyof ChildFormData, value: string) => {
    setChildren(prev => prev.map(child =>
      child.id === id ? { ...child, [field]: value } : child
    ))
  }
  
  const validateFamilyStep = () => {
    if (!familyData.name.trim()) {
      toast({ 
        title: 'Family name required',
        description: 'Please enter a name for your family',
        variant: 'destructive'
      })
      return false
    }
    if (familyData.name.length < 2 || familyData.name.length > 100) {
      toast({ 
        title: 'Invalid family name',
        description: 'Family name must be between 2 and 100 characters',
        variant: 'destructive'
      })
      return false
    }
    return true
  }
  
  const validateChildrenStep = () => {
    const validChildren = children.filter(child => child.name.trim())
    if (validChildren.length === 0) {
      toast({ 
        title: 'At least one child required',
        description: 'Please add at least one child to your family',
        variant: 'destructive'
      })
      return false
    }
    
    // Validate each child
    for (const child of validChildren) {
      if (child.name.length < 2 || child.name.length > 50) {
        toast({ 
          title: 'Invalid child name',
          description: `Child name "${child.name}" must be between 2 and 50 characters`,
          variant: 'destructive'
        })
        return false
      }
      
      if (child.birthDate) {
        const birthDate = new Date(child.birthDate)
        const now = new Date()
        const age = now.getFullYear() - birthDate.getFullYear()
        
        if (birthDate > now) {
          toast({ 
            title: 'Invalid birth date',
            description: `Birth date for ${child.name} cannot be in the future`,
            variant: 'destructive'
          })
          return false
        }
        
        if (age > 18) {
          toast({ 
            title: 'Age limit',
            description: `This app is designed for children under 18 years old`,
            variant: 'destructive'
          })
          return false
        }
      }
    }
    
    return true
  }
  
  const handleNext = () => {
    if (currentStep === 0 && !validateFamilyStep()) return
    if (currentStep === 1 && !validateChildrenStep()) return
    
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  const handleComplete = async () => {
    setLoading(true)
    
    try {
             const validChildren = children
         .filter(child => child.name.trim())
         .map(({ id, birthDate, profileImageUrl, ...child }) => ({
           ...child,
           birth_date: birthDate,
           profile_image_url: profileImageUrl,
           created_by: familyData.created_by
         }))
      
      onComplete({
        family: familyData,
        children: validChildren
      })
    } catch (error) {
      console.error('Family setup error:', error)
      toast({ 
        title: 'Setup failed',
        description: 'There was an error setting up your family. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return ''
    const today = new Date()
    const birth = new Date(birthDate)
    const ageYears = today.getFullYear() - birth.getFullYear()
    const ageMonths = today.getMonth() - birth.getMonth()
    
    if (ageYears === 0) {
      return `${Math.max(1, ageMonths)} month${ageMonths !== 1 ? 's' : ''} old`
    }
    return `${ageYears} year${ageYears !== 1 ? 's' : ''} old`
  }
  
  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-purple-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Family Memories</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Let's set up your family so you can start capturing precious moments
        </p>
      </div>
      
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {SETUP_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                  ${isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isActive 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }
                `}>
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                {index < SETUP_STEPS.length - 1 && (
                  <div className={`
                    w-16 h-0.5 mx-2 transition-colors
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            )
          })}
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-sm text-gray-600 mt-2">
          Step {currentStep + 1} of {SETUP_STEPS.length}: {currentStepData.title}
        </p>
      </div>
      
      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <currentStepData.icon className="w-5 h-5 mr-2" />
            {currentStepData.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Family Step */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Name *
                </label>
                <Input
                  placeholder="e.g., The Smith Family"
                  value={familyData.name}
                  onChange={(e) => setFamilyData(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be shown to family members and in shared memories
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Description (Optional)
                </label>
                <Textarea
                  placeholder="Tell us about your family..."
                  value={familyData.description || ''}
                  onChange={(e) => setFamilyData(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(familyData.description || '').length}/500 characters
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-blue-900">Family Privacy</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your family is completely private. Only people you invite can see your memories.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Children Step */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600">
                  Add your children to start capturing their precious moments
                </p>
              </div>
              
              {children.map((child, index) => (
                <Card key={child.id} className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">
                        Child {index + 1}
                      </h4>
                      {children.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChild(child.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <Input
                          placeholder="Child's name"
                          value={child.name}
                          onChange={(e) => updateChild(child.id, 'name', e.target.value)}
                          maxLength={50}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Birth Date
                        </label>
                        <Input
                          type="date"
                          value={child.birthDate}
                          onChange={(e) => updateChild(child.id, 'birthDate', e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                        />
                        {child.birthDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            {calculateAge(child.birthDate)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender
                        </label>
                        <select
                          value={child.gender}
                          onChange={(e) => updateChild(child.id, 'gender', e.target.value)}
                          className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select gender</option>
                          <option value="boy">Boy</option>
                          <option value="girl">Girl</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <Input
                          placeholder="Any special notes..."
                          value={child.notes}
                          onChange={(e) => updateChild(child.id, 'notes', e.target.value)}
                          maxLength={200}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {children.length < 10 && (
                <Button
                  variant="outline"
                  onClick={addChild}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Child
                </Button>
              )}
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <Baby className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Getting Started Tip</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      You can always add more children later or update their information in family settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Review Step */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Almost Ready!
                </h3>
                <p className="text-gray-600">
                  Review your family setup before we create your account
                </p>
              </div>
              
              {/* Family Summary */}
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center mb-3">
                    <Users className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-blue-900">Family</h4>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{familyData.name}</p>
                    {familyData.description && (
                      <p className="text-sm text-gray-600">{familyData.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Children Summary */}
              <Card className="bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center mb-3">
                    <Baby className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="font-medium text-green-900">
                      Children ({children.filter(c => c.name.trim()).length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {children
                      .filter(child => child.name.trim())
                      .map((child, index) => (
                        <div key={child.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{child.name}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {child.birthDate && (
                                <span>{calculateAge(child.birthDate)}</span>
                              )}
                              {child.gender && (
                                <Badge variant="outline" className="text-xs">
                                  {child.gender}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="font-medium text-purple-900">What's Next?</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      After setup, you can start creating memories, invite family members, and watch as AI helps organize your family's story.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex items-center justify-between">
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {onSkip && currentStep === 0 && (
              <Button variant="ghost" onClick={onSkip} className="text-gray-500">
                Skip for now
              </Button>
            )}
          </div>
          
          <Button 
            onClick={handleNext}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              'Creating...'
            ) : currentStep === SETUP_STEPS.length - 1 ? (
              'Create Family'
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 