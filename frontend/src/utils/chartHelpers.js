/**
 * Helper para centralizar la configuración base y paleta de colores de Highcharts
 * con soporte reactivo para temas claro y oscuro.
 */

import { OKABE_ITO_PALETTE } from "./mofHelpers";

/**
 * Retorna las opciones base de configuración para Highcharts con soporte dark/light sincronizado
 * y paleta accesible Okabe-Ito para modo daltónico.
 *
 * @param {boolean|{value: boolean}} isDark - Indicador de modo oscuro activo (booleano o ref)
 * @param {object} [customOptions] - Opciones adicionales para fusionar en el objeto base
 * @param {boolean|{value: boolean}} [isColorblind=false] - Indicador de modo daltónico activo (booleano o ref)
 * @returns {object} Opciones base de Highcharts con objeto auxiliar `_colors`
 */
export function getHighchartsBaseOptions(
  isDark = false,
  customOptions = {},
  isColorblind = false,
) {
  const isDarkVal = Boolean(
    typeof isDark === "object" && isDark !== null && "value" in isDark
      ? isDark.value
      : isDark,
  );

  const isColorblindVal = Boolean(
    typeof isColorblind === "object" &&
      isColorblind !== null &&
      "value" in isColorblind
      ? isColorblind.value
      : isColorblind,
  );

  const colors = {
    textColor: isDarkVal ? "#E2E8F0" : "#333333",
    labelColor: isDarkVal ? "#94A3B8" : "#666666",
    gridLineColor: isDarkVal ? "#334155" : "#E6E6E6",
    lineColor: isDarkVal ? "#475569" : "#CCD6EB",
    hoverColor: isDarkVal ? "#FFFFFF" : "#000000",
    accentColor: isColorblindVal ? "#0072B2" : "#F57C00",
  };

  const base = {
    chart: {
      backgroundColor: "transparent",
      style: { fontFamily: "inherit", color: colors.textColor },
    },
    title: { text: null },
    credits: { enabled: false },
    legend: {
      itemStyle: { color: colors.textColor },
      itemHoverStyle: { color: colors.hoverColor },
    },
  };

  if (isColorblindVal) {
    base.colors = [...OKABE_ITO_PALETTE];
  }

  return {
    ...base,
    ...customOptions,
    chart: {
      ...base.chart,
      ...(customOptions.chart || {}),
    },
    legend: {
      ...base.legend,
      ...(customOptions.legend || {}),
    },
    _colors: colors,
  };
}
