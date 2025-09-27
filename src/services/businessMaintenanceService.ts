import { PrismaClient } from '@prisma/client';
import { BusinessStaffRole } from '@prisma/client';

export class BusinessMaintenanceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fix missing owner staff records for businesses
   * This should be run once to fix existing businesses that don't have owner staff records
   */
  async fixMissingOwnerStaffRecords(): Promise<{ fixed: number; errors: string[] }> {
    const errors: string[] = [];
    let fixed = 0;

    try {
      // Find businesses where owner doesn't have a staff record
      // We'll use a raw query approach since Prisma field references are complex here
      const businessesWithMissingOwnerStaff = await this.prisma.$queryRaw<Array<{
        id: string;
        ownerId: string;
        name: string;
        createdAt: Date;
      }>>`
        SELECT b.id, b.owner_id as "ownerId", b.name, b.created_at as "createdAt"
        FROM businesses b
        WHERE b.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM business_staff bs
          WHERE bs.business_id = b.id
          AND bs.user_id = b.owner_id
          AND bs.role = 'OWNER'
          AND bs.is_active = true
        )
      `;

      console.log(`Found ${businessesWithMissingOwnerStaff.length} businesses with missing owner staff records`);

      for (const business of businessesWithMissingOwnerStaff) {
        try {
          await this.prisma.businessStaff.create({
            data: {
              id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
              businessId: business.id,
              userId: business.ownerId,
              role: BusinessStaffRole.OWNER,
              permissions: {},
              isActive: true,
              joinedAt: business.createdAt,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          fixed++;
          console.log(`Fixed business ${business.id} - owner ${business.ownerId}`);
        } catch (error) {
          const errorMsg = `Failed to fix business ${business.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to query businesses: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }

    return { fixed, errors };
  }

  /**
   * Check if a business has missing owner staff record
   */
  async checkBusinessOwnerStaffRecord(businessId: string): Promise<{
    hasOwnerStaff: boolean;
    businessId: string;
    ownerId: string;
  }> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        staff: {
          where: {
            role: BusinessStaffRole.OWNER,
            isActive: true
          }
        }
      }
    });

    if (!business) {
      throw new Error('Business not found');
    }

    return {
      hasOwnerStaff: business.staff.length > 0,
      businessId: business.id,
      ownerId: business.ownerId
    };
  }
}

