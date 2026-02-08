import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server.js';

const redisMock = {
  hSet: vi.fn(),
  rPush: vi.fn(),
  lPush: vi.fn(),
  lTrim: vi.fn(),
  publish: vi.fn()
};

const dbMock = {
  query: vi.fn()
};

vi.mock('$lib/redis', () => ({
  getRedis: vi.fn(async () => redisMock)
}));

vi.mock('$lib/db', () => ({
  getDb: () => dbMock
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/jobs', () => {
  it('returns 400 when type is missing', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await POST({ request });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('type is required');
  });

  it('enqueues a job and writes to db', async () => {
    dbMock.query.mockResolvedValueOnce({ rowCount: 1 });

    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'send-email', payload: { to: 'demo@example.com' } })
    });

    const response = await POST({ request });
    expect(response.status).toBe(200);

    expect(dbMock.query).toHaveBeenCalledTimes(1);
    expect(redisMock.hSet).toHaveBeenCalledTimes(1);
    expect(redisMock.rPush).toHaveBeenCalledTimes(1);
    expect(redisMock.lPush).toHaveBeenCalledTimes(1);
    expect(redisMock.lTrim).toHaveBeenCalledTimes(1);
    expect(redisMock.publish).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/jobs', () => {
  it('returns jobs from Postgres', async () => {
    dbMock.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'job-1',
          type: 'send-email',
          payload: { to: 'demo@example.com' },
          status: 'queued',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z'
        }
      ]
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].id).toBe('job-1');
  });
});
