import Highcharts from 'highcharts';
import HighchartsVue from 'highcharts-vue';
import SankeyModule from 'highcharts/modules/sankey';
import OrganizationModule from 'highcharts/modules/organization';
import ExportingModule from 'highcharts/modules/exporting';
import AccessibilityModule from 'highcharts/modules/accessibility';
import { SERIES_COLORS, THEME_COLORS } from '@/config/designSystem';

// Función para inicializar módulos de forma segura
const initializeModule = (module, hc) => {
    if (typeof module === 'function') {
        module(hc);
    } else if (module && typeof module.default === 'function') {
        module.default(hc);
    }
};

// Inicializar todos los módulos
initializeModule(SankeyModule, Highcharts);
initializeModule(OrganizationModule, Highcharts);
initializeModule(ExportingModule, Highcharts);
initializeModule(AccessibilityModule, Highcharts);

// Aplicar configuración del Archivo Maestro a Highcharts
Highcharts.setOptions({
  colors: SERIES_COLORS,
  chart: {
    style: {
      fontFamily: "'Urbanist', sans-serif",
    },
  },
  title: {
    style: {
      color: THEME_COLORS.petroleo,
      fontWeight: '700',
    },
  },
  subtitle: {
    style: {
      color: THEME_COLORS.acero,
      fontWeight: '500',
    },
  },
  xAxis: {
    gridLineColor: THEME_COLORS.gridline,
    labels: {
      style: {
        color: THEME_COLORS.textMuted,
        fontSize: '11px',
      },
    },
  },
  yAxis: {
    gridLineColor: THEME_COLORS.gridline,
    labels: {
      style: {
        color: THEME_COLORS.textMuted,
        fontSize: '11px',
      },
    },
  },
  plotOptions: {
    column: {
      borderRadius: 6,
    },
    bar: {
      borderRadius: 6,
    },
  },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderColor: THEME_COLORS.acero,
    borderRadius: 8,
    style: {
      color: THEME_COLORS.textMain,
      fontFamily: "'Urbanist', sans-serif",
    },
  },
});

export default (app) => {
    app.use(HighchartsVue, {
        highcharts: Highcharts
    });
};
