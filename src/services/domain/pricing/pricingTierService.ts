import { PrismaClient } from '@prisma/client';

export interface PricingTierData {
  id: string;
  name: string;
  displayName: string;
  multiplier: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CityPricingData {
  id: string;
  city: string;
  state: string;
  country: string;
  pricingTierId: string;
  isActive: boolean;
  pricingTier: PricingTierData;
}

export interface LocationBasedPricing {
  basePrice: number;
  locationPrice: number;
  multiplier: number;
  tier: string;
  city: string;
  state: string;
  country: string;
}

export class PricingTierService {
  constructor(private prisma: PrismaClient) {}

  // Get pricing tier by city (using hardcoded data for now)
  async getPricingTierByCity(city: string, state?: string, country: string = 'Turkey'): Promise<PricingTierData | null> {
    const cityMapping = this.getCityTierMapping(city, state, country);
    return cityMapping;
  }

  // Get all pricing tiers
  async getAllPricingTiers(): Promise<PricingTierData[]> {
    return [
      {
        id: 'tier_1',
        name: 'TIER_1',
        displayName: 'Tier 1 Cities',
        multiplier: 2.0,
        description: 'Major metropolitan areas with higher cost of living',
        isActive: true,
        sortOrder: 1
      },
      {
        id: 'tier_2',
        name: 'TIER_2',
        displayName: 'Tier 2 Cities',
        multiplier: 1.5,
        description: 'Regional centers and developed cities',
        isActive: true,
        sortOrder: 2
      },
      {
        id: 'tier_3',
        name: 'TIER_3',
        displayName: 'Tier 3 Cities',
        multiplier: 1.0,
        description: 'Smaller cities and rural areas',
        isActive: true,
        sortOrder: 3
      }
    ];
  }

  // Calculate location-based pricing
  async calculateLocationBasedPricing(
    basePrice: number, 
    city: string, 
    state?: string, 
    country: string = 'Turkey'
  ): Promise<LocationBasedPricing> {
    const tier = await this.getPricingTierByCity(city, state, country);
    
    if (!tier) {
      // Default to tier 3 if city not found
      return {
        basePrice,
        locationPrice: basePrice,
        multiplier: 1.0,
        tier: 'TIER_3',
        city,
        state: state || '',
        country
      };
    }

    const locationPrice = basePrice * tier.multiplier;

    return {
      basePrice,
      locationPrice: Math.round(locationPrice * 100) / 100, // Round to 2 decimal places
      multiplier: tier.multiplier,
      tier: tier.name,
      city,
      state: state || '',
      country
    };
  }

  // Get all cities with their pricing tiers
  async getAllCitiesWithPricing(): Promise<CityPricingData[]> {
    const cities = this.getAllTurkishCities();
    const tiers = await this.getAllPricingTiers();
    
    return cities.map(city => {
      const tier = tiers.find(t => t.id === city.tierId);
      return {
        id: city.id,
        city: city.city,
        state: city.state,
        country: city.country,
        pricingTierId: city.tierId,
        isActive: true,
        pricingTier: tier!
      };
    });
  }

  // Initialize pricing tiers and city mappings (placeholder for database version)
  async initializePricingTiers(): Promise<void> {
    console.log('Pricing tiers initialized with hardcoded data');
  }

  // Hardcoded city tier mapping
  private getCityTierMapping(city: string, state?: string, country: string = 'Turkey'): PricingTierData | null {
    const normalizedCity = city.toLowerCase().trim();
    
    // Tier 1 Cities (Major metropolitan areas)
    const tier1Cities = ['istanbul', 'ankara','izmir', 'bursa',"antalya","eskisehir"];
    
    // Tier 2 Cities (Regional centers)
    const tier2Cities = [
      'gaziantep', 'konya', 
      'diyarbakir', 'samsun', 'denizli', 'kayseri', 'mersin', 'erzurum', 
      'trabzon', 'balikesir', 'kahramanmaras', 'van', 'manisa', 'sivas', 'batman'
    ];
    
    // Tier 3 Cities (Smaller cities and rural areas) - everything else
    const tier3Cities = [
      'kutahya', 'tekirdag', 'aydin', 'sakarya', 'mugla', 'afyon', 
      'izmit', 'edirne', 'elazig', 'erzincan', 'rize', 'artvin', 
      'giresun', 'gumushane', 'ordu', 'tokat', 'corum', 'amasya', 
      'sinop', 'kastamonu', 'cankiri', 'bolu', 'duzce', 'zonguldak', 
      'bartin', 'karabuk', 'kirklareli', 'yalova', 'bilecik', 'osmaniye', 
      'kilis', 'hatay', 'malatya', 'adiyaman', 'sanliurfa', 'mardin', 
      'siirt', 'sirnak', 'hakkari', 'mus', 'bitlis', 'agri', 'igdir', 
      'kars', 'ardahan', 'aksaray', 'nevsehir', 'kirsehir', 'yozgat', 
      'karaman', 'nigde', 'bayburt'
    ];
    
    if (tier1Cities.includes(normalizedCity)) {
      return {
        id: 'tier_1',
        name: 'TIER_1',
        displayName: 'Tier 1 Cities',
        multiplier: 2.0,
        description: 'Major metropolitan areas with higher cost of living',
        isActive: true,
        sortOrder: 1
      };
    }
    
    if (tier2Cities.includes(normalizedCity)) {
      return {
        id: 'tier_2',
        name: 'TIER_2',
        displayName: 'Tier 2 Cities',
        multiplier: 1.5,
        description: 'Regional centers and developed cities',
        isActive: true,
        sortOrder: 2
      };
    }
    
    if (tier3Cities.includes(normalizedCity)) {
      return {
        id: 'tier_3',
        name: 'TIER_3',
        displayName: 'Tier 3 Cities',
        multiplier: 1.0,
        description: 'Smaller cities and rural areas',
        isActive: true,
        sortOrder: 3
      };
    }
    
    // Default to tier 3 for unknown cities
    return {
      id: 'tier_3',
      name: 'TIER_3',
      displayName: 'Tier 3 Cities',
      multiplier: 1.0,
      description: 'Smaller cities and rural areas',
      isActive: true,
      sortOrder: 3
    };
  }

