<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

interface SelectOption {
  value: string
  label: string
  description?: string
  dotClass?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    id?: string
    ariaLabel?: string
    placeholder?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  {
    id: undefined,
    ariaLabel: undefined,
    placeholder: 'Выберите значение',
    disabled: false,
    compact: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uid = useId()
const listId = `select-list-${uid}`
const triggerId = computed(() => props.id ?? `select-trigger-${uid}`)

const open = ref(false)
const activeIndex = ref(-1)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLDivElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const selected = computed(
  () => props.options.find((option) => option.value === props.modelValue) ?? null,
)
const activeOption = computed(() => props.options[activeIndex.value] ?? null)
const activeDescendant = computed(() =>
  open.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined,
)

function optionId(index: number): string {
  return `${listId}-option-${index}`
}

function computePosition() {
  const trigger = triggerRef.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const gap = 8
  const width = Math.min(Math.max(rect.width, 220), 360, window.innerWidth - gap * 2)
  const left = Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap))

  const spaceBelow = window.innerHeight - rect.bottom - gap
  const spaceAbove = rect.top - gap
  const desiredHeight = Math.min(288, props.options.length * 46 + 12)
  const openUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow
  const maxHeight = Math.max(120, Math.min(288, openUp ? spaceAbove : spaceBelow))

  panelStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    zIndex: '60',
    ...(openUp
      ? { bottom: `${Math.round(window.innerHeight - rect.top + 6)}px` }
      : { top: `${Math.round(rect.bottom + 6)}px` }),
  }
}

function scrollActiveIntoView() {
  if (!open.value) return
  document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' })
}

function openMenu(direction: 1 | -1 = 1) {
  if (props.disabled) return

  open.value = true
  const selectedIndex = props.options.findIndex((option) => option.value === props.modelValue)
  activeIndex.value =
    selectedIndex >= 0
      ? selectedIndex
      : direction === 1
        ? 0
        : Math.max(0, props.options.length - 1)

  computePosition()
  nextTick(scrollActiveIntoView)
}

function closeMenu(returnFocus = false) {
  open.value = false

  if (returnFocus) {
    triggerRef.value?.focus({ preventScroll: true })
  }
}

function move(delta: number) {
  if (!props.options.length) return

  const next = activeIndex.value + delta
  if (next < 0) activeIndex.value = props.options.length - 1
  else if (next >= props.options.length) activeIndex.value = 0
  else activeIndex.value = next

  nextTick(scrollActiveIntoView)
}

function selectOption(option: SelectOption) {
  if (option.value !== props.modelValue) {
    emit('update:modelValue', option.value)
  }
  closeMenu(true)
}

function toggle() {
  if (props.disabled) return
  if (open.value) closeMenu()
  else openMenu()
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (open.value) move(1)
      else openMenu(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      if (open.value) move(-1)
      else openMenu(-1)
      break
    case 'Home':
      if (open.value) {
        event.preventDefault()
        activeIndex.value = 0
        nextTick(scrollActiveIntoView)
      }
      break
    case 'End':
      if (open.value) {
        event.preventDefault()
        activeIndex.value = props.options.length - 1
        nextTick(scrollActiveIntoView)
      }
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (!open.value) openMenu(1)
      else if (activeOption.value) selectOption(activeOption.value)
      break
    case 'Escape':
      if (open.value) {
        event.preventDefault()
        closeMenu(true)
      }
      break
    case 'Tab':
      if (open.value) closeMenu()
      break
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (triggerRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  closeMenu()
}

function addListeners() {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener('resize', computePosition)
  window.addEventListener('scroll', computePosition, true)
}

function removeListeners() {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('resize', computePosition)
  window.removeEventListener('scroll', computePosition, true)
}

watch(open, (isOpen) => {
  if (isOpen) addListeners()
  else removeListeners()
})

onBeforeUnmount(removeListeners)
</script>

<template>
  <div class="relative" :class="compact ? 'w-full sm:w-auto' : 'w-full'">
    <button
      :id="triggerId"
      ref="triggerRef"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="activeDescendant"
      :aria-label="ariaLabel"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white text-left shadow-sm transition focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      :class="
        compact
          ? 'h-10 px-3 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 sm:w-auto sm:min-w-[11.5rem]'
          : 'px-3.5 py-2.5 text-sm text-slate-900 hover:border-slate-400'
      "
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span
          v-if="selected?.dotClass"
          class="size-2 shrink-0 rounded-full"
          :class="selected.dotClass"
          aria-hidden="true"
        />
        <span class="truncate" :class="selected ? '' : 'text-slate-400'">
          {{ selected?.label ?? placeholder }}
        </span>
      </span>

      <svg
        class="size-4 shrink-0 text-slate-400 transition-transform duration-150"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="select-pop">
        <div
          v-if="open"
          ref="panelRef"
          :style="panelStyle"
          class="overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          <ul
            :id="listId"
            role="listbox"
            :aria-labelledby="triggerId"
            class="space-y-0.5"
          >
            <li
              v-for="(option, index) in options"
              :id="optionId(index)"
              :key="option.value"
              role="option"
              :aria-selected="option.value === modelValue"
              class="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition"
              :class="
                activeIndex === index
                  ? 'bg-slate-100 text-slate-900'
                  : option.value === modelValue
                    ? 'text-indigo-700'
                    : 'text-slate-700'
              "
              @mouseenter="activeIndex = index"
              @click="selectOption(option)"
            >
              <span
                v-if="option.dotClass"
                class="size-2 shrink-0 rounded-full"
                :class="option.dotClass"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate" :class="{ 'font-medium': option.value === modelValue }">
                  {{ option.label }}
                </span>
                <span v-if="option.description" class="mt-0.5 block truncate text-xs text-slate-400">
                  {{ option.description }}
                </span>
              </span>
              <svg
                v-if="option.value === modelValue"
                class="size-4 shrink-0 text-indigo-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            </li>
          </ul>

          <p v-if="options.length === 0" class="px-3 py-2 text-sm text-slate-500">
            Нет вариантов
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
