import { HttpStatus } from '@nestjs/common';

export const ErrorCodes = {
  CATALOG_REF_NOT_FOUND: 'CATALOG_REF_NOT_FOUND',
  UNIDAD_CODIGO_DUPLICADO: 'UNIDAD_CODIGO_DUPLICADO',
  UNIDAD_PARENT_SELF: 'UNIDAD_PARENT_SELF',
  UNIDAD_PARENT_CYCLE: 'UNIDAD_PARENT_CYCLE',
  FUNCION_YA_PRIMERA: 'FUNCION_YA_PRIMERA',
  FUNCION_YA_ULTIMA: 'FUNCION_YA_ULTIMA',
  DEPENDENCIA_SELF: 'DEPENDENCIA_SELF',
  DEPENDENCIA_DUPLICADA: 'DEPENDENCIA_DUPLICADA',
  CLASE_YA_PRIMERA: 'CLASE_YA_PRIMERA',
  CLASE_YA_ULTIMA: 'CLASE_YA_ULTIMA',
  CARGO_YA_ASIGNADO: 'CARGO_YA_ASIGNADO',
  INVENTARIO_NO_PERTENECE_UNIDAD: 'INVENTARIO_NO_PERTENECE_UNIDAD',
  INVENTARIO_ID_DUPLICADO: 'INVENTARIO_ID_DUPLICADO',
  SIA_SOLO_CARRERA: 'SIA_SOLO_CARRERA',
  SIA_NO_PERTENECE_UNIDAD: 'SIA_NO_PERTENECE_UNIDAD',
  SIA_ID_DUPLICADO: 'SIA_ID_DUPLICADO',
  SIA_FILA_VACIA: 'SIA_FILA_VACIA',
  PLANIFICACION_ESTRATEGICA_INCOMPLETA: 'PLANIFICACION_ESTRATEGICA_INCOMPLETA',
  USUARIO_CI_DUPLICADO: 'USUARIO_CI_DUPLICADO',
  PRIMER_ACCESO_REQUERIDO: 'PRIMER_ACCESO_REQUERIDO',
  PRIMER_ACCESO_INVALIDO: 'PRIMER_ACCESO_INVALIDO',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  REQUEST_ERROR: 'REQUEST_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type ErrorDefinition = {
  code: ErrorCode;
  httpStatus: HttpStatus;
  message: string;
};

