export const rules = {
  required: value => !!value || 'Este campo es requerido',
  
  minLength: min => value => 
    (value && value.length >= min) || `Mínimo ${min} caracteres`,
  
  codigo: value => {
    if (!value) return 'El código es requerido';
    if (!/^[A-Z0-9.-]+$/i.test(value)) return 'Solo letras, números, puntos y guiones';
    return true;
  }
};