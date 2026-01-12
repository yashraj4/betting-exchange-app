import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
    imports: [TypeOrmModule.forFeature([User, Transaction])],
    controllers: [WalletController],
    providers: [WalletService],
    exports: [WalletService],
})
export class WalletModule { }
