/**
 * Helper para centralizar la configuración base y paleta de colores de Highcharts
 * con soporte reactivo para temas claro y oscuro.
 */

/**
 * Retorna las opciones base de configuración para Highcharts con soporte dark/light sincronizado.
 *
 * @param {boolean|{value: boolean}} isDark - Indicador de modo oscuro activo (booleano o ref)
 * @param {object} [customOptions] - Opciones adicionales para fusionar en el objeto base
 * @returns {object} Opciones base de Highcharts con objeto auxiliar `_colors`
 */
export function getHighchartsBaseOptions(isDark = false, customOptions = {}) {
  const isDarkVal = Boolean(
    typeof isDark === "object" && isDark !== null && "value" in isDark
      ? isDark.value
      : isDark,
  );

  const colors = {
    textColor: isDarkVal ? "#E2E8F0" : "#333333",
    labelColor: isDarkVal ? "#94A3B8" : "#666666",
    gridLineColor: isDarkVal ? "#334155" : "#E6E6E6",
    lineColor: isDarkVal ? "#475569" : "#CCD6EB",
    hoverColor: isDarkVal ? "#FFFFFF" : "#000000",
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
