import { query, transaction } from '../config/database';
import {
  acquireTicketValidationLock,
  releaseTicketValidationLock,
  setIfAbsent,
} from '../config/redis';
import {
  TicketValidationError,
  computeQrSignature,
  parseQrScan,
  validateTicketQr,
} from './ticket.service';

jest.mock('../config/database', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../config/redis', () => ({
  acquireTicketValidationLock: jest.fn(),
  releaseTicketValidationLock: jest.fn(),
  setIfAbsent: jest.fn(),
}));

const mockedQuery = query as unknown as jest.Mock;
const mockedTransaction = transaction as unknown as jest.Mock;
const mockedAcquire = acquireTicketValidationLock as unknown as jest.Mock;
const mockedRelease = releaseTicketValidationLock as unknown as jest.Mock;
const mockedSetIfAbsent = setIfAbsent as unknown as jest.Mock;

const baseTicket = {
  id: 'ticket-1',
  ticket_code: 'TB-001',
  trip_id: 'trip-1',
  seat_number: 'A1',
  fare_amount: '100000.00',
  status: 'BOOKED',
  full_name: 'Nguyen Van A',
  email: 'a@example.com',
  route_name: 'Ha Noi - Hai Phong',
  route_code: 'HN-HP',
};

function makeClient(ticketRow: typeof baseTicket | null) {
  return {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM tickets t')) return { rows: ticketRow ? [ticketRow] : [] };
      if (sql.includes('INSERT INTO ticket_validation_logs')) return { rows: [{ id: 'log-1' }] };
      return { rows: [], rowCount: 1 };
    }),
  };
}

async function runWithClient(ticketRow: typeof baseTicket | null, input: Record<string, unknown>) {
  const client = makeClient(ticketRow);
  mockedTransaction.mockImplementation(async (work: (c: unknown) => Promise<unknown>) =>
    work(client)
  );
  try {
    const result = await validateTicketQr(input as never);
    return { result, client };
  } catch (error) {
    return { error, client };
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedAcquire.mockResolvedValue('lock-1');
  mockedRelease.mockResolvedValue(undefined);
  mockedQuery.mockResolvedValue([]);
  mockedSetIfAbsent.mockResolvedValue(true);
});

describe('parseQrScan', () => {
  it('accepts a raw ticket code', () => {
    expect(parseQrScan(' TB-001 ')).toEqual({ code: 'TB-001' });
  });

  it('strips the SMARTBUS-QR- prefix', () => {
    expect(parseQrScan('SMARTBUS-QR-TB-001')).toEqual({ code: 'TB-001' });
  });

  it('extracts ticket_code and embedded trip_id from a JSON payload', () => {
    const payload = JSON.stringify({ ticket_code: 'TB-001', trip_id: 'trip-1' });
    expect(parseQrScan(payload)).toEqual({ code: 'TB-001', embeddedTripId: 'trip-1' });
  });

  it('rejects an empty code with 400', () => {
    expect(() => parseQrScan('   ')).toThrow(TicketValidationError);
    try {
      parseQrScan('');
    } catch (error) {
      expect((error as TicketValidationError).status).toBe(400);
    }
  });
});

