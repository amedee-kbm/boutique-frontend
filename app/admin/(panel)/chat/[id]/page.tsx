import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getChatMessages, getChatSession } from '@/lib/db/queries'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChatConversation } from '@/components/admin/ChatConversation'

export const metadata: Metadata = { title: 'Conversation — Zita Boutique' }

export default async function ChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [session, messages] = await Promise.all([getChatSession(id), getChatMessages(id)])

  if (!session) notFound()

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2" render={<Link href="/admin/chat" />}>
        <ArrowLeft className="size-4" />
        All chats
      </Button>

      <div className="mb-4 flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{session.guestName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-bold">{session.guestName}</h1>
          <p className="text-muted-foreground text-xs">Customer</p>
        </div>
      </div>

      <ChatConversation
        sessionId={session.id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          content: m.content,
          fromAdmin: m.fromAdmin,
          createdAt: m.createdAt,
          items: m.items,
        }))}
      />
    </>
  )
}
