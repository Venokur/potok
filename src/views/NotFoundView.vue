<template>
  <div class="flex min-h-[60vh] items-center justify-center px-6 py-16">
    <div class="text-center">
      <p class="text-6xl font-black tracking-tight text-slate-200">404</p>
      <h1 class="mt-3 text-lg font-semibold text-slate-900">Страница не найдена</h1>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Похоже, такой страницы нет. Вернитесь к списку заявок.
      </p>
      <RouterLink :to="{ name: 'tickets' }" class="btn-primary mt-5">К заявкам</RouterLink>
    </div>
  </div>
</template>
