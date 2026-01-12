import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BetsModule } from './bets/bets.module';
import { Bet } from './entities/bet.entity';
import { Escrow } from './entities/escrow.entity';
import { Follow } from './entities/follow.entity';
import { Transaction } from './entities/transaction.entity';
import { User } from './entities/user.entity';
import { RedisModule } from './redis/redis.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [User, Bet, Escrow, Transaction, Follow],
        synchronize: process.env.NODE_ENV === 'development', // Auto-sync in dev
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),

    // Redis/Bull for queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests
      },
    ]),

    // Feature Modules
    RedisModule,
    AuthModule,
    WalletModule,
    BetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

