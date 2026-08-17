import Highcharts from 'highcharts';
import HighchartsVue from 'highcharts-vue';
import SankeyModule from 'highcharts/modules/sankey';
import OrganizationModule from 'highcharts/modules/organization';
import ExportingModule from 'highcharts/modules/exporting';
import AccessibilityModule from 'highcharts/modules/accessibility';

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

export default (app) => {
    app.use(HighchartsVue, {
        highcharts: Highcharts
    });
};
