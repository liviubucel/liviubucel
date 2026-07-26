import { describe, expect, it, vi } from 'vitest';
import { sendNewsletterDigest } from './newsletter-digest';

function fakeDb(subscribers: Array<{ email: string; unsubscribe_token: string }>): D1Database {
  return {
    prepare: () => ({
      all: async () => ({ results: subscribers }),
      bind: () => ({
        all: async () => ({ results: subscribers }),
      }),
    }),
  } as unknown as D1Database;
}

const ITEMS = [{ title: 'Acme SRL: ransomware group listing (unconfirmed claim)', excerpt: 'A group listed Acme.', url: 'https://liviubucel.com/romania-cyber-monitor/incidents/acme-abc123' }];

describe('sendNewsletterDigest', () => {
  it('does nothing when there are no newly published items', async () => {
    const send = vi.fn();
    await sendNewsletterDigest(fakeDb([{ email: 'a@example.com', unsubscribe_token: 't' }]), { EMAIL: { send } }, []);
    expect(send).not.toHaveBeenCalled();
  });

  it('does nothing when the EMAIL binding is not configured', async () => {
    const db = fakeDb([{ email: 'a@example.com', unsubscribe_token: 't' }]);
    await expect(sendNewsletterDigest(db, {}, ITEMS)).resolves.toBeUndefined();
  });

  it('sends one email per confirmed subscriber with a unique unsubscribe link', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const db = fakeDb([
      { email: 'a@example.com', unsubscribe_token: 'token-a' },
      { email: 'b@example.com', unsubscribe_token: 'token-b' },
    ]);

    await sendNewsletterDigest(db, { EMAIL: { send } }, ITEMS);

    expect(send).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = send.mock.calls;
    expect(firstCall[0].to).toBe('a@example.com');
    expect(firstCall[0].html).toContain('token-a');
    expect(secondCall[0].to).toBe('b@example.com');
    expect(secondCall[0].html).toContain('token-b');
  });

  it('never sends one email per incident - always exactly one send per subscriber regardless of item count', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const db = fakeDb([{ email: 'a@example.com', unsubscribe_token: 'token-a' }]);
    const manyItems = Array.from({ length: 67 }, (_, i) => ({
      title: `Victim ${i}`,
      excerpt: 'claim',
      url: `https://liviubucel.com/romania-cyber-monitor/incidents/victim-${i}`,
    }));

    await sendNewsletterDigest(db, { EMAIL: { send } }, manyItems);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("one subscriber's send failure does not block the others", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('bounced'))
      .mockResolvedValueOnce(undefined);
    const db = fakeDb([
      { email: 'bad@example.com', unsubscribe_token: 'token-a' },
      { email: 'good@example.com', unsubscribe_token: 'token-b' },
    ]);

    await sendNewsletterDigest(db, { EMAIL: { send } }, ITEMS);

    expect(send).toHaveBeenCalledTimes(2);
  });
});
