import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  escrowBalance: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalProfit: number;

  @Column({ type: 'int', default: 0 })
  totalBets: number;

  @Column({ type: 'int', default: 0 })
  wonBets: number;

  @Column({ type: 'int', default: 0 })
  lostBets: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed field for win rate
  get winRate(): number {
    return this.totalBets > 0 ? (this.wonBets / this.totalBets) * 100 : 0;
  }
}
