import {isValidGstRate} from '../constants/gst';

/**
 * Input validation for the product form.
 * Keep all rules here so the New and Edit forms validate identically.
 */
export interface ProductFormValues {
  name: string;
  /** Raw text from the price TextInput. */
  priceText: string;
  /** Selected GST rate (percent). Optional — defaults to 0 for non-GST shops. */
  gstRate?: number;
}

export interface ValidationResult {
  valid: boolean;
  /** Field -> error message. Empty when valid. */
  errors: {name?: string; price?: string; gstRate?: string};
  /** Parsed price, only meaningful when valid. */
  price: number;
}

export function validateProductForm(values: ProductFormValues): ValidationResult {
  const errors: {name?: string; price?: string; gstRate?: string} = {};

  const name = values.name.trim();
  if (name.length === 0) {
    errors.name = 'Name is required';
  }

  const priceText = values.priceText.trim();
  const price = Number(priceText);
  if (priceText.length === 0) {
    errors.price = 'Price is required';
  } else if (!Number.isFinite(price)) {
    errors.price = 'Price must be a number';
  } else if (price < 0) {
    errors.price = 'Price cannot be negative';
  }

  // GST rate, when supplied, must be one of the allowed slabs.
  if (values.gstRate !== undefined && !isValidGstRate(values.gstRate)) {
    errors.gstRate = 'Select a valid GST rate';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    price: Number.isFinite(price) ? price : 0,
  };
}

/**
 * Validation for the shop setup / settings form.
 * Shop name + phone are always required. When GST is enabled, GSTIN and state
 * become required too.
 */
export interface ProfileFormValues {
  shopType: string;
  shopName: string;
  phone: string;
  gstEnabled: boolean;
  gstin: string;
  stateCode: string;
}

export interface ProfileErrors {
  shopType?: string;
  shopName?: string;
  phone?: string;
  gstin?: string;
  state?: string;
}

export function validateProfileForm(values: ProfileFormValues): {
  valid: boolean;
  errors: ProfileErrors;
} {
  const errors: ProfileErrors = {};

  if (!values.shopType) {
    errors.shopType = 'Select a shop type';
  }
  if (values.shopName.trim().length === 0) {
    errors.shopName = 'Shop name is required';
  }
  if (values.phone.trim().length === 0) {
    errors.phone = 'Phone number is required';
  }

  if (values.gstEnabled) {
    const gstin = values.gstin.trim();
    if (gstin.length === 0) {
      errors.gstin = 'GSTIN is required for a GST shop';
    } else if (gstin.length !== 15) {
      errors.gstin = 'GSTIN should be 15 characters';
    }
    if (!values.stateCode) {
      errors.state = 'Select your state';
    }
  }

  return {valid: Object.keys(errors).length === 0, errors};
}
