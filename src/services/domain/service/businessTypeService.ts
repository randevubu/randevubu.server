import { BusinessTypeRepository } from '../../../repositories/businessTypeRepository';
import { BusinessTypeData } from '../../../types/business';

export class BusinessTypeService {
  constructor(private businessTypeRepository: BusinessTypeRepository) {}

  /**
   * Get all active business types
   */
  async getAllActiveBusinessTypes(): Promise<BusinessTypeData[]> {
    return await this.businessTypeRepository.findAllActive();
  }

  /**
   * Get all business types (including inactive)
   */
  async getAllBusinessTypes(): Promise<BusinessTypeData[]> {
    return await this.businessTypeRepository.findAll();
  }

  /**
   * Get business types by category
   */
  async getBusinessTypesByCategory(category: string): Promise<BusinessTypeData[]> {
    return await this.businessTypeRepository.findByCategory(category);
  }

  /**
   * Get business type by ID
   */
  async getBusinessTypeById(id: string): Promise<BusinessTypeData | null> {
    return await this.businessTypeRepository.findById(id);
  }

  /**
   * Get business type by name
   */
  async getBusinessTypeByName(name: string): Promise<BusinessTypeData | null> {
    return await this.businessTypeRepository.findByName(name);
  }

  /**
   * Get business types with business count
   */
  async getBusinessTypesWithCount(): Promise<(BusinessTypeData & { businessCount: number })[]> {
    return await this.businessTypeRepository.findWithBusinessCount();
  }

  /**
   * Get all categories with business type count
   */
  async getCategories(): Promise<{ category: string; count: number }[]> {
    return await this.businessTypeRepository.getCategories();
  }

  /**
   * Get business types grouped by category
   */
  async getBusinessTypesGroupedByCategory(): Promise<Record<string, BusinessTypeData[]>> {
    const businessTypes = await this.businessTypeRepository.findAllActive();
    
    return businessTypes.reduce((grouped, businessType) => {
      const category = businessType.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(businessType);
      return grouped;
    }, {} as Record<string, BusinessTypeData[]>);
  }
}

