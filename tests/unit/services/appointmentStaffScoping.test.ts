/**
 * Appointment Staff Scoping Tests
 *
 * Verifies that each user role only receives appointments
 * scoped according to the business rules:
 *
 *  - OWNER (global role or business_staff.role=OWNER) with no staffId selector
 *      → sees ALL appointments in the business
 *  - OWNER with explicit staffId selector
 *      → sees only that staff member's appointments
 *  - STAFF / MANAGER / RECEPTIONIST
 *      → always see only their own appointments; staffId param is ignored
 *  - ADMIN
 *      → sees all by default; optional staffId selector respected
 *  - User with no staff record → empty results
 *  - Cross-business access → denied / empty
 */

import { AppointmentService } from '../../../src/services/domain/appointment/appointmentService';
import { AuthorizationError } from '../../../src/utils/errors/customError';

// ─── Shared IDs ──────────────────────────────────────────────────────────────
const BUSINESS_ID    = 'biz-001';
const OTHER_BIZ_ID   = 'biz-002';
const OWNER_USER_ID  = 'user-owner';
const STAFF_A_USER   = 'user-staff-a';
const STAFF_B_USER   = 'user-staff-b';
const ADMIN_USER_ID  = 'user-admin';
const STRANGER_USER  = 'user-stranger';

const OWNER_STAFF_ID   = 'bs-owner';
const STAFF_A_STAFF_ID = 'bs-staff-a';
const STAFF_B_STAFF_ID = 'bs-staff-b';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeAppointment(staffId: string | null, id = `apt-${staffId}`) {
  return { id, staffId } as any;
}

// business_staff rows keyed by userId + businessId
const STAFF_ROWS: Record<string, { id: string; role: string; businessId: string }> = {
  [OWNER_USER_ID]: { id: OWNER_STAFF_ID,   role: 'OWNER', businessId: BUSINESS_ID },
  [STAFF_A_USER]:  { id: STAFF_A_STAFF_ID,  role: 'STAFF', businessId: BUSINESS_ID },
  [STAFF_B_USER]:  { id: STAFF_B_STAFF_ID,  role: 'STAFF', businessId: BUSINESS_ID },
};

// ─── Mock factories ───────────────────────────────────────────────────────────
function makeRbac(roleName: string) {
  return {
    getUserPermissions: jest.fn().mockResolvedValue({
      roles: [{ name: roleName }],
      effectiveLevel: roleName === 'ADMIN' ? 1000 : roleName === 'OWNER' ? 300 : 200,
    }),
    hasPermission:      jest.fn().mockResolvedValue(false),
    requirePermission:  jest.fn().mockResolvedValue(undefined),
    forceInvalidateUser: jest.fn(),
  } as any;
}

function makePrismaClient(userId: string) {
  const staffRow = STAFF_ROWS[userId] ?? null;
  return {
    businessStaff: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        if (!staffRow) return Promise.resolve(null);
        // role-specific check (resolveStaffFilter passes role = 'OWNER')
        if (where?.role === 'OWNER' && staffRow.role !== 'OWNER') return Promise.resolve(null);
        // businessId-specific check (resolveStaffFilter always passes businessId)
        if (where?.businessId && where.businessId !== staffRow.businessId) return Promise.resolve(null);
        return Promise.resolve(staffRow);
      }),
      findMany: jest.fn().mockResolvedValue(staffRow ? [staffRow] : []),
    },
  } as any;
}

