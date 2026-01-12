import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto) {
        // Check if email exists
        const existingEmail = await this.userRepository.findOne({
            where: { email: registerDto.email },
        });
        if (existingEmail) {
            throw new ConflictException('Email already exists');
        }

        // Check if username exists
        const existingUsername = await this.userRepository.findOne({
            where: { username: registerDto.username },
        });
        if (existingUsername) {
            throw new ConflictException('Username already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        // Create user
        const user = this.userRepository.create({
            email: registerDto.email,
            username: registerDto.username,
            password: hashedPassword,
            balance: 1000, // Starting bonus for testing
        });

        await this.userRepository.save(user);

        // Generate token
        const token = this.generateToken(user);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    async login(loginDto: LoginDto) {
        // Find user by email or username
        const user = await this.userRepository.findOne({
            where: [
                { email: loginDto.emailOrUsername },
                { username: loginDto.emailOrUsername },
            ],
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is disabled');
        }

        // Generate token
        const token = this.generateToken(user);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    async validateUser(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException();
        }

        return user;
    }

    private generateToken(user: User): string {
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username,
        };

        return this.jwtService.sign(payload);
    }

    private sanitizeUser(user: User) {
        const { password, ...sanitized } = user;
        return sanitized;
    }
}
