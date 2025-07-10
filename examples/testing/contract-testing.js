// Consumer contract test example using Pact
const { Pact } = require('@pact-foundation/pact');
const { like, term } = require('@pact-foundation/pact').Matchers;

describe('Order API Consumer', () => {
  const provider = new Pact({
    consumer: 'OrderConsumer',
    provider: 'OrderAPI',
    port: 1234,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'INFO',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  it('should create an order', async () => {
    await provider
      .given('a valid customer exists')
      .uponReceiving('a request to create an order')
      .withRequest({
        method: 'POST',
        path: '/orders',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          customerId: like('cust-123'),
          items: like([{ productId: 'prod-456', quantity: 2 }])
        }
      })
      .willRespondWith({
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          id: term({ generate: 'ord-789', matcher: '^ord-\\d+$' }),
          customerId: like('cust-123'),
          status: 'PENDING'
        }
      });

    // Test implementation
    const response = await orderService.createOrder({
      customerId: 'cust-123',
      items: [{ productId: 'prod-456', quantity: 2 }]
    });

    expect(response.id).toMatch(/^ord-\d+$/);
    expect(response.status).toBe('PENDING');
  });
});