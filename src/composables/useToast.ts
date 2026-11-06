import { readonly, ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const toasts = ref<Toast[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 1

function dismiss(id: number): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function push(kind: ToastKind, message: string): void {
  const id = nextId++
  toasts.value = [...toasts.value.slice(-2), { id, kind, message }]

  const timer = setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000)
  timers.set(id, timer)
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    dismiss,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }
}
