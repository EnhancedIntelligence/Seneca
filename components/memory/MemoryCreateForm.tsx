'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload,
  MapPin,
  Sparkles,
  User,
  Calendar,
  Tag,
  Image,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Brain,
  Zap
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MediaUpload } from './shared/MediaUpload'
import { LocationPicker } from './shared/LocationPicker'
import { TagSelector } from './shared/TagSelector'
import { ChildSelector } from './shared/ChildSelector'
import { supabase } from '@/lib/supabase'
import type { UIChild, Family } from '@/lib/types'

// Memory Creation Schema - UI layer uses camelCase
export const memoryCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  childId: z.string().optional(), // Memory can be associated with specific child
  familyId: z.string(), // Family is required
  tags: z.array(z.string()),
  imageUrls: z.array(z.string()),
  videoUrls: z.array(z.string()),
  category: z.enum(['social','language','cognitive','physical','emotional','creative','eating','sleep','play']).optional(),
  locationName: z.string().optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  memoryDate: z.string().optional(),
  aiProcessing: z.object({
    autoProcess: z.boolean(),
    priority: z.enum(['normal','low','high']),
    generateEmbedding: z.boolean(),
    redactPii: z.boolean(),
    classifyActivities: z.boolean(),
  }),
  workflowContext: z.object({
    source: z.string(),
    device: z.string().optional(),
  }),
}).refine(v =>
  (v.locationLat == null && v.locationLng == null) ||
  (v.locationLat != null && v.locationLng != null),
  { message: 'Provide both latitude and longitude or leave both empty', path: ['locationLat'] }
)

export type MemoryFormValues = z.infer<typeof memoryCreateSchema>

interface MemoryCreateFormProps {
  family: Family
  children: UIChild[]
  onSuccess?: (memory: any) => void
  onCancel?: () => void
  className?: string
  // AI Agent Integration
  initialData?: Partial<MemoryFormValues>
  agentSuggestions?: {
    title?: string
    content?: string
    tags?: string[]
    category?: string
    confidence?: number
  }
}

