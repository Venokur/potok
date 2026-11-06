<script setup lang="ts">
import { computed } from 'vue'

import type { Profile } from '@/types'

import AppSelect from './AppSelect.vue'

const props = defineProps<{
  modelValue: string
  profiles: Profile[]
  id?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const options = computed(() =>
  props.profiles.map((profile) => ({
    value: profile.id,
    label: profile.display_name || profile.email,
    description: profile.email,
  })),
)
</script>

<template>
  <AppSelect
    :model-value="modelValue"
    :options="options"
    :id="id"
    :disabled="disabled"
    placeholder="Выберите исполнителя"
    aria-label="Исполнитель"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