describe('validateTicketQr', () => {
  it('checks in a BOOKED ticket and writes a VALID audit log', async () => {
    const { result, client } = await runWithClient(baseTicket, { code: 'TB-001' });

    expect(result).toMatchObject({ isAlreadyCheckedIn: false, validationId: 'log-1' });
    expect(result.ticket).toMatchObject({ ticketCode: 'TB-001', seatNumber: 'A1' });
    const sqls = client.query.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(sqls.some((s: string) => s.includes("UPDATE tickets SET status='CHECKED_IN'"))).toBe(
      true
    );
    expect(sqls.some((s: string) => s.includes("UPDATE trip_seats SET status='CHECKED_IN'"))).toBe(
      true
    );
    const logCall = client.query.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('INSERT INTO ticket_validation_logs')
    );
    expect(logCall?.[1]).toContain('VALID');
    expect(mockedRelease).toHaveBeenCalledWith('TB-001', 'lock-1');
  });

  it('flags an already checked-in ticket without re-updating status', async () => {
    const { result, client } = await runWithClient(
      { ...baseTicket, status: 'CHECKED_IN' },
      {
        code: 'TB-001',
      }
    );

    expect(result.isAlreadyCheckedIn).toBe(true);
    const sqls = client.query.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(sqls.some((s: string) => s.includes("UPDATE tickets SET status='CHECKED_IN'"))).toBe(
      false
    );
    expect(sqls.some((s: string) => s.includes('INSERT INTO ticket_validation_logs'))).toBe(true);
  });

  it('rejects a ticket from another trip with 403 and logs REJECTED', async () => {
    const { error, client } = await runWithClient(baseTicket, {
      code: 'TB-001',
      tripId: 'trip-other',
    });

    expect(error).toBeInstanceOf(TicketValidationError);
    expect((error as TicketValidationError).status).toBe(403);
    expect(
      client.query.mock.calls.some((c: unknown[]) =>
        (c[0] as string).includes("UPDATE tickets SET status='CHECKED_IN'")
      )
    ).toBe(false);
    // Rejection is logged outside the rolled-back transaction.
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('result, reason'),
      expect.arrayContaining(['TRIP_MISMATCH'])
    );
  });

  it('rejects an unpaid RESERVED ticket with 409', async () => {
    const { error } = await runWithClient(
      { ...baseTicket, status: 'RESERVED' },
      {
        code: 'TB-001',
      }
    );

    expect((error as TicketValidationError).status).toBe(409);
    expect((error as TicketValidationError).message).toBe('Vé chưa được thanh toán.');
  });

  it('returns 404 when the ticket does not exist', async () => {
    const { error } = await runWithClient(null, { code: 'MISSING' });
    expect((error as TicketValidationError).status).toBe(404);
    expect(mockedTransaction).toHaveBeenCalled();
  });

  it('returns 409 without touching the database when the scan lock is held', async () => {
    mockedAcquire.mockResolvedValue(null);
    await expect(validateTicketQr({ code: 'TB-001' })).rejects.toMatchObject({ status: 409 });
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('releases the scan lock even when validation fails', async () => {
    await runWithClient(null, { code: 'MISSING' });
    expect(mockedRelease).toHaveBeenCalledWith('MISSING', 'lock-1');
  });
});

describe('QR security (HMAC-SHA256 / expiry / anti-replay)', () => {
  beforeEach(() => {
    process.env.QR_HMAC_SECRET = 'unit-test-qr-secret-xxxxxxxxxxxx';
  });

  afterEach(() => {
    delete process.env.QR_HMAC_SECRET;
  });

  function signedCode(overrides: Record<string, unknown> = {}): string {
    const security = {
      ticket_code: 'TB-001',
      trip_id: 'trip-1',
      seat_number: 'A1',
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'nonce-1',
      ...overrides,
    };
    const payload: Record<string, unknown> = { ...security };
    if (!('sig' in overrides)) {
      payload.sig = computeQrSignature(security as never);
    }
    return JSON.stringify(payload);
  }

  it('accepts a correctly signed, unexpired payload and consumes the nonce', async () => {
    const { result } = await runWithClient(baseTicket, { code: signedCode() });

    expect(result).toMatchObject({ isAlreadyCheckedIn: false, validationId: 'log-1' });
    expect(mockedSetIfAbsent).toHaveBeenCalledWith('qr:nonce:nonce-1', '1', expect.any(Number));
  });

  it('rejects a tampered signature with 403 and logs QR_SIGNATURE_MISMATCH', async () => {
    const { error } = await runWithClient(baseTicket, {
      code: signedCode({ sig: 'f'.repeat(64) }),
    });

    expect((error as TicketValidationError).status).toBe(403);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('result, reason'),
      expect.arrayContaining(['QR_SIGNATURE_MISMATCH'])
    );
    expect(mockedSetIfAbsent).not.toHaveBeenCalled();
  });

  it('rejects an expired QR with 403 and logs QR_EXPIRED', async () => {
    const code = JSON.stringify({
      ticket_code: 'TB-001',
      trip_id: 'trip-1',
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const { error } = await runWithClient(baseTicket, { code });

    expect((error as TicketValidationError).status).toBe(403);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('result, reason'),
      expect.arrayContaining(['QR_EXPIRED'])
    );
  });

  it('rejects a replayed nonce with 409 and logs QR_REPLAY', async () => {
    mockedSetIfAbsent.mockResolvedValue(false);
    const { error } = await runWithClient(baseTicket, { code: signedCode() });

    expect((error as TicketValidationError).status).toBe(409);
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining('result, reason'),
      expect.arrayContaining(['QR_REPLAY'])
    );
  });
});
