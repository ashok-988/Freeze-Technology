import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  module?: string;
  action?: string;
  code?: string;
}

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermission = (...permissions: (string | RequiredPermission)[]) => {
  const normalized: RequiredPermission[] = permissions.map((p) => {
    if (typeof p === 'string') {
      const parts = p.split('.');
      if (parts.length === 2) {
        return { module: parts[0], action: parts[1], code: p };
      }
      return { code: p };
    }
    return {
      ...p,
      code: p.code || (p.module && p.action ? `${p.module}.${p.action}` : undefined),
    };
  });
  return SetMetadata(PERMISSIONS_KEY, normalized);
};

export const Permissions = RequirePermission;
