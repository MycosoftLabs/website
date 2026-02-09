/**
 * JSON Render Component Registry
 * Maps JSON specifications to approved React components for AI-generated dashboards
 * Created: February 9, 2026
 * 
 * SECURITY: Only components registered here can be rendered from JSON specs.
 * This prevents arbitrary component injection from AI-generated content.
 */

import { ComponentType, lazy } from 'react';

interface ComponentSpec {
  type: string;
  props: Record<string, unknown>;
  children?: ComponentSpec[];
}

interface RegisteredComponent {
  component: ComponentType<any>;
  allowedProps: string[];
  description: string;
}

const registry = new Map<string, RegisteredComponent>();

export function registerComponent(
  type: string,
  component: ComponentType<any>,
  allowedProps: string[],
  description: string
): void {
  registry.set(type, { component, allowedProps, description });
}

export function getComponent(type: string): RegisteredComponent | undefined {
  return registry.get(type);
}

export function isRegistered(type: string): boolean {
  return registry.has(type);
}

export function listComponents(): Array<{ type: string; description: string; allowedProps: string[] }> {
  return Array.from(registry.entries()).map(([type, reg]) => ({
    type,
    description: reg.description,
    allowedProps: reg.allowedProps,
  }));
}

export function validateSpec(spec: ComponentSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!spec.type) {
    errors.push('Missing component type');
    return { valid: false, errors };
  }
  
  if (!isRegistered(spec.type)) {
    errors.push(`Unknown component type: ${spec.type}. Allowed: ${Array.from(registry.keys()).join(', ')}`);
    return { valid: false, errors };
  }
  
  const registered = registry.get(spec.type)!;
  const propKeys = Object.keys(spec.props || {});
  const invalidProps = propKeys.filter(k => !registered.allowedProps.includes(k));
  if (invalidProps.length > 0) {
    errors.push(`Invalid props for ${spec.type}: ${invalidProps.join(', ')}. Allowed: ${registered.allowedProps.join(', ')}`);
  }
  
  if (spec.children) {
    for (const child of spec.children) {
      const childResult = validateSpec(child);
      errors.push(...childResult.errors);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export type { ComponentSpec, RegisteredComponent };
