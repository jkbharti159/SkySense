/**
 * Universal Postal Code Location Resolution System - Helper Utilities
 */

export interface PostalFormatDetails {
  isValid: boolean;
  formatType: 'india_pin' | 'us_zip' | 'uk_postcode' | 'canada_postal' | 'australia_postcode' | 'generic_numeric' | 'generic_alphanumeric' | 'invalid';
  label: string;
  example: string;
  likelyCountry: string | null;
  hasAmbiguity: boolean;
  error?: string;
}

// Check for invalid characters (only allows alphanumeric, spaces, and hyphens)
export function hasInvalidCharacters(query: string): boolean {
  return !/^[a-zA-Z0-9\s-]*$/.test(query);
}

// Identify and validate postal code patterns
export function detectPostalFormat(query: string): PostalFormatDetails {
  const trimmed = query.trim().toUpperCase();

  if (!trimmed) {
    return {
      isValid: false,
      formatType: 'invalid',
      label: 'Empty Code',
      example: '',
      likelyCountry: null,
      hasAmbiguity: false,
      error: 'Please enter a valid postal code.'
    };
  }

  if (hasInvalidCharacters(trimmed)) {
    return {
      isValid: false,
      formatType: 'invalid',
      label: 'Invalid Characters',
      example: '',
      likelyCountry: null,
      hasAmbiguity: false,
      error: 'Postal code format not recognized. Only letters, digits, spaces, and hyphens are supported.'
    };
  }

  // 1. Indian PIN Code: 6 digits (optionally space-separated in the middle)
  if (/^\d{6}$/.test(trimmed) || /^\d{3}\s\d{3}$/.test(trimmed)) {
    return {
      isValid: true,
      formatType: 'india_pin',
      label: 'Indian PIN Code',
      example: '700001',
      likelyCountry: 'India',
      hasAmbiguity: true // Could technically be China, Romania, etc. but India is default. Let's offer choice.
    };
  }

  // 2. US ZIP Code: 5 digits, or ZIP+4 (5 digits, hyphen, 4 digits)
  if (/^\d{5}$/.test(trimmed) || /^\d{5}-\d{4}$/.test(trimmed)) {
    return {
      isValid: true,
      formatType: 'us_zip',
      label: '5-Digit ZIP / Postal Code',
      example: '90210',
      likelyCountry: 'United States',
      hasAmbiguity: true // Extremely common format (US, Germany, France, Italy, Spain, etc.)
    };
  }

  // 3. UK Postcode: alphanumeric standard
  // e.g., SW1A 1AA, EC1A 1BB, W1A 0AX, M1 1AE
  const ukRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;
  if (ukRegex.test(trimmed)) {
    return {
      isValid: true,
      formatType: 'uk_postcode',
      label: 'UK Postcode',
      example: 'SW1A 1AA',
      likelyCountry: 'United Kingdom',
      hasAmbiguity: false
    };
  }

  // 4. Canadian Postal Code: A1A 1A1 (letter-digit-letter space/no-space digit-letter-digit)
  const canadaRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/;
  if (canadaRegex.test(trimmed)) {
    return {
      isValid: true,
      formatType: 'canada_postal',
      label: 'Canadian Postal Code',
      example: 'M5V 2T6',
      likelyCountry: 'Canada',
      hasAmbiguity: false
    };
  }

  // 5. Australian Postcode / 4-Digit code: 4 digits
  if (/^\d{4}$/.test(trimmed)) {
    return {
      isValid: true,
      formatType: 'australia_postcode',
      label: '4-Digit Postal Code',
      example: '2000',
      likelyCountry: 'Australia',
      hasAmbiguity: true // Australia, Switzerland, Belgium, South Africa, Austria, Denmark, Norway
    };
  }

  // 6. Generic Numeric Postal code (3 to 10 digits)
  if (/^\d{3,10}$/.test(trimmed)) {
    return {
      isValid: true,
      formatType: 'generic_numeric',
      label: 'Numeric Postal Code',
      example: '10000',
      likelyCountry: null,
      hasAmbiguity: true
    };
  }

  // 7. Generic Alphanumeric Postal code (3 to 10 chars, contains both letter and number)
  if (/^[A-Z0-9\s-]{3,10}$/.test(trimmed) && /[A-Z]/i.test(trimmed) && /\d/.test(trimmed)) {
    return {
      isValid: true,
      formatType: 'generic_alphanumeric',
      label: 'Alphanumeric Postal Code',
      example: 'AM55-12',
      likelyCountry: null,
      hasAmbiguity: true
    };
  }

  // Otherwise, if it has too few characters or wrong format
  return {
    isValid: false,
    formatType: 'invalid',
    label: 'Unsupported Format',
    example: '',
    likelyCountry: null,
    hasAmbiguity: false,
    error: 'Postal code format not recognized. Please verify the code and try again.'
  };
}

// Get candidate countries to resolve format ambiguity
export function getCandidateCountries(formatType: string): string[] {
  switch (formatType) {
    case 'us_zip':
      return ['United States', 'Germany', 'France', 'Spain', 'Italy', 'Other'];
    case 'australia_postcode':
      return ['Australia', 'Switzerland', 'Belgium', 'Austria', 'South Africa', 'Other'];
    case 'india_pin':
      return ['India', 'China', 'Romania', 'Singapore', 'Other'];
    case 'generic_numeric':
      return ['United States', 'India', 'Australia', 'Japan', 'Brazil', 'Other'];
    case 'generic_alphanumeric':
      return ['United Kingdom', 'Canada', 'Netherlands', 'Sweden', 'Other'];
    default:
      return ['Other'];
  }
}
