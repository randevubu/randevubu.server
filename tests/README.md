# Test Suite Documentation

## Overview

Comprehensive test suite for the Randevubu subscription, discount codes, and payment systems. Tests cover unit, integration, and end-to-end scenarios with industry-standard practices.

## Test Structure

```
tests/
├── unit/                          # Unit tests for individual components
│   ├── services/
│   │   ├── subscriptionService.test.ts    # Subscription business logic
│   │   ├── discountCodeService.test.ts    # Discount validation & management
│   │   └── paymentService.test.ts         # Payment processing
│   └── controllers/                       # Controller layer tests (existing)
│       ├── subscriptionController.test.ts
│       ├── discountCodeController.test.ts
│       └── paymentController.test.ts
├── integration/                   # Integration tests for complete flows
│   ├── completeSubscriptionFlow.test.ts   # End-to-end subscription scenarios
│   └── edgeCases.test.ts                  # Edge cases & error handling
├── e2e/                          # End-to-end tests (existing)
│   └── userRegistrationWorkflow.test.ts
├── utils/                        # Test utilities
│   ├── testHelpers.ts           # Mock generators & helpers
│   ├── mockFactories.ts         # Data factory functions
│   └── testData.ts              # Centralized test data
├── fixtures/                     # Test fixtures
└── setup.ts                      # Global test setup
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI/CD optimized
npm run test:ci
```

### Running Specific Files
```bash
# Single test file
npm test -- subscriptionService.test.ts

# Test pattern
npm test -- --testPathPattern=discount

# Specific test suite
npm test -- --testNamePattern="should create trial subscription"
```

## Test Coverage

### Current Coverage

#### Unit Tests: Service Layer
- **SubscriptionService**: 30+ test cases
  - Plan retrieval & management
  - Location-based pricing
  - Trial subscription creation
  - Immediate paid subscriptions
  - Discount integration
  - Cancellation & reactivation
  - Admin operations
  - Permission validation

- **DiscountCodeService**: 40+ test cases
  - Code creation & validation
  - One-time discounts
  - Recurring discounts
  - Expiration handling
  - Usage limits
  - Per-user restrictions
  - Plan-specific discounts
  - Bulk generation
  - Statistics & analytics

- **PaymentService**: 35+ test cases
  - Payment creation
  - Discount application
  - Refunds (full & partial)
  - Payment cancellation
  - Retry logic
  - Webhook handling
  - Card validation
  - Test cards

#### Integration Tests
- **Complete Subscription Flows**: 5 major scenarios
  1. Trial subscription with one-time discount
  2. Recurring discount (3 payments)
  3. Late discount application
  4. Payment failure & retry logic
  5. Subscription upgrade with proration

- **Edge Cases**: 50+ scenarios
  - Concurrent operations
  - Data integrity
  - Timezone handling
  - Security considerations
  - Performance scenarios
  - Business logic edge cases

### Coverage Goals
- **Statements**: 80%+
- **Branches**: 70%+
- **Functions**: 75%+
- **Lines**: 80%+

## Test Data

### Centralized Test Constants

Located in `tests/utils/testData.ts`:

- **TEST_USER_IDS**: Admin, regular user, business owner, suspended user
- **TEST_BUSINESS_IDS**: Active, trial, expired, canceled businesses
- **TEST_PLAN_IDS**: All tier plans (basic & premium)
- **TEST_DISCOUNT_CODES**: Valid, expired, exhausted, inactive codes
- **TEST_PRICES**: Prices for all plan tiers
- **TEST_CARD_DATA**: Valid/invalid test cards
- **TEST_BUYER_DATA**: Buyer information for different cities
- **TEST_ERROR_MESSAGES**: Standard error messages

### Mock Factories

Located in `tests/utils/mockFactories.ts`:

- `subscriptionPlan()` - Create plan mock
- `premiumPlan()` - Create premium plan mock
- `businessSubscription()` - Create subscription mock
- `trialSubscription()` - Create trial subscription mock
- `trialWithDiscount()` - Create trial with discount mock
- `discountCode()` - Create discount code mock
- `recurringDiscountCode()` - Create recurring discount mock
- `expiredDiscountCode()` - Create expired code mock
- `exhaustedDiscountCode()` - Create exhausted code mock
- `payment()` - Create payment mock
- `paymentWithDiscount()` - Create payment with discount mock
- `failedPayment()` - Create failed payment mock
- `cardData()` - Create card data mock
- `buyerData()` - Create buyer data mock
- `testCards()` - Get Iyzico test cards

### Test Helpers

Located in `tests/utils/testHelpers.ts`:

- `createMockRequest()` - Create Express request mock
- `createMockResponse()` - Create Express response mock
- `createMockAuthRequest()` - Create authenticated request mock
- `createMockPrisma()` - Create Prisma client mock
- `generateId()` - Generate test IDs
- `futureDate()` - Create future date
- `pastDate()` - Create past date
- `wait()` - Async wait helper

## Writing Tests

### Test Structure

