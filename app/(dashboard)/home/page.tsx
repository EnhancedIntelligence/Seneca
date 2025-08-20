import HomeClient from './HomeClient';
import { apiFetchServer } from '@/lib/server/apiFetch';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  let families = [];
  
  try {
    const response = await apiFetchServer('/api/families', { method: 'GET' });
    
    if (response.status === 401) {
      // User not authenticated, redirect to login
      redirect('/login');
    }
    
    if (!response.ok) {
      console.error('Failed to load families:', response.status);
      // We'll let the client component handle the empty state
    } else {
      const { items } = await response.json();
      families = items || [];
    }
  } catch (error) {
    console.error('Error fetching families:', error);
    // Continue with empty families array
  }

  return <HomeClient families={families} />;
}