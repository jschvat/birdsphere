# BirdSphere API Documentation

## Overview

BirdSphere is a comprehensive pet marketplace API focused on birds and exotic animals. The API provides full CRUD operations for listings, user management, real-time messaging, location-based search, and more.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.birdsphere.com/api`

## Interactive Documentation

Visit `/api-docs` for the complete Swagger/OpenAPI documentation with interactive testing capabilities.

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Key Features

### 🐦 Listings Management
- Create, read, update, delete pet listings
- Advanced search and filtering
- Geographic location-based search
- Media file upload and management
- Category-based organization

### 👥 User Management
- User registration and authentication
- Profile management with location data
- Breeder verification system
- Privacy controls

### 💬 Messaging System
- Real-time chat via Socket.IO
- Private conversations between users
- Message history and management
- Online status tracking

### 📍 Location Services
- Geographic search capabilities
- Distance calculations
- Location autocomplete
- Regional filtering

### 🔍 Search & Filtering
- Text-based search
- Price range filtering
- Species and breed filtering
- Gender-based filtering
- Shipping availability
- Pagination and sorting

## Quick Start

1. Register a user account: `POST /api/auth/register`
2. Login to get JWT token: `POST /api/auth/login`
3. Create a listing: `POST /api/listings`
4. Search listings: `GET /api/listings?query=budgerigar`

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Rate limit headers included in responses

## Error Handling

All errors return JSON with consistent format:

```json
{
  "error": "Error description",
  "details": [
    {
      "field": "fieldName",
      "message": "Specific validation error"
    }
  ]
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Support

For API support and documentation issues, please refer to the interactive documentation at `/api-docs` or contact the development team.