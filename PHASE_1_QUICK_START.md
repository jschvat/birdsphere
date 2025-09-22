# Phase 1 Quick Start Guide: Enhanced Comments with Media

## Overview
This is the immediate implementation plan for Phase 1 - adding media support to the existing comment system without breaking any current functionality.

## Database Changes (Execute First)

```sql
-- Add media support to existing comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_attachments JSONB DEFAULT '[]';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT FALSE;

-- Add comment types for better classification
ALTER TABLE comments ADD COLUMN IF NOT EXISTS comment_type VARCHAR(20) DEFAULT 'standard'
  CHECK (comment_type IN ('standard', 'media', 'reaction', 'question'));

-- Create comment_media table (similar to post_media)
CREATE TABLE IF NOT EXISTS comment_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  file_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_media_comment_id ON comment_media(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_media_display_order ON comment_media(comment_id, display_order);
```

## Backend Implementation Steps

### 1. Update Comment Model (src/models/Comment.js)

Add these methods to the Comment class:

```javascript
// Add to Comment.js
static async addMedia(commentId, mediaArray) {
  if (!mediaArray || mediaArray.length === 0) return;

  const values = [];
  const placeholders = [];

  mediaArray.forEach((media, index) => {
    const offset = index * 10;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);

    values.push(
      commentId,
      media.fileType || 'image',
      media.fileUrl,
      media.fileName,
      media.fileSize || null,
      media.mimeType || null,
      media.width || null,
      media.height || null,
      media.duration || null,
      media.thumbnailUrl || null
    );
  });

  const sql = `
    INSERT INTO comment_media (comment_id, file_type, file_url, file_name, file_size, mime_type, width, height, duration, thumbnail_url)
    VALUES ${placeholders.join(', ')}
    RETURNING *
  `;

  const result = await query(sql, values);

  // Update comment to indicate it has media
  await query('UPDATE comments SET has_media = TRUE WHERE id = $1', [commentId]);

  return result.rows;
}

static async getCommentsWithMedia(postId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    sort = 'newest'
  } = options;

  let orderBy;
  switch (sort) {
    case 'oldest':
      orderBy = 'c.created_at ASC';
      break;
    case 'popular':
      orderBy = 'c.reaction_count DESC, c.created_at DESC';
      break;
    case 'newest':
    default:
      orderBy = 'c.created_at DESC';
      break;
  }

  const sql = `
    SELECT c.*,
           COALESCE(json_agg(
             json_build_object(
               'id', cm.id,
               'fileType', cm.file_type,
               'fileUrl', cm.file_url,
               'fileName', cm.file_name,
               'fileSize', cm.file_size,
               'mimeType', cm.mime_type,
               'width', cm.width,
               'height', cm.height,
               'duration', cm.duration,
               'thumbnailUrl', cm.thumbnail_url,
               'displayOrder', cm.display_order
             ) ORDER BY cm.display_order
           ) FILTER (WHERE cm.id IS NOT NULL), '[]'::json) as media
    FROM comments c
    LEFT JOIN comment_media cm ON c.id = cm.comment_id
    WHERE c.post_id = $1 AND c.parent_comment_id IS NULL
    GROUP BY c.id
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `;

  const result = await query(sql, [postId, limit, offset]);
  return result.rows;
}
```

### 2. Update Comment Controller (src/controllers/commentController.js)

Enhance the createComment method:

```javascript
// Update createComment method in commentController.js
exports.createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { postId } = req.params;
    const { content, parentCommentId, commentType = 'standard' } = req.body;

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Create comment
    const comment = await Comment.create({
      postId,
      authorId: req.user.id,
      content,
      parentCommentId,
      commentType
    });

    // Handle media uploads if present
    if (req.files && req.files.length > 0) {
      const mediaFiles = req.files.map(file => ({
        fileType: file.mimetype.startsWith('image/') ? 'image' :
                 file.mimetype.startsWith('video/') ? 'video' : 'document',
        fileUrl: `/uploads/comments/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        width: file.metadata?.width,
        height: file.metadata?.height,
        duration: file.metadata?.duration,
        thumbnailUrl: file.metadata?.thumbnail
      }));

      await Comment.addMedia(comment.id, mediaFiles);
    }

    // Update post comment count (only for top-level comments)
    if (!parentCommentId) {
      await Post.incrementCommentCount(postId);
    }

    // Get author information for response
    const author = await User.findById(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: {
        ...comment,
        author: {
          id: author.id,
          username: author.username,
          firstName: author.first_name,
          lastName: author.last_name,
          profileImage: author.profile_image,
          isVerified: author.is_verified
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: error.message
    });
  }
};

// Add new method for getting comments with media
exports.getPostCommentsWithMedia = async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = 'newest'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.getCommentsWithMedia(postId, {
      limit: parseInt(limit),
      offset,
      sort
    });

    // Add author information to comments
    const commentsWithAuthors = await Promise.all(comments.map(async (comment) => {
      const author = await User.findById(comment.author_id);
      return {
        ...comment,
        author: {
          id: author.id,
          username: author.username,
          firstName: author.first_name,
          lastName: author.last_name,
          profileImage: author.profile_image,
          isVerified: author.is_verified
        }
      };
    }));

    res.json({
      success: true,
      data: commentsWithAuthors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasNext: comments.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};
```

### 3. Update Routes (src/routes/posts.js)

Add new route for enhanced comments:

```javascript
// Add to posts.js routes
const { uploadCommentFiles, processCommentFiles } = require('../middleware/upload');

// Enhanced comment creation with media support
router.post('/:postId/comments/enhanced', authenticateToken, (req, res, next) => {
  uploadCommentFiles(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    processCommentFiles(req, res, next);
  });
}, createCommentValidation, commentController.createComment);

