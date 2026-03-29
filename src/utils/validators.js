// src/utils/validators.js

// Validação de Telefone (11 dígitos)
export function validatePhoneNumber(phoneNumber) {
  // Remove todos os caracteres não numéricos
  const cleaned = String(phoneNumber).replace(/\D/g, '');

  // Verifica se tem exatamente 11 dígitos (DDD + 9 + 8 dígitos)
  if (cleaned.length === 11) {
    return true;
  }
  return false;
}

// Validação de CPF
export function validateCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  const cleaned = cpf.replace(/[^\d]+/g, '');

  if (cleaned.length !== 11 || !!cleaned.match(/(\d)\1{10}/)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;

  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;

  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

// Validação de CNPJ
export function validateCNPJ(cnpj) {
  if (typeof cnpj !== 'string') return false;
  const cleaned = cnpj.replace(/[^\d]+/g, '');

  if (cleaned.length !== 14 || !!cleaned.match(/(\d)\1{13}/)) return false;

  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  let digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(i - 1)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(i - 1)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

// Validação de CPF ou CNPJ
export function validateCpfCnpj(doc) {
  const cleaned = String(doc).replace(/[^\d]+/g, '');
  if (cleaned.length === 11) {
    return validateCPF(cleaned);
  } else if (cleaned.length === 14) {
    return validateCNPJ(cleaned);
  }
  return false;
}