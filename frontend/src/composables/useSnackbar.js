/**
 * @fileoverview Composable para la gestión centralizada de alertas Snackbar globales en la aplicación.
 * Proporciona un estado reactivo único compartido para evitar instancias duplicadas,
 * soporte de cierre manual y duración mínima por defecto de 20 segundos.
 */

import { ref } from 'vue';

// Estado reactivo global compartido (Singleton a nivel de módulo)
const isVisible = ref(false);
const text = ref('');
const color = ref('success');
const timeout = ref(20000);

/**
 * Hook composable para interactuar con la alerta snackbar global.
 *
 * @example
 * // Uso básico en un componente:
 * import { useSnackbar } from '@/composables/useSnackbar';
 * const { mostrar } = useSnackbar();
 * mostrar('Operación exitosa', 'success');
 *
 * @example
 * // Con duración personalizada y método semántico:
 * const { error, cerrar } = useSnackbar();
 * error('Error al conectar con el servidor', 25000);
 * cerrar();
 *
 * @returns {Object} API del snackbar global.
 * @property {import('vue').Ref<boolean>} isVisible - Indica si la alerta está visible.
 * @property {import('vue').Ref<string>} text - Texto o mensaje que muestra la alerta.
 * @property {import('vue').Ref<string>} color - Color/tipo semántico ('success', 'error', 'info', 'warning').
 * @property {import('vue').Ref<number>} timeout - Tiempo en milisegundos de permanencia (por defecto 20000 ms).
 * @property {Function} mostrar - Muestra una alerta con mensaje, color y timeout configurable.
 * @property {Function} cerrar - Cierra inmediatamente la alerta activa.
 * @property {Function} success - Atajo para mostrar alertas de éxito.
 * @property {Function} error - Atajo para mostrar alertas de error.
 * @property {Function} info - Atajo para mostrar alertas informativas.
 * @property {Function} warning - Atajo para mostrar alertas de advertencia.
 */
export function useSnackbar() {
  /**
   * Dispara una notificación snackbar global.
   *
   * @param {string} mensaje - Texto o mensaje a desplegar en la alerta.
   * @param {('success'|'error'|'info'|'warning'|string)} [colorTipo='success'] - Color temático de Vuetify.
   * @param {number} [duracion=20000] - Tiempo en ms antes de autocerrarse (por defecto 20s).
   */
  const mostrar = (mensaje, colorTipo = 'success', duracion = 20000) => {
    if (isVisible.value) {
      isVisible.value = false;
      setTimeout(() => {
        text.value = mensaje || '';
        color.value = colorTipo || 'success';
        timeout.value = typeof duracion === 'number' ? duracion : 20000;
        isVisible.value = true;
      }, 50);
    } else {
      text.value = mensaje || '';
      color.value = colorTipo || 'success';
      timeout.value = typeof duracion === 'number' ? duracion : 20000;
      isVisible.value = true;
    }
  };

  /**
   * Cierra de manera manual e inmediata la alerta global.
   */
  const cerrar = () => {
    isVisible.value = false;
  };

  /**
   * Atajo para desplegar una alerta de éxito ('success').
   * @param {string} mensaje - Texto de éxito.
   * @param {number} [duracion=20000] - Duración en milisegundos.
   */
  const success = (mensaje, duracion = 20000) => mostrar(mensaje, 'success', duracion);

  /**
   * Atajo para desplegar una alerta de error ('error').
   * @param {string} mensaje - Texto del error.
   * @param {number} [duracion=20000] - Duración en milisegundos.
   */
  const error = (mensaje, duracion = 20000) => mostrar(mensaje, 'error', duracion);

  /**
   * Atajo para desplegar una alerta informativa ('info').
   * @param {string} mensaje - Texto informativo.
   * @param {number} [duracion=20000] - Duración en milisegundos.
   */
  const info = (mensaje, duracion = 20000) => mostrar(mensaje, 'info', duracion);

  /**
   * Atajo para desplegar una alerta de advertencia ('warning').
   * @param {string} mensaje - Texto de advertencia.
   * @param {number} [duracion=20000] - Duración en milisegundos.
   */
  const warning = (mensaje, duracion = 20000) => mostrar(mensaje, 'warning', duracion);

  return {
    isVisible,
    text,
    color,
    timeout,
    mostrar,
    cerrar,
    success,
    error,
    info,
    warning
  };
}

export default useSnackbar;
