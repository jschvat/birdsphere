/**
 * Query helpers for building complex database queries with sorting, filtering, and pagination
 */

class QueryBuilder {
  constructor(model, query) {
    this.model = model;
    this.mongooseQuery = query;
    this.queryString = {};
  }

  static create(model, queryString = {}) {
    const query = model.find();
    const builder = new QueryBuilder(model, query);
    builder.queryString = queryString;
    return builder;
  }

  // Filtering methods
  filter(filters = {}) {
    const queryObj = { ...this.queryString };

    // Remove special query parameters
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'populate'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering with operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    const filterObj = JSON.parse(queryStr);

    // Apply additional filters
    Object.assign(filterObj, filters);

    this.mongooseQuery = this.mongooseQuery.find(filterObj);
    return this;
  }

  // Search functionality
  search(searchFields = []) {
    if (this.queryString.search && searchFields.length > 0) {
      const searchValue = this.queryString.search;
      const searchConditions = [];

      // Text search if search fields include text searchable fields
      if (searchFields.includes('content') || searchFields.includes('hashtags')) {
        searchConditions.push({
          $text: { $search: searchValue }
        });
      }

      // Regex search for other fields
      searchFields.forEach(field => {
        if (field !== 'content' && field !== 'hashtags') {
          searchConditions.push({
            [field]: { $regex: searchValue, $options: 'i' }
          });
        }
      });

      if (searchConditions.length > 0) {
        this.mongooseQuery = this.mongooseQuery.find({
          $or: searchConditions
        });
      }
    }
    return this;
  }

  // Sorting
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      // Default sort by creation date (newest first)
      this.mongooseQuery = this.mongooseQuery.sort('-createdAt');
    }
    return this;
  }

  // Field limiting
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.select(fields);
    }
    return this;
  }

  // Pagination
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 20;
    const skip = (page - 1) * limit;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    return this;
  }

  // Population
  populate(populateOptions = []) {
    if (this.queryString.populate) {
      const fieldsToPopulate = this.queryString.populate.split(',');
      fieldsToPopulate.forEach(field => {
        const populateOption = populateOptions.find(opt => opt.path === field.trim());
        if (populateOption) {
          this.mongooseQuery = this.mongooseQuery.populate(populateOption);
        } else {
          this.mongooseQuery = this.mongooseQuery.populate(field.trim());
        }
      });
    } else {
      // Apply default populations
      populateOptions.forEach(option => {
        if (option.default) {
          this.mongooseQuery = this.mongooseQuery.populate(option);
        }
      });
    }
    return this;
  }

  // Date range filtering
  dateRange(dateField = 'createdAt') {
    if (this.queryString.startDate || this.queryString.endDate) {
      const dateFilter = {};

      if (this.queryString.startDate) {
        dateFilter.$gte = new Date(this.queryString.startDate);
      }

      if (this.queryString.endDate) {
        const endDate = new Date(this.queryString.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        dateFilter.$lte = endDate;
      }

      this.mongooseQuery = this.mongooseQuery.find({
        [dateField]: dateFilter
      });
    }
    return this;
  }

  // Visibility filtering (for posts)
  visibility(userId = null, userFollowing = []) {
    const visibilityConditions = [
      { visibility: 'public' }
    ];

    if (userId) {
      // User can see their own posts
      visibilityConditions.push({ author: userId });

      // User can see posts from people they follow that are set to 'followers'
      if (userFollowing.length > 0) {
        visibilityConditions.push({
          visibility: 'followers',
          author: { $in: userFollowing }
        });
      }
    }

    this.mongooseQuery = this.mongooseQuery.find({
      $or: visibilityConditions
    });

    return this;
  }

  // Execute query and get results with metadata
  async execute() {
    return await this.mongooseQuery;
  }

  // Execute with pagination metadata
  async executeWithPagination() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 20;

    // Clone query for counting (without pagination)
    const countQuery = this.mongooseQuery.model.find(this.mongooseQuery.getQuery());
    const total = await countQuery.countDocuments();

    const results = await this.mongooseQuery;

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
}

// Predefined sort options for different models
const SORT_OPTIONS = {
  posts: {
    newest: '-createdAt',
    oldest: 'createdAt',
    popular: '-analytics.engagementScore -analytics.reactionCount -createdAt',
    trending: '-analytics.reachCount -analytics.engagementScore -createdAt',
    mostViewed: '-analytics.viewCount -createdAt',
    mostCommented: '-analytics.commentCount -createdAt',
    mostShared: '-analytics.shareCount -createdAt',
    alphabetical: 'content',
    author: 'author -createdAt'
  },
  comments: {
    newest: '-createdAt',
    oldest: 'createdAt',
    popular: '-reactionCount -createdAt',
    author: 'author -createdAt'
  },
  users: {
    newest: '-createdAt',
    oldest: 'createdAt',
    alphabetical: 'firstName lastName username',
    mostFollowers: '-followerCount',
    mostPosts: '-postCount'
  }
};

// Search field configurations
const SEARCH_FIELDS = {
  posts: ['content', 'hashtags', 'searchKeywords'],
  comments: ['content'],
  users: ['username', 'firstName', 'lastName', 'bio']
};

// Population configurations
const POPULATE_OPTIONS = {
  posts: [
    { path: 'relatedCategories', select: 'name icon' },
    { path: 'originalPost' }
  ],
  comments: [
    { path: 'post', select: 'author content' }
  ]
};

module.exports = {
  QueryBuilder,
  SORT_OPTIONS,
  SEARCH_FIELDS,
  POPULATE_OPTIONS
};