import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponse<T = unknown> {
  @ApiProperty({ example: true, description: 'Indicates the request succeeded' })
  success: boolean;

  @ApiProperty({ description: 'Response payload' })
  data: T;

  @ApiProperty({ example: 1716000000, description: 'Unix timestamp of the response (seconds)' })
  timestamp: number;

  constructor(data: T) {
    this.success = true;
    this.data = data;
    this.timestamp = Math.floor(Date.now() / 1000);
  }
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Invalid Ethereum address' })
  message: string;
}
