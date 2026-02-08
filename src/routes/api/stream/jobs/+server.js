import { createRedisClient } from '$lib/redis';

const CHANNEL = 'jobs:events';

export async function GET({ request }) {
  const client = createRedisClient();
  await client.connect();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      client.subscribe(CHANNEL, (message) => {
        try {
          send(JSON.parse(message));
        } catch {
          send({ type: 'unknown', raw: message });
        }
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'));
      }, 15000);

      request.signal.addEventListener('abort', async () => {
        clearInterval(heartbeat);
        try {
          await client.unsubscribe(CHANNEL);
        } catch {
          // ignore
        }
        try {
          await client.quit();
        } catch {
          // ignore
        }
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
