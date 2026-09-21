import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from "vue";
import { useDisplay } from "vuetify";

/**
 * Composable reutilizable para detección responsiva de breakpoints, dimensiones y orientación del dispositivo.
 * Compatible con Vuetify 3 y entornos móviles/tablets con soporte táctil.
 */
export function useResponsive() {
  let display = null;
  try {
    const vm = getCurrentInstance();
    if (vm) {
      let current = vm;
      let hasDisplay = false;
      while (current) {
        const symbols = current.provides ? Object.getOwnPropertySymbols(current.provides) : [];
        if (symbols.some((s) => s.toString().includes("display"))) {
          hasDisplay = true;
          break;
        }
        current = current.parent;
      }
      if (hasDisplay) {
        display = useDisplay();
      }
    }
  } catch {
    display = null;
  }

  const windowWidth = ref(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );
  const windowHeight = ref(
    typeof window !== "undefined" ? window.innerHeight : 800,
  );

  const isPortrait = ref(
    typeof window !== "undefined"
      ? window.innerHeight >= window.innerWidth
      : false,
  );
  const isLandscape = computed(() => !isPortrait.value);
  const orientation = computed(() =>
    isPortrait.value ? "portrait" : "landscape",
  );

  // Breakpoints principales
  const isMobile = computed(() => {
    if (display?.smAndDown?.value !== undefined) {
      return display.smAndDown.value;
    }
    return windowWidth.value < 768;
  });

  const isTablet = computed(() => {
    if (display?.md?.value !== undefined) {
      return display.md.value;
    }
    return windowWidth.value >= 768 && windowWidth.value < 1024;
  });

  const isDesktop = computed(() => {
    if (display?.lgAndUp?.value !== undefined) {
      return display.lgAndUp.value;
    }
    return windowWidth.value >= 1024;
  });

  const smAndDown = computed(() => isMobile.value);
  const mdAndDown = computed(() => {
    if (display?.mdAndDown?.value !== undefined) {
      return display.mdAndDown.value;
    }
    return windowWidth.value < 1024;
  });
  const mdAndUp = computed(() => {
    if (display?.mdAndUp?.value !== undefined) {
      return display.mdAndUp.value;
    }
    return windowWidth.value >= 768;
  });

  const xs = computed(() => display?.xs?.value ?? windowWidth.value < 600);
  const sm = computed(
    () =>
      display?.sm?.value ??
      (windowWidth.value >= 600 && windowWidth.value < 768),
  );
  const md = computed(
    () =>
      display?.md?.value ??
      (windowWidth.value >= 768 && windowWidth.value < 1024),
  );
  const lg = computed(
    () =>
      display?.lg?.value ??
      (windowWidth.value >= 1024 && windowWidth.value < 1440),
  );
  const xl = computed(
    () => display?.xl?.value ?? windowWidth.value >= 1440,
  );

  const updateDimensions = () => {
    if (typeof window === "undefined") return;
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
    isPortrait.value = window.innerHeight >= window.innerWidth;
  };

  onMounted(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateDimensions, { passive: true });
      window.addEventListener("orientationchange", updateDimensions, {
        passive: true,
      });

      if (window.matchMedia) {
        const mql = window.matchMedia("(orientation: portrait)");
        const handleMql = (e) => {
          isPortrait.value = e.matches;
        };
        mql.addEventListener?.("change", handleMql);
      }
      updateDimensions();
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
    }
  });

  return {
    windowWidth,
    windowHeight,
    isPortrait,
    isLandscape,
    orientation,
    isMobile,
    isTablet,
    isDesktop,
    xs,
    sm,
    md,
    lg,
    xl,
    smAndDown,
    mdAndDown,
    mdAndUp,
    updateDimensions,
  };
}
