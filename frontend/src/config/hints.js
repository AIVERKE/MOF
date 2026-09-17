/**
 * @file hints.js
 * @description Diccionario centralizado de textos de ayuda contextual (hints) y
 * explicaciones conceptuales del dominio MOF (Manual de Organización y Funciones)
 * de la Universidad Mayor de San Andrés (UMSA).
 *
 * Convención de claves y estructura:
 * 1. hints.conceptos: Explicaciones del dominio MOF mostradas en tooltips de ayuda
 *    con el icono ❓ (mdi-help-circle-outline). Longitud objetivo: ~90-130 caracteres.
 * 2. hints.[modulo].[campo]: Textos de ayuda breves para la prop nativa `hint` de Vuetify
 *    mostrados en modo on-focus (:persistent-hint="false"). Longitud objetivo: ~60-90 caracteres.
 * 3. hints.dashboards.[vista]: Títulos y descripciones para notas informativas descartables.
 *
 * REGLA: Cero textos de hints o conceptos hardcodeados fuera de este archivo.
 */

export const hints = {
  /**
   * Conceptos clave del dominio MOF explicados vía tooltip con icono ❓
   */
  conceptos: {
    clase:
      "Clasificación jerárquica u orden estructural de la unidad (ej: Órgano de Gobierno, Facultad, Carrera, Departamento o División).",
    nivel:
      "Posición y grado de autoridad en la escala orgánica de mando (ej: Directivo, Ejecutivo, Operativo o de Apoyo).",
    tipo:
      "Naturaleza funcional o rol operativo de la unidad (ej: Sustantiva, de Asesoramiento, de Apoyo o Control).",
    relacion:
      "Tipo de vínculo o enlace formal con la unidad superior (ej: Línea Directa, Asesoría, Coordinación o Funcional).",
    baseLegal:
      "Normativa, resolución, estatuto o documento legal universitario que faculta formalmente la atribución o función.",
  },

  /**
   * Formulario principal de creación y edición de unidad (UnidadFormDialog.vue)
   */
  unidadForm: {
    nombre:
      "Denominación oficial completa de la unidad administrativa según estatuto",
    sigla:
      "Acrónimo oficial en mayúsculas para identificación rápida (ej: FCPN)",
    codigo:
      "Código numérico o alfanumérico único según la codificación orgánica",
    resCreacion:
      "Número y año de resolución o documento de creación (ej: RCU 120/2020)",
    fecCreacion:
      "Fecha formal en que fue promulgada la resolución de creación",
    objetivo:
      "Propósito estratégico y razón de ser institucional de la unidad",
    dependenciasFuncionales:
      "Unidades con las que mantiene coordinación operativa o dependencia técnica",
    tipo:
      "Seleccione la naturaleza sustantiva, de apoyo o asesoramiento",
    nivel:
      "Seleccione el grado jerárquico dentro de la estructura general",
    relacion:
      "Seleccione el tipo de dependencia o enlace jerárquico",
    cargos:
      "Cargos y puestos de trabajo asignados a esta unidad administrativa",
    clase:
      "Seleccione la jerarquía o nivel de instancia universitaria",
    funcion:
      "Descripción clara y en infinitivo de la tarea o atribución asignada",
    baseLegal:
      "Norma, resolución o artículo que faculta esta función específica",
    es_troncal:
      "Define si la unidad desciende directamente por la línea central de gobierno",
    ejecucionPoa:
      "Porcentaje o estado del plan operativo anual asignado a la unidad",
    ejecucionPresupuestaria:
      "Monto o porcentaje de ejecución presupuestaria del periodo actual",
    cargaHorariaProgramada:
      "Total de horas académicas o laborales planificadas para el periodo",
    cargaHorariaEjecutada:
      "Total de horas efectivamente cumplidas o reportadas en el periodo",
    ubicacion:
      "Campus, edificio, piso o ambiente físico donde opera la unidad",
    infraestructura:
      "Detalle de aulas, laboratorios, oficinas u otros espacios asignados",
    tramitesAtendidos:
      "Servicios, trámites y procesos gestionados para la comunidad universitaria",
    coordinacionInterna:
      "Unidades internas con las que se interactúa permanentemente",
    coordinacionExterna:
      "Nombre de la entidad, ministerio u organismo externo de coordinación",
  },

  /**
   * Diálogo de cambio de dependencia jerárquica (UnidadDependencyDialog.vue)
   */
  unidadDependency: {
    unidadACambiar:
      "Seleccione la unidad subordinada cuya dependencia jerárquica desea reasignar",
    unidadDestino:
      "Seleccione la nueva unidad superior que pasará a ser la madre jerárquica",
    razon:
      "Justificación formal del cambio de dependencia para fines de auditoría",
  },

  /**
   * Catálogo de Clases / Instancias (SelectAllClases.vue)
   */
  clases: {
    select:
      "Seleccione una instancia del catálogo para clasificar la unidad",
    nombre:
      "Nombre identificador de la clase o instancia estructural (ej: Facultad)",
  },

  /**
   * Catálogo de Niveles Jerárquicos (SelectAllNiveles.vue)
   */
  niveles: {
    select:
      "Seleccione un nivel jerárquico del catálogo institucional",
    nombre:
      "Descripción del nivel jerárquico en la escala orgánica (ej: Nivel 1)",
  },

  /**
   * Catálogo de Tipos de Unidad (SelectAllTipos.vue)
   */
  tipos: {
    select:
      "Seleccione el tipo funcional que caracteriza a la unidad",
    nombre:
      "Descripción del tipo o naturaleza funcional (ej: Sustantiva, Apoyo)",
  },

  /**
   * Catálogo de Relaciones Jerárquicas (SelectAllRelaciones.vue)
   */
  relaciones: {
    select:
      "Seleccione la relación jerárquica aplicable a la unidad",
    nombre:
      "Descripción del vínculo o tipo de relación institucional (ej: Asesoría)",
  },

  /**
   * Catálogo de Cargos (SelectAllCargos.vue)
   */
  cargos: {
    select:
      "Seleccione los cargos institucionales vinculados a la unidad",
    nombre:
      "Nombre del puesto de trabajo o cargo funcional (ej: Director de Carrera)",
    descripcion:
      "Descripción breve de responsabilidades generales asociadas al cargo",
  },

  /**
   * Formulario de autenticación (Login.vue)
   */
  login: {
    email:
      "Ingrese su correo institucional habilitado (ej: usuario@umsa.bo)",
    password:
      "Ingrese su contraseña de acceso al sistema (mínimo 6 caracteres)",
    ci:
      "Número de carnet de identidad registrado por el administrador al crear su cuenta",
    passwordNueva:
      "Defina su contraseña personal de acceso (mínimo 6 caracteres)",
    passwordConfirmacion:
      "Repita la contraseña para confirmar que coincide",
  },

  /**
   * Gestión de usuarios del sistema (Usuarios.vue)
   */
  usuarios: {
    ci:
      "Carnet de identidad del funcionario; lo usará para su primer acceso al sistema",
    nombres:
      "Nombres de pila del funcionario, sin apellidos",
    apellidoPaterno:
      "Apellido paterno del funcionario",
    apellidoMaterno:
      "Apellido materno del funcionario (opcional)",
    email:
      "Correo electrónico institucional que servirá como usuario de acceso",
    passwordEdit:
      "Deje en blanco si desea conservar la contraseña actual del usuario",
    rol:
      "Nivel de privilegios y permisos en el sistema: ADMIN, OPERADOR o USER",
    estado:
      "Estado operativo de la cuenta para habilitar o denegar el acceso",
  },

  /**
   * Notas informativas contextuales para Dashboards
   */
  dashboards: {
    ejecutivo: {
      title: "Guía del Reporte Ejecutivo",
      text: "Visualice el consolidado institucional de unidades y aplique filtros por instancia, nivel, tipo o relación. Puede exportar el reporte a PDF o CSV desde el menú superior.",
    },
    facultativo: {
      title: "Guía del Dashboard Facultativo",
      text: "Seleccione una instancia superior y una unidad madre para explorar su árbol completo de dependencias directas e indirectas, indicadores cuantitativos y exportación.",
    },
  },
};

export default hints;
