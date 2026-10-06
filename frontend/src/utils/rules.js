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
    if (!value) return 'El código es requerido';
    if (!/^[A-Z0-9.-]+$/i.test(value)) return 'Solo letras, números, puntos y guiones';
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
  }
};
