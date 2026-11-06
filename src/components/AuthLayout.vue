<script setup lang="ts">
import AppLogo from './AppLogo.vue'

const highlights = [
  'Создайте задачу и назначьте исполнителя из команды',
  'Ведите задачу по этапам: новая, уточнение, в работе, завершена',
  'Комментарии и история изменений — всё в одном месте',
]
</script>

<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
    <aside
      class="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"
    >
      <div
        class="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-indigo-600/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -right-40 bottom-0 size-[30rem] rounded-full bg-sky-500/20 blur-3xl"
        aria-hidden="true"
      />

      <div class="relative">
        <AppLogo light />
      </div>

      <div class="relative max-w-md">
        <p class="text-sm font-medium text-indigo-300">Заявки на автоматизацию</p>
        <h1 class="mt-4 text-4xl leading-tight font-bold tracking-tight">
          Рутина уходит<br />в поток.
        </h1>
        <p class="mt-4 text-base leading-relaxed text-slate-300">
          Общая доска, где сотрудники ставят задачи друг другу и видят, что уже в работе.
        </p>

        <ul class="mt-8 space-y-3">
          <li v-for="item in highlights" :key="item" class="flex items-start gap-3 text-sm text-slate-300">
            <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-indigo-200">
              <svg
                class="size-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            </span>
            {{ item }}
          </li>
        </ul>
      </div>

      <p class="relative text-xs text-slate-500">Vue 3 · Supabase · Docker</p>
    </aside>

    <main class="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
      <div class="w-full max-w-md">
        <div class="mb-8 lg:hidden">
          <AppLogo />
        </div>
        <slot />
      </div>
    </main>
  </div>
</template>
