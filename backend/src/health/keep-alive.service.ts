import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class KeepAliveService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(KeepAliveService.name);
  private intervalRef: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.logger.log('Starting automated Keep-Alive heartbeat generator (10-minute interval to prevent server sleep)...');
    
    // Run every 10 minutes (600,000 ms)
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    // Initial heartbeat after 30 seconds
    setTimeout(() => {
      this.sendHeartbeatPacket();
    }, 30000);

    this.intervalRef = setInterval(() => {
      this.sendHeartbeatPacket();
    }, TEN_MINUTES_MS);
  }

  onApplicationShutdown() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  async sendHeartbeatPacket() {
    const port = process.env.PORT || 3001;
    const urlsToPing: string[] = [];

    // Render external URL if available
    if (process.env.RENDER_EXTERNAL_URL) {
      urlsToPing.push(`${process.env.RENDER_EXTERNAL_URL}/health`);
    }

    if (process.env.BACKEND_URL && !urlsToPing.includes(`${process.env.BACKEND_URL}/health`)) {
      urlsToPing.push(`${process.env.BACKEND_URL}/health`);
    }

    // Default Render production domain fallback
    const renderDefault = 'https://stitch-enterprise-backend.onrender.com/health';
    if (!urlsToPing.includes(renderDefault)) {
      urlsToPing.push(renderDefault);
    }

    // Localhost fallback
    urlsToPing.push(`http://127.0.0.1:${port}/health`);

    let pingSuccess = false;
    for (const url of urlsToPing) {
      try {
        const response = await axios.get(url, { timeout: 8000 });
        if (response.status === 200) {
          this.logger.log(`[Keep-Alive] 💓 Automated heartbeat packet sent to ${url} -> Status 200 (Active)`);
          pingSuccess = true;
          break;
        }
      } catch (err: any) {
        // Continue to next URL candidate
      }
    }

    // Also touch database connection to ensure connection pool stays warm
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      this.logger.warn(`[Keep-Alive] DB pool touch warning: ${err.message}`);
    }

    if (!pingSuccess) {
      this.logger.debug(`[Keep-Alive] Internal pulse triggered (Uptime: ${Math.floor(process.uptime())}s)`);
    }
  }
}
