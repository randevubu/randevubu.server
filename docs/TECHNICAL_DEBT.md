# Technical Debt & TODO Items

This document tracks all TODO, FIXME, and HACK comments in the codebase for future improvement.

## Overview

**Last Updated:** 2025-01-18
**Total Items:** 29
**Priority Breakdown:**
- 🔴 High Priority: 3
- 🟡 Medium Priority: 8
- 🟢 Low Priority: 18

---

## 🔴 High Priority (Complete Before Production)

### 1. Email Service Integration
**File:** `src/services/domain/notification/notificationService.ts:231`

```typescript
// TODO: Implement actual email service integration (SendGrid, AWS SES, etc.)
```

**Action Required:**
- Integrate email service provider (SendGrid, AWS SES, or similar)
- Implement email templates
- Add email tracking and delivery confirmation

**Impact:** Critical for production notification system

---

### 2. Email Reminders
**File:** `src/services/domain/appointment/appointmentReminderService.ts:265`

```typescript
// TODO: Implement email reminders
```

**Action Required:**
- Add email reminder support alongside SMS and Push
- Configure email templates for reminders
- Test email delivery

**Impact:** Important for complete notification system

---

### 3. Notification Channel Implementation
**File:** `src/services/domain/notification/notificationService.ts:354`

```typescript
// TODO: Implement based on channel type
```

**Action Required:**
- Complete implementation for all notification channels
- Add channel-specific logic
- Test each channel independently

**Impact:** Ensures all notification types work correctly

---

## 🟡 Medium Priority (Nice to Have)

### 4. Business Name in Closures
**Files:**
- `src/controllers/businessClosureController.ts:908`
- `src/controllers/businessClosureController.ts:955`

```typescript
businessName: 'Business Name', // TODO: Get from business service
```

**Action Required:**
- Fetch actual business name from business service
- Update closure notification context

**Impact:** Better UX for closure notifications

---

### 5. Customer Analytics Calculations

**File:** `src/services/domain/customer/customerRelationshipService.ts`

Multiple TODO items for analytics:
- Line 216: Preferred services calculation
- Line 369: New customers this month
- Line 370: Returning customers
- Line 371: Average spending
- Line 372: Top spending customers
- Line 373: Customer retention rate
- Line 374: Average appointments per customer

**Action Required:**
- Implement proper analytics queries
- Add caching for expensive calculations
- Create dashboard endpoints

**Impact:** Essential for business intelligence features

---

### 6. Reports Service Analytics

**File:** `src/services/domain/reports/reportsService.ts`

Multiple analytics TODOs:
- Line 417: Average rating system
- Line 731-732: Customer tracking (new/returning)
- Line 735: Retention rate calculation
- Line 737: Acquisition tracking
- Line 904: Rating system
- Line 963: Revenue growth calculation
- Line 1026: Utilization rate
- Line 1028: Average wait time
- Line 1100-1101: Customer acquisition cost and retention
- Line 1224: Service demand growth

**Action Required:**
- Implement comprehensive analytics engine
- Add database views for performance
- Create background jobs for calculations

**Impact:** Critical for business insights and reporting

---

### 7. Staff Role Management
**File:** `src/services/domain/business/customerManagementService.ts:121`

```typescript
role: 'STAFF' // TODO: Get actual role from business staff
```

**Action Required:**
- Fetch actual role from business staff relation
- Update customer management logic

**Impact:** Correct permission handling

---

### 8. Staff Join Date
**File:** `src/services/domain/business/customerManagementService.ts:242`

```typescript
joinedAt: new Date() // TODO: Get actual join date
```

**Action Required:**
- Get actual join date from business staff record
- Fix data accuracy

**Impact:** Data accuracy for staff management

---

## 🟢 Low Priority (Future Enhancements)

### 9. Next Appointments Feature
**File:** `src/controllers/reportsController.ts:963`

```typescript
nextAppointments: [], // TODO: Get upcoming appointments
```

**Action Required:**
- Add upcoming appointments query
- Implement in reports endpoint

**Impact:** Enhanced reporting features

---

### 10. Translation Service Database Migration
**File:** `src/services/translationService.ts:94`

```typescript
// TODO: Enable when database migration is applied
```

**Action Required:**
- Check if migration is applied
- Enable the feature
- Test translations

**Impact:** Multi-language support

---

## Implementation Plan

### Phase 1: Critical Features (Week 1-2)
1. ✅ Email service integration (SendGrid/AWS SES)
2. ✅ Email reminder implementation
3. ✅ Complete notification channel logic

### Phase 2: Analytics & Reporting (Week 3-4)
1. Customer analytics calculations
2. Reports service analytics
3. Revenue and growth calculations
4. Performance optimization with caching

### Phase 3: Data Accuracy (Week 5)
1. Business name integration
2. Staff role management
3. Staff join date fixes
4. Next appointments feature

### Phase 4: Enhancements (Week 6+)
1. Translation service enablement
2. Additional analytics features
3. Performance optimizations
4. UI improvements

---

## Contributing

When working on TODO items:

1. **Create GitHub Issue:**
   ```
   Title: [TODO] Brief description
   Labels: technical-debt, priority-level
   ```

2. **Update This Document:**
   - Mark item as in-progress
   - Add assignee and start date
   - Link to GitHub issue/PR

3. **Test Thoroughly:**
   - Add unit tests
   - Update integration tests
   - Test in staging environment

4. **Document Changes:**
   - Update API documentation
   - Add migration guides if needed
   - Update CHANGELOG.md

---

## Metrics

Track technical debt reduction:

```
Initial TODO Count: 29
Resolved: 0
In Progress: 0
Remaining: 29
```

**Goal:** Reduce to <10 TODOs before stable 1.0 release

---

## Notes

- Most TODOs are for future enhancements, not bugs
- No critical blocking issues found
- Analytics features are the largest area needing work
- Email integration is the highest priority for production

---

## Related Documents

- [Development Roadmap](./ROADMAP.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](../api-docs)
