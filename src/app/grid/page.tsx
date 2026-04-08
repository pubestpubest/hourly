import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import GridPage from './GridPage'

export default async function Page() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <GridPage currentUserId={session.userId} username={session.username} />
}
