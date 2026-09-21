import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { THEME_LIST } from '@/plugins/themes';

export const STORAGE_KEY_THEME = 'mof_theme_mode';

function readStoredTheme() {
  if (typeof window === 'undefined' || !window.localStorage) return 'light';
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  if (saved && THEME_LIST.some((t) => t.id === saved)) {
    return saved;
  }
  return 'light';
}

function syncRootDomClasses(themeId) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;

  // Limpiar clases previas de tema
  THEME_LIST.forEach((t) => {
    root.classList.remove(`theme-${t.id}`);
  });

  const themeInfo = THEME_LIST.find((t) => t.id === themeId);
  root.classList.add(`theme-${themeId}`);

  if (themeInfo?.isDark) {
    root.classList.add('dark-theme');
    root.classList.remove('light-theme');
  } else {
    root.classList.add('light-theme');
    root.classList.remove('dark-theme');
  }

  if (themeInfo?.isColorblind) {
    root.classList.add('colorblind-mode');
    root.classList.add(`colorblind-${themeId}`);
  } else {
    root.classList.remove('colorblind-mode');
    root.classList.remove('colorblind-protanopia');
    root.classList.remove('colorblind-deuteranopia');
    root.classList.remove('colorblind-tritanopia');
  }
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref(readStoredTheme());

  // Inicializar clases en el elemento raíz
  syncRootDomClasses(currentTheme.value);

  const activeThemeInfo = computed(() => {
    return (
      THEME_LIST.find((t) => t.id === currentTheme.value) || THEME_LIST[0]
    );
  });

  const isDark = computed(() => activeThemeInfo.value.isDark);
  const isColorblind = computed(() => activeThemeInfo.value.isColorblind);

  function setTheme(themeId, vuetifyTheme = null) {
    if (!THEME_LIST.some((t) => t.id === themeId)) return;

    currentTheme.value = themeId;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_THEME, themeId);
    }

    syncRootDomClasses(themeId);

    if (vuetifyTheme && vuetifyTheme.global) {
      vuetifyTheme.global.name.value = themeId;
    }
  }

  function toggleTheme(vuetifyTheme = null) {
    const nextTheme = isDark.value ? 'light' : 'dark';
    setTheme(nextTheme, vuetifyTheme);
  }

  return {
    currentTheme,
    activeThemeInfo,
    isDark,
    isColorblind,
    themeList: THEME_LIST,
    setTheme,
    toggleTheme,
  };
});
