import { formatDateToString } from './mofHelpers';

/** Alineado con backend/src/common/validators/fec-creacion-range.validator.ts */
export const FEC_CREACION_MIN = '1825-01-01';
export const fecCreacionMax = (today = new Date()) => `${today.getFullYear()}-12-31`;

export const rules = {
  required: value => !!value || 'Este campo es requerido',

  minLength: min => value =>
    (value && value.length >= min) || `Mínimo ${min} caracteres`,

  email: value => {
    if (!value) return 'Este campo es requerido';
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value) || 'Ingrese un email válido';
  },

  codigo: value => {
    if (!value || (typeof value === 'string' && !value.trim())) return 'El código es requerido';
    return true;
  },

  siglaNotCodigo: (codigo) => (value) => {
    if (!value || !codigo) return true;
    if (String(value).trim().toLowerCase() === String(codigo).trim().toLowerCase()) {
      return 'La sigla no puede ser igual al código orgánico';
    }
    return true;
  },

  siglaValida: (value) => {
    if (!value) return true;
    if (/^[0-9]+(\.[0-9]+)*\.?$/.test(String(value).trim())) {
      return 'La sigla debe ser un acrónimo (ej: FCPN), no un código numérico';
    }
    return true;
  },

  fechaCreacionRango: (value) => {
    if (!value) return true;
    const today = new Date();
    const mensaje = `La fecha de creación debe estar entre 01/01/1825 y 31/12/${today.getFullYear()}`;
    const day = formatDateToString(value);
    if (!day) return mensaje;
    return (day >= FEC_CREACION_MIN && day <= fecCreacionMax(today)) || mensaje;
  },

  soloNumeros: (value) => {
    if (!value || !String(value).trim()) return true;
    return /^\d+$/.test(String(value).trim()) || 'Solo se permiten números';
  },

  ci: (value) => {
    if (!value || !String(value).trim()) return true;
    const val = String(value).trim();
    return (
      /^\d{4,10}(?:-[a-zA-Z0-9]{1,3})?$/.test(val) ||
      'El C.I. debe tener entre 4 y 10 dígitos, con complemento opcional (ej. 8123456 o 8123456-1A)'
    );
  },

  soloNombre: (value) => {
    if (!value || !String(value).trim()) return true;
    return (
      /^[\p{L}\s]+$/u.test(String(value).trim()) ||
      'Solo se permiten letras, acentos, diéresis y espacios'
    );
  },

  porcentajePlanificacion: (value) => {
    if (value == null || value === "") return true;
    const num = Number(value);
    if (isNaN(num)) return "Debe ser un número válido";
    if (num < 0 || num > 100) return "El valor debe estar entre 0 y 100";
    if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) return "Máximo 2 decimales";
    return true;
  }
};
