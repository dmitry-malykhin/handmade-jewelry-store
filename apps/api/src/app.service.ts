import { Injectable } from '@nestjs/common'

export interface HealthStatus {
  status: string
  timestamp: string
}

@Injectable()
export class AppService {
  getHealthStatus(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
