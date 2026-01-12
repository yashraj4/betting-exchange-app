import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(3)
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'Username can only contain letters, numbers, underscores, and hyphens',
    })
    username: string;

    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    })
    password: string;
}

export class LoginDto {
    @IsString()
    emailOrUsername: string;

    @IsString()
    password: string;
}
