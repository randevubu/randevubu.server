// Utility functions to convert between Prisma types and application types
// Prisma uses `null` for nullable fields, but our interfaces use `undefined`

export function convertNullToUndefined<T extends Record<string, any>>(obj: T): T {
  const result = {} as T;
  
  for (const key in obj) {
    if (obj[key] === null) {
      (result as any)[key] = undefined;
    } else if (
      // Convert Prisma Decimal to number
      typeof (obj as any)[key] === 'object' &&
      (obj as any)[key] !== null &&
      typeof (obj as any)[key].toNumber === 'function'
    ) {
      (result as any)[key] = (obj as any)[key].toNumber();
    } else if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      (obj[key] as any)?.constructor?.name !== 'Date'
    ) {
      // Recursively convert nested objects, but skip Dates
      if (Array.isArray(obj[key])) {
        (result as any)[key] = obj[key].map((item: any) => 
          typeof item === 'object' && item !== null ? convertNullToUndefined(item) : item === null ? undefined : item
        );
      } else {
        (result as any)[key] = convertNullToUndefined(obj[key]);
      }
    } else {
      (result as any)[key] = obj[key];
    }
  }
  
  return result;
}

// Type-safe converter for business data
export function convertBusinessData<T>(data: any): T {
  return convertNullToUndefined(data) as T;
}

// Type-safe converter for arrays
export function convertBusinessDataArray<T>(data: any[]): T[] {
  return data.map(item => convertNullToUndefined(item)) as T[];
}