# Social Media Application Pattern

## Overview
Social media applications require complex user interactions, real-time updates, content management, and scalable architectures. This pattern covers modern social media features, data models, and implementation strategies.

## Core Features

### User Management
```javascript
class UserService {
  constructor(userRepository, authService) {
    this.userRepository = userRepository;
    this.authService = authService;
  }

  async createUser(userData) {
    const hashedPassword = await this.authService.hashPassword(userData.password);
    const user = {
      id: generateId(),
      username: userData.username,
      email: userData.email,
      passwordHash: hashedPassword,
      profile: {
        displayName: userData.displayName,
        bio: userData.bio,
        avatar: userData.avatar,
        coverPhoto: userData.coverPhoto
      },
      settings: {
        privacy: 'public',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.userRepository.save(user);
  }

  async followUser(followerId, followeeId) {
    const follow = {
      id: generateId(),
      followerId,
      followeeId,
      createdAt: new Date()
    };
    
    await this.userRepository.createFollow(follow);
    await this.notificationService.notifyFollow(followeeId, followerId);
  }
}
```

### Content Management
```javascript
class PostService {
  constructor(postRepository, mediaService, notificationService) {
    this.postRepository = postRepository;
    this.mediaService = mediaService;
    this.notificationService = notificationService;
  }

  async createPost(userId, postData) {
    const mediaUrls = await this.mediaService.uploadMedia(postData.media);
    
    const post = {
      id: generateId(),
      userId,
      content: postData.content,
      media: mediaUrls,
      visibility: postData.visibility || 'public',
      location: postData.location,
      hashtags: this.extractHashtags(postData.content),
      mentions: this.extractMentions(postData.content),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const savedPost = await this.postRepository.save(post);
    await this.notificationService.notifyMentions(post);
    return savedPost;
  }

  async getFeed(userId, page = 1, limit = 20) {
    const following = await this.userRepository.getFollowing(userId);
    const followingIds = following.map(f => f.followeeId);
    
    return await this.postRepository.getPostsByUsers(
      [userId, ...followingIds],
      page,
      limit
    );
  }

  extractHashtags(content) {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  }

  extractMentions(content) {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches.map(mention => mention.slice(1)) : [];
  }
}
```

### Real-Time Updates
```javascript
class RealTimeService {
  constructor(io, userRepository) {
    this.io = io;
    this.userRepository = userRepository;
    this.userSockets = new Map();
  }

  connectUser(userId, socket) {
    this.userSockets.set(userId, socket);
    
    socket.on('disconnect', () => {
      this.userSockets.delete(userId);
    });
  }

  async notifyNewPost(post) {
    const followers = await this.userRepository.getFollowers(post.userId);
    
    followers.forEach(follower => {
      const socket = this.userSockets.get(follower.followerId);
      if (socket) {
        socket.emit('new_post', {
          postId: post.id,
          userId: post.userId,
          content: post.content,
          createdAt: post.createdAt
        });
      }
    });
  }

  async notifyLike(postId, userId, likerId) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit('post_liked', {
        postId,
        likerId,
        timestamp: new Date()
      });
    }
  }
}
```

## Data Models

### User Model
```javascript
class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.profile = {
      displayName: data.profile.displayName,
      bio: data.profile.bio,
      avatar: data.profile.avatar,
      coverPhoto: data.profile.coverPhoto,
      website: data.profile.website,
      location: data.profile.location,
      birthDate: data.profile.birthDate
    };
    this.stats = {
      followers: data.stats.followers || 0,
      following: data.stats.following || 0,
      posts: data.stats.posts || 0
    };
    this.settings = data.settings;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  updateProfile(updates) {
    this.profile = { ...this.profile, ...updates };
    this.updatedAt = new Date();
  }

  incrementFollowers() {
    this.stats.followers++;
  }

  incrementFollowing() {
    this.stats.following++;
  }
}
```

### Post Model
```javascript
class Post {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.content = data.content;
    this.media = data.media || [];
    this.visibility = data.visibility;
    this.location = data.location;
    this.hashtags = data.hashtags || [];
    this.mentions = data.mentions || [];
    this.stats = {
      likes: data.stats.likes || 0,
      comments: data.stats.comments || 0,
      shares: data.stats.shares || 0
    };
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  addLike(userId) {
    if (!this.likes.includes(userId)) {
      this.likes.push(userId);
      this.stats.likes++;
    }
  }

  removeLike(userId) {
    const index = this.likes.indexOf(userId);
    if (index > -1) {
      this.likes.splice(index, 1);
      this.stats.likes--;
    }
  }

  addComment(comment) {
    this.comments.push(comment);
    this.stats.comments++;
  }
}
```

