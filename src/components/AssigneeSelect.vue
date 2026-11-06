<script setup lang="ts">
import type { Profile } from '@/types'

defineProps<{
  modelValue: string
  profiles: Profile[]
  id?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <select
    :id="id"
    class="input"
    :value="modelValue"
    :disabled="disabled"
    @change="onChange"
  >
    <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
      {{ profile.display_name }} · {{ profile.email }}
    </option>
  </select>
</template>
