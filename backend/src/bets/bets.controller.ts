import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BetsService } from './bets.service';
import { AcceptBetDto, CreateBetDto } from './dto/bet.dto';

@Controller('bets')
export class BetsController {
    constructor(private betsService: BetsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createBet(@Request() req, @Body() createBetDto: CreateBetDto) {
        return this.betsService.createBet(req.user.id, createBetDto);
    }

    @Post('accept')
    @UseGuards(JwtAuthGuard)
    async acceptBet(@Request() req, @Body() acceptBetDto: AcceptBetDto) {
        return this.betsService.acceptBet(req.user.id, acceptBetDto.betId);
    }

    @Get('available')
    async getAvailableBets() {
        return this.betsService.getAvailableBets();
    }

    @Get('my-bets')
    @UseGuards(JwtAuthGuard)
    async getUserBets(@Request() req) {
        return this.betsService.getUserBets(req.user.id);
    }

    @Get(':id')
    async getBetById(@Param('id') id: string) {
        return this.betsService.getBetById(id);
    }

    @Get('challenge/:link')
    async getBetByChallenge(@Param('link') link: string) {
        return this.betsService.getBetByChallenge(link);
    }
}