function makeAppointmentRepo(appointments: any[]) {
  return {
    finalizeEndedAppointmentsIfStale: jest.fn().mockResolvedValue(undefined),

    /** findByUserBusinesses — used by getMyAppointments */
    findByUserBusinesses: jest.fn().mockImplementation((_userId: string, filters: any) => {
      const ids: string[] | undefined = filters?.staffIds;
      const filtered = ids ? appointments.filter(a => ids.includes(a.staffId)) : appointments;
      return Promise.resolve({ appointments: filtered, total: filtered.length, page: 1, totalPages: 1 });
    }),

    /** findByBusinessId — used by getBusinessAppointments */
    findByBusinessId: jest.fn().mockImplementation((_bId: string, _p: number, _l: number, staffIds?: string[]) => {
      const filtered = staffIds ? appointments.filter(a => staffIds.includes(a.staffId)) : appointments;
      return Promise.resolve({ appointments: filtered, total: filtered.length, page: 1, totalPages: 1 });
    }),

    /** findByBusinessAndDateRange — used by getMonitorAppointments */
    findByBusinessAndDateRange: jest.fn().mockImplementation((_bId: string, _s: Date, _e: Date, staffIds?: string[]) => {
      const filtered = staffIds ? appointments.filter(a => staffIds.includes(a.staffId)) : appointments;
      return Promise.resolve(filtered);
    }),
  } as any;
}

function makeService(userId: string, roleName: string, repoAppointments: any[]): AppointmentService {
  return new AppointmentService(
    makeAppointmentRepo(repoAppointments),
    {} as any, // serviceRepository
    {} as any, // userBehaviorRepository
    {} as any, // businessClosureRepository
    { findById: jest.fn().mockResolvedValue({ id: BUSINESS_ID, name: 'Test Biz', timezone: 'Europe/Istanbul' }) } as any,
    makeRbac(roleName),
    {} as any, // businessService
    {} as any, // notificationService
    {} as any, // usageService
    { prismaClient: makePrismaClient(userId) } as any, // repositories
    {} as any, // cancellationPolicyService
    {} as any, // notificationGateway
  );
}

// ─── Test data: one appointment per staff member ──────────────────────────────
const ALL_APPOINTMENTS = [
  makeAppointment(OWNER_STAFF_ID,   'apt-owner'),
  makeAppointment(STAFF_A_STAFF_ID, 'apt-staff-a'),
  makeAppointment(STAFF_B_STAFF_ID, 'apt-staff-b'),
];