```typescript
describe('ComponentName', () => {
  let service: ServiceClass;
  let mockDependency: jest.Mocked<DependencyClass>;

  beforeEach(() => {
    // Setup mocks
    mockDependency = {
      method: jest.fn()
    } as any;

    // Create service instance
    service = new ServiceClass(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = MockFactories.createInput();
      mockDependency.method.mockResolvedValue(expectedResult);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });

    it('should handle error case', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(
        service.methodName(invalidInput)
      ).rejects.toThrow('Test error');
    });
  });
});
```

### Best Practices

1. **Use AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test**: Keep tests focused
3. **Mock external dependencies**: Use test doubles
4. **Test behavior, not implementation**: Focus on outcomes
5. **Use descriptive test names**: "should [expected behavior] when [condition]"
6. **Clean up after tests**: Use afterEach hooks
7. **Avoid test interdependence**: Each test should be isolated
8. **Use test data constants**: Centralize test data
9. **Test error cases**: Not just happy paths
10. **Keep tests DRY**: Use factories and helpers

## Scenarios Tested

### Subscription Scenarios
- ✅ Create trial subscription
- ✅ Create immediate paid subscription
- ✅ Apply discount at subscription creation
- ✅ Apply discount to existing subscription
- ✅ Trial conversion to active
- ✅ Subscription cancellation (immediate & period-end)
- ✅ Subscription reactivation
- ✅ Plan upgrade with proration
- ✅ Plan downgrade
- ✅ Subscription expiration
- ✅ Multiple active subscriptions prevention
- ✅ Location-based pricing

### Discount Code Scenarios
- ✅ One-time discount validation
- ✅ Recurring discount (multiple uses)
- ✅ Expired code rejection
- ✅ Inactive code rejection
- ✅ Usage limit enforcement
- ✅ Per-user usage limits
- ✅ Plan-specific discounts
- ✅ Minimum purchase amount
- ✅ Percentage vs fixed amount
- ✅ Discount exceeding purchase amount
- ✅ Late discount application
- ✅ Concurrent discount applications
- ✅ Bulk code generation

### Payment Scenarios
- ✅ Successful payment
- ✅ Failed payment
- ✅ Payment with discount
- ✅ Full refund
- ✅ Partial refund
- ✅ Payment cancellation
- ✅ Payment retry (up to 3 times)
- ✅ Successful retry on second attempt
- ✅ Card validation
- ✅ Expired card rejection
- ✅ 3D Secure handling
- ✅ Webhook processing
- ✅ Idempotency
- ✅ Concurrent payments

### Edge Cases
- ✅ Timezone handling
- ✅ Daylight saving time
- ✅ Race conditions
- ✅ Data integrity
- ✅ Orphaned records
- ✅ Null/undefined handling
- ✅ Very large numbers
- ✅ Very small numbers (0.01)
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Long string handling
- ✅ Pagination edge cases

## Industry Standards Compliance

### PCI DSS
- ✅ No card data in logs
- ✅ Card data encrypted
- ✅ Tokenization used
- ✅ Audit trail maintained

### Strong Customer Authentication (SCA)
- ✅ 3D Secure integration
- ✅ Card verification
- ✅ Authentication failure handling

### GDPR
- ✅ Data anonymization in tests
- ✅ User consent tracking
- ✅ Data deletion capability

### Financial Regulations
- ✅ Refund policy compliance
- ✅ Proration accuracy
- ✅ Transaction audit trail
- ✅ Receipt generation

## Continuous Integration

### GitHub Actions / GitLab CI

```yaml
test:
  script:
    - npm install
    - npm run test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

### Pre-commit Hook

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test"
    }
  }
}
```

## Debugging Tests

### Run with Debugging
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### VSCode Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Verbose Output
```bash
npm test -- --verbose
```

### Watch Specific File
```bash
npm run test:watch -- subscriptionService
```

## Performance

### Test Execution Time
- Unit tests: < 5 seconds
- Integration tests: < 30 seconds
- Full suite: < 60 seconds

### Optimization Tips
1. Mock external services (database, payment gateway)
2. Use `--maxWorkers=50%` for parallel execution
3. Use `--bail` to stop on first failure
4. Use `--onlyChanged` during development
5. Cache Jest transforms

## Troubleshooting

### Common Issues

**Tests timing out**
```bash
# Increase timeout
jest.setTimeout(10000);
```

**Module not found**
```bash
# Clear Jest cache
npm test -- --clearCache
```

**Mock not working**
```bash
# Reset mocks
jest.clearAllMocks();
jest.resetModules();
```

**Database connection errors**
```bash
# Use test database
process.env.DATABASE_URL = 'test-database-url';
```

## Contributing

### Adding New Tests

1. Identify what to test
2. Choose appropriate test type (unit/integration/e2e)
3. Use existing factories and helpers
4. Follow AAA pattern
5. Add descriptive test names
6. Include both success and error cases
7. Update this README if needed

### Test Naming Convention

```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should [expected result] when [condition]', () => {});
    it('should throw error if [invalid condition]', () => {});
  });
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Mocking Strategies](https://kentcdodds.com/blog/mocking-is-a-code-smell)

## Maintainers

For questions or issues with the test suite, contact the development team.

---

**Last Updated**: 2025-01-22
**Version**: 1.0.0
**Coverage**: 80%+ (target: 90%+)
