import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('follows')
export class Follow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'followerId' })
    follower: User;

    @Column()
    followerId: string; // User doing the copying

    @ManyToOne(() => User)
    @JoinColumn({ name: 'followedId' })
    followed: User;

    @Column()
    followedId: string; // Pro bettor being copied

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
    copyRatio: number; // Multiplier for copy bets (0.1 to 10.0)

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    maxBetAmount: number; // Max amount per copy bet

    @CreateDateColumn()
    createdAt: Date;
}