export function MemoryCreateForm({
  family,
  children,
  onSuccess,
  onCancel,
  className,
  initialData,
  agentSuggestions
}: MemoryCreateFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [aiProcessingEstimate, setAiProcessingEstimate] = useState<number | null>(null)
  const [formStep, setFormStep] = useState<'basic' | 'details' | 'ai_config' | 'review'>('basic')
  
  const form = useForm<MemoryFormValues>({
    resolver: zodResolver(memoryCreateSchema),
    defaultValues: {
      title: '',
      content: '',
      familyId: family.id,
      childId: undefined,
      tags: [],
      imageUrls: [],
      videoUrls: [],
      category: undefined,
      locationName: undefined,
      locationLat: undefined,
      locationLng: undefined,
      memoryDate: undefined,
      aiProcessing: {
        autoProcess: false,
        priority: 'normal',
        generateEmbedding: false,
        redactPii: false,
        classifyActivities: false,
      },
      workflowContext: {
        source: 'ui',
        device: undefined,
      },
      ...initialData
    }
  })

  const { watch, setValue, getValues } = form

  // Real-time AI processing estimation
  const watchedContent = watch('content')
  const watchedAiConfig = watch('aiProcessing')

  React.useEffect(() => {
    if (watchedContent && watchedAiConfig.autoProcess) {
      const estimateMs = calculateProcessingTime(watchedContent, watchedAiConfig)
      setAiProcessingEstimate(estimateMs)
    }
  }, [watchedContent, watchedAiConfig])

  // Apply agent suggestions with user confirmation
  const applyAgentSuggestions = useCallback(() => {
    if (!agentSuggestions) return

    const currentValues = getValues()
    const improvements: string[] = []

    if (agentSuggestions.title && !currentValues.title) {
      setValue('title', agentSuggestions.title)
      improvements.push('Added AI-suggested title')
    }

    if (agentSuggestions.content && currentValues.content.length < 50) {
      setValue('content', agentSuggestions.content)
      improvements.push('Enhanced content with AI suggestions')
    }

    if (agentSuggestions.tags && agentSuggestions.tags.length > 0) {
      const existingTags = currentValues.tags || []
      const newTags = [...existingTags, ...agentSuggestions.tags.filter(tag => !existingTags.includes(tag))]
      setValue('tags', newTags.slice(0, 20)) // Respect max limit
      improvements.push(`Added ${agentSuggestions.tags.length} AI-suggested tags`)
    }

    if (agentSuggestions.category) {
      setValue('category', agentSuggestions.category as any)
      improvements.push('Applied AI-suggested category')
    }

    // Store improvements in workflow context if needed
    // setValue('workflow_context.device', 'web') // optional

    toast({
      title: "✨ AI Suggestions Applied",
      description: `Applied ${improvements.length} improvements with ${Math.round((agentSuggestions.confidence || 0.8) * 100)}% confidence`,
    })
  }, [agentSuggestions, setValue, getValues, toast])

  const onSubmit = async (data: MemoryFormValues) => {
    setIsSubmitting(true)
    
    try {
      // Convert camelCase UI data to snake_case for API
      const apiData = {
        title: data.title?.trim(),
        content: data.content.trim(),
        child_id: data.childId || null,
        family_id: data.familyId,
        tags: data.tags.filter(tag => tag.trim().length > 0).map(tag => tag.trim().toLowerCase()),
        image_urls: data.imageUrls,
        video_urls: data.videoUrls,
        category: data.category,
        location_name: data.locationName || null,
        location_lat: data.locationLat || null,
        location_lng: data.locationLng || null,
        memory_date: data.memoryDate ? new Date(data.memoryDate).toISOString() : null,
        ai_processing: {
          auto_process: data.aiProcessing.autoProcess,
          priority: data.aiProcessing.priority,
          generate_embedding: data.aiProcessing.generateEmbedding,
          redact_pii: data.aiProcessing.redactPii,
          classify_activities: data.aiProcessing.classifyActivities,
        },
        workflow_context: {
          source: data.workflowContext.source,
          device: data.workflowContext.device,
        }
      }

      // Create memory via API
      const { data: authData } = await supabase.auth.getSession()
      const token = authData.session?.access_token

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/memories/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create memory')
      }

      const result = await response.json()

      toast({
        title: "🎉 Memory Created Successfully!",
        description: data.aiProcessing.autoProcess 
          ? "Your memory is being processed by AI. You'll see insights soon!"
          : "Your memory has been saved and is ready to view.",
      })

      onSuccess?.(result.memory)

    } catch (error) {
      console.error('Memory creation error:', error)
      toast({
        title: "❌ Error Creating Memory",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateProcessingTime = (content: string, aiConfig: MemoryFormValues['aiProcessing']): number => {
    const baseTime = 2000 // 2 seconds base
    const contentMultiplier = Math.max(1, content.length / 100)
    const featuresEnabled = Object.values(aiConfig).filter(Boolean).length
    return Math.round(baseTime * contentMultiplier * (featuresEnabled / 6))
  }

  const renderFormStep = () => {
    switch (formStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Step 1: Basic Information</span>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Memory Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="What happened? (e.g., Emma's first steps!)"
                      {...field}
                      className="text-lg"
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive title helps with organization and AI analysis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Memory Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what happened, how it felt, and any special details you want to remember..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Rich details help AI detect milestones and generate insights ({field.value?.length || 0}/10,000 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="childId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Child (Optional)</FormLabel>
                    <FormControl>
                      <ChildSelector
                        children={children}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Link this memory to a specific child
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="milestone">🏆 Milestone</SelectItem>
                        <SelectItem value="daily_life">🏠 Daily Life</SelectItem>
                        <SelectItem value="celebration">🎉 Celebration</SelectItem>
                        <SelectItem value="learning">📚 Learning</SelectItem>
                        <SelectItem value="social">👥 Social</SelectItem>
                        <SelectItem value="creative">🎨 Creative</SelectItem>
                        <SelectItem value="outdoor">🌳 Outdoor</SelectItem>
                        <SelectItem value="family_time">❤️ Family Time</SelectItem>
                        <SelectItem value="other">📝 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {agentSuggestions && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Suggestions Available
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3">
                    AI has analyzed your input and found {agentSuggestions.confidence ? Math.round(agentSuggestions.confidence * 100) : 80}% confident suggestions
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={applyAgentSuggestions}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Apply AI Suggestions
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Image className="h-4 w-4" />
              <span>Step 2: Media & Location</span>
            </div>

            <FormField
              control={form.control}
              name="imageUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photos & Videos</FormLabel>
                  <FormControl>
                    <MediaUpload
                      value={field.value}
                      onChange={field.onChange}
                      onProgress={setUploadProgress}
                      maxFiles={10}
                      accept="image/*,video/*"
                    />
                  </FormControl>
                  <FormDescription>
                    Upload up to 10 photos and 5 videos (AI will analyze them for context)
                  </FormDescription>
                </FormItem>
              )}
            />

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading media...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <FormField
              control={form.control}
              name="locationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <LocationPicker
                      value={{
                        name: field.value || '',
                        lat: form.getValues('locationLat'),
                        lng: form.getValues('locationLng')
                      }}
                      onChange={(location) => {
                        field.onChange(location.name)
                        form.setValue('locationLat', location.lat)
                        form.setValue('locationLng', location.lng)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Where did this memory happen? Location helps with organization
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagSelector
                      value={field.value}
                      onChange={field.onChange}
                      familyId={family.id}
                      maxTags={20}
                    />
                  </FormControl>
                  <FormDescription>
                    Add tags to help organize and find this memory later
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memoryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Memory Date</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  </FormControl>
                  <FormDescription>
                    When did this memory happen? (defaults to now)
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        )

      case 'ai_config':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4" />
              <span>Step 3: AI Processing Options</span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Processing Configuration
                </CardTitle>
                <CardDescription>
                  Configure how AI will analyze and enhance your memory
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="aiProcessing.autoProcess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable AI Processing
                        </FormLabel>
                        <FormDescription>
                          Let AI analyze your memory for milestones, sentiment, and insights
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchedAiConfig.autoProcess && (
                  <>
                    <FormField
                      control={form.control}
                      name="aiProcessing.priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Processing Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">🐌 Low (slower, costs less)</SelectItem>
                              <SelectItem value="normal">⚡ Normal (balanced)</SelectItem>
                              <SelectItem value="high">🚀 High (faster, priority queue)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Higher priority processes faster but uses more resources
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="aiProcessing.autoProcess"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>🏆 Milestone Detection</FormLabel>
                              <FormDescription>
                                Detect first words, steps, foods, etc.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="aiProcessing.generateEmbedding"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>😊 Sentiment Analysis</FormLabel>
                              <FormDescription>
                                Analyze emotional tone and mood
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="aiProcessing.redactPii"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>💡 Generate Insights</FormLabel>
                              <FormDescription>
                                Create summary and observations
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="aiProcessing.generateEmbedding"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>🔍 Semantic Search</FormLabel>
                              <FormDescription>
                                Enable natural language search
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {aiProcessingEstimate && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Estimated processing time: ~{Math.round(aiProcessingEstimate / 1000)} seconds</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )

      case 'review':
        const values = getValues()
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Step 4: Review & Submit</span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Review Your Memory</CardTitle>
                <CardDescription>
                  Please review all details before creating your memory
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Title</h4>
                  <p className="text-sm text-muted-foreground">{values.title || 'Untitled Memory'}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm">Content</h4>
                  <p className="text-sm text-muted-foreground">
                    {values.content.substring(0, 200)}
                    {values.content.length > 200 && '...'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm">Category</h4>
                    <Badge variant="secondary">{values.category}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Child</h4>
                    <p className="text-sm text-muted-foreground">
                      {values.childId ? children.find(c => c.id === values.childId)?.name : 'Family memory'}
                    </p>
                  </div>
                </div>

                {values.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm">Tags</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {values.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {values.locationName && (
                  <div>
                    <h4 className="font-semibold text-sm">Location</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {values.locationName}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-sm">AI Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    {values.aiProcessing.autoProcess 
                      ? `Enabled (${values.aiProcessing.priority} priority)`
                      : 'Disabled'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  const renderStepNavigation = () => {
    const steps = ['basic', 'details', 'ai_config', 'review'] as const
    const currentIndex = steps.indexOf(formStep)

    return (
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (currentIndex > 0) {
              setFormStep(steps[currentIndex - 1])
            } else {
              onCancel?.()
            }
          }}
          disabled={isSubmitting}
        >
          {currentIndex === 0 ? 'Cancel' : 'Previous'}
        </Button>

        <div className="flex items-center space-x-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full ${
                index <= currentIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {formStep === 'review' ? (
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Memory'
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setFormStep(steps[currentIndex + 1])}
            disabled={isSubmitting}
          >
            Next
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Create New Memory
              </CardTitle>
              <CardDescription>
                Capture and preserve your family moments with AI-powered insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderFormStep()}
              {renderStepNavigation()}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
} 