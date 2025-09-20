# Complete Follow System Implementation Plan

## 🎯 OVERVIEW

This document outlines the complete implementation plan for a comprehensive follow system including following, blocking, muting, privacy controls, and advanced notification settings.

---

## 📊 CURRENT STATE ANALYSIS

### ✅ **What's Already Implemented:**
- Basic `follows` table (id, follower_id, following_id, created_at)
- Basic `user_follows` table (similar structure)
- Follow model with advanced PostgreSQL queries
- Follow controller with MongoDB syntax (INCONSISTENT)
- Follow routes (`/follows` endpoints)
- Timeline integration (basic)

### ❌ **Critical Issues Found:**
1. **Database/Code Mismatch**: Model uses PostgreSQL, Controller uses MongoDB syntax
2. **Table Inconsistency**: Both `follows` AND `user_follows` tables exist
3. **Missing Core Features**: No blocking, muting, privacy controls
4. **Limited Notification Control**: No granular notification settings
5. **No Follow Requests**: No approval system for private accounts

---

## 🏗️ DATABASE SCHEMA REDESIGN

### **1. Consolidated User Relationships Table**
```sql
-- Replace both 'follows' and 'user_follows' with comprehensive table
CREATE TABLE user_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationship
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Relationship type and status
    relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN (
        'follow', 'block', 'mute', 'close_friend'
    )),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'pending', 'active', 'denied', 'removed'
    )),

    -- Notification preferences (JSON for flexibility)
    notification_settings JSONB DEFAULT '{
        "posts": true,
        "stories": true,
        "live_streams": true,
        "mentions": true,
        "comments": true,
        "reactions": true
    }',

    -- Algorithm & engagement data
    engagement_score DECIMAL(10,2) DEFAULT 1.0,
    last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interaction_count INTEGER DEFAULT 0,

    -- Follow-specific settings
    show_in_feed BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level IN (1, 2, 3)), -- 1=normal, 2=priority, 3=close_friend

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id, target_user_id),
    CHECK(user_id != target_user_id)
);
```

### **2. Enhanced User Privacy Settings**
```sql
-- Add privacy columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_privacy VARCHAR(20) DEFAULT 'public'
    CHECK (account_privacy IN ('public', 'private', 'restricted'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_visibility VARCHAR(20) DEFAULT 'public'
    CHECK (followers_visibility IN ('public', 'followers', 'private'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS following_visibility VARCHAR(20) DEFAULT 'public'
    CHECK (following_visibility IN ('public', 'followers', 'private'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_follow_requests BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_mentions BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_discovery BOOLEAN DEFAULT true;
```

### **3. Follow Requests Table**
```sql
CREATE TABLE follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT, -- Optional message with request
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'denied', 'expired'
    )),
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(requester_id, target_user_id)
);
```

### **4. User Blocked Keywords/Content**
```sql
CREATE TABLE user_content_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filter_type VARCHAR(20) NOT NULL CHECK (filter_type IN (
        'keyword', 'hashtag', 'mention', 'content_type'
    )),
    filter_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **5. Comprehensive Indexes**
```sql
-- Performance indexes for new tables
CREATE INDEX idx_user_relationships_user ON user_relationships(user_id);
CREATE INDEX idx_user_relationships_target ON user_relationships(target_user_id);
CREATE INDEX idx_user_relationships_type ON user_relationships(relationship_type);
CREATE INDEX idx_user_relationships_status ON user_relationships(status);
CREATE INDEX idx_user_relationships_engagement ON user_relationships(user_id, engagement_score DESC);
CREATE INDEX idx_user_relationships_active_follows ON user_relationships(user_id, relationship_type, status)
    WHERE relationship_type = 'follow' AND status = 'active';

CREATE INDEX idx_follow_requests_target ON follow_requests(target_user_id);
CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id);
CREATE INDEX idx_follow_requests_pending ON follow_requests(target_user_id, status)
    WHERE status = 'pending';

CREATE INDEX idx_user_content_filters_user ON user_content_filters(user_id);
CREATE INDEX idx_user_content_filters_active ON user_content_filters(user_id, is_active)
    WHERE is_active = true;
```

---

## 📱 API ENDPOINTS DESIGN

### **1. Follow Management**
```javascript
// Core following
POST   /api/follows/:userId              // Follow user (or send request if private)
DELETE /api/follows/:userId              // Unfollow user
GET    /api/follows/:userId/status       // Check follow status

// Follow requests (for private accounts)
GET    /api/follows/requests/incoming    // Get incoming follow requests
GET    /api/follows/requests/outgoing    // Get sent follow requests
POST   /api/follows/requests/:requestId/approve
POST   /api/follows/requests/:requestId/deny
DELETE /api/follows/requests/:requestId  // Cancel sent request