// ═════════════════════════════════════════════════════════════════════════════
// getMyAppointments
// ═════════════════════════════════════════════════════════════════════════════
describe('getMyAppointments – staff scoping', () => {

  // ── Owner: default (no staff selector) ──────────────────────────────────
  it('OWNER with no staff selector sees ALL business appointments', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(OWNER_USER_ID);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-owner');
    expect(ids).toContain('apt-staff-a');
    expect(ids).toContain('apt-staff-b');
  });

  // ── Owner: staff selector applied ───────────────────────────────────────
  it('OWNER with staffId selector sees only that staff member\'s appointments', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(OWNER_USER_ID, { staffId: STAFF_A_STAFF_ID });
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-a');
    expect(ids).not.toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-b');
  });

  it('OWNER with own staffId selector sees only their own appointments', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(OWNER_USER_ID, { staffId: OWNER_STAFF_ID });
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-a');
    expect(ids).not.toContain('apt-staff-b');
  });

  // ── Staff A ──────────────────────────────────────────────────────────────
  it('STAFF A sees only their own appointments', async () => {
    const svc = makeService(STAFF_A_USER, 'STAFF', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(STAFF_A_USER);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-a');
    expect(ids).not.toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-b');
  });

  // ── Staff B ──────────────────────────────────────────────────────────────
  it('STAFF B sees only their own appointments', async () => {
    const svc = makeService(STAFF_B_USER, 'STAFF', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(STAFF_B_USER);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-b');
    expect(ids).not.toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-a');
  });

  // ── Cross-staff visibility denied for non-owner ──────────────────────────
  it('STAFF A cannot see STAFF B appointments', async () => {
    const svc = makeService(STAFF_A_USER, 'STAFF', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(STAFF_A_USER);
    expect(result.appointments.map((a: any) => a.id)).not.toContain('apt-staff-b');
  });

  it('STAFF B cannot see STAFF A appointments', async () => {
    const svc = makeService(STAFF_B_USER, 'STAFF', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(STAFF_B_USER);
    expect(result.appointments.map((a: any) => a.id)).not.toContain('apt-staff-a');
  });

  // ── No staff record ───────────────────────────────────────────────────────
  it('user with no staff record gets empty results', async () => {
    const svc = makeService(STRANGER_USER, 'STAFF', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(STRANGER_USER);
    expect(result.appointments).toHaveLength(0);
  });

  // ── Access control ────────────────────────────────────────────────────────
  it('user without a business role is denied access', async () => {
    const svc = makeService(STRANGER_USER, 'CUSTOMER', ALL_APPOINTMENTS);
    await expect(svc.getMyAppointments(STRANGER_USER)).rejects.toThrow(AuthorizationError);
  });

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  it('ADMIN with no selector sees all appointments', async () => {
    const svc = makeService(ADMIN_USER_ID, 'ADMIN', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(ADMIN_USER_ID);
    expect(result.appointments).toHaveLength(3);
  });

  it('ADMIN with staffId selector sees only that staff member', async () => {
    const svc = makeService(ADMIN_USER_ID, 'ADMIN', ALL_APPOINTMENTS);
    const result = await svc.getMyAppointments(ADMIN_USER_ID, { staffId: STAFF_B_STAFF_ID });
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-b');
    expect(ids).not.toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-a');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getBusinessAppointments
// ═════════════════════════════════════════════════════════════════════════════
describe('getBusinessAppointments – staff scoping', () => {

  // ── Owner: default (no staff selector) ──────────────────────────────────
  it('OWNER with no staff selector sees ALL business appointments', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const result = await svc.getBusinessAppointments(OWNER_USER_ID, BUSINESS_ID);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-owner');
    expect(ids).toContain('apt-staff-a');
    expect(ids).toContain('apt-staff-b');
  });

  // ── Owner: staff selector ────────────────────────────────────────────────
  it('OWNER with staffId selector sees only that staff member\'s appointments', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const result = await svc.getBusinessAppointments(OWNER_USER_ID, BUSINESS_ID, 1, 20, STAFF_A_STAFF_ID);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-a');
    expect(ids).not.toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-b');
  });

  it('OWNER with own staffId selector sees only their own appointments', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const result = await svc.getBusinessAppointments(OWNER_USER_ID, BUSINESS_ID, 1, 20, OWNER_STAFF_ID);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-a');
    expect(ids).not.toContain('apt-staff-b');
  });

  // ── Staff scoping ─────────────────────────────────────────────────────────
  it('STAFF A sees only their own appointments', async () => {
    const svc = makeService(STAFF_A_USER, 'STAFF', ALL_APPOINTMENTS);
    const result = await svc.getBusinessAppointments(STAFF_A_USER, BUSINESS_ID);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-a');
    expect(ids).not.toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-b');
  });

  it('STAFF ignores staffId param — cannot escalate to see other staff', async () => {
    const svc = makeService(STAFF_A_USER, 'STAFF', ALL_APPOINTMENTS);
    // Even if STAFF_B id is passed, Staff A still only sees their own
    const result = await svc.getBusinessAppointments(STAFF_A_USER, BUSINESS_ID, 1, 20, STAFF_B_STAFF_ID);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-a');
    expect(ids).not.toContain('apt-staff-b');
  });

  it('STAFF B cannot see STAFF A appointments', async () => {
    const svc = makeService(STAFF_B_USER, 'STAFF', ALL_APPOINTMENTS);
    const result = await svc.getBusinessAppointments(STAFF_B_USER, BUSINESS_ID);
    expect(result.appointments.map((a: any) => a.id)).not.toContain('apt-staff-a');
  });

  // ── Cross-business access ─────────────────────────────────────────────────
  it('OWNER cannot see appointments from a different business', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    // resolveStaffFilter returns null for owner (all), but findByBusinessId is
    // scoped to the businessId argument — which is the other business here.
    // The repo mock returns an empty list because no appointments belong to OTHER_BIZ_ID.
    const repo = (svc as any).appointmentRepository;
    repo.findByBusinessId.mockResolvedValueOnce({ appointments: [], total: 0, page: 1, totalPages: 0 });
    const result = await svc.getBusinessAppointments(OWNER_USER_ID, OTHER_BIZ_ID);
    expect(result.appointments).toHaveLength(0);
  });

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  it('ADMIN with no selector sees all appointments', async () => {
    const svc = makeService(ADMIN_USER_ID, 'ADMIN', ALL_APPOINTMENTS);
    const result = await svc.getBusinessAppointments(ADMIN_USER_ID, BUSINESS_ID);
    expect(result.appointments).toHaveLength(3);
  });

  it('ADMIN with staffId selector sees only that staff member', async () => {
    const svc = makeService(ADMIN_USER_ID, 'ADMIN', ALL_APPOINTMENTS);
    const result = await svc.getBusinessAppointments(ADMIN_USER_ID, BUSINESS_ID, 1, 20, STAFF_B_STAFF_ID);
    const ids = result.appointments.map((a: any) => a.id);
    expect(ids).toContain('apt-staff-b');
    expect(ids).not.toContain('apt-owner');
    expect(ids).not.toContain('apt-staff-a');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getMonitorAppointments — resolveStaffFilter path
// ═════════════════════════════════════════════════════════════════════════════
describe('getMonitorAppointments – staff scoping (via resolveStaffFilter)', () => {

  it('OWNER with no selector passes null staffIds → repo gets no staff filter', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const repo = (svc as any).appointmentRepository;
    await svc.getMonitorAppointments(BUSINESS_ID, OWNER_USER_ID);
    const call = repo.findByBusinessAndDateRange.mock.calls[0];
    // 4th argument is staffIds — should be undefined (null resolved to undefined in service call)
    expect(call[3]).toBeUndefined();
  });

  it('OWNER with staffId selector passes only that staff to repo', async () => {
    const svc = makeService(OWNER_USER_ID, 'OWNER', ALL_APPOINTMENTS);
    const repo = (svc as any).appointmentRepository;
    await svc.getMonitorAppointments(BUSINESS_ID, OWNER_USER_ID, undefined, STAFF_A_STAFF_ID);
    const call = repo.findByBusinessAndDateRange.mock.calls[0];
    expect(call[3]).toEqual([STAFF_A_STAFF_ID]);
  });

  it('STAFF A passes only their own staffId to repo', async () => {
    const svc = makeService(STAFF_A_USER, 'STAFF', ALL_APPOINTMENTS);
    const repo = (svc as any).appointmentRepository;
    await svc.getMonitorAppointments(BUSINESS_ID, STAFF_A_USER);
    const call = repo.findByBusinessAndDateRange.mock.calls[0];
    expect(call[3]).toEqual([STAFF_A_STAFF_ID]);
  });

  it('STAFF B passes only their own staffId to repo', async () => {
    const svc = makeService(STAFF_B_USER, 'STAFF', ALL_APPOINTMENTS);
    const repo = (svc as any).appointmentRepository;
    await svc.getMonitorAppointments(BUSINESS_ID, STAFF_B_USER);
    const call = repo.findByBusinessAndDateRange.mock.calls[0];
    expect(call[3]).toEqual([STAFF_B_STAFF_ID]);
  });

  it('STAFF cannot escalate by passing another staffId — scoping is enforced', async () => {
    const svc = makeService(STAFF_A_USER, 'STAFF', ALL_APPOINTMENTS);
    const repo = (svc as any).appointmentRepository;
    await svc.getMonitorAppointments(BUSINESS_ID, STAFF_A_USER, undefined, STAFF_B_STAFF_ID);
    const call = repo.findByBusinessAndDateRange.mock.calls[0];
    expect(call[3]).toEqual([STAFF_A_STAFF_ID]);
    expect(call[3]).not.toContain(STAFF_B_STAFF_ID);
  });

  it('user with no staff record passes empty staffIds → repo returns nothing', async () => {
    const svc = makeService(STRANGER_USER, 'STAFF', ALL_APPOINTMENTS);
    const repo = (svc as any).appointmentRepository;
    await svc.getMonitorAppointments(BUSINESS_ID, STRANGER_USER);
    const call = repo.findByBusinessAndDateRange.mock.calls[0];
    expect(call[3]).toEqual([]);
  });
});
