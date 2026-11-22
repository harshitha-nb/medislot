module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'MediSlot API',
    version: '1.0.0',
    description:
      'Healthcare appointment booking backend. Register, log in, search doctors, ' +
      'see free slots and book or cancel appointments. Double booking is prevented by the database.'
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [
    { name: 'Auth' }, { name: 'Doctors' }, { name: 'Appointments' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string', example: 'Something went wrong' } }
      }
    }
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new patient',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string', example: 'Test User' },
              email: { type: 'string', example: 'test@example.com' },
              password: { type: 'string', minLength: 8, example: 'password123' }
            }
          } } }
        },
        responses: {
          201: { description: 'User created' },
          400: { description: 'Missing fields or password shorter than 8 characters' },
          409: { description: 'Email already registered' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', example: 'test@example.com' },
              password: { type: 'string', example: 'password123' }
            }
          } } }
        },
        responses: {
          200: { description: 'Returns { token }. Valid for 1 hour.' },
          400: { description: 'Missing fields' },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/api/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'Search doctors by specialty and city (paginated, cached 60 s)',
        parameters: [
          { name: 'specialty', in: 'query', schema: { type: 'string' }, example: 'Cardiology' },
          { name: 'city', in: 'query', schema: { type: 'string' }, example: 'Bengaluru' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } }
        ],
        responses: {
          200: { description: 'List of doctors. The X-Cache header shows HIT or MISS.' }
        }
      }
    },
    '/api/doctors/{id}/slots': {
      get: {
        tags: ['Doctors'],
        summary: 'Free slots for a doctor on a date (cached 30 s)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 },
          { name: 'date', in: 'query', required: true, schema: { type: 'string' }, example: '2026-11-24',
            description: 'Format YYYY-MM-DD. Use a date from tomorrow onward.' }
        ],
        responses: {
          200: { description: 'Free slots only; booked slots are not listed.' },
          400: { description: 'Invalid doctor id or date' }
        }
      }
    },
    '/api/appointments': {
      post: {
        tags: ['Appointments'],
        summary: 'Book a slot (patients only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['slotId'],
            properties: { slotId: { type: 'integer', example: 5 } }
          } } }
        },
        responses: {
          201: { description: 'Appointment confirmed' },
          400: { description: 'slotId missing or not a number' },
          401: { description: 'Missing or invalid token' },
          403: { description: 'Only patients can book' },
          404: { description: 'Slot not found or already started' },
          409: { description: 'Slot already booked' }
        }
      }
    },
    '/api/appointments/mine': {
      get: {
        tags: ['Appointments'],
        summary: 'List my appointments',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'The logged-in patient\'s appointments' },
          401: { description: 'Missing or invalid token' }
        }
      }
    },
    '/api/appointments/{id}': {
      delete: {
        tags: ['Appointments'],
        summary: 'Cancel my confirmed appointment',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }
        ],
        responses: {
          200: { description: 'Appointment cancelled; the slot becomes free again' },
          401: { description: 'Missing or invalid token' },
          404: { description: 'No confirmed appointment found' }
        }
      }
    }
  }
};