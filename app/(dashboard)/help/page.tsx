'use client'

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  ExternalLink,
  Search,
  Mic,
  Shield,
  Zap,
  Users,
  Settings,
  ChevronRight,
  Play,
  FileText,
  Phone,
  Clock
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

interface TutorialCard {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ElementType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const faqItems: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I record a voice memory?',
    answer: 'To record a voice memory, go to the Capture page and tap the microphone button. Hold to record and release to stop. The app will automatically transcribe your voice and process it with AI to detect milestones and patterns.',
    category: 'Recording',
    keywords: ['voice', 'record', 'microphone', 'capture'],
  },
  {
    id: 'faq-2',
    question: 'What types of milestones does the AI detect?',
    answer: 'Our AI detects five main categories of milestones: Physical (walking, crawling), Cognitive (problem-solving, memory), Language (first words, sentences), Social (sharing, playing with others), and Emotional (self-regulation, empathy).',
    category: 'AI & Milestones',
    keywords: ['milestones', 'ai', 'detection', 'categories'],
  },
  {
    id: 'faq-3',
    question: 'How do I add multiple children?',
    answer: 'Navigate to the Children page and click the "Add Child" button. Enter their name, birthdate, and select an avatar. You can switch between children using the child selector at the top of most pages.',
    category: 'Family Management',
    keywords: ['children', 'add', 'family', 'multiple'],
  },
  {
    id: 'faq-4',
    question: 'Is my data secure and private?',
    answer: 'Yes, we take privacy seriously. All data is encrypted in transit and at rest. We never share your personal information with third parties. You can export or delete your data at any time from the Settings page.',
    category: 'Privacy & Security',
    keywords: ['privacy', 'security', 'data', 'encryption'],
  },
  {
    id: 'faq-5',
    question: 'How accurate is the AI analysis?',
    answer: 'Our AI models have been trained on extensive developmental psychology research and achieve 85-95% accuracy in milestone detection. However, AI insights should complement, not replace, professional medical advice.',
    category: 'AI & Milestones',
    keywords: ['accuracy', 'ai', 'reliability', 'confidence'],
  },
  {
    id: 'faq-6',
    question: 'Can I manually edit or add milestones?',
    answer: 'Yes! While AI automatically detects milestones, you can manually add, edit, or verify them. Go to the Milestones page and use the manual entry option to add your own observations.',
    category: 'Features',
    keywords: ['manual', 'edit', 'add', 'milestones'],
  },
  {
    id: 'faq-7',
    question: 'How do I export my data?',
    answer: 'You can export all your data from the Settings page. We support multiple formats including PDF reports, CSV files, and JSON for complete data portability.',
    category: 'Data Management',
    keywords: ['export', 'download', 'backup', 'pdf'],
  },
  {
    id: 'faq-8',
    question: 'What is the difference between memories and milestones?',
    answer: 'Memories are daily observations and moments you capture, while milestones are significant developmental achievements. The AI analyzes memories to automatically identify and suggest milestones.',
    category: 'Getting Started',
    keywords: ['memories', 'milestones', 'difference', 'basics'],
  },
];