export const ERROR_CATALOG: Record<ErrorCode, ErrorDefinition> = {
  CATALOG_REF_NOT_FOUND: {
    code: ErrorCodes.CATALOG_REF_NOT_FOUND,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Referencia de catálogo no encontrada',
  },
  UNIDAD_CODIGO_DUPLICADO: {
    code: ErrorCodes.UNIDAD_CODIGO_DUPLICADO,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Ya existe una unidad con ese código',
  },
  UNIDAD_PARENT_SELF: {
    code: ErrorCodes.UNIDAD_PARENT_SELF,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Una unidad no puede ser padre de sí misma',
  },
  UNIDAD_PARENT_CYCLE: {
    code: ErrorCodes.UNIDAD_PARENT_CYCLE,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La asignación generaría un ciclo en la jerarquía',
  },
  FUNCION_YA_PRIMERA: {
    code: ErrorCodes.FUNCION_YA_PRIMERA,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La función ya está en la primera posición',
  },
  FUNCION_YA_ULTIMA: {
    code: ErrorCodes.FUNCION_YA_ULTIMA,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La función ya está en la última posición',
  },
  DEPENDENCIA_SELF: {
    code: ErrorCodes.DEPENDENCIA_SELF,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'No se puede depender de sí misma',
  },
  DEPENDENCIA_DUPLICADA: {
    code: ErrorCodes.DEPENDENCIA_DUPLICADA,
    httpStatus: HttpStatus.CONFLICT,
    message: 'La dependencia funcional ya existe',
  },
  CLASE_YA_PRIMERA: {
    code: ErrorCodes.CLASE_YA_PRIMERA,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La clase ya está en la primera posición',
  },
  CLASE_YA_ULTIMA: {
    code: ErrorCodes.CLASE_YA_ULTIMA,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La clase ya está en la última posición',
  },
  CARGO_YA_ASIGNADO: {
    code: ErrorCodes.CARGO_YA_ASIGNADO,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Ese cargo ya está asignado en la unidad',
  },
  INVENTARIO_NO_PERTENECE_UNIDAD: {
    code: ErrorCodes.INVENTARIO_NO_PERTENECE_UNIDAD,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'El ítem de inventario no pertenece a la unidad',
  },
  INVENTARIO_ID_DUPLICADO: {
    code: ErrorCodes.INVENTARIO_ID_DUPLICADO,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'El ítem de inventario está repetido en la solicitud',
  },
  SIA_SOLO_CARRERA: {
    code: ErrorCodes.SIA_SOLO_CARRERA,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'El bloque SIA solo aplica a unidades de tipo Carrera',
  },
  SIA_NO_PERTENECE_UNIDAD: {
    code: ErrorCodes.SIA_NO_PERTENECE_UNIDAD,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La fila SIA no pertenece a la unidad',
  },
  SIA_ID_DUPLICADO: {
    code: ErrorCodes.SIA_ID_DUPLICADO,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La fila SIA está repetida en la solicitud',
  },
  SIA_FILA_VACIA: {
    code: ErrorCodes.SIA_FILA_VACIA,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'La fila SIA debe tener al menos un valor',
  },
  PLANIFICACION_ESTRATEGICA_INCOMPLETA: {
    code: ErrorCodes.PLANIFICACION_ESTRATEGICA_INCOMPLETA,
    httpStatus: HttpStatus.BAD_REQUEST,
    message:
      'Si la Planificación Estratégica aplica, el porcentaje y la descripción son obligatorios',
  },
  USUARIO_CI_DUPLICADO: {
    code: ErrorCodes.USUARIO_CI_DUPLICADO,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Ya existe una persona registrada con ese C.I.',
  },
  PRIMER_ACCESO_REQUERIDO: {
    code: ErrorCodes.PRIMER_ACCESO_REQUERIDO,
    httpStatus: HttpStatus.UNAUTHORIZED,
    message:
      'Debe completar el primer acceso con su correo y C.I. para definir su contraseña',
  },
  PRIMER_ACCESO_INVALIDO: {
    code: ErrorCodes.PRIMER_ACCESO_INVALIDO,
    httpStatus: HttpStatus.UNAUTHORIZED,
    message: 'Los datos de primer acceso no son válidos',
  },
  VALIDATION_FAILED: {
    code: ErrorCodes.VALIDATION_FAILED,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Error de validación',
  },
  UNAUTHORIZED: {
    code: ErrorCodes.UNAUTHORIZED,
    httpStatus: HttpStatus.UNAUTHORIZED,
    message: 'No autenticado',
  },
  FORBIDDEN: {
    code: ErrorCodes.FORBIDDEN,
    httpStatus: HttpStatus.FORBIDDEN,
    message: 'Sin permisos para realizar esta acción',
  },
  NOT_FOUND: {
    code: ErrorCodes.NOT_FOUND,
    httpStatus: HttpStatus.NOT_FOUND,
    message: 'Registro no encontrado',
  },
  TOO_MANY_REQUESTS: {
    code: ErrorCodes.TOO_MANY_REQUESTS,
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Demasiadas solicitudes. Intente más tarde',
  },
  INTERNAL_ERROR: {
    code: ErrorCodes.INTERNAL_ERROR,
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Se genero un error en el servidor, contacte con administracion',
  },
  REQUEST_ERROR: {
    code: ErrorCodes.REQUEST_ERROR,
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Error en la solicitud',
  },
};

export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  return ERROR_CATALOG[code];
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ERROR_CATALOG, value)
  );
}
