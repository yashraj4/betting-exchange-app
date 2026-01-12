import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Bet, BetOutcome, BetStatus, BetType } from '../entities/bet.entity';
import { Escrow, EscrowStatus } from '../entities/escrow.entity';
import { User } from '../entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateBetDto } from './dto/bet.dto';

@Injectable()
export class BetsService {
    private readonly platformFeePercentage: number;

    constructor(
        @InjectRepository(Bet)
        private betRepository: Repository<Bet>,
        @InjectRepository(Escrow)
        private escrowRepository: Repository<Escrow>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private walletService: WalletService,
        private redisService: RedisService,
        private dataSource: DataSource,
        private configService: ConfigService,
    ) {
        this.platformFeePercentage =
            this.configService.get<number>('PLATFORM_FEE_PERCENTAGE') || 5;
    }

    /**
     * Create a new bet offer
     */
    async createBet(userId: string, createBetDto: CreateBetDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Calculate liability based on bet type
        let liability: number;

        if (createBetDto.betType === BetType.BACK) {
            // For BACK bets, user risks their stake
            liability = createBetDto.stake;
        } else {
            // For LAY bets, user risks (stake * (odds - 1))
            liability = createBetDto.stake * (createBetDto.odds - 1);
        }

        // Check if user has sufficient balance
        const availableBalance =
            Number(user.balance) - Number(user.escrowBalance);

        if (availableBalance < liability) {
            throw new BadRequestException('Insufficient balance');
        }

        // Generate challenge link if needed
        const challengeLink = createBetDto.isPublic
            ? null
            : `bet-${uuidv4().split('-')[0]}`;

        // Create bet
        const bet = this.betRepository.create({
            userId,
            matchStartTime: new Date(createBetDto.matchStartTime),
            liability,
            challengeLink,
            ...createBetDto,
        });

        await this.betRepository.save(bet);

        return {
            bet,
            challengeLink: challengeLink
                ? `${this.configService.get('FRONTEND_URL')}/challenge/${challengeLink}`
                : null,
        };
    }

    /**
     * Accept a bet (THE CRITICAL MATCHING OPERATION)
     * This is where we prevent race conditions using Redis locks
     */
    async acceptBet(userId: string, betId: string) {
        // Step 1: Acquire distributed lock
        const lockKey = `bet:${betId}`;
        const lockToken = await this.redisService.acquireLock(lockKey, 5000);

        if (!lockToken) {
            throw new ConflictException(
                'This bet is currently being processed by another user. Please try again.',
            );
        }

        try {
            // Step 2: Execute matching inside a database transaction
            return await this.dataSource.transaction(async (manager) => {
                // Lock both the bet and the user for update
                const bet = await manager.findOne(Bet, {
                    where: { id: betId },
                    lock: { mode: 'pessimistic_write' },
                });

                if (!bet) {
                    throw new NotFoundException('Bet not found');
                }

                if (bet.userId === userId) {
                    throw new BadRequestException('You cannot accept your own bet');
                }

                if (bet.status !== BetStatus.PENDING) {
                    throw new ConflictException('This bet is no longer available');
                }

                // Check if match has already started
                if (new Date(bet.matchStartTime) < new Date()) {
                    throw new BadRequestException('Match has already started');
                }

                const acceptingUser = await manager.findOne(User, {
                    where: { id: userId },
                    lock: { mode: 'pessimistic_write' },
                });

                // Calculate required liability for accepting user
                let requiredLiability: number;

                if (bet.betType === BetType.BACK) {
                    // If original bet was BACK, acceptor is LAYing
                    requiredLiability = bet.stake * (bet.odds - 1);
                } else {
                    // If original bet was LAY, acceptor is BACKing
                    requiredLiability = bet.stake;
                }

                // Check accepting user's balance
                const availableBalance =
                    Number(acceptingUser.balance) - Number(acceptingUser.escrowBalance);

                if (availableBalance < requiredLiability) {
                    throw new BadRequestException('Insufficient balance');
                }

                // Create matched bet for accepting user
                const matchedBet = manager.create(Bet, {
                    userId: acceptingUser.id,
                    matchId: bet.matchId,
                    matchTitle: bet.matchTitle,
                    matchStartTime: bet.matchStartTime,
                    betType: bet.betType === BetType.BACK ? BetType.LAY : BetType.BACK,
                    outcome: bet.outcome,
                    odds: bet.odds,
                    stake: bet.stake,
                    liability: requiredLiability,
                    status: BetStatus.MATCHED,
                    matchedBetId: bet.id,
                    isPublic: false,
                });

                await manager.save(matchedBet);

                // Update original bet
                bet.status = BetStatus.MATCHED;
                bet.matchedBetId = matchedBet.id;
                await manager.save(bet);

                // Create escrow record
                const escrow = manager.create(Escrow, {
                    betId: bet.id,
                    matchedBetId: matchedBet.id,
                    backerUserId:
                        bet.betType === BetType.BACK ? bet.userId : matchedBet.userId,
                    layerUserId:
                        bet.betType === BetType.LAY ? bet.userId : matchedBet.userId,
                    backerStake: bet.betType === BetType.BACK ? bet.stake : matchedBet.stake,
                    layerLiability:
                        bet.betType === BetType.LAY ? bet.liability : matchedBet.liability,
                    totalHeld:
                        (bet.betType === BetType.BACK ? bet.stake : matchedBet.stake) +
                        (bet.betType === BetType.LAY ? bet.liability : matchedBet.liability),
                    status: EscrowStatus.HOLDING,
                });

                await manager.save(escrow);

                // Update both bets with escrow ID
                bet.escrowId = escrow.id;
                matchedBet.escrowId = escrow.id;
                await manager.save([bet, matchedBet]);

                // Move funds to escrow for both users
                await this.walletService.moveToEscrow(bet.userId, bet.liability, bet.id);
                await this.walletService.moveToEscrow(
                    matchedBet.userId,
                    matchedBet.liability,
                    matchedBet.id,
                );

                return {
                    originalBet: bet,
                    matchedBet,
                    escrow,
                };
            });
        } finally {
            // Step 3: Always release the lock
            await this.redisService.releaseLock(lockKey, lockToken);
        }
    }

