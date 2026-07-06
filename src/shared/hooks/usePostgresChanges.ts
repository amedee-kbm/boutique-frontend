'use client'

import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE'

// One place for the Supabase realtime subscribe/teardown lifecycle. Callers give
// a channel name, the table (plus optional event/row filter) to watch, and a
// handler; the plumbing — createClient → channel → on('postgres_changes') →
// subscribe → removeChannel — lives here. The handler is kept in a ref so the
// subscription isn't torn down and rebuilt on every render.
export function usePostgresChanges<T extends Record<string, unknown>>(
  // Pass null to disable the subscription (e.g. before a session id is known).
  channel: string | null,
  source: { table: string; event?: PostgresEvent; filter?: string },
  handler: (payload: RealtimePostgresChangesPayload<T>) => void
) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  const { table, event = 'INSERT', filter } = source

  useEffect(() => {
    if (!channel) return
    const supabase = createClient()
    const ch = supabase
      .channel(channel)
      .on(
        // supabase-js keys the overload on the event literal; the config is
        // assembled dynamically here, so assert the filter shape.
        'postgres_changes',
        { event, schema: 'public', table, ...(filter ? { filter } : {}) } as {
          event: PostgresEvent
          schema: string
          table: string
          filter?: string
        },
        (payload) => handlerRef.current(payload as RealtimePostgresChangesPayload<T>)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [channel, table, event, filter])
}
