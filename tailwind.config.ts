import type { Config } from 'tailwindcss';

// Colours, radii and shadows come from the Lucent tokens (app/styles/lucent-tokens.css),
// the design system Electron Fiddle uses. Light and dark follow the OS through the tokens,
// so components don't need `dark:` variants.
const lu = (name: string) => `var(--lu-${name})`;

export default {
  content: ['./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Commit Mono', 'ui-monospace', 'SF Mono', 'Cascadia Mono', 'Menlo', 'monospace'],
      },
      colors: {
        window: lu('window'),
        surface: {
          DEFAULT: lu('surface'),
          raised: lu('surface-raised'),
          sunken: lu('surface-sunken'),
        },
        hover: lu('hover'),
        fill: { DEFAULT: lu('fill'), strong: lu('fill-strong') },
        line: { DEFAULT: lu('line'), strong: lu('line-strong') },
        chrome: lu('material-chrome'),
        capsule: { DEFAULT: lu('capsule'), hover: lu('capsule-hover') },
        chip: lu('chip'),
        ink: { DEFAULT: lu('ink'), muted: lu('ink-muted'), faint: lu('ink-faint') },
        accent: { DEFAULT: lu('accent'), soft: lu('accent-soft') },
        action: { DEFAULT: lu('action'), on: lu('on-action') },
        spark: { DEFAULT: lu('spark'), soft: lu('spark-soft') },
        success: lu('success'),
        warning: lu('warning'),
        field: lu('field'),
        button: { DEFAULT: lu('button'), hover: lu('button-hover'), edge: lu('button-edge') },
        thumb: lu('thumb'),
        kbd: lu('kbd'),
      },
      borderRadius: {
        code: lu('radius-code'),
        sm: lu('radius-sm'),
        item: lu('radius-item'),
        control: lu('radius-control'),
        menu: lu('radius-menu'),
        panel: lu('radius-panel'),
        dialog: lu('radius-dialog'),
        sheet: lu('radius-sheet'),
        capsule: lu('radius-capsule'),
      },
      boxShadow: {
        island: lu('shadow-island'),
        lift: lu('shadow-lift'),
        button: lu('shadow-button'),
        primary: lu('shadow-primary'),
        capsule: lu('shadow-capsule'),
        popover: lu('shadow-popover'),
        float: lu('shadow-float'),
        edge: 'inset 0 0 0 0.5px var(--lu-button-edge)',
      },
      transitionTimingFunction: { lu: 'cubic-bezier(0.32, 0.72, 0, 1)' },
    },
  },
  plugins: [],
} satisfies Config;