    /**
     * Get available bets in the public feed
     */
    async getAvailableBets(limit = 50) {
        return this.betRepository.find({
            where: {
                status: BetStatus.PENDING,
                isPublic: true,
                matchStartTime: MoreThan(new Date()),
            },
            order: {
                createdAt: 'DESC',
            },
            take: limit,
        });
    }

    /**
     * Get user's bets
     */
    async getUserBets(userId: string) {
        return this.betRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get single bet by ID
     */
    async getBetById(betId: string) {
        const bet = await this.betRepository.findOne({
            where: { id: betId },
        });

        if (!bet) {
            throw new NotFoundException('Bet not found');
        }

        return bet;
    }

    /**
     * Get bet by challenge link
     */
    async getBetByChallenge(challengeLink: string) {
        const bet = await this.betRepository.findOne({
            where: {
                challengeLink,
                status: BetStatus.PENDING,
            },
        });

        if (!bet) {
            throw new NotFoundException('Challenge not found or already matched');
        }

        return bet;
    }

    /**
     * Settle bet after match result (would be called by a worker/cron job)
     */
    async settleBet(betId: string, actualResult: BetOutcome) {
        return this.dataSource.transaction(async (manager) => {
            const bet = await manager.findOne(Bet, {
                where: { id: betId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!bet || bet.status !== BetStatus.MATCHED) {
                throw new BadRequestException('Bet cannot be settled');
            }

            const matchedBet = await manager.findOne(Bet, {
                where: { id: bet.matchedBetId },
                lock: { mode: 'pessimistic_write' },
            });

            const escrow = await manager.findOne(Escrow, {
                where: { id: bet.escrowId },
                lock: { mode: 'pessimistic_write' },
            });

            // Determine winner
            let winnerBetId: string;
            let winnerId: string;

            if (bet.outcome === actualResult) {
                // Original bettor predicted correctly
                if (bet.betType === BetType.BACK) {
                    winnerBetId = bet.id;
                    winnerId = bet.userId;
                } else {
                    winnerBetId = matchedBet.id;
                    winnerId = matchedBet.userId;
                }
            } else {
                // Original bettor predicted incorrectly
                if (bet.betType === BetType.BACK) {
                    winnerBetId = matchedBet.id;
                    winnerId = matchedBet.userId;
                } else {
                    winnerBetId = bet.id;
                    winnerId = bet.userId;
                }
            }

            // Calculate payout
            const totalPool = Number(escrow.totalHeld);
            const platformFee = (totalPool * this.platformFeePercentage) / 100;
            const winnerPayout = totalPool - platformFee;

            // Update escrow
            escrow.status = EscrowStatus.RELEASED;
            escrow.winnerId = winnerId;
            escrow.winnerPayout = winnerPayout;
            escrow.platformFee = platformFee;
            escrow.releasedAt = new Date();
            await manager.save(escrow);

            // Update bets
            bet.status = BetStatus.SETTLED;
            bet.actualResult = actualResult;
            bet.payout = winnerBetId === bet.id ? winnerPayout : 0;
            bet.settledAt = new Date();

            matchedBet.status = BetStatus.SETTLED;
            matchedBet.actualResult = actualResult;
            matchedBet.payout = winnerBetId === matchedBet.id ? winnerPayout : 0;
            matchedBet.settledAt = new Date();

            await manager.save([bet, matchedBet]);

            // Release funds from escrow
            await this.walletService.releaseFromEscrow(
                bet.userId,
                bet.liability,
                bet.id,
                winnerBetId === bet.id,
            );

            await this.walletService.releaseFromEscrow(
                matchedBet.userId,
                matchedBet.liability,
                matchedBet.id,
                winnerBetId === matchedBet.id,
            );

            // Update user statistics
            await this.updateUserStats(manager, bet.userId, winnerBetId === bet.id);
            await this.updateUserStats(
                manager,
                matchedBet.userId,
                winnerBetId === matchedBet.id,
            );

            return {
                winnerId,
                winnerPayout,
                platformFee,
            };
        });
    }

    private async updateUserStats(
        manager: any,
        userId: string,
        won: boolean,
    ): Promise<void> {
        const user = await manager.findOne(User, { where: { id: userId } });

        user.totalBets += 1;

        if (won) {
            user.wonBets += 1;
        } else {
            user.lostBets += 1;
        }

        await manager.save(user);
    }
}
