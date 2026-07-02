import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/shared/lib/error'

export const AuthService = {
  async signUp(email: string, password: string) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return { error: error.message }
      return { error: null, data }
    } catch (err) {
      return { error: getErrorMessage(err, 'Failed to sign up') }
    }
  },

  async signIn(email: string, password: string) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null, data }
    } catch (err) {
      return { error: getErrorMessage(err, 'Failed to sign in') }
    }
  },

  async signOut() {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) return { error: error.message }
      return { error: null }
    } catch (err) {
      return { error: getErrorMessage(err, 'Failed to sign out') }
    }
  },
}
