import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum EscrowStatus {
    HOLDING = 'HOLDING',     // Funds locked, bet active
    RELEASED = 'RELEASED',   // Funds paid out to winner
    REFUNDED = 'REFUNDED',   // Funds returned (cancelled bet)
}

@Entity('escrow')
export class Escrow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    betId: string;

    @Column()
    matchedBetId: string;

    @Column()
    backerUserId: string;

    @Column()
    layerUserId: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    backerStake: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    layerLiability: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    totalHeld: number; // backerStake + layerLiability

    @Column({
        type: 'enum',
        enum: EscrowStatus,
        default: EscrowStatus.HOLDING,
    })
    status: EscrowStatus;

    @Column({ nullable: true })
    winnerId: string; // User ID of winner

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    winnerPayout: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    platformFee: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    releasedAt: Date;
}