// Follow lists
GET    /api/follows/:userId/followers    // Get followers list
GET    /api/follows/:userId/following    // Get following list
GET    /api/follows/suggestions          // Get follow suggestions
```

### **2. Blocking System**
```javascript
POST   /api/blocks/:userId               // Block user
DELETE /api/blocks/:userId               // Unblock user
GET    /api/blocks                       // Get blocked users list
GET    /api/blocks/:userId/status        // Check if user is blocked
```

### **3. Muting System**
```javascript
POST   /api/mutes/:userId                // Mute user
DELETE /api/mutes/:userId                // Unmute user
GET    /api/mutes                        // Get muted users list
PUT    /api/mutes/:userId/settings       // Update mute settings (posts, stories, etc.)
```

### **4. Privacy & Settings**
```javascript
// Account privacy
PUT    /api/users/privacy                // Update privacy settings
GET    /api/users/privacy                // Get current privacy settings

// Notification preferences for follows
PUT    /api/follows/:userId/notifications // Update notification settings for specific user
GET    /api/follows/notification-settings // Get all follow notification settings

// Content filtering
POST   /api/filters                      // Add content filter
GET    /api/filters                      // Get content filters
DELETE /api/filters/:filterId            // Remove content filter
```

### **5. Advanced Features**
```javascript
// Close friends
POST   /api/follows/:userId/close-friend  // Add to close friends
DELETE /api/follows/:userId/close-friend  // Remove from close friends
GET    /api/follows/close-friends         // Get close friends list

// Follow analytics
GET    /api/follows/analytics             // Follow/follower stats
GET    /api/follows/engagement/:userId    // Engagement score with user
```

---

## 🔧 BACKEND IMPLEMENTATION PLAN

### **Phase 1: Database Migration & Core Models**

#### **Step 1.1: Database Backup & Migration**
```bash
# 1. Backup current database
pg_dump birdsphere > backup_before_follow_system_$(date +%Y%m%d_%H%M%S).sql

# 2. Create migration script: 03_complete_follow_system.sql
# 3. Migrate existing data from 'follows'/'user_follows' to 'user_relationships'
# 4. Drop old tables after data migration
```

#### **Step 1.2: Updated Models**
```javascript
// models/UserRelationship.js - Replace Follow.js
class UserRelationship {
  static async createRelationship(userId, targetUserId, type, options = {})
  static async updateRelationship(userId, targetUserId, updates)
  static async removeRelationship(userId, targetUserId, type)
  static async getRelationship(userId, targetUserId)
  static async getFollowers(userId, options = {})
  static async getFollowing(userId, options = {})
  static async getBlocked(userId, options = {})
  static async getMuted(userId, options = {})
  static async getCloseFriends(userId)
  static async isBlocked(userId, targetUserId)
  static async isMuted(userId, targetUserId)
  static async getRelationshipStats(userId)
}

// models/FollowRequest.js
class FollowRequest {
  static async create(requesterId, targetUserId, message)
  static async approve(requestId, targetUserId)
  static async deny(requestId, targetUserId)
  static async cancel(requestId, requesterId)
  static async getIncoming(userId, options = {})
  static async getOutgoing(userId, options = {})
  static async cleanup() // Remove expired requests
}

// models/ContentFilter.js
class ContentFilter {
  static async create(userId, filterType, filterValue)
  static async getByUser(userId)
  static async remove(userId, filterId)
  static async shouldFilterContent(userId, content)
}
```

### **Phase 2: Controllers & Middleware**

#### **Step 2.1: Updated Controllers**
```javascript
// controllers/followController.js - Complete rewrite
// controllers/blockController.js - New
// controllers/muteController.js - New
// controllers/privacyController.js - New
// controllers/followRequestController.js - New
```

#### **Step 2.2: Protection Middleware**
```javascript
// middleware/relationshipCheck.js
const checkBlocked = async (req, res, next) => {
  // Check if users have blocked each other
  // Prevent any interaction if blocked
}

const checkMuted = async (req, res, next) => {
  // Check if user is muted
  // Filter content accordingly
}

const checkPrivacy = async (req, res, next) => {
  // Check account privacy settings
  // Require follow relationship for private accounts
}
```

### **Phase 3: Timeline & Content Filtering**

#### **Step 3.1: Enhanced Timeline Service**
```javascript
// services/timelineService.js - Major updates
class TimelineService {
  async generatePersonalizedTimeline(userId, options = {}) {
    // 1. Get active follows (not muted, not blocked)
    // 2. Apply priority levels (close friends get higher score)
    // 3. Filter out muted content types
    // 4. Apply user content filters
    // 5. Calculate engagement-based ranking
  }

  async filterContentForUser(userId, posts) {
    // Apply all filtering rules:
    // - Blocked users content
    // - Muted users content (based on mute settings)
    // - Content filters (keywords, hashtags)
    // - Privacy restrictions
  }
}
```

#### **Step 3.2: Real-time Notifications**
```javascript
// services/notificationService.js
class NotificationService {
  async sendFollowNotification(followerId, followingId) {
    // Check notification settings for the follow relationship
    // Send appropriate notifications based on user preferences
  }

