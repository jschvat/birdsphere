# Database Architecture Decision

## Current Issue
The posting system was designed with both PostgreSQL and MongoDB, creating unnecessary complexity:
- Posts/Comments in MongoDB
- Analytics/Follows in PostgreSQL
- Data consistency challenges
- Complex cross-database operations

## Recommendation: Pure PostgreSQL

### Why PostgreSQL Only?

1. **ACID Transactions**: Critical for social features (follows, reactions)
2. **Complex Analytics**: Better aggregation for engagement scoring
3. **JSON Support**: Modern PostgreSQL handles flexible schemas well
4. **Full-Text Search**: Built-in search capabilities
5. **Existing Integration**: Animal categories already in PostgreSQL
6. **Simpler Deployment**: One database system

### Migration Plan

1. Convert MongoDB models to PostgreSQL tables
2. Use JSONB columns for flexible data (media arrays)
3. Leverage PostgreSQL's array and JSON operators
4. Keep all social graph data in one system

### Implementation

```sql
-- Posts table with JSONB for media
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    media JSONB DEFAULT '[]', -- Array of media objects
    hashtags TEXT[] DEFAULT '{}',
    -- ... rest of fields
);

-- Comments with threaded replies
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id),
    parent_comment_id UUID REFERENCES comments(id),
    -- ... rest of fields
);
```

This gives us the best of both worlds:
- Relational integrity for social features
- JSON flexibility for media/metadata
- Single database for consistent transactions