// Simple test to verify Jest is working
describe('Simple Test Suite', () => {
  it('should pass basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const str = 'Hello, World!';
    expect(str).toContain('World');
    expect(str.length).toBe(13);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
    expect(arr[0]).toBe(1);
  });

  it('should handle object operations', () => {
    const obj = { name: 'Test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('Test');
    expect(obj.value).toBe(42);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('async result');
    const result = await promise;
    expect(result).toBe('async result');
  });

  it('should handle error throwing', () => {
    const throwError = () => {
      throw new Error('Test error');
    };
    
    expect(throwError).toThrow('Test error');
  });
});

