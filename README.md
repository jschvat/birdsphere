# BirdSphere Backend

A specialized social media marketplace for bird and exotic pet breeders.

## Features

- **User Authentication**: Email/password registration and login with JWT tokens
- **Marketplace**: Create, browse, and search listings for birds and exotic pets
- **Geolocation**: Find local sellers and breeders within specified radius
- **Direct Messaging**: Internal messaging system between buyers and sellers
- **File Upload**: Support for images and videos on listings
- **Categories**: Organized pet categories and subcategories

## Tech Stack

- **Node.js** with Express.js
- **PostgreSQL** for data storage
- **Redis** for sessions and caching
- **JWT** for authentication
- **Multer** for file uploads
- **Docker** for database services

## Setup

### Prerequisites

- Node.js 16+ 
- Docker and Docker Compose

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Start PostgreSQL and Redis services:
```bash
docker-compose up -d
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. The database will be automatically initialized with the schema and seed data when you first start the containers.

6. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)

### Listings
- `GET /api/listings` - Search listings with filters
- `POST /api/listings` - Create new listing (authenticated)
- `GET /api/listings/:id` - Get listing details
- `PUT /api/listings/:id` - Update listing (authenticated, owner only)
- `DELETE /api/listings/:id` - Delete listing (authenticated, owner only)
- `GET /api/listings/categories` - Get all categories
- `POST /api/listings/:id/media` - Upload media files (authenticated)

### Messages
- `GET /api/messages/conversations` - Get user conversations (authenticated)
- `POST /api/messages/conversations` - Start new conversation (authenticated)
- `GET /api/messages/conversations/:id/messages` - Get conversation messages (authenticated)
- `POST /api/messages/conversations/:id/messages` - Send message (authenticated)

### Users
- `GET /api/users/:username` - Get user profile
- `GET /api/users/nearby` - Find nearby users

### Location
- `GET /api/location/nearby/listings` - Find listings near coordinates
- `GET /api/location/nearby/breeders` - Find breeders near coordinates
- `GET /api/location/distance` - Calculate distance between two points

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and profiles
- `categories` - Pet categories and subcategories
- `listings` - Marketplace listings
- `listing_media` - Images and videos for listings
- `conversations` - Message conversations between users
- `messages` - Individual messages
- `user_favorites` - User saved listings
- `user_reviews` - User ratings and reviews

## File Uploads

- Images: JPEG, PNG, WebP, GIF
- Videos: MP4, MPEG, QuickTime, WebM, AVI
- Maximum file size: 10MB (configurable)
- Files are stored in `uploads/` directory
- Accessible via `/uploads/:filename`

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Environment Variables
Key configuration options in `.env`:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session signing secret
- `UPLOAD_PATH` - File upload directory
- `MAX_FILE_SIZE` - Maximum upload file size

## Future Enhancements

- OAuth integration (Google, Facebook, Twitter)
- Real-time messaging with WebSockets
- Push notifications
- Advanced search with full-text search
- Image processing and thumbnails
- Email notifications
- Payment integration
- Review and rating system
- Advanced geolocation with maps integration