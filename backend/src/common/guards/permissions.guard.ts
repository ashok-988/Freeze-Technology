import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User session context not found. Please log in.');
    }

    // SUPER_ADMIN and Admin have unrestricted access
    const roleName = user.role?.roleName || user.role || '';
    const roleCode = user.role?.code || '';
    if (
      roleName.toUpperCase() === 'SUPER_ADMIN' ||
      roleName.toUpperCase() === 'ADMIN' ||
      roleCode.toUpperCase() === 'SUPER_ADMIN' ||
      roleCode.toUpperCase() === 'ADMIN'
    ) {
      return true;
    }

    const userPermissions = user.permissions || [];
    // userPermissions may be array of string codes or objects
    const hasPermission = requiredPermissions.every((reqPerm) => {
      return userPermissions.some((userPerm: any) => {
        if (typeof userPerm === 'string') {
          return (
            userPerm === reqPerm.code ||
            (reqPerm.module && reqPerm.action && userPerm === `${reqPerm.module}.${reqPerm.action}`) ||
            (reqPerm.module && userPerm === `${reqPerm.module}.*`) ||
            userPerm === '*'
          );
        }
        if (typeof userPerm === 'object') {
          if (userPerm.code && reqPerm.code && userPerm.code === reqPerm.code) return true;
          if (
            userPerm.moduleName &&
            reqPerm.module &&
            userPerm.moduleName.toLowerCase() === reqPerm.module.toLowerCase() &&
            (userPerm.action === reqPerm.action || userPerm.action === 'all' || userPerm.action === '*')
          ) {
            return true;
          }
        }
        return false;
      });
    });

    if (!hasPermission) {
      const requiredStr = requiredPermissions.map((p) => p.code || `${p.module}.${p.action}`).join(', ');
      throw new ForbiddenException(
        `Access denied. You do not have the required permission: [${requiredStr}]. Please contact your administrator.`,
      );
    }

    return true;
  }
}
