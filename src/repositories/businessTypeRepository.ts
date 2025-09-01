import { PrismaClient } from '@prisma/client';
import { BusinessTypeData } from '../types/business';

export class BusinessTypeRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all active business types
   */
  async findAllActive(): Promise<BusinessTypeData[]> {
    const result = await this.prisma.businessType.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });
    
    return result.map(bt => ({
      ...bt,
      description: bt.description || null,
      icon: bt.icon || null
    }));
  }

  /**
   * Get all business types (including inactive)
   */
  async findAll(): Promise<BusinessTypeData[]> {
    const result = await this.prisma.businessType.findMany({
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });
    
    return result.map(bt => ({
      ...bt,
      description: bt.description || null,
      icon: bt.icon || null
    }));
  }

  /**
   * Get business types by category
   */
  async findByCategory(category: string): Promise<BusinessTypeData[]> {
    const result = await this.prisma.businessType.findMany({
      where: { 
        category,
        isActive: true 
      },
      orderBy: { displayName: 'asc' }
    });
    
    return result.map(bt => ({
      ...bt,
      description: bt.description || null,
      icon: bt.icon || null
    }));
  }

  /**
   * Get business type by ID
   */
  async findById(id: string): Promise<BusinessTypeData | null> {
    const result = await this.prisma.businessType.findUnique({
      where: { id }
    });
    
    if (!result) return null;
    
    return {
      ...result,
      description: result.description || null,
      icon: result.icon || null
    };
  }

  /**
   * Get business type by name
   */
  async findByName(name: string): Promise<BusinessTypeData | null> {
    const result = await this.prisma.businessType.findUnique({
      where: { name }
    });
    
    if (!result) return null;
    
    return {
      ...result,
      description: result.description || null,
      icon: result.icon || null
    };
  }

  /**
   * Get business types with business count
   */
  async findWithBusinessCount(): Promise<(BusinessTypeData & { businessCount: number })[]> {
    const businessTypes = await this.prisma.businessType.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { businesses: true }
        }
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });

    return businessTypes.map(bt => ({
      ...bt,
      description: bt.description || null,
      icon: bt.icon || null,
      businessCount: bt._count.businesses
    }));
  }

  /**
   * Get categories with business type count
   */
  async getCategories(): Promise<{ category: string; count: number }[]> {
    const result = await this.prisma.businessType.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: {
        id: true
      },
      orderBy: { category: 'asc' }
    });

    return result.map(item => ({
      category: item.category,
      count: item._count.id
    }));
  }
}
