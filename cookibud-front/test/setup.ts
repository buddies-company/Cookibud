// Vitest setup file: provide globals, DOM matchers, and common mocks
import { vi } from 'vitest'
import React, { Attributes } from 'react'
import '@testing-library/jest-dom'

interface MockProps {
  children?: React.ReactNode;
}
interface MockPropsHeading {
  title?: string;
  children?: React.ReactNode;
}
interface MockPropsInput {
  label?: string;
  [key: string]: unknown;
}
interface MockPropsModal {
  open?: boolean;
  children?: React.ReactNode;
}
// Mock UI library components used by the app so tests run in jsdom
vi.mock('@soilhat/react-components', () => ({
  Container: (props: MockProps) => React.createElement('div', {}, props.children),
  Heading: (props: MockPropsHeading) => React.createElement('h1', {}, props.title ?? props.children),
  Card: (props: MockProps) => React.createElement('div', {}, props.children),
  Form: (props: MockProps) => React.createElement('form', { ...props }, props.children),
  Input: (props: MockPropsInput) => {
    const { label, ...rest } = props || {};
    return React.createElement('input', { 'aria-label': label, ...rest });
  },
  Button: (props: MockProps) => React.createElement('button', props, props.children),
  Textarea: (props: Attributes) => React.createElement('textarea', props),
  StackedList: (props: MockProps) => React.createElement('div', {}, props.children),
  Modal: (props: MockPropsModal) => (props.open ? React.createElement('div', {}, props.children) : null),
}))

// Default i18n mock used across tests
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

// Mock the API helper used by the UI tests. Individual tests can override this mock's implementation.
// By default return a resolved value so callers using `.then` or `await` get a Promise.
vi.mock('../src/services/api', () => ({
  callApi: vi.fn().mockResolvedValue({ data: null, offline: false }),
}))
