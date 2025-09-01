// Utility functions to convert between Prisma types and application types
// Prisma uses `null` for nullable fields, but our interfaces use `undefined`

export function convertNullToUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Prisma Decimal objects
  if (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).toNumber === 'function'
  ) {
    return (obj as any).toNumber();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item: any) => convertNullToUndefined(item)) as unknown as T;
  }

  // Handle objects (but skip Date objects)
  if (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as any)?.constructor?.name !== 'Date'
  ) {
    const result = {} as T;
    
    for (const key in obj) {
      if (obj[key] === null) {
        (result as any)[key] = undefined;
      } else {
        (result as any)[key] = convertNullToUndefined(obj[key]);
      }
    }
    
    return result;
  }

  // Return primitive values as-is
  return obj;
}

// Type-safe converter for business data
export function convertBusinessData<T>(data: any): T {
  return convertNullToUndefined(data) as T;
}

// Type-safe converter for arrays
export function convertBusinessDataArray<T>(data: any[]): T[] {
  return data.map(item => convertNullToUndefined(item)) as T[];
}