import { create } from 'zustand'

// Transient UI state: toasts (with Undo), the command palette, celebrations.

export interface Toast {
  id: number
  message: string
  undo?: () => unknown
}

interface UIStore {
  toasts: Toast[]
  paletteOpen: boolean
  confettiAt: number
  toast: (message: string, undo?: Toast['undo']) => void
  dismiss: (id: number) => void
  setPaletteOpen: (open: boolean) => void
  celebrate: () => void
}

let nextId = 1

export const useUI = create<UIStore>((set, get) => ({
  toasts: [],
  paletteOpen: false,
  confettiAt: 0,
  toast: (message, undo) => {
    const id = nextId++
    set({ toasts: [...get().toasts.slice(-2), { id, message, undo }] })
    setTimeout(() => get().dismiss(id), undo ? 6000 : 3000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  celebrate: () => set({ confettiAt: Date.now() }),
}))

export const toast = (m: string, undo?: Toast['undo']) => useUI.getState().toast(m, undo)
export const celebrate = () => useUI.getState().celebrate()
