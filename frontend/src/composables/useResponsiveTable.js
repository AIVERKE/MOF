import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";

/**
 * Composable para gestionar el comportamiento responsivo de tablas en el sistema MOF.
 * Permite alternar automáticamente entre vista de tabla clásica (desktop) y vista de tarjetas (móvil/tablet).
 */
export function useResponsiveTable() {
  const display = useDisplay();
  const { smAndDown, xs, sm, mdAndUp, mobile } = display;

  const isMobile = computed(() => Boolean(smAndDown?.value ?? mobile?.value));

  // Modo tarjeta activo por defecto en móviles/tablets pequeñas (xs y sm)
  const isCardView = ref(isMobile.value);

  // Sincronizar automáticamente cuando cambia el viewport, respetando la preferencia si el usuario la cambia
  watch(
    isMobile,
    (val) => {
      isCardView.value = val;
    },
    { immediate: true },
  );

  const toggleCardView = () => {
    isCardView.value = !isCardView.value;
  };

  const tableDensity = computed(() => (isMobile.value ? "compact" : "comfortable"));

  return {
    display,
    isMobile,
    isCardView,
    toggleCardView,
    tableDensity,
    xs,
    sm,
    smAndDown,
    mdAndUp,
  };
}
