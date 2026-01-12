import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { BetOutcome, BetType } from '../../entities/bet.entity';

export class CreateBetDto {
    @IsString()
    matchId: string;

    @IsString()
    matchTitle: string;

    @IsString()
    matchStartTime: string; // ISO format

    @IsEnum(BetType)
    betType: BetType;

    @IsEnum(BetOutcome)
    outcome: BetOutcome;

    @IsNumber()
    @Min(1.01)
    @Max(1000)
    odds: number;

    @IsNumber()
    @Min(10)
    stake: number;

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}

export class AcceptBetDto {
    @IsString()
    betId: string;
}
