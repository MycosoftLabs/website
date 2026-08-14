/**
 * @jest-environment node
 *
 * Activate auth gate: paying does not prove inbox ownership.
 * Auto-login only when this purchase created the auth user.
 * Email lookup must page past the first 200 auth users.
 */

import {
  ensureUser,
  findUserIdByEmail,
  provisionPaidPublicPurchase,
  shouldAutoLoginAfterPurchase,
} from '../billing/provision';

jest.mock('../billing/grants', () => ({
  grantCatalogProductToTenant: jest.fn(async () => ({ granted: true })),
}));

type ListedUser = { id: string; email: string };

function pageOf(count: number, start: number): ListedUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${start + i}`,
    email: `user${start + i}@example.com`,
  }));
}

function mockAuthAdmin(opts: {
  pages: ListedUser[][];
  create?: { id: string } | { error: string };
  getById?: { id: string; metadata?: Record<string, unknown>; created_at?: string };
}) {
  const listUsers = jest.fn(async ({ page }: { page: number }) => ({
    data: { users: opts.pages[page - 1] ?? [] },
    error: null,
  }));
  const createUser = jest.fn(async () => {
    if (opts.create && 'error' in opts.create) {
      return { data: { user: null }, error: { message: opts.create.error } };
    }
    if (opts.create && 'id' in opts.create) {
      return { data: { user: { id: opts.create.id } }, error: null };
    }
    return { data: { user: null }, error: { message: 'not configured' } };
  });
  const getUserById = jest.fn(async () => ({
    data: {
      user: opts.getById
        ? {
            id: opts.getById.id,
            user_metadata: opts.getById.metadata ?? {},
            created_at: opts.getById.created_at ?? new Date().toISOString(),
          }
        : null,
    },
    error: null,
  }));
  return {
    auth: { admin: { listUsers, createUser, getUserById } },
    listUsers,
    createUser,
    getUserById,
  };
}

describe('shouldAutoLoginAfterPurchase', () => {
  test('only the created-user flag unlocks auto-login', () => {
    expect(shouldAutoLoginAfterPurchase({ userWasCreated: true })).toBe(true);
    expect(shouldAutoLoginAfterPurchase({ userWasCreated: false })).toBe(false);
    expect(shouldAutoLoginAfterPurchase({})).toBe(false);
    expect(shouldAutoLoginAfterPurchase({ userWasCreated: undefined })).toBe(false);
  });
});

describe('findUserIdByEmail pagination', () => {
  test('finds a user on page 2 and does not throw at the 200-row cap', async () => {
    const target = { id: 'user-beyond-200', email: 'beyond@example.com' };
    const admin = mockAuthAdmin({
      pages: [pageOf(200, 1), [target, { id: 'user-202', email: 'other@example.com' }]],
    });
    const id = await findUserIdByEmail(admin as never, 'beyond@example.com');
    expect(id).toBe('user-beyond-200');
    expect(admin.listUsers).toHaveBeenCalledTimes(2);
    expect(admin.listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 200 });
    expect(admin.listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 200 });
  });

  test('returns null after exhausting short pages — never throws', async () => {
    const admin = mockAuthAdmin({
      pages: [pageOf(200, 1), pageOf(3, 201)],
    });
    await expect(findUserIdByEmail(admin as never, 'missing@example.com')).resolves.toBeNull();
    expect(admin.listUsers).toHaveBeenCalledTimes(2);
  });

  test('uses getUserByEmail when the admin client exposes it', async () => {
    const admin = mockAuthAdmin({ pages: [pageOf(1, 1)] });
    const getUserByEmail = jest.fn(async () => ({
      data: { user: { id: 'direct-id' } },
      error: null,
    }));
    (admin.auth.admin as { getUserByEmail: typeof getUserByEmail }).getUserByEmail = getUserByEmail;
    const id = await findUserIdByEmail(admin as never, 'direct@example.com');
    expect(id).toBe('direct-id');
    expect(getUserByEmail).toHaveBeenCalledWith('direct@example.com');
    expect(admin.listUsers).not.toHaveBeenCalled();
  });
});

describe('ensureUser created flag', () => {
  test('existing email is adopted but marked not created', async () => {
    const admin = mockAuthAdmin({
      pages: [[{ id: 'existing-1', email: 'morgan@mycosoft.org' }]],
    });
    const result = await ensureUser(admin as never, 'morgan@mycosoft.org', 'Morgan');
    expect(result).toEqual({ id: 'existing-1', created: false });
    expect(admin.createUser).not.toHaveBeenCalled();
  });

  test('new email creates the auth user', async () => {
    const admin = mockAuthAdmin({
      pages: [[]],
      create: { id: 'new-1' },
    });
    const result = await ensureUser(admin as never, 'new.buyer@example.com', 'Buyer');
    expect(result).toEqual({ id: 'new-1', created: true });
    expect(admin.createUser).toHaveBeenCalled();
  });
});

function mockProvisionSvc(opts: {
  admin: ReturnType<typeof mockAuthAdmin>;
  pending?: Record<string, unknown> | null;
  membership?: { tenant_id: string } | null;
}) {
  const updates: Record<string, unknown>[] = [];
  return {
    ...opts.admin,
    from(table: string) {
      return {
        select() {
          const chain = {
            eq() {
              return chain;
            },
            order() {
              return chain;
            },
            limit() {
              return chain;
            },
            async maybeSingle() {
              if (table === 'launchpad_pending_purchases') {
                return { data: opts.pending ?? null };
              }
              if (table === 'launchpad_memberships') {
                return { data: opts.membership ?? null };
              }
              return { data: null };
            },
          };
          return chain;
        },
        update(patch: Record<string, unknown>) {
          updates.push(patch);
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    },
    async rpc() {
      return { data: 'tenant-created', error: null };
    },
    updates,
  };
}

describe('provisionPaidPublicPurchase userWasCreated', () => {
  test('existing email → userWasCreated false (no auto-login)', async () => {
    const admin = mockAuthAdmin({
      pages: [[{ id: 'existing-1', email: 'morgan@mycosoft.org' }]],
    });
    const svc = mockProvisionSvc({ admin, pending: { status: 'paid' } });
    const result = await provisionPaidPublicPurchase(svc as never, {
      stripeSessionId: 'cs_test_existingemail12345',
      eventId: 'evt_1',
      email: 'morgan@mycosoft.org',
      lookupKey: 'fus_launchpad_core_monthly',
      company: 'Mycosoft',
      contactName: 'Attacker',
      customerId: null,
      subscriptionId: null,
    });
    expect(result.ok).toBe(true);
    expect(result.userWasCreated).toBe(false);
    expect(shouldAutoLoginAfterPurchase(result)).toBe(false);
    expect(svc.updates.some((u) => u.user_was_created === true)).toBe(false);
  });

  test('new email → userWasCreated true (auto-login allowed)', async () => {
    const admin = mockAuthAdmin({
      pages: [[]],
      create: { id: 'new-1' },
    });
    const svc = mockProvisionSvc({ admin, pending: { status: 'paid' } });
    const result = await provisionPaidPublicPurchase(svc as never, {
      stripeSessionId: 'cs_test_newbuyer1234567890',
      eventId: 'evt_2',
      email: 'new.buyer@example.com',
      lookupKey: 'fus_launchpad_core_monthly',
      company: 'New Co',
      contactName: 'Buyer',
      customerId: null,
      subscriptionId: null,
    });
    expect(result.ok).toBe(true);
    expect(result.userWasCreated).toBe(true);
    expect(result.userId).toBe('new-1');
    expect(shouldAutoLoginAfterPurchase(result)).toBe(true);
    expect(svc.updates.some((u) => u.user_was_created === true)).toBe(true);
  });
});
