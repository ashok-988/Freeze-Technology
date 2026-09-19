import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User context not found.');
    }

    // Admin has universal bypass across all roles
    if (user.role === 'Admin' || requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException(
      `Access denied. Requires one of roles: [${requiredRoles.join(', ')}]. Current role: ${user.role || 'None'}`,
    );
  }
}
