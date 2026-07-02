import '@testing-library/jest-dom'

// Base UI's popover positioning (Floating UI) observes element size; jsdom has
// no ResizeObserver, so polyfill a no-op to let popovers mount under test.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
