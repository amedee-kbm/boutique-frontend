// Common fashion variant types for the Zita catalogue (adult women's fashion,
// largely China-sourced). The admin picks from these presets and ticks the
// values that apply rather than typing each one. Group names here are the
// customer-facing labels shown on the storefront, so a product carries at most
// one group per name.

export interface VariantPresetSection {
  // Optional sub-heading, used when one type spans two sizing systems.
  label?: string
  options: string[]
}

export interface VariantPresetType {
  name: string
  helper?: string
  // Selecting any option here can attach a product image (colour swatches).
  supportsImages?: boolean
  sections: VariantPresetSection[]
}

// Letter sizing (tops, dresses, outerwear) and the waist-number run used for
// jeans/trousers live under one "Size" type — a product uses one system, and
// the admin simply ticks the relevant row.
const SIZE: VariantPresetType = {
  name: 'Size',
  sections: [
    { label: 'Standard', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'] },
    {
      label: 'Waist (jeans / trousers)',
      options: ['26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38'],
    },
  ],
}

// Chinese women's fashion is very often sized by recommended body weight. These
// kg bands mirror the typical S–XXL fit chart (≈ 80–160 斤).
const WEIGHT: VariantPresetType = {
  name: 'Weight',
  helper: 'Recommended body weight for the best fit',
  sections: [
    {
      options: ['40–50 kg', '50–55 kg', '55–60 kg', '60–65 kg', '65–70 kg', '70–80 kg'],
    },
  ],
}

const COLOUR: VariantPresetType = {
  name: 'Colour',
  supportsImages: true,
  sections: [
    {
      options: [
        'Black',
        'White',
        'Grey',
        'Beige',
        'Khaki',
        'Brown',
        'Apricot',
        'Pink',
        'Red',
        'Yellow',
        'Green',
        'Blue',
        'Navy',
        'Purple',
      ],
    },
  ],
}

export const VARIANT_PRESET_TYPES: VariantPresetType[] = [SIZE, WEIGHT, COLOUR]

export const PRESET_GROUP_NAMES = VARIANT_PRESET_TYPES.map((type) => type.name)

export function presetByName(name: string): VariantPresetType | undefined {
  return VARIANT_PRESET_TYPES.find((type) => type.name === name)
}

export function isPresetGroup(name: string): boolean {
  return PRESET_GROUP_NAMES.includes(name)
}

// Starting suggestions for the colour-swatch picker. The seller can adjust each
// before saving — the storefront only ever shows the saved hex, never a guess.
const NAMED_COLOR_HEX: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  grey: '#9ca3af',
  beige: '#e3d9c6',
  khaki: '#94804f',
  brown: '#7c4a2d',
  apricot: '#f4b183',
  pink: '#f7a8c4',
  red: '#d92d20',
  yellow: '#f5c518',
  green: '#3f9142',
  blue: '#2563eb',
  navy: '#1e2a55',
  purple: '#7c3aed',
}

export function defaultHexForName(value: string): string {
  return NAMED_COLOR_HEX[value.trim().toLowerCase()] ?? '#cccccc'
}
