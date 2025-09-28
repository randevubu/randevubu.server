import { BusinessTypeService } from '../../../src/services/businessTypeService';
import { BusinessTypeRepository } from '../../../src/repositories/businessTypeRepository';
import { BusinessTypeData } from '../../../src/types/business';

// Mock dependencies
jest.mock('../../../src/repositories/businessTypeRepository');

describe('BusinessTypeService', () => {
  let businessTypeService: BusinessTypeService;
  let mockBusinessTypeRepository: jest.Mocked<BusinessTypeRepository>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repository
    mockBusinessTypeRepository = {
      findAllActive: jest.fn(),
      findAll: jest.fn(),
      findByCategory: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findWithBusinessCount: jest.fn(),
      getCategories: jest.fn()
    } as any;

    // Create BusinessTypeService instance
    businessTypeService = new BusinessTypeService(mockBusinessTypeRepository);
  });

  describe('getAllActiveBusinessTypes', () => {
    it('should return all active business types', async () => {
      // Arrange
      const expectedBusinessTypes: BusinessTypeData[] = [
        {
          id: 'type-1',
          name: 'Restaurant',
          category: 'Food & Beverage',
          description: 'Restaurant business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'type-2',
          name: 'Salon',
          category: 'Beauty & Wellness',
          description: 'Salon business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockBusinessTypeRepository.findAllActive.mockResolvedValue(expectedBusinessTypes);

      // Act
      const result = await businessTypeService.getAllActiveBusinessTypes();

      // Assert
      expect(result).toEqual(expectedBusinessTypes);
      expect(mockBusinessTypeRepository.findAllActive).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no active business types', async () => {
      // Arrange
      mockBusinessTypeRepository.findAllActive.mockResolvedValue([]);

      // Act
      const result = await businessTypeService.getAllActiveBusinessTypes();

      // Assert
      expect(result).toEqual([]);
      expect(mockBusinessTypeRepository.findAllActive).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllBusinessTypes', () => {
    it('should return all business types including inactive', async () => {
      // Arrange
      const expectedBusinessTypes: BusinessTypeData[] = [
        {
          id: 'type-1',
          name: 'Restaurant',
          category: 'Food & Beverage',
          description: 'Restaurant business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'type-2',
          name: 'Old Type',
          category: 'Other',
          description: 'Inactive business type',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockBusinessTypeRepository.findAll.mockResolvedValue(expectedBusinessTypes);

      // Act
      const result = await businessTypeService.getAllBusinessTypes();

      // Assert
      expect(result).toEqual(expectedBusinessTypes);
      expect(mockBusinessTypeRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBusinessTypesByCategory', () => {
    it('should return business types by category', async () => {
      // Arrange
      const category = 'Food & Beverage';
      const expectedBusinessTypes: BusinessTypeData[] = [
        {
          id: 'type-1',
          name: 'Restaurant',
          category: 'Food & Beverage',
          description: 'Restaurant business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'type-2',
          name: 'Cafe',
          category: 'Food & Beverage',
          description: 'Cafe business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockBusinessTypeRepository.findByCategory.mockResolvedValue(expectedBusinessTypes);

      // Act
      const result = await businessTypeService.getBusinessTypesByCategory(category);

      // Assert
      expect(result).toEqual(expectedBusinessTypes);
      expect(mockBusinessTypeRepository.findByCategory).toHaveBeenCalledWith(category);
    });

    it('should return empty array for non-existent category', async () => {
      // Arrange
      const category = 'Non-existent Category';
      mockBusinessTypeRepository.findByCategory.mockResolvedValue([]);

      // Act
      const result = await businessTypeService.getBusinessTypesByCategory(category);

      // Assert
      expect(result).toEqual([]);
      expect(mockBusinessTypeRepository.findByCategory).toHaveBeenCalledWith(category);
    });
  });

  describe('getBusinessTypeById', () => {
    it('should return business type by id', async () => {
      // Arrange
      const id = 'type-1';
      const expectedBusinessType: BusinessTypeData = {
        id: 'type-1',
        name: 'Restaurant',
        category: 'Food & Beverage',
        description: 'Restaurant business type',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockBusinessTypeRepository.findById.mockResolvedValue(expectedBusinessType);

      // Act
      const result = await businessTypeService.getBusinessTypeById(id);

      // Assert
      expect(result).toEqual(expectedBusinessType);
      expect(mockBusinessTypeRepository.findById).toHaveBeenCalledWith(id);
    });

    it('should return null for non-existent id', async () => {
      // Arrange
      const id = 'non-existent-id';
      mockBusinessTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await businessTypeService.getBusinessTypeById(id);

      // Assert
      expect(result).toBeNull();
      expect(mockBusinessTypeRepository.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('getBusinessTypeByName', () => {
    it('should return business type by name', async () => {
      // Arrange
      const name = 'Restaurant';
      const expectedBusinessType: BusinessTypeData = {
        id: 'type-1',
        name: 'Restaurant',
        category: 'Food & Beverage',
        description: 'Restaurant business type',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockBusinessTypeRepository.findByName.mockResolvedValue(expectedBusinessType);

      // Act
      const result = await businessTypeService.getBusinessTypeByName(name);

      // Assert
      expect(result).toEqual(expectedBusinessType);
      expect(mockBusinessTypeRepository.findByName).toHaveBeenCalledWith(name);
    });

    it('should return null for non-existent name', async () => {
      // Arrange
      const name = 'Non-existent Type';
      mockBusinessTypeRepository.findByName.mockResolvedValue(null);

      // Act
      const result = await businessTypeService.getBusinessTypeByName(name);

      // Assert
      expect(result).toBeNull();
      expect(mockBusinessTypeRepository.findByName).toHaveBeenCalledWith(name);
    });
  });

  describe('getBusinessTypesWithCount', () => {
    it('should return business types with business count', async () => {
      // Arrange
      const expectedBusinessTypes = [
        {
          id: 'type-1',
          name: 'Restaurant',
          category: 'Food & Beverage',
          description: 'Restaurant business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          businessCount: 15
        },
        {
          id: 'type-2',
          name: 'Salon',
          category: 'Beauty & Wellness',
          description: 'Salon business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          businessCount: 8
        }
      ];

      mockBusinessTypeRepository.findWithBusinessCount.mockResolvedValue(expectedBusinessTypes);

      // Act
      const result = await businessTypeService.getBusinessTypesWithCount();

      // Assert
      expect(result).toEqual(expectedBusinessTypes);
      expect(mockBusinessTypeRepository.findWithBusinessCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCategories', () => {
    it('should return all categories with count', async () => {
      // Arrange
      const expectedCategories = [
        { category: 'Food & Beverage', count: 5 },
        { category: 'Beauty & Wellness', count: 3 },
        { category: 'Healthcare', count: 2 }
      ];

      mockBusinessTypeRepository.getCategories.mockResolvedValue(expectedCategories);

      // Act
      const result = await businessTypeService.getCategories();

      // Assert
      expect(result).toEqual(expectedCategories);
      expect(mockBusinessTypeRepository.getCategories).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBusinessTypesGroupedByCategory', () => {
    it('should return business types grouped by category', async () => {
      // Arrange
      const businessTypes: BusinessTypeData[] = [
        {
          id: 'type-1',
          name: 'Restaurant',
          category: 'Food & Beverage',
          description: 'Restaurant business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'type-2',
          name: 'Cafe',
          category: 'Food & Beverage',
          description: 'Cafe business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'type-3',
          name: 'Salon',
          category: 'Beauty & Wellness',
          description: 'Salon business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const expectedGrouped = {
        'Food & Beverage': [
          {
            id: 'type-1',
            name: 'Restaurant',
            category: 'Food & Beverage',
            description: 'Restaurant business type',
            isActive: true,
            createdAt: businessTypes[0].createdAt,
            updatedAt: businessTypes[0].updatedAt
          },
          {
            id: 'type-2',
            name: 'Cafe',
            category: 'Food & Beverage',
            description: 'Cafe business type',
            isActive: true,
            createdAt: businessTypes[1].createdAt,
            updatedAt: businessTypes[1].updatedAt
          }
        ],
        'Beauty & Wellness': [
          {
            id: 'type-3',
            name: 'Salon',
            category: 'Beauty & Wellness',
            description: 'Salon business type',
            isActive: true,
            createdAt: businessTypes[2].createdAt,
            updatedAt: businessTypes[2].updatedAt
          }
        ]
      };

      mockBusinessTypeRepository.findAllActive.mockResolvedValue(businessTypes);

      // Act
      const result = await businessTypeService.getBusinessTypesGroupedByCategory();

      // Assert
      expect(result).toEqual(expectedGrouped);
      expect(mockBusinessTypeRepository.findAllActive).toHaveBeenCalledTimes(1);
    });

    it('should return empty object when no business types', async () => {
      // Arrange
      mockBusinessTypeRepository.findAllActive.mockResolvedValue([]);

      // Act
      const result = await businessTypeService.getBusinessTypesGroupedByCategory();

      // Assert
      expect(result).toEqual({});
      expect(mockBusinessTypeRepository.findAllActive).toHaveBeenCalledTimes(1);
    });

    it('should handle business types with same category', async () => {
      // Arrange
      const businessTypes: BusinessTypeData[] = [
        {
          id: 'type-1',
          name: 'Restaurant',
          category: 'Food & Beverage',
          description: 'Restaurant business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'type-2',
          name: 'Cafe',
          category: 'Food & Beverage',
          description: 'Cafe business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'type-3',
          name: 'Fast Food',
          category: 'Food & Beverage',
          description: 'Fast food business type',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockBusinessTypeRepository.findAllActive.mockResolvedValue(businessTypes);

      // Act
      const result = await businessTypeService.getBusinessTypesGroupedByCategory();

      // Assert
      expect(result['Food & Beverage']).toHaveLength(3);
      expect(Object.keys(result)).toHaveLength(1);
    });
  });
});

