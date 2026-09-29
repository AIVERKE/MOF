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
  }
};
