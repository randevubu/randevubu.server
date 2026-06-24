import { BaseJob } from '../base/BaseJob';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/Logger/logger';

export class ResetMonthlyCountsJob extends BaseJob {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  getName(): string {
    return 'reset_monthly_counts';
  }

  async execute(): Promise<void> {
    // Duplicate-execution guard: only run once per month.
    // We store the last-reset month/year in a transient in-memory key on this instance,
    // but more reliably we check whether the existing records already show 0 counts AND
    // were reset this month by comparing updatedAt to the start of the current month.
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Check if any records were already updated this month (after midnight on 1st)
    const alreadyReset = await this.prisma.userBehavior.count({
      where: {
        updatedAt: { gte: startOfMonth },
        noShowsThisMonth: 0,
        cancelationsThisMonth: 0,
      },
    });

    if (alreadyReset > 0) {
      logger.info(
        `⏭️  ${this.getName()}: Monthly counts already reset for ${now.getFullYear()}-${now.getMonth() + 1}, skipping.`
      );
      return;
    }

    // Reset only monthly counters — historical totals (canceledAppointments,
    // noShowAppointments, totalAppointments, completedAppointments) are untouched.
    const result = await this.prisma.userBehavior.updateMany({
      where: {
        OR: [
          { noShowsThisMonth: { gt: 0 } },
          { cancelationsThisMonth: { gt: 0 } },
          { noShowsThisWeek: { gt: 0 } },
          { cancelationsThisWeek: { gt: 0 } },
        ],
      },
      data: {
        noShowsThisMonth: 0,
        cancelationsThisMonth: 0,
        noShowsThisWeek: 0,
        cancelationsThisWeek: 0,
      },
    });

    logger.info(
      `✅ ${this.getName()}: Reset monthly/weekly counts for ${result.count} user(s) — ` +
      `period: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    );
  }
}