  private getAllTurkishCities() {
    return [
      // Tier 1 Cities
      { id: 'mapping_istanbul', city: 'Istanbul', state: 'Istanbul', country: 'Turkey', tierId: 'tier_1' },
      { id: 'mapping_ankara', city: 'Ankara', state: 'Ankara', country: 'Turkey', tierId: 'tier_1' },
      
      // Tier 2 Cities
      { id: 'mapping_izmir', city: 'Izmir', state: 'Izmir', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_bursa', city: 'Bursa', state: 'Bursa', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_antalya', city: 'Antalya', state: 'Antalya', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_gaziantep', city: 'Gaziantep', state: 'Gaziantep', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_konya', city: 'Konya', state: 'Konya', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_eskisehir', city: 'Eskisehir', state: 'Eskisehir', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_diyarbakir', city: 'Diyarbakir', state: 'Diyarbakir', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_samsun', city: 'Samsun', state: 'Samsun', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_denizli', city: 'Denizli', state: 'Denizli', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_kayseri', city: 'Kayseri', state: 'Kayseri', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_mersin', city: 'Mersin', state: 'Mersin', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_erzurum', city: 'Erzurum', state: 'Erzurum', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_trabzon', city: 'Trabzon', state: 'Trabzon', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_balikesir', city: 'Balikesir', state: 'Balikesir', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_kahramanmaras', city: 'Kahramanmaras', state: 'Kahramanmaras', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_van', city: 'Van', state: 'Van', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_manisa', city: 'Manisa', state: 'Manisa', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_sivas', city: 'Sivas', state: 'Sivas', country: 'Turkey', tierId: 'tier_2' },
      { id: 'mapping_batman', city: 'Batman', state: 'Batman', country: 'Turkey', tierId: 'tier_2' },
      
      // Tier 3 Cities
      { id: 'mapping_kutahya', city: 'Kutahya', state: 'Kutahya', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_tekirdag', city: 'Tekirdag', state: 'Tekirdag', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_aydin', city: 'Aydin', state: 'Aydin', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_sakarya', city: 'Sakarya', state: 'Sakarya', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_mugla', city: 'Mugla', state: 'Mugla', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_afyon', city: 'Afyon', state: 'Afyon', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_izmit', city: 'Izmit', state: 'Kocaeli', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_edirne', city: 'Edirne', state: 'Edirne', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_elazig', city: 'Elazig', state: 'Elazig', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_erzincan', city: 'Erzincan', state: 'Erzincan', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_rize', city: 'Rize', state: 'Rize', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_artvin', city: 'Artvin', state: 'Artvin', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_giresun', city: 'Giresun', state: 'Giresun', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_gumushane', city: 'Gumushane', state: 'Gumushane', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_ordu', city: 'Ordu', state: 'Ordu', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_tokat', city: 'Tokat', state: 'Tokat', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_corum', city: 'Corum', state: 'Corum', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_amasya', city: 'Amasya', state: 'Amasya', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_sinop', city: 'Sinop', state: 'Sinop', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_kastamonu', city: 'Kastamonu', state: 'Kastamonu', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_cankiri', city: 'Cankiri', state: 'Cankiri', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_bolu', city: 'Bolu', state: 'Bolu', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_duzce', city: 'Duzce', state: 'Duzce', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_zonguldak', city: 'Zonguldak', state: 'Zonguldak', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_bartin', city: 'Bartin', state: 'Bartin', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_karabuk', city: 'Karabuk', state: 'Karabuk', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_kirklareli', city: 'Kirklareli', state: 'Kirklareli', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_yalova', city: 'Yalova', state: 'Yalova', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_bilecik', city: 'Bilecik', state: 'Bilecik', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_osmaniye', city: 'Osmaniye', state: 'Osmaniye', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_kilis', city: 'Kilis', state: 'Kilis', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_hatay', city: 'Hatay', state: 'Hatay', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_malatya', city: 'Malatya', state: 'Malatya', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_adiyaman', city: 'Adiyaman', state: 'Adiyaman', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_sanliurfa', city: 'Sanliurfa', state: 'Sanliurfa', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_mardin', city: 'Mardin', state: 'Mardin', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_siirt', city: 'Siirt', state: 'Siirt', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_sirnak', city: 'Sirnak', state: 'Sirnak', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_hakkari', city: 'Hakkari', state: 'Hakkari', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_mus', city: 'Mus', state: 'Mus', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_bitlis', city: 'Bitlis', state: 'Bitlis', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_agri', city: 'Agri', state: 'Agri', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_igdir', city: 'Igdir', state: 'Igdir', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_kars', city: 'Kars', state: 'Kars', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_ardahan', city: 'Ardahan', state: 'Ardahan', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_aksaray', city: 'Aksaray', state: 'Aksaray', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_nevsehir', city: 'Nevsehir', state: 'Nevsehir', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_kirsehir', city: 'Kirsehir', state: 'Kirsehir', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_yozgat', city: 'Yozgat', state: 'Yozgat', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_karaman', city: 'Karaman', state: 'Karaman', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_nigde', city: 'Nigde', state: 'Nigde', country: 'Turkey', tierId: 'tier_3' },
      { id: 'mapping_bayburt', city: 'Bayburt', state: 'Bayburt', country: 'Turkey', tierId: 'tier_3' }
    ];
  }
}