## Content Discovery

### Recommendation Engine
```javascript
class RecommendationEngine {
  constructor(userRepository, postRepository, interactionRepository) {
    this.userRepository = userRepository;
    this.postRepository = postRepository;
    this.interactionRepository = interactionRepository;
  }

  async getRecommendedPosts(userId, limit = 10) {
    const userInterests = await this.getUserInterests(userId);
    const similarUsers = await this.findSimilarUsers(userId);
    const trendingPosts = await this.getTrendingPosts();
    
    const recommendations = await this.postRepository.getPostsByCriteria({
      interests: userInterests,
      similarUsers,
      trending: trendingPosts,
      excludeUser: userId
    });
    
    return this.rankRecommendations(recommendations, userId).slice(0, limit);
  }

  async getUserInterests(userId) {
    const interactions = await this.interactionRepository.getUserInteractions(userId);
    const hashtags = interactions
      .filter(i => i.type === 'like' || i.type === 'comment')
      .flatMap(i => i.post.hashtags);
    
    return this.getTopHashtags(hashtags, 10);
  }

  async findSimilarUsers(userId) {
    const userInterests = await this.getUserInterests(userId);
    const allUsers = await this.userRepository.getAllUsers();
    
    return allUsers
      .filter(user => user.id !== userId)
      .map(user => ({
        user,
        similarity: this.calculateSimilarity(userInterests, user.interests)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20)
      .map(item => item.user.id);
  }

  calculateSimilarity(interests1, interests2) {
    const set1 = new Set(interests1);
    const set2 = new Set(interests2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
}
```

### Search System
```javascript
class SearchService {
  constructor(postRepository, userRepository, searchIndex) {
    this.postRepository = postRepository;
    this.userRepository = userRepository;
    this.searchIndex = searchIndex;
  }

  async search(query, filters = {}) {
    const searchResults = await this.searchIndex.search(query, {
      type: filters.type || 'all',
      dateRange: filters.dateRange,
      hashtags: filters.hashtags,
      users: filters.users
    });
    
    const posts = await this.postRepository.getPostsByIds(searchResults.posts);
    const users = await this.userRepository.getUsersByIds(searchResults.users);
    
    return {
      posts: this.rankSearchResults(posts, query),
      users: this.rankSearchResults(users, query),
      hashtags: searchResults.hashtags
    };
  }

  async searchHashtags(query) {
    return await this.searchIndex.searchHashtags(query);
  }

  async searchUsers(query) {
    return await this.userRepository.searchUsers(query);
  }

  rankSearchResults(results, query) {
    return results.map(result => ({
      ...result,
      relevance: this.calculateRelevance(result, query)
    })).sort((a, b) => b.relevance - a.relevance);
  }

  calculateRelevance(item, query) {
    const queryTerms = query.toLowerCase().split(' ');
    let relevance = 0;
    
    if (item.content) {
      const content = item.content.toLowerCase();
      queryTerms.forEach(term => {
        if (content.includes(term)) relevance += 1;
      });
    }
    
    if (item.username) {
      const username = item.username.toLowerCase();
      queryTerms.forEach(term => {
        if (username.includes(term)) relevance += 2;
      });
    }
    
    return relevance;
  }
}
```

## Media Management

### Media Upload Service
```javascript
class MediaService {
  constructor(storageService, imageProcessor) {
    this.storageService = storageService;
    this.imageProcessor = imageProcessor;
  }

  async uploadMedia(files, userId) {
    const uploadPromises = files.map(file => this.processAndUpload(file, userId));
    return await Promise.all(uploadPromises);
  }

  async processAndUpload(file, userId) {
    const processedFile = await this.imageProcessor.process(file);
    const path = `users/${userId}/media/${Date.now()}_${file.name}`;
    
    const url = await this.storageService.upload(processedFile, path);
    
    return {
      id: generateId(),
      originalName: file.name,
      url,
      type: file.type,
      size: processedFile.size,
      dimensions: processedFile.dimensions,
      uploadedAt: new Date()
    };
  }

  async generateThumbnails(media) {
    const thumbnails = await this.imageProcessor.generateThumbnails(media);
    const thumbnailUrls = [];
    
    for (const [size, thumbnail] of Object.entries(thumbnails)) {
      const path = `thumbnails/${media.id}_${size}.jpg`;
      const url = await this.storageService.upload(thumbnail, path);
      thumbnailUrls.push({ size, url });
    }
    
    return thumbnailUrls;
  }
}
```

### Image Processing
```javascript
class ImageProcessor {
  constructor() {
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  async process(file) {
    if (!this.supportedFormats.includes(file.type)) {
      throw new Error('Unsupported file format');
    }
    
    if (file.size > this.maxFileSize) {
      throw new Error('File too large');
    }
    
    const image = await this.loadImage(file);
    const processed = await this.optimizeImage(image);
    
    return processed;
  }

  async optimizeImage(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Resize if too large
    const maxDimension = 2048;
    let { width, height } = image;
    
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width *= ratio;
      height *= ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.drawImage(image, 0, 0, width, height);
    
    return canvas.toBlob((blob) => blob, 'image/jpeg', 0.8);
  }

  async generateThumbnails(media) {
    const image = await this.loadImage(media.url);
    const sizes = { small: 150, medium: 300, large: 600 };
    const thumbnails = {};
    
    for (const [size, dimension] of Object.entries(sizes)) {
      thumbnails[size] = await this.resizeImage(image, dimension, dimension);
    }
    
    return thumbnails;
  }
}
```

## Privacy and Security

### Privacy Controls
```javascript
class PrivacyService {
  constructor(userRepository, postRepository) {
    this.userRepository = userRepository;
    this.postRepository = postRepository;
  }

  async checkPostVisibility(postId, viewerId) {
    const post = await this.postRepository.getById(postId);
    const author = await this.userRepository.getById(post.userId);
    
    if (post.visibility === 'public') {
      return true;
    }
    
    if (post.visibility === 'private') {
      return viewerId === post.userId;
    }
    
    if (post.visibility === 'followers') {
      const isFollowing = await this.userRepository.isFollowing(viewerId, post.userId);
      return isFollowing || viewerId === post.userId;
    }
    
    return false;
  }

  async filterFeedByPrivacy(posts, viewerId) {
    const filteredPosts = [];
    
    for (const post of posts) {
      const isVisible = await this.checkPostVisibility(post.id, viewerId);
      if (isVisible) {
        filteredPosts.push(post);
      }
    }
    
    return filteredPosts;
  }
}
```

### Content Moderation
```javascript
class ContentModerationService {
  constructor(aiService, reportRepository) {
    this.aiService = aiService;
    this.reportRepository = reportRepository;
    this.blockedWords = new Set(['spam', 'inappropriate', 'violence']);
  }

  async moderateContent(content) {
    const checks = [
      this.checkBlockedWords(content),
      this.checkSpam(content),
      await this.aiService.analyzeToxicity(content),
      await this.aiService.detectSpam(content)
    ];
    
    const results = await Promise.all(checks);
    const violations = results.filter(result => result.violation);
    
    return {
      approved: violations.length === 0,
      violations,
      score: this.calculateModerationScore(results)
    };
  }

  async reportContent(report) {
    const moderationResult = await this.moderateContent(report.content);
    
    if (moderationResult.approved) {
      await this.reportRepository.save(report);
    } else {
      await this.autoModerate(report.contentId, moderationResult);
    }
  }

  async autoModerate(contentId, moderationResult) {
    const actions = {
      low: 'flag',
      medium: 'hide',
      high: 'remove'
    };
    
    const action = actions[moderationResult.severity];
    await this.performModerationAction(contentId, action);
  }
}
```

## Analytics and Insights

### User Analytics
```javascript
class AnalyticsService {
  constructor(analyticsRepository, eventTracker) {
    this.analyticsRepository = analyticsRepository;
    this.eventTracker = eventTracker;
  }

  async trackUserActivity(userId, activity) {
    const event = {
      id: generateId(),
      userId,
      type: activity.type,
      data: activity.data,
      timestamp: new Date(),
      sessionId: activity.sessionId
    };
    
    await this.analyticsRepository.saveEvent(event);
    this.eventTracker.track(event);
  }

  async getUserInsights(userId, timeRange = '30d') {
    const activities = await this.analyticsRepository.getUserActivities(userId, timeRange);
    
    return {
      engagement: this.calculateEngagement(activities),
      reach: this.calculateReach(activities),
      growth: this.calculateGrowth(activities),
      topContent: this.getTopContent(activities),
      audience: this.getAudienceInsights(activities)
    };
  }

  calculateEngagement(activities) {
    const interactions = activities.filter(a => 
      ['like', 'comment', 'share', 'save'].includes(a.type)
    );
    
    return {
      total: interactions.length,
      rate: interactions.length / activities.length,
      breakdown: this.groupByType(interactions)
    };
  }
}
```

## Performance Optimization

