import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    BET_PLACED = 'BET_PLACED',
    BET_MATCHED = 'BET_MATCHED',
    BET_WON = 'BET_WON',
    BET_LOST = 'BET_LOST',
    BET_REFUND = 'BET_REFUND',
    PLATFORM_FEE = 'PLATFORM_FEE',
    ESCROW_HOLD = 'ESCROW_HOLD',
    ESCROW_RELEASE = 'ESCROW_RELEASE',
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @Column({
        type: 'enum',
        enum: TransactionType,
    })
    type: TransactionType;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    balanceBefore: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    balanceAfter: number;

    @Column({ nullable: true })
    referenceId: string; // Bet ID, Escrow ID, etc.

    @Column({ type: 'text', nullable: true })
    description: string;

    @CreateDateColumn()
    createdAt: Date;
}
