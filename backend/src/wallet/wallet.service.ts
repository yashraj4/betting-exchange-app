import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Transaction)
        private transactionRepository: Repository<Transaction>,
        private dataSource: DataSource,
    ) { }

    /**
     * Get user's current balance
     */
    async getBalance(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        return {
            balance: user.balance,
            escrowBalance: user.escrowBalance,
            availableBalance: Number(user.balance) - Number(user.escrowBalance),
        };
    }

    /**
     * Deposit funds (for testing - in production, integrate payment gateway)
     */
    async deposit(userId: string, amount: number) {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        return this.executeTransaction(
            userId,
            amount,
            TransactionType.DEPOSIT,
            null,
            'Deposit to wallet',
        );
    }

    /**
     * Withdraw funds
     */
    async withdraw(userId: string, amount: number) {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        const availableBalance = Number(user.balance) - Number(user.escrowBalance);

        if (availableBalance < amount) {
            throw new BadRequestException('Insufficient balance');
        }

        return this.executeTransaction(
            userId,
            -amount,
            TransactionType.WITHDRAWAL,
            null,
            'Withdrawal from wallet',
        );
    }

    /**
     * Move funds to escrow (when bet is matched)
     * This is a CRITICAL operation that must be atomic
     */
    async moveToEscrow(
        userId: string,
        amount: number,
        betId: string,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            // Lock the user row for update
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new BadRequestException('User not found');
            }

            const availableBalance = Number(user.balance) - Number(user.escrowBalance);

            if (availableBalance < amount) {
                throw new BadRequestException('Insufficient balance');
            }

            // Update escrow balance
            user.escrowBalance = Number(user.escrowBalance) + amount;
            await manager.save(user);

            // Create transaction record
            const transaction = manager.create(Transaction, {
                userId,
                type: TransactionType.ESCROW_HOLD,
                amount,
                balanceBefore: user.balance,
                balanceAfter: user.balance,
                referenceId: betId,
                description: `Escrow hold for bet ${betId}`,
            });

            await manager.save(transaction);
        });
    }

    /**
     * Release funds from escrow (when bet is settled)
     */
    async releaseFromEscrow(
        userId: string,
        amount: number,
        betId: string,
        won: boolean,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new BadRequestException('User not found');
            }

            const balanceBefore = user.balance;

            // Release escrow
            user.escrowBalance = Number(user.escrowBalance) - amount;

            if (user.escrowBalance < 0) {
                throw new InternalServerErrorException('Escrow balance cannot be negative');
            }

            // If won, add winnings to balance
            if (won) {
                user.balance = Number(user.balance) + amount;
            }

            await manager.save(user);

            // Create transaction record
            const transaction = manager.create(Transaction, {
                userId,
                type: TransactionType.ESCROW_RELEASE,
                amount: won ? amount : -amount,
                balanceBefore,
                balanceAfter: user.balance,
                referenceId: betId,
                description: won
                    ? `Bet won - payout for ${betId}`
                    : `Bet lost - escrow released for ${betId}`,
            });

            await manager.save(transaction);
        });
    }

    /**
     * Get transaction history
     */
    async getTransactions(userId: string, limit = 50) {
        return this.transactionRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Internal helper for executing transactions atomically
     */
    private async executeTransaction(
        userId: string,
        amount: number,
        type: TransactionType,
        referenceId: string | null,
        description: string,
    ) {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new BadRequestException('User not found');
            }

            const balanceBefore = user.balance;
            user.balance = Number(user.balance) + amount;

            if (user.balance < 0) {
                throw new BadRequestException('Insufficient balance');
            }

            await manager.save(user);

            // Create transaction record
            const transaction = manager.create(Transaction, {
                userId,
                type,
                amount,
                balanceBefore,
                balanceAfter: user.balance,
                referenceId,
                description,
            });

            await manager.save(transaction);

            return {
                balance: user.balance,
                transaction,
            };
        });
    }
}