  async sendFollowRequestNotification(requesterId, targetUserId)
  async sendFollowApprovalNotification(targetUserId, requesterId)
}
```

### **Phase 4: Privacy & Security Features**

#### **Step 4.1: Privacy Controls**
```javascript
// services/privacyService.js
class PrivacyService {
  static async canUserSeeProfile(viewerId, profileUserId)
  static async canUserSeeFollowers(viewerId, profileUserId)
  static async canUserSeeFollowing(viewerId, profileUserId)
  static async canUserMention(mentionerId, mentionedUserId)
  static async canUserMessage(senderId, recipientUserId)
  static async requiresFollowRequest(followerId, targetUserId)
}
```

#### **Step 4.2: Content Filtering Engine**
```javascript
// services/contentFilterService.js
class ContentFilterService {
  static async filterPost(userId, post)
  static async filterComment(userId, comment)
  static async filterMention(userId, mention)
  static async applyKeywordFilters(userId, content)
  static async checkSpamFilters(content)
}
```

---

## 🎨 FRONTEND INTEGRATION POINTS

### **Components Needed:**
```javascript
// Follow system components
<FollowButton userId={targetUserId} />
<FollowersModal userId={userId} />
<FollowingModal userId={userId} />
<FollowRequestsList />
<BlockedUsersList />
<MutedUsersList />

// Privacy settings
<PrivacySettingsPanel />
<NotificationPreferences />
<ContentFilters />

// Advanced features
<CloseFriendsList />
<FollowSuggestions />
<FollowAnalytics />
```

### **State Management:**
```javascript
// Redux/Context state for follow system
const followState = {
  relationships: {},      // userId -> relationship data
  followRequests: {       // Pending requests
    incoming: [],
    outgoing: []
  },
  blockedUsers: [],
  mutedUsers: [],
  privacy: {},            // User privacy settings
  suggestions: []         // Follow suggestions
}
```

---

## 🧪 TESTING STRATEGY

### **1. Unit Tests**
- Model methods (create, update, delete relationships)
- Privacy check functions
- Content filtering logic
- Notification triggering

### **2. Integration Tests**
- Follow workflow (request → approve → follow)
- Block/unblock workflow
- Mute/unmute with different settings
- Timeline filtering accuracy

### **3. End-to-End Tests**
- Complete user journey scenarios
- Privacy setting changes
- Cross-platform compatibility
- Performance under load

---

## 🚀 DEPLOYMENT PLAN

### **Phase 1: Core Infrastructure** (Week 1)
1. ✅ Database backup and migration
2. ✅ New table creation and indexes
3. ✅ Data migration from old tables
4. ✅ Basic model implementations

### **Phase 2: API Development** (Week 2)
1. ✅ Core follow/unfollow endpoints
2. ✅ Block/mute functionality
3. ✅ Follow requests system
4. ✅ Privacy controls API

### **Phase 3: Advanced Features** (Week 3)
1. ✅ Enhanced timeline filtering
2. ✅ Notification system integration
3. ✅ Content filtering engine
4. ✅ Analytics and suggestions

### **Phase 4: Frontend Integration** (Week 4)
1. ✅ React components for follow system
2. ✅ Privacy settings UI
3. ✅ Real-time updates
4. ✅ Mobile responsiveness

### **Phase 5: Testing & Optimization** (Week 5)
1. ✅ Comprehensive testing
2. ✅ Performance optimization
3. ✅ Security audit
4. ✅ Documentation completion

---

## 📈 SUCCESS METRICS

### **Technical Metrics:**
- ✅ API response times < 200ms for follow operations
- ✅ Timeline generation < 500ms for 1000+ follows
- ✅ 99.9% uptime for follow system
- ✅ Zero data loss during migration

### **User Experience Metrics:**
- ✅ Follow request approval rate > 80%
- ✅ User privacy setting adoption > 60%
- ✅ Content filtering effectiveness > 95%
- ✅ User satisfaction score > 4.5/5

### **Business Metrics:**
- ✅ Increased user engagement by 25%
- ✅ Reduced spam reports by 40%
- ✅ Improved user retention by 15%
- ✅ Enhanced platform safety score

---

## ⚠️ RISKS & MITIGATIONS

### **High Risk:**
1. **Data Migration Complexity**
   - *Mitigation*: Comprehensive backup strategy, staged rollout

2. **Performance Impact**
   - *Mitigation*: Extensive load testing, database optimization

3. **Privacy Regulation Compliance**
   - *Mitigation*: Legal review, GDPR compliance checks

### **Medium Risk:**
1. **User Adoption of New Features**
   - *Mitigation*: Progressive disclosure, user education

2. **API Breaking Changes**
   - *Mitigation*: API versioning, backward compatibility

### **Low Risk:**
1. **Frontend Complexity**
   - *Mitigation*: Component reusability, design system

---

## 🏁 READY FOR IMPLEMENTATION

This plan provides:
✅ **Complete database schema redesign**
✅ **Comprehensive API specification**
✅ **Detailed implementation roadmap**
✅ **Testing and deployment strategy**
✅ **Risk mitigation plans**

**Total Estimated Development Time: 5 weeks**
**Required Team: 2-3 developers + 1 QA engineer**

When ready to proceed, start with **Phase 1: Database Migration** to ensure no data loss and maintain system stability throughout the implementation.

---

*This plan transforms the basic follow system into a comprehensive social relationship management platform with enterprise-level features for privacy, security, and user control.*