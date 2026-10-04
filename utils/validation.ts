/**
 * Validation utilities for Frontend Auth and Forms
 */

// Email regex matching standard format: name@domain.tld
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone regex: Sri Lankan mobile/landline numbers (07XXXXXXXX, +947XXXXXXXX, etc.) or general 9-15 digit numbers
export const PHONE_REGEX = /^(?:\+94|0)?[0-9]{9,10}$/;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an email address (e.g. Gmail, Yahoo, etc.)
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'ඊමේල් ලිපිනයක් ඇතුළත් කරන්න (Email is required)',
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'වලංගු ඊමේල් ආකෘතියක් ඇතුළත් කරන්න (උදා: name@gmail.com)',
    };
  }

  return { isValid: true };
};

/**
 * Validates a password
 * Note: Backend IAM schema strictly requires at least 10 characters.
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return {
      isValid: false,
      error: 'මුරපදයක් ඇතුළත් කරන්න (Password is required)',
    };
  }

  if (password.length < 10) {
    return {
      isValid: false,
      error: `මුරපදය අවම වශයෙන් අක්ෂර 10ක් විය යුතුය (${password.length}/10)`,
    };
  }

  return { isValid: true };
};

/**
 * Validates full name
 */
export const validateFullName = (name: string): ValidationResult => {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'කරුණාකර සම්පූර්ණ නම ඇතුළත් කරන්න',
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'නම අවම වශයෙන් අක්ෂර 2කින් සමන්විත විය යුතුය',
    };
  }

  return { isValid: true };
};

/**
 * Validates phone number (optional, but if provided must be valid)
 */
export const validatePhone = (phone: string, required: boolean = false): ValidationResult => {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (!cleaned) {
    if (required) {
      return {
        isValid: false,
        error: 'දුරකථන අංකය ඇතුළත් කරන්න',
      };
    }
    return { isValid: true };
  }

  if (!PHONE_REGEX.test(cleaned)) {
    return {
      isValid: false,
      error: 'වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 07XXXXXXXX)',
    };
  }

  return { isValid: true };
};

/**
 * Formats API errors into user-friendly messages
 */
export const formatAuthError = (error: any, defaultMsg: string = 'ලියාපදිංචි වීම අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.'): string => {
  if (!error.response) {
    const isNetworkErr = error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network');
    if (isNetworkErr) {
      return 'සර්වර් එක සම්බන්ධ කරගත නොහැක (Network Error). ඔබගේ අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.';
    }
    return error.message || defaultMsg;
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') {
    const lower = detail.toLowerCase();
    if (lower.includes('already exists') || lower.includes('duplicate') || lower.includes('already registered')) {
      return 'මෙම ඊමේල් ලිපිනය දැනටමත් ලියාපදිංචි කර ඇත (Email already registered). කරුණාකර වෙනත් ඊමේල් ලිපිනයක් භාවිතා කරන්න හෝ Login වන්න.';
    }
    if (lower.includes('invalid credentials') || lower.includes('incorrect') || lower.includes('not found')) {
      return 'ඊමේල් ලිපිනය හෝ මුරපදය වැරදියි (Invalid email or password).';
    }
    return detail;
  }

  if (Array.isArray(detail)) {
    // Pydantic validation errors list
    const messages = detail.map((err: any) => {
      const field = err.loc ? err.loc[err.loc.length - 1] : '';
      if (field === 'email') return 'වලංගු ඊමේල් ලිපිනයක් ලබා දෙන්න (Invalid email address).';
      if (field === 'password') return 'මුරපදය අවම වශයෙන් අක්ෂර 10කින් සමන්විත විය යුතුය (Password min 10 characters).';
      return `${field ? `[${field}]: ` : ''}${err.msg}`;
    });
    return messages.join('\n');
  }

  return defaultMsg;
};
