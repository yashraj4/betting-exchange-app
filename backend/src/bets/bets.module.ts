import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bet } from '../entities/bet.entity';
import { Escrow } from '../entities/escrow.entity';
import { User } from '../entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { BetsController } from './bets.controller';
import { BetsService } from './bets.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Bet, Escrow, User]),
        WalletModule,
    ],
    controllers: [BetsController],
    providers: [BetsService],
    exports: [BetsService],
})
export class BetsModule { }
