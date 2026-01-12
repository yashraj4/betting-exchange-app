import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface JwtPayload {
    sub: string;
    email: string;
    username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException();
        }

        return user;
    }
}