const tutorials: TutorialCard[] = [
  {
    id: 'tut-1',
    title: 'Getting Started with Seneca',
    description: 'Learn the basics of capturing memories and tracking milestones',
    duration: '5 min',
    icon: Play,
    difficulty: 'beginner',
  },
  {
    id: 'tut-2',
    title: 'Voice Recording Best Practices',
    description: 'Tips for capturing clear, detailed voice memories',
    duration: '3 min',
    icon: Mic,
    difficulty: 'beginner',
  },
  {
    id: 'tut-3',
    title: 'Understanding AI Insights',
    description: 'How to interpret predictions and recommendations',
    duration: '7 min',
    icon: Zap,
    difficulty: 'intermediate',
  },
  {
    id: 'tut-4',
    title: 'Managing Multiple Children',
    description: 'Organize and track development for siblings',
    duration: '4 min',
    icon: Users,
    difficulty: 'intermediate',
  },
  {
    id: 'tut-5',
    title: 'Privacy & Security Settings',
    description: 'Configure privacy settings and data management',
    duration: '6 min',
    icon: Shield,
    difficulty: 'advanced',
  },
  {
    id: 'tut-6',
    title: 'Advanced Analytics',
    description: 'Deep dive into development trends and patterns',
    duration: '8 min',
    icon: Settings,
    difficulty: 'advanced',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter FAQ items based on search
  const filteredFAQ = faqItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(faqItems.map(item => item.category)))];

  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Help & Support
        </h1>
        <p className="text-gray-400 text-sm mt-1">Find answers, tutorials, and contact support</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search for help topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 focus:border-violet-500"
        />
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="bg-white/5 border-white/10 w-full justify-start">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Tutorials
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  selectedCategory === category 
                    ? 'bg-gradient-to-r from-violet-500 to-blue-500' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All Categories' : category}
              </Badge>
            ))}
          </div>

          {/* FAQ Accordion */}
          {filteredFAQ.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredFAQ.map(item => (
                <AccordionItem 
                  key={item.id} 
                  value={item.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <HelpCircle className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{item.question}</div>
                        <Badge variant="outline" className="mt-1 text-xs bg-white/5 border-white/10">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 pl-8">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-8">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h3 className="text-lg font-medium text-white/80 mb-2">No results found</h3>
                <p className="text-sm text-white/60">
                  Try adjusting your search terms or browse all categories
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Tutorials Tab */}
        <TabsContent value="tutorials" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tutorials.map(tutorial => {
              const Icon = tutorial.icon;
              
              return (
                <Card 
                  key={tutorial.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Icon className="w-8 h-8 text-violet-400" />
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${difficultyColors[tutorial.difficulty]}`}
                    >
                      {tutorial.difficulty}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-2">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">{tutorial.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tutorial.duration}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hover:bg-white/10"
                    >
                      Start
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <Mail className="w-8 h-8 text-violet-400 mb-4" />
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-gray-400 mb-4">
                Get help from our support team via email. We typically respond within 24 hours.
              </p>
              <Button 
                variant="outline" 
                className="w-full border-white/10 hover:bg-white/10"
              >
                <Mail className="w-4 h-4 mr-2" />
                support@senecaprotocol.com
              </Button>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <MessageCircle className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-gray-400 mb-4">
                Chat with our support team in real-time. Available Monday-Friday, 9 AM - 6 PM EST.
              </p>
              <Button className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Chat
              </Button>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <Phone className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="font-semibold mb-2">Phone Support</h3>
              <p className="text-sm text-gray-400 mb-4">
                Premium support for Pro subscribers. Call us for immediate assistance.
              </p>
              <Button 
                variant="outline" 
                className="w-full border-white/10 hover:bg-white/10"
              >
                <Phone className="w-4 h-4 mr-2" />
                1-800-SENECA-1
              </Button>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <Users className="w-8 h-8 text-yellow-400 mb-4" />
              <h3 className="font-semibold mb-2">Community Forum</h3>
              <p className="text-sm text-gray-400 mb-4">
                Connect with other parents and share experiences in our community forum.
              </p>
              <Button 
                variant="outline" 
                className="w-full border-white/10 hover:bg-white/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Forum
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <FileText className="w-6 h-6 text-violet-400 mb-3" />
              <h3 className="font-semibold mb-2">Documentation</h3>
              <p className="text-sm text-gray-400 mb-4">
                Comprehensive guides and API documentation
              </p>
              <Button variant="ghost" size="sm" className="hover:bg-white/10">
                View Docs
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <BookOpen className="w-6 h-6 text-blue-400 mb-3" />
              <h3 className="font-semibold mb-2">Child Development Guide</h3>
              <p className="text-sm text-gray-400 mb-4">
                Expert resources on developmental milestones
              </p>
              <Button variant="ghost" size="sm" className="hover:bg-white/10">
                Read Guide
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <Shield className="w-6 h-6 text-green-400 mb-3" />
              <h3 className="font-semibold mb-2">Privacy Policy</h3>
              <p className="text-sm text-gray-400 mb-4">
                Learn about how we protect your data
              </p>
              <Button variant="ghost" size="sm" className="hover:bg-white/10">
                View Policy
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <Zap className="w-6 h-6 text-yellow-400 mb-3" />
              <h3 className="font-semibold mb-2">API Reference</h3>
              <p className="text-sm text-gray-400 mb-4">
                For developers building integrations
              </p>
              <Button variant="ghost" size="sm" className="hover:bg-white/10">
                View API
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}