export interface CertidaoValidation {
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  certidao_type: string;
  act_data: string;
  delivery_method: string;
  custom_instructions: string;
}

export interface ConfidenceScore {
  field: string;
  score: number;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExtractedData {
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  certidao_type: string;
  act_date: string;
  act_number: string;
  other_details: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-\(\)]+$/;
const DATE_REGEX = /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/;

export function validateCertidaoData(data: CertidaoValidation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.requester_name || data.requester_name.trim().length < 3) {
    errors.push('Nome do requerente deve ter pelo menos 3 caracteres');
  }

  if (!EMAIL_REGEX.test(data.requester_email)) {
    errors.push('Email inválido');
  }

  if (!PHONE_REGEX.test(data.requester_phone)) {
    errors.push('Telefone deve conter apenas números, espaços, hífens e parênteses');
  }

  if (!data.certidao_type || data.certidao_type.trim().length === 0) {
    errors.push('Tipo de certidão é obrigatório');
  }

  if (!data.act_data || data.act_data.trim().length === 0) {
    errors.push('Dados do ato são obrigatórios');
  }

  if (!data.delivery_method || data.delivery_method.trim().length === 0) {
    errors.push('Forma de entrega é obrigatória');
  }

  if (data.requester_phone.length < 10) {
    warnings.push('Telefone parece incompleto (menos de 10 dígitos)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function calculateFieldConfidence(
  field: string,
  value: string,
  context?: string
): ConfidenceScore {
  let score = 50;
  let reason = 'Valor padrão';

  if (!value || value.trim().length === 0) {
    return {
      field,
      score: 0,
      reason: 'Campo vazio',
    };
  }

  switch (field) {
    case 'requester_name':
      if (value.length >= 10 && value.split(' ').length >= 2) {
        score = 95;
        reason = 'Nome completo identificado';
      } else if (value.length >= 5) {
        score = 70;
        reason = 'Nome parece válido mas pode estar incompleto';
      } else {
        score = 30;
        reason = 'Nome muito curto';
      }
      break;

    case 'requester_email':
      if (EMAIL_REGEX.test(value)) {
        score = 100;
        reason = 'Email válido';
      } else {
        score = 20;
        reason = 'Formato de email inválido';
      }
      break;

    case 'requester_phone':
      const cleanPhone = value.replace(/\D/g, '');
      if (cleanPhone.length === 11) {
        score = 100;
        reason = 'Telefone completo (11 dígitos)';
      } else if (cleanPhone.length === 10) {
        score = 90;
        reason = 'Telefone válido (10 dígitos)';
      } else if (cleanPhone.length >= 8) {
        score = 60;
        reason = 'Telefone incompleto';
      } else {
        score = 20;
        reason = 'Telefone inválido';
      }
      break;

    case 'certidao_type':
      const validTypes = ['nascimento', 'casamento', 'óbito', 'divórcio', 'união estável'];
      const lowerValue = value.toLowerCase();
      if (validTypes.some((t) => lowerValue.includes(t))) {
        score = 100;
        reason = 'Tipo de certidão reconhecido';
      } else if (value.length >= 5) {
        score = 70;
        reason = 'Tipo de certidão presumível';
      } else {
        score = 40;
        reason = 'Tipo de certidão incerto';
      }
      break;

    case 'act_date':
      if (DATE_REGEX.test(value)) {
        const date = parseDate(value);
        if (date && isValidDate(date)) {
          const age = getYearsDifference(date);
          if (age > 0 && age < 200) {
            score = 95;
            reason = `Data válida (${age} anos atrás)`;
          } else if (age >= 200) {
            score = 60;
            reason = 'Data muito antiga, verificar';
          } else {
            score = 30;
            reason = 'Data futura, verificar';
          }
        } else {
          score = 40;
          reason = 'Formato de data reconhecido mas data inválida';
        }
      } else {
        score = 30;
        reason = 'Formato de data não identificado';
      }
      break;

    case 'act_number':
      if (/^\d+$/.test(value) && value.length >= 4) {
        score = 100;
        reason = 'Número de registro válido';
      } else if (value.length >= 3) {
        score = 70;
        reason = 'Possível número de registro';
      } else {
        score = 40;
        reason = 'Número de registro incompleto';
      }
      break;

    case 'delivery_method':
      const validMethods = ['presencial', 'correio', 'email', 'digital', 'download'];
      if (validMethods.some((m) => value.toLowerCase().includes(m))) {
        score = 100;
        reason = 'Forma de entrega válida';
      } else if (value.length >= 5) {
        score = 70;
        reason = 'Forma de entrega presumível';
      } else {
        score = 50;
        reason = 'Forma de entrega incerta';
      }
      break;

    default:
      score = value.length > 10 ? 80 : 50;
      reason = 'Campo genérico';
  }

  return { field, score, reason };
}

function parseDate(dateStr: string): Date | null {
  const parts = dateStr.split(/[\/-]/);
  if (parts.length !== 3) return null;

  let day = parseInt(parts[0]);
  let month = parseInt(parts[1]);
  let year = parseInt(parts[2]);

  // Handle 2-digit years
  if (year < 100) {
    year = year < 30 ? 2000 + year : 1900 + year;
  }

  return new Date(year, month - 1, day);
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

function getYearsDifference(date: Date): number {
  const today = new Date();
  return today.getFullYear() - date.getFullYear();
}

export function getConfidenceColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  if (score >= 30) return 'text-orange-600';
  return 'text-red-600';
}

export function getConfidenceBgColor(score: number): string {
  if (score >= 90) return 'bg-green-50';
  if (score >= 70) return 'bg-emerald-50';
  if (score >= 50) return 'bg-amber-50';
  if (score >= 30) return 'bg-orange-50';
  return 'bg-red-50';
}

export function getConfidenceBorderColor(score: number): string {
  if (score >= 90) return 'border-green-200';
  if (score >= 70) return 'border-emerald-200';
  if (score >= 50) return 'border-amber-200';
  if (score >= 30) return 'border-orange-200';
  return 'border-red-200';
}
