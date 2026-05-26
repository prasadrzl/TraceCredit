import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLClient, gql } from 'graphql-request';
import { AppLogger } from '../logger/logger.service';

export interface SubgraphLoan {
  id: string;
  loanId: string;
  borrower: string;
  principal: string;
  rateBps: string;
  dueTime: string;
  status: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

export interface SubgraphLiquidation {
  id: string;
  loanId: string;
  borrower: string;
  recoveredAmount: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

export interface SubgraphScoreUpdate {
  id: string;
  wallet: string;
  newScore: string;
  previousScore: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

@Injectable()
export class GraphService implements OnModuleInit {
  private client: GraphQLClient;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('subgraphUrl') ?? '';
    this.client = new GraphQLClient(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    this.logger.log(`Graph client ready → ${url}`, 'GraphService');
  }

  async getActiveLoans(first = 1000, skip = 0): Promise<SubgraphLoan[]> {
    const query = gql`
      query ActiveLoans($first: Int!, $skip: Int!) {
        loans(
          first: $first
          skip: $skip
          where: { status: "active" }
          orderBy: dueTime
          orderDirection: asc
        ) {
          id
          loanId
          borrower
          principal
          rateBps
          dueTime
          status
          txHash
          blockNumber
          timestamp
        }
      }
    `;
    const data = await this.client.request<{ loans: SubgraphLoan[] }>(query, { first, skip });
    return data.loans;
  }

  async getLoansByBorrower(borrower: string): Promise<SubgraphLoan[]> {
    const query = gql`
      query LoansByBorrower($borrower: String!) {
        loans(
          where: { borrower: $borrower }
          orderBy: timestamp
          orderDirection: desc
          first: 50
        ) {
          id
          loanId
          borrower
          principal
          rateBps
          dueTime
          status
          txHash
          blockNumber
          timestamp
        }
      }
    `;
    const data = await this.client.request<{ loans: SubgraphLoan[] }>(query, {
      borrower: borrower.toLowerCase(),
    });
    return data.loans;
  }

  async getLiquidations(first = 50, skip = 0): Promise<SubgraphLiquidation[]> {
    const query = gql`
      query Liquidations($first: Int!, $skip: Int!) {
        liquidations(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
          id
          loanId
          borrower
          recoveredAmount
          txHash
          blockNumber
          timestamp
        }
      }
    `;
    const data = await this.client.request<{ liquidations: SubgraphLiquidation[] }>(query, {
      first,
      skip,
    });
    return data.liquidations;
  }

  async getScoreHistory(wallet: string, first = 50): Promise<SubgraphScoreUpdate[]> {
    const query = gql`
      query ScoreHistory($wallet: String!, $first: Int!) {
        scoreUpdates(
          where: { wallet: $wallet }
          orderBy: timestamp
          orderDirection: desc
          first: $first
        ) {
          id
          wallet
          newScore
          previousScore
          txHash
          blockNumber
          timestamp
        }
      }
    `;
    const data = await this.client.request<{ scoreUpdates: SubgraphScoreUpdate[] }>(query, {
      wallet: wallet.toLowerCase(),
      first,
    });
    return data.scoreUpdates;
  }

  async getProtocolStats(): Promise<{
    totalBorrowed: string;
    totalRepaid: string;
    totalLiquidated: string;
    activeLoansCount: string;
    uniqueBorrowers: string;
  }> {
    const query = gql`
      query ProtocolStats {
        protocolStats(id: "global") {
          totalBorrowed
          totalRepaid
          totalLiquidated
          activeLoansCount
          uniqueBorrowers
        }
      }
    `;
    const data = await this.client.request<{ protocolStats: any }>(query);
    return (
      data.protocolStats ?? {
        totalBorrowed: '0',
        totalRepaid: '0',
        totalLiquidated: '0',
        activeLoansCount: '0',
        uniqueBorrowers: '0',
      }
    );
  }

  async getOverdueLoans(nowUnix: number): Promise<SubgraphLoan[]> {
    const query = gql`
      query OverdueLoans($dueTime: String!) {
        loans(
          where: { status: "active", dueTime_lt: $dueTime }
          first: 500
          orderBy: dueTime
          orderDirection: asc
        ) {
          id
          loanId
          borrower
          principal
          rateBps
          dueTime
          status
          txHash
          blockNumber
          timestamp
        }
      }
    `;
    const data = await this.client.request<{ loans: SubgraphLoan[] }>(query, {
      dueTime: nowUnix.toString(),
    });
    return data.loans;
  }
}
