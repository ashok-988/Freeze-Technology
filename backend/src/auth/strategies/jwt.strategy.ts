import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'freeze_tech_secret_key_jwt_2026',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or not found.');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role?.roleName || 'Technician',
      roleId: user.roleId,
      permissions: user.role?.rolePermissions?.map((rp: any) => ({
        module: rp.permission.moduleName,
        action: rp.permission.action,
      })) || [],
    };
  }
}
