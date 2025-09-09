const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BirdSphere API',
      version: '1.0.0',
      description: 'A specialized social media marketplace API for bird and exotic pet breeders',
      contact: {
        name: 'BirdSphere',
        email: 'support@birdsphere.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            username: {
              type: 'string',
              description: 'Unique username',
            },
            phone: {
              type: 'string',
              description: 'User phone number',
            },
            bio: {
              type: 'string',
              description: 'User biography',
            },
            profileImage: {
              type: 'string',
              description: 'Profile image URL',
            },
            location: {
              type: 'object',
              properties: {
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number' },
                    longitude: { type: 'number' },
                  },
                },
              },
            },
            isBreeder: {
              type: 'boolean',
              description: 'Whether user is a breeder',
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether user is verified',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
              description: 'Listing title',
            },
            description: {
              type: 'string',
              description: 'Listing description',
            },
            price: {
              type: 'number',
              description: 'Listing price',
            },
            currency: {
              type: 'string',
              default: 'USD',
            },
            species: {
              type: 'string',
              description: 'Animal species',
            },
            breed: {
              type: 'string',
              description: 'Animal breed',
            },
            age: {
              type: 'string',
              description: 'Animal age',
            },
            sex: {
              type: 'string',
              enum: ['Male', 'Female', 'Unknown'],
            },
            color: {
              type: 'string',
              description: 'Animal color',
            },
            healthStatus: {
              type: 'string',
              description: 'Health status',
            },
            vaccinationStatus: {
              type: 'string',
              description: 'Vaccination status',
            },
            shippingAvailable: {
              type: 'boolean',
              default: false,
            },
            localPickupOnly: {
              type: 'boolean',
              default: true,
            },
            location: {
              type: 'object',
              properties: {
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number' },
                    longitude: { type: 'number' },
                  },
                },
              },
            },
            status: {
              type: 'string',
              enum: ['active', 'sold', 'pending', 'inactive'],
              default: 'active',
            },
            viewsCount: {
              type: 'integer',
              default: 0,
            },
            mediaCount: {
              type: 'integer',
              default: 0,
            },
            category: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
              },
            },
            seller: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                isBreeder: { type: 'boolean' },
                profileImage: { type: 'string' },
              },
            },
            media: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Media',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Media: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            filePath: {
              type: 'string',
              description: 'File path',
            },
            fileType: {
              type: 'string',
              enum: ['image', 'video'],
            },
            isPrimary: {
              type: 'boolean',
              default: false,
            },
            displayOrder: {
              type: 'integer',
              default: 0,
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              description: 'Category name',
            },
            description: {
              type: 'string',
              description: 'Category description',
            },
            subcategories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            listingId: {
              type: 'string',
              format: 'uuid',
            },
            otherUser: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                profileImage: { type: 'string' },
              },
            },
            listing: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                price: { type: 'number' },
              },
            },
            lastMessage: {
              type: 'string',
            },
            unreadCount: {
              type: 'integer',
            },
            lastMessageAt: {
              type: 'string',
              format: 'date-time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            content: {
              type: 'string',
              description: 'Message content',
            },
            senderId: {
              type: 'string',
              format: 'uuid',
            },
            sender: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                profileImage: { type: 'string' },
              },
            },
            isRead: {
              type: 'boolean',
              default: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and profile management',
      },
      {
        name: 'Listings',
        description: 'Marketplace listings management',
      },
      {
        name: 'Messages',
        description: 'Direct messaging system',
      },
      {
        name: 'Users',
        description: 'User profiles and discovery',
      },
      {
        name: 'Location',
        description: 'Geolocation-based services',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API files
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};