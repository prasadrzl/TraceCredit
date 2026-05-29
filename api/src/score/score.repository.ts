import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreHistory } from '../database/entities/score-history.entity';

@Injectable()
export class ScoreRepository {
  constructor(
    @InjectRepository(ScoreHistory)
    private readonly repo: Repository<ScoreHistory>,
  ) {}

  async findByWallet(wallet: string, limit = 50): Promise<ScoreHistory[]> {
    return this.repo.find({
      where: { wallet: wallet.toLowerCase() },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  async create(data: Partial<ScoreHistory>): Promise<ScoreHistory> {
    const record = this.repo.create({ ...data, wallet: data.wallet?.toLowerCase() });
    return this.repo.save(record);
  }

  async getLatest(wallet: string): Promise<ScoreHistory | null> {
    return this.repo.findOne({
      where: { wallet: wallet.toLowerCase() },
      order: { recordedAt: 'DESC' },
    });
  }
}