### Caching Strategy
```javascript
class SocialMediaCache {
  constructor(redisClient) {
    this.redis = redisClient;
    this.ttl = {
      user: 3600, // 1 hour
      post: 1800, // 30 minutes
      feed: 300,  // 5 minutes
      trending: 600 // 10 minutes
    };
  }

  async cacheUserFeed(userId, feed) {
    const key = `feed:${userId}`;
    await this.redis.setex(key, this.ttl.feed, JSON.stringify(feed));
  }

  async getCachedFeed(userId) {
    const key = `feed:${userId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheTrendingPosts(posts) {
    const key = 'trending:posts';
    await this.redis.setex(key, this.ttl.trending, JSON.stringify(posts));
  }

  async invalidateUserCache(userId) {
    const keys = [
      `feed:${userId}`,
      `user:${userId}`,
      `posts:${userId}`
    ];
    
    await Promise.all(keys.map(key => this.redis.del(key)));
  }
}
```

### Database Optimization
```javascript
class DatabaseOptimizer {
  constructor(database) {
    this.database = database;
  }

  async createIndexes() {
    await this.database.createIndex('posts', 'userId_createdAt', ['userId', 'createdAt']);
    await this.database.createIndex('posts', 'hashtags', ['hashtags']);
    await this.database.createIndex('follows', 'follower_followee', ['followerId', 'followeeId']);
    await this.database.createIndex('likes', 'post_user', ['postId', 'userId']);
  }

  async partitionTables() {
    // Partition posts table by date
    await this.database.partitionTable('posts', 'createdAt', 'monthly');
    
    // Partition events table by date
    await this.database.partitionTable('events', 'timestamp', 'daily');
  }

  async optimizeQueries() {
    // Use materialized views for complex aggregations
    await this.database.createMaterializedView(
      'user_stats',
      'SELECT userId, COUNT(*) as post_count, MAX(createdAt) as last_post FROM posts GROUP BY userId'
    );
  }
}
```

## Testing Strategies

### Integration Testing
```javascript
class SocialMediaIntegrationTest {
  constructor(testDatabase, testServices) {
    this.db = testDatabase;
    this.services = testServices;
  }

  async testUserWorkflow() {
    // Create user
    const user = await this.services.userService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    
    // Create post
    const post = await this.services.postService.createPost(user.id, {
      content: 'Hello world! #test',
      visibility: 'public'
    });
    
    // Follow another user
    const otherUser = await this.services.userService.createUser({
      username: 'otheruser',
      email: 'other@example.com',
      password: 'password123'
    });
    
    await this.services.userService.followUser(user.id, otherUser.id);
    
    // Get feed
    const feed = await this.services.postService.getFeed(user.id);
    
    expect(feed).toContainEqual(expect.objectContaining({
      id: post.id,
      userId: user.id
    }));
  }
}
```

### Performance Testing
```javascript
class SocialMediaPerformanceTest {
  constructor(loadGenerator, metricsCollector) {
    this.loadGenerator = loadGenerator;
    this.metrics = metricsCollector;
  }

  async testFeedPerformance() {
    const users = await this.loadGenerator.createUsers(1000);
    const posts = await this.loadGenerator.createPosts(users, 10000);
    
    const startTime = Date.now();
    const feeds = await Promise.all(
      users.map(user => this.services.postService.getFeed(user.id))
    );
    const endTime = Date.now();
    
    const avgResponseTime = (endTime - startTime) / users.length;
    expect(avgResponseTime).toBeLessThan(100); // 100ms threshold
  }

  async testConcurrentUsers() {
    const concurrentUsers = 1000;
    const requestsPerUser = 10;
    
    const results = await this.loadGenerator.simulateConcurrentUsers(
      concurrentUsers,
      requestsPerUser,
      async (user) => {
        return await this.services.postService.getFeed(user.id);
      }
    );
    
    const successRate = results.filter(r => r.success).length / results.length;
    expect(successRate).toBeGreaterThan(0.95); // 95% success rate
  }
}
```

## Best Practices

### Scalability
- Use horizontal scaling for database and application servers
- Implement proper caching strategies
- Use CDN for media delivery
- Implement database sharding for large datasets
- Use message queues for async processing

### Security
- Implement proper authentication and authorization
- Use HTTPS for all communications
- Validate and sanitize all user inputs
- Implement rate limiting
- Regular security audits

### User Experience
- Implement infinite scrolling for feeds
- Use lazy loading for images
- Provide real-time notifications
- Implement proper error handling
- Ensure responsive design

### Performance
- Optimize database queries
- Use proper indexing strategies
- Implement efficient caching
- Monitor and optimize API response times
- Use compression for data transfer 