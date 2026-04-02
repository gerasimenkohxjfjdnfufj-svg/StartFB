import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProfileType, RouteResult } from '../types'

interface AppState {
  profile: ProfileType
  setProfile: (p: ProfileType) => void
  currentRoute: RouteResult | null
  setCurrentRoute: (r: RouteResult | null) => void
  fromAddress: string
  toAddress: string
  setFromAddress: (a: string) => void
  setToAddress: (a: string) => void
  isLoading: boolean
  setLoading: (v: boolean) => void
  error: string | null
  setError: (e: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      profile: 'wheelchair',
      setProfile: profile => set({ profile }),
      currentRoute: null,
      setCurrentRoute: currentRoute => set({ currentRoute }),
      fromAddress: '',
      toAddress: '',
      setFromAddress: fromAddress => set({ fromAddress }),
      setToAddress: toAddress => set({ toAddress }),
      isLoading: false,
      setLoading: isLoading => set({ isLoading }),
      error: null,
      setError: error => set({ error }),
    }),
    {
      name: 'dg-store',
      partialize: state => ({
        profile:     state.profile,
        fromAddress: state.fromAddress,
        toAddress:   state.toAddress,
      }),
    }
  )
)
