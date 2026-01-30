---
name: frontend-ui-ux
description: Frontend UI/UX development expert skill
argument-hint: "[component|design-system|accessibility|animation]"
---

# Frontend UI/UX Skill

Expert skill for frontend development and UI/UX design.

## Role

As a designer-developer hybrid:
- Apply visual design principles
- Ensure accessibility (a11y)
- Optimize performance
- Implement responsive design

## Design System

### Typography

```css
/* Type Scale (Major Third - 1.25) */
--text-xs: 0.64rem;    /* 10.24px */
--text-sm: 0.8rem;     /* 12.8px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.25rem;    /* 20px */
--text-xl: 1.563rem;   /* 25px */
--text-2xl: 1.953rem;  /* 31.25px */
--text-3xl: 2.441rem;  /* 39px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Color Palette

```css
/* Primary */
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;

/* Neutral */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-500: #6b7280;
--color-gray-900: #111827;

/* Semantic */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
}
```

### Spacing System

```css
/* 4px Base Grid */
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### Breakpoints

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Large phone */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Laptop */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */
```

## Component Patterns

### Button

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Tailwind implementation
const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};
```

### Input

```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

// State styles
const states = {
  default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
  disabled: 'bg-gray-100 cursor-not-allowed',
};
```

### Card

```tsx
interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const Card = ({ variant = 'elevated', padding = 'md', interactive, children }) => {
  const baseStyles = 'rounded-xl transition-all';
  const variantStyles = {
    elevated: 'bg-white shadow-md',
    outlined: 'bg-white border border-gray-200',
    filled: 'bg-gray-50',
  };
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  const interactiveStyles = interactive ? 'cursor-pointer hover:shadow-lg' : '';

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles}`}>
      {children}
    </div>
  );
};
```

## Accessibility Checklist

### Color Contrast
- [ ] Normal text: 4.5:1 minimum
- [ ] Large text (18px+): 3:1 minimum
- [ ] UI components: 3:1 minimum

### Keyboard Navigation
- [ ] All interactive elements are tabbable
- [ ] Focus indicator is clearly visible
- [ ] Logical tab order

### Screen Reader
- [ ] Images have alt text
- [ ] Forms have associated labels
- [ ] Appropriate ARIA attributes

### Motion
- [ ] Respect `prefers-reduced-motion`
- [ ] Option to disable non-essential animations

## Performance Optimization

### CSS Optimization
- Remove unused styles (PurgeCSS/Tailwind JIT)
- Inline critical CSS
- Watch CSS-in-JS runtime overhead

### Layout Optimization
- Minimize CLS (Cumulative Layout Shift)
- Specify image dimensions
- Optimize font loading (font-display: swap)

### Rendering Optimization
- Prevent unnecessary rerenders
- Virtual scrolling for long lists
- Lazy loading for images and components

## Motion Guide

### Duration
```css
--duration-fast: 150ms;    /* Hover, toggle */
--duration-normal: 200ms;  /* Fade, slide */
--duration-slow: 300ms;    /* Modal, page transitions */
```

### Easing
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Principles
- Use meaningful motion only
- Apply easing to animations over 200ms
- Provide immediate feedback for user actions
