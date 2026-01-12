import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private readonly lockPrefix = 'lock:';
    private readonly lockTTL = 5000; // 5 seconds default

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        this.client = new Redis({
            host: this.configService.get('REDIS_HOST'),
            port: this.configService.get('REDIS_PORT'),
        });

        this.client.on('connect', () => {
            console.log('✅ Redis connected');
        });

        this.client.on('error', (err) => {
            console.error('❌ Redis error:', err);
        });
    }

    onModuleDestroy() {
        this.client.disconnect();
    }

    /**
     * Acquire a distributed lock
     * Critical for preventing race conditions in bet matching
     * 
     * @param key - The resource to lock (e.g., 'bet:123')
     * @param ttl - Lock expiration in milliseconds (prevents deadlocks)
     * @returns Lock token if acquired, null if already locked
     */
    async acquireLock(key: string, ttl: number = this.lockTTL): Promise<string | null> {
        const lockKey = `${this.lockPrefix}${key}`;
        const token = `${Date.now()}-${Math.random()}`;

        // SET NX - Only set if key doesn't exist (atomic operation)
        // PX - Set expiration in milliseconds
        const result = await this.client.set(lockKey, token, 'PX', ttl, 'NX');

        return result === 'OK' ? token : null;
    }

    /**
     * Release a distributed lock
     * Only the lock holder (with correct token) can release
     * 
     * @param key - The resource to unlock
     * @param token - The token received when acquiring the lock
     */
    async releaseLock(key: string, token: string): Promise<boolean> {
        const lockKey = `${this.lockPrefix}${key}`;

        // Lua script ensures atomic check-and-delete
        const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

        const result = await this.client.eval(script, 1, lockKey, token);
        return result === 1;
    }

    /**
     * Generic Redis operations
     */
    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.client.set(key, value, 'PX', ttl);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }

    /**
     * Pub/Sub for real-time events
     */
    async publish(channel: string, message: string): Promise<void> {
        await this.client.publish(channel, message);
    }

    subscribe(channel: string, callback: (message: string) => void): void {
        const subscriber = this.client.duplicate();
        subscriber.subscribe(channel);
        subscriber.on('message', (ch, msg) => {
            if (ch === channel) {
                callback(msg);
            }
        });
    }

    getClient(): Redis {
        return this.client;
    }
}
