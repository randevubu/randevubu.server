/**
 * Centralized Reliability Score Calculator (Güvenilirlik Skoru)
 * 
 * This utility provides consistent reliability score calculation across the application.
 * The score ranges from 0-100, where:
 * - 100 = Perfect reliability
 * - 80-99 = High reliability
 * - 60-79 = Medium reliability
 * - 40-59 = Low reliability
 * - 0-39 = Very low reliability
 */

export interface ReliabilityScoreInput {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  currentStrikes: number;
  isBanned?: boolean;
  bannedUntil?: Date | null;
}

export interface ReliabilityScoreResult {
  score: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
  breakdown: {
    baseScore: number;
    completionBonus: number;
    cancellationPenalty: number;
    noShowPenalty: number;
    strikesPenalty: number;
    banPenalty: number;
  };
}

export class ReliabilityScoreCalculator {
  // Configuration constants
  private static readonly BASE_SCORE = 100;
  private static readonly CANCELLATION_PENALTY_RATE = 0.5; // 0.5 points per 1% cancellation rate
  private static readonly NO_SHOW_PENALTY_RATE = 1.5; // 1.5 points per 1% no-show rate
  private static readonly STRIKE_PENALTY = 10; // 10 points per strike
  private static readonly BAN_PENALTY = 50; // 50 points penalty for being banned
  
  // Risk level thresholds
  private static readonly HIGH_RISK_STRIKES = 2;
  private static readonly HIGH_RISK_NO_SHOW_RATE = 20;
  private static readonly MEDIUM_RISK_STRIKES = 1;
  private static readonly MEDIUM_RISK_CANCELLATION_RATE = 30;
  private static readonly MEDIUM_RISK_NO_SHOW_RATE = 10;

  /**
   * Calculate reliability score based on user behavior data
   */
  static calculate(input: ReliabilityScoreInput): ReliabilityScoreResult {
    const {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      currentStrikes,
      isBanned = false,
      bannedUntil
    } = input;

    // Initialize breakdown tracking
    const breakdown = {
      baseScore: this.BASE_SCORE,
      completionBonus: 0,
      cancellationPenalty: 0,
      noShowPenalty: 0,
      strikesPenalty: 0,
      banPenalty: 0
    };

    let score = this.BASE_SCORE;
    const factors: string[] = [];

    // Handle case with no appointments (new user)
    if (totalAppointments === 0) {
      return {
        score: this.BASE_SCORE,
        riskLevel: 'LOW',
        factors: ['New user - no appointment history'],
        breakdown
      };
    }

    // Calculate rates
    const completionRate = (completedAppointments / totalAppointments) * 100;
    const cancellationRate = (cancelledAppointments / totalAppointments) * 100;
    const noShowRate = (noShowAppointments / totalAppointments) * 100;

    // Apply penalties based on rates
    const cancellationPenalty = cancellationRate * this.CANCELLATION_PENALTY_RATE;
    const noShowPenalty = noShowRate * this.NO_SHOW_PENALTY_RATE;
    
    breakdown.cancellationPenalty = cancellationPenalty;
    breakdown.noShowPenalty = noShowPenalty;

    score -= cancellationPenalty;
    score -= noShowPenalty;

    // Add factors for penalties
    if (cancellationRate > 0) {
      factors.push(`Cancellation rate: ${cancellationRate.toFixed(1)}%`);
    }
    if (noShowRate > 0) {
      factors.push(`No-show rate: ${noShowRate.toFixed(1)}%`);
    }

    // Apply strikes penalty
    if (currentStrikes > 0) {
      const strikesPenalty = currentStrikes * this.STRIKE_PENALTY;
      breakdown.strikesPenalty = strikesPenalty;
      score -= strikesPenalty;
      factors.push(`${currentStrikes} strike(s) on record`);
    }

    // Apply ban penalty
    const now = new Date();
    const isCurrentlyBanned = isBanned && (!bannedUntil || bannedUntil > now);
    
    if (isCurrentlyBanned) {
      breakdown.banPenalty = this.BAN_PENALTY;
      score -= this.BAN_PENALTY;
      factors.push('Currently banned');
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine risk level
    const riskLevel = this.determineRiskLevel(
      currentStrikes,
      cancellationRate,
      noShowRate,
      isCurrentlyBanned
    );

    // Add positive factors
    if (completionRate >= 90) {
      factors.push(`Excellent completion rate: ${completionRate.toFixed(1)}%`);
    } else if (completionRate >= 80) {
      factors.push(`Good completion rate: ${completionRate.toFixed(1)}%`);
    }

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal place
      riskLevel,
      factors,
      breakdown
    };
  }

  /**
   * Determine risk level based on various factors
   */
  private static determineRiskLevel(
    strikes: number,
    cancellationRate: number,
    noShowRate: number,
    isBanned: boolean
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    // High risk conditions
    if (isBanned || 
        strikes >= this.HIGH_RISK_STRIKES || 
        noShowRate > this.HIGH_RISK_NO_SHOW_RATE) {
      return 'HIGH';
    }

    // Medium risk conditions
    if (strikes >= this.MEDIUM_RISK_STRIKES || 
        cancellationRate > this.MEDIUM_RISK_CANCELLATION_RATE || 
        noShowRate > this.MEDIUM_RISK_NO_SHOW_RATE) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Get reliability score description
   */
  static getScoreDescription(score: number): string {
    if (score >= 90) return 'Excellent reliability';
    if (score >= 80) return 'High reliability';
    if (score >= 70) return 'Good reliability';
    if (score >= 60) return 'Fair reliability';
    if (score >= 40) return 'Poor reliability';
    return 'Very poor reliability';
  }

  /**
   * Get risk level description
   */
  static getRiskLevelDescription(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    switch (riskLevel) {
      case 'LOW':
        return 'Low risk - reliable customer';
      case 'MEDIUM':
        return 'Medium risk - monitor behavior';
      case 'HIGH':
        return 'High risk - consider restrictions';
      default:
        return 'Unknown risk level';
    }
  }
}
