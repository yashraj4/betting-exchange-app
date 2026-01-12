import {
    Body,
    Controller,
    Get,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
    constructor(private walletService: WalletService) { }

    @Get('balance')
    async getBalance(@Request() req) {
        return this.walletService.getBalance(req.user.id);
    }

    @Post('deposit')
    async deposit(@Request() req, @Body('amount') amount: number) {
        return this.walletService.deposit(req.user.id, amount);
    }

    @Post('withdraw')
    async withdraw(@Request() req, @Body('amount') amount: number) {
        return this.walletService.withdraw(req.user.id, amount);
    }

    @Get('transactions')
    async getTransactions(@Request() req) {
        return this.walletService.getTransactions(req.user.id);
    }
}
