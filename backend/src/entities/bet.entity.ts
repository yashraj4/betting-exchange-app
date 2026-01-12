import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum BetType {
    BACK = 'BACK', // Betting FOR an outcome
    LAY = 'LAY',   // Betting AGAINST an outcome
}

export enum BetStatus {
    PENDING = 'PENDING',       // Waiting for match
    MATCHED = 'MATCHED',       // Matched with opposing bet
    SETTLED = 'SETTLED',       // Match ended, result processed
    CANCELLED = 'CANCELLED',   // Cancelled before match
    EXPIRED = 'EXPIRED',       // Expired without match
}

export enum BetOutcome {
    HOME_WIN = 'HOME_WIN',
    AWAY_WIN = 'AWAY_WIN',
    DRAW = 'DRAW',
}

@Entity('bets')
export class Bet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @Column()
    matchId: string; // From sports API

    @Column()
    matchTitle: string;

    @Column({ type: 'timestamp' })
    matchStartTime: Date;

    @Column({
        type: 'enum',
        enum: BetType,
    })
    betType: BetType;

    @Column({
        type: 'enum',
        enum: BetOutcome,
    })
    outcome: BetOutcome;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    odds: number; // e.g., 2.5 means if you bet $100, you win $250

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    stake: number; // Amount user is risking

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    liability: number; // Amount user must pay if they lose (for LAY bets)

    @Column({
        type: 'enum',
        enum: BetStatus,
        default: BetStatus.PENDING,
    })
    status: BetStatus;

    @Column({ nullable: true })
    matchedBetId: string; // ID of the opposing bet this was matched with

    @Column({ nullable: true })
    escrowId: string; // Reference to escrow record

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    payout: number; // Final payout after settlement

    @Column({ nullable: true })
    actualResult: BetOutcome; // Actual match result

    @Column({ default: false })
    isPublic: boolean; // If true, visible in public feed

    @Column({ nullable: true })
    challengeLink: string; // Unique link for direct challenges

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    settledAt: Date;
}