// Get comments with media
router.get('/:postId/comments/enhanced', commentController.getPostCommentsWithMedia);
```

### 4. Update Upload Middleware (src/middleware/upload.js)

Add comment-specific upload handling:

```javascript
// Add to upload.js
const uploadCommentFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads/comments');
      ensureDirectoryExists(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for comment media
    files: 3 // Max 3 files per comment
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|webm|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
}).array('media', 3);

const processCommentFiles = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    // Process each uploaded file
    for (const file of req.files) {
      // Add metadata processing for images/videos
      if (file.mimetype.startsWith('image/')) {
        // Add image processing logic here
        file.metadata = { width: 0, height: 0 }; // Placeholder
      } else if (file.mimetype.startsWith('video/')) {
        // Add video processing logic here
        file.metadata = { duration: 0, thumbnail: null }; // Placeholder
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // ... existing exports
  uploadCommentFiles,
  processCommentFiles
};
```

## Frontend Implementation Steps

### 1. Update Types (frontend/src/types/index.ts)

```typescript
// Update Comment interface in types/index.ts
export interface Comment {
  id: string;
  userId: string;
  postId: string;
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  content: string;
  commentType?: 'standard' | 'media' | 'reaction' | 'question';
  parentId?: string;
  reactions?: Reaction[];
  reactionCounts?: { [key: string]: number };
  replies?: Comment[];
  replyCount: number;
  media?: MediaFile[]; // Add media support
  hasMedia?: boolean;   // Add media flag
  createdAt: string;
  updatedAt: string;
}
```

### 2. Enhanced Comment Form Component

Create `frontend/src/components/Posts/EnhancedCommentForm.tsx`:

```tsx
import React, { useState } from 'react';
import { usePosts } from '../../contexts/PostsContext';

interface EnhancedCommentFormProps {
  postId: string;
  onCommentAdded: (comment: Comment) => void;
}

const EnhancedCommentForm: React.FC<EnhancedCommentFormProps> = ({ postId, onCommentAdded }) => {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 3)); // Max 3 files
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);

      selectedFiles.forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch(`/api/posts/${postId}/comments/enhanced`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        onCommentAdded(result.data);
        setContent('');
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        className="w-full resize-none border border-gray-300 rounded-lg p-3 text-sm"
        rows={3}
        maxLength={1000}
      />

      {/* File Upload */}
      <div className="flex items-center space-x-3">
        <label className="cursor-pointer flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600">
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={selectedFiles.length >= 3}
          />
          <span>📎 Attach Media ({selectedFiles.length}/3)</span>
        </label>
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span className="text-sm truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {content.length}/1000 characters
        </span>
        <button
          onClick={handleSubmit}
          disabled={(!content.trim() && selectedFiles.length === 0) || isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : 'Comment'}
        </button>
      </div>
    </div>
  );
};

export default EnhancedCommentForm;
```

### 3. Enhanced Comment Display

Update PostCard to use enhanced comments:

```tsx
// Add to PostCard.tsx
import EnhancedCommentForm from './EnhancedCommentForm';

// Replace the existing comment form with:
<EnhancedCommentForm
  postId={post.id}
  onCommentAdded={(newComment) => {
    setComments(prev => [...prev, newComment]);
  }}
/>

// Update comment display to show media:
{comments.map((comment) => (
  <div key={comment.id} className="space-y-2">
    {/* Existing comment content */}
    <p className="text-sm text-gray-800">{comment.content}</p>

    {/* Add media display */}
    {comment.media && comment.media.length > 0 && (
      <div className="grid gap-2 mt-2">
        {comment.media.map((mediaItem, index) => (
          <div key={index} className="max-w-sm">
            {mediaItem.fileType === 'image' ? (
              <img
                src={`http://localhost:3000${mediaItem.fileUrl}`}
                alt={mediaItem.fileName}
                className="rounded-lg max-h-48 object-cover"
              />
            ) : mediaItem.fileType === 'video' ? (
              <video
                src={`http://localhost:3000${mediaItem.fileUrl}`}
                controls
                className="rounded-lg max-h-48"
              />
            ) : (
              <div className="p-2 bg-gray-100 rounded flex items-center space-x-2">
                <span>📄</span>
                <span className="text-sm">{mediaItem.fileName}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
))}
```

## Testing Checklist

- [ ] Database migrations run successfully
- [ ] Comments can be created with text only (existing functionality)
- [ ] Comments can be created with media attachments
- [ ] Media displays correctly in comment threads
- [ ] File upload limits are enforced
- [ ] Invalid file types are rejected
- [ ] Comment reactions still work
- [ ] Nested comments (replies) still work
- [ ] Performance impact is minimal

## Deployment Steps

1. Run database migrations
2. Deploy backend changes
3. Deploy frontend changes
4. Test in staging environment
5. Monitor performance metrics
6. Gradual rollout to production

This Phase 1 implementation provides immediate value while maintaining full backward compatibility and sets the foundation for the unified system in later phases.