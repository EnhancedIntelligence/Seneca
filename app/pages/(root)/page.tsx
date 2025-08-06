import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <Card className="p-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Family Memory Tracker</h1>
          <p className="text-muted-foreground mb-6">
            Track and preserve your family memories with AI-powered insights
          </p>
          <Link href="/auth">
            <Button>Get Started</Button>
          </Link>
        </Card>
      </div>
    </main>
  )
}