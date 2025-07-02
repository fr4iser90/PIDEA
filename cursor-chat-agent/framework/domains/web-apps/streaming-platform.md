# Streaming Platform Application Pattern

## Overview
Streaming platforms require sophisticated video processing, real-time delivery, user engagement features, and scalable infrastructure. This pattern covers modern streaming architecture, content management, and user experience optimization.

## Core Architecture

### Video Processing Pipeline
```javascript
class VideoProcessingPipeline {
  constructor(encoder, storage, cdn) {
    this.encoder = encoder;
    this.storage = storage;
    this.cdn = cdn;
    this.processingQueue = new Queue();
  }

  async processVideo(videoFile, metadata) {
    const job = {
      id: generateId(),
      file: videoFile,
      metadata,
      status: 'pending',
      createdAt: new Date()
    };

    await this.processingQueue.add(job);
    return job.id;
  }

  async processJob(job) {
    try {
      job.status = 'processing';
      
      // Generate multiple quality versions
      const qualities = ['1080p', '720p', '480p', '360p'];
      const encodedVersions = await Promise.all(
        qualities.map(quality => this.encoder.encode(job.file, quality))
      );

      // Generate thumbnails
      const thumbnails = await this.generateThumbnails(job.file);
      
      // Upload to storage
      const uploadPromises = [
        ...encodedVersions.map(version => this.storage.upload(version)),
        ...thumbnails.map(thumb => this.storage.upload(thumb))
      ];
      
      const uploadedFiles = await Promise.all(uploadPromises);
      
      // Create HLS manifest
      const manifest = this.createHLSManifest(encodedVersions);
      await this.storage.upload(manifest);
      
      job.status = 'completed';
      job.result = {
        versions: uploadedFiles.slice(0, qualities.length),
        thumbnails: uploadedFiles.slice(qualities.length),
        manifest: manifest.url
      };
      
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
    }
  }

  createHLSManifest(versions) {
    const manifest = {
      version: 3,
      segments: versions.map(version => ({
        resolution: version.resolution,
        bandwidth: version.bandwidth,
        url: version.url
      }))
    };
    
    return {
      content: this.generateM3U8(manifest),
      url: `manifests/${generateId()}.m3u8`
    };
  }
}
```

### Streaming Server
```javascript
class StreamingServer {
  constructor(mediaServer, sessionManager) {
    this.mediaServer = mediaServer;
    this.sessionManager = sessionManager;
    this.activeStreams = new Map();
  }

  async startStream(streamId, userId) {
    const stream = {
      id: streamId,
      userId,
      status: 'live',
      viewers: 0,
      startedAt: new Date(),
      quality: 'auto'
    };

    this.activeStreams.set(streamId, stream);
    await this.mediaServer.createStream(streamId);
    
    return stream;
  }

  async joinStream(streamId, userId) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    stream.viewers++;
    await this.sessionManager.addViewer(streamId, userId);
    
    const session = await this.mediaServer.createViewerSession(streamId, userId);
    return {
      streamUrl: session.url,
      quality: stream.quality,
      chatEnabled: stream.chatEnabled
    };
  }

  async leaveStream(streamId, userId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.viewers = Math.max(0, stream.viewers - 1);
      await this.sessionManager.removeViewer(streamId, userId);
    }
  }

  async endStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.status = 'ended';
      stream.endedAt = new Date();
      
      await this.mediaServer.endStream(streamId);
      await this.saveStreamRecording(stream);
      
      this.activeStreams.delete(streamId);
    }
  }
}
```

## Content Management

### Video Repository
```javascript
class VideoRepository {
  constructor(database, storage) {
    this.database = database;
    this.storage = storage;
  }

  async saveVideo(videoData) {
    const video = {
      id: generateId(),
      title: videoData.title,
      description: videoData.description,
      userId: videoData.userId,
      category: videoData.category,
      tags: videoData.tags,
      duration: videoData.duration,
      thumbnail: videoData.thumbnail,
      manifest: videoData.manifest,
      qualities: videoData.qualities,
      visibility: videoData.visibility || 'public',
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.database.videos.insert(video);
    return video;
  }

  async getVideo(videoId, userId = null) {
    const video = await this.database.videos.findById(videoId);
    
    if (!video) {
      throw new Error('Video not found');
    }

    // Check visibility
    if (video.visibility === 'private' && video.userId !== userId) {
      throw new Error('Video is private');
    }

    // Add view count if public
    if (video.visibility === 'public') {
      await this.incrementViewCount(videoId);
    }

    return video;
  }

  async getRecommendedVideos(userId, limit = 20) {
    const userHistory = await this.getUserHistory(userId);
    const userPreferences = await this.analyzeUserPreferences(userHistory);
    
    const videos = await this.database.videos.find({
      status: 'published',
      visibility: 'public',
      category: { $in: userPreferences.categories }
    }).limit(limit);

    return this.rankVideos(videos, userPreferences);
  }

  async searchVideos(query, filters = {}) {
    const searchCriteria = {
      $text: { $search: query },
      status: 'published',
      visibility: 'public'
    };

    if (filters.category) {
      searchCriteria.category = filters.category;
    }

    if (filters.duration) {
      searchCriteria.duration = { $lte: filters.duration };
    }

    const videos = await this.database.videos.find(searchCriteria)
      .sort({ score: { $meta: 'textScore' } })
      .limit(filters.limit || 50);

    return videos;
  }
}
```

### Live Streaming Management
```javascript
class LiveStreamManager {
  constructor(streamingServer, notificationService) {
    this.streamingServer = streamingServer;
    this.notificationService = notificationService;
    this.scheduledStreams = new Map();
  }

  async scheduleStream(streamData) {
    const stream = {
      id: generateId(),
      userId: streamData.userId,
      title: streamData.title,
      description: streamData.description,
      scheduledAt: streamData.scheduledAt,
      duration: streamData.estimatedDuration,
      category: streamData.category,
      thumbnail: streamData.thumbnail,
      status: 'scheduled'
    };

    this.scheduledStreams.set(stream.id, stream);
    await this.notificationService.notifyFollowers(stream);
    
    return stream;
  }

  async startScheduledStream(streamId) {
    const stream = this.scheduledStreams.get(streamId);
    if (!stream) {
      throw new Error('Scheduled stream not found');
    }

    const liveStream = await this.streamingServer.startStream(streamId, stream.userId);
    stream.status = 'live';
    stream.startedAt = new Date();

    await this.notificationService.notifySubscribers(stream);
    return liveStream;
  }

  async getLiveStreams(category = null) {
    const streams = Array.from(this.streamingServer.activeStreams.values());
    
    if (category) {
      return streams.filter(stream => stream.category === category);
    }
    
    return streams.sort((a, b) => b.viewers - a.viewers);
  }
}
```

## User Engagement

### Chat System
```javascript
class LiveChatSystem {
  constructor(websocketManager, moderationService) {
    this.websocketManager = websocketManager;
    this.moderationService = moderationService;
    this.chatRooms = new Map();
  }

  async joinChat(streamId, userId) {
    const room = this.getOrCreateRoom(streamId);
    room.addUser(userId);
    
    const socket = await this.websocketManager.connect(userId);
    socket.join(`chat:${streamId}`);
    
    return {
      roomId: streamId,
      messageHistory: await this.getMessageHistory(streamId, 50)
    };
  }

  async sendMessage(streamId, userId, message) {
    const room = this.chatRooms.get(streamId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    // Moderate message
    const moderationResult = await this.moderationService.moderateMessage(message);
    if (!moderationResult.approved) {
      throw new Error('Message violates community guidelines');
    }

    const chatMessage = {
      id: generateId(),
      streamId,
      userId,
      message: moderationResult.cleanedMessage,
      timestamp: new Date(),
      type: 'message'
    };

    await this.saveMessage(chatMessage);
    await this.broadcastMessage(streamId, chatMessage);
    
    return chatMessage;
  }

  async broadcastMessage(streamId, message) {
    const room = this.chatRooms.get(streamId);
    if (room) {
      room.broadcast('new_message', message);
    }
  }

  async getMessageHistory(streamId, limit = 50) {
    return await this.database.chatMessages
      .find({ streamId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .reverse();
  }
}
```

### Interaction System
```javascript
class InteractionSystem {
  constructor(database, notificationService) {
    this.database = database;
    this.notificationService = notificationService;
  }

  async likeVideo(videoId, userId) {
    const existingLike = await this.database.likes.findOne({
      videoId,
      userId
    });

    if (existingLike) {
      await this.database.likes.deleteOne({ _id: existingLike._id });
      await this.decrementLikeCount(videoId);
      return { action: 'unliked' };
    } else {
      const like = {
        id: generateId(),
        videoId,
        userId,
        createdAt: new Date()
      };

      await this.database.likes.insert(like);
      await this.incrementLikeCount(videoId);
      await this.notificationService.notifyLike(videoId, userId);
      
      return { action: 'liked' };
    }
  }

  async subscribeToChannel(channelId, userId) {
    const existingSubscription = await this.database.subscriptions.findOne({
      channelId,
      userId
    });

    if (existingSubscription) {
      await this.database.subscriptions.deleteOne({ _id: existingSubscription._id });
      await this.decrementSubscriberCount(channelId);
      return { action: 'unsubscribed' };
    } else {
      const subscription = {
        id: generateId(),
        channelId,
        userId,
        createdAt: new Date()
      };

      await this.database.subscriptions.insert(subscription);
      await this.incrementSubscriberCount(channelId);
      await this.notificationService.notifySubscription(channelId, userId);
      
      return { action: 'subscribed' };
    }
  }

  async addComment(videoId, userId, comment) {
    const moderationResult = await this.moderationService.moderateComment(comment);
    if (!moderationResult.approved) {
      throw new Error('Comment violates community guidelines');
    }

    const commentObj = {
      id: generateId(),
      videoId,
      userId,
      content: moderationResult.cleanedComment,
      createdAt: new Date(),
      likes: 0,
      replies: []
    };

    await this.database.comments.insert(commentObj);
    await this.incrementCommentCount(videoId);
    await this.notificationService.notifyComment(videoId, userId);
    
    return commentObj;
  }
}
```

## Analytics and Insights

### Viewer Analytics
```javascript
class ViewerAnalytics {
  constructor(database, realTimeTracker) {
    this.database = database;
    this.realTimeTracker = realTimeTracker;
  }

  async trackView(videoId, userId, sessionData) {
    const view = {
      id: generateId(),
      videoId,
      userId,
      sessionId: sessionData.sessionId,
      watchTime: sessionData.watchTime,
      progress: sessionData.progress,
      quality: sessionData.quality,
      device: sessionData.device,
      location: sessionData.location,
      timestamp: new Date()
    };

    await this.database.views.insert(view);
    await this.updateVideoStats(videoId);
    
    if (userId) {
      await this.updateUserHistory(userId, videoId, sessionData);
    }
  }

  async getVideoAnalytics(videoId) {
    const views = await this.database.views.find({ videoId });
    const likes = await this.database.likes.find({ videoId });
    const comments = await this.database.comments.find({ videoId });

    return {
      totalViews: views.length,
      uniqueViews: new Set(views.map(v => v.userId)).size,
      averageWatchTime: this.calculateAverageWatchTime(views),
      engagementRate: this.calculateEngagementRate(views, likes, comments),
      viewerRetention: this.calculateViewerRetention(views),
      geographicDistribution: this.getGeographicDistribution(views),
      deviceBreakdown: this.getDeviceBreakdown(views)
    };
  }

  async getChannelAnalytics(channelId) {
    const videos = await this.database.videos.find({ userId: channelId });
    const subscribers = await this.database.subscriptions.find({ channelId });
    
    const videoIds = videos.map(v => v.id);
    const views = await this.database.views.find({ videoId: { $in: videoIds } });

    return {
      totalVideos: videos.length,
      totalViews: views.length,
      totalSubscribers: subscribers.length,
      averageViewsPerVideo: views.length / videos.length,
      subscriberGrowth: await this.getSubscriberGrowth(channelId),
      topVideos: await this.getTopVideos(channelId)
    };
  }

  calculateAverageWatchTime(views) {
    if (views.length === 0) return 0;
    const totalWatchTime = views.reduce((sum, view) => sum + view.watchTime, 0);
    return totalWatchTime / views.length;
  }

  calculateEngagementRate(views, likes, comments) {
    const totalInteractions = likes.length + comments.length;
    const totalViews = views.length;
    return totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
  }
}
```

## Content Discovery

### Recommendation Engine
```javascript
class VideoRecommendationEngine {
  constructor(videoRepository, userRepository, analytics) {
    this.videoRepository = videoRepository;
    this.userRepository = userRepository;
    this.analytics = analytics;
  }

  async getPersonalizedRecommendations(userId, limit = 20) {
    const userHistory = await this.analytics.getUserHistory(userId);
    const userPreferences = await this.analyzeUserPreferences(userHistory);
    const similarUsers = await this.findSimilarUsers(userId);
    
    const recommendations = await this.videoRepository.getVideosByCriteria({
      categories: userPreferences.categories,
      tags: userPreferences.tags,
      similarUsers: similarUsers.map(u => u.id),
      excludeWatched: userHistory.map(h => h.videoId)
    });

    return this.rankRecommendations(recommendations, userPreferences).slice(0, limit);
  }

  async getTrendingVideos(timeRange = '7d', category = null) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.parseTimeRange(timeRange));

    const views = await this.analytics.getViewsInRange(startDate);
    const videoStats = this.aggregateVideoStats(views);
    
    let trendingVideos = Object.entries(videoStats)
      .map(([videoId, stats]) => ({
        videoId,
        score: this.calculateTrendingScore(stats)
      }))
      .sort((a, b) => b.score - a.score);

    if (category) {
      const categoryVideos = await this.videoRepository.getVideosByCategory(category);
      const categoryVideoIds = categoryVideos.map(v => v.id);
      trendingVideos = trendingVideos.filter(v => categoryVideoIds.includes(v.videoId));
    }

    const videoIds = trendingVideos.slice(0, 50).map(v => v.videoId);
    return await this.videoRepository.getVideosByIds(videoIds);
  }

  calculateTrendingScore(stats) {
    const viewWeight = 1;
    const likeWeight = 2;
    const commentWeight = 3;
    const shareWeight = 4;
    
    return (
      stats.views * viewWeight +
      stats.likes * likeWeight +
      stats.comments * commentWeight +
      stats.shares * shareWeight
    );
  }
}
```

## Performance Optimization

### CDN Integration
```javascript
class CDNManager {
  constructor(cdnProvider, storage) {
    this.cdnProvider = cdnProvider;
    this.storage = storage;
  }

  async distributeVideo(videoId, manifestUrl) {
    const distribution = await this.cdnProvider.createDistribution({
      origin: manifestUrl,
      behaviors: [
        {
          path: '*.m3u8',
          cachePolicy: 'no-cache'
        },
        {
          path: '*.ts',
          cachePolicy: 'cache-1-day'
        },
        {
          path: 'thumbnails/*',
          cachePolicy: 'cache-1-week'
        }
      ]
    });

    await this.storage.updateVideo(videoId, {
      cdnUrl: distribution.url,
      distributionId: distribution.id
    });

    return distribution;
  }

  async invalidateCache(videoId, paths = []) {
    const video = await this.storage.getVideo(videoId);
    if (video.distributionId) {
      await this.cdnProvider.invalidateCache(video.distributionId, paths);
    }
  }
}
```

### Adaptive Bitrate Streaming
```javascript
class AdaptiveBitrateManager {
  constructor(mediaServer, analytics) {
    this.mediaServer = mediaServer;
    this.analytics = analytics;
  }

  async selectOptimalQuality(userId, videoId, networkConditions) {
    const userHistory = await this.analytics.getUserHistory(userId);
    const userPreferences = this.analyzeUserPreferences(userHistory);
    
    const availableQualities = ['1080p', '720p', '480p', '360p'];
    const networkSpeed = networkConditions.bandwidth;
    const deviceCapabilities = networkConditions.device;
    
    let optimalQuality = '480p'; // Default
    
    if (networkSpeed > 5000000 && deviceCapabilities.supports1080p) {
      optimalQuality = '1080p';
    } else if (networkSpeed > 2500000 && deviceCapabilities.supports720p) {
      optimalQuality = '720p';
    } else if (networkSpeed > 1000000) {
      optimalQuality = '480p';
    } else {
      optimalQuality = '360p';
    }
    
    // Adjust based on user preferences
    if (userPreferences.prefersQuality && networkSpeed > 2000000) {
      optimalQuality = this.upgradeQuality(optimalQuality);
    }
    
    return optimalQuality;
  }

  async monitorStreamQuality(sessionId, metrics) {
    const session = await this.mediaServer.getSession(sessionId);
    
    if (metrics.bufferHealth < 0.3) {
      // Buffer is running low, downgrade quality
      const newQuality = this.downgradeQuality(session.currentQuality);
      await this.mediaServer.changeQuality(sessionId, newQuality);
    } else if (metrics.bufferHealth > 0.8 && metrics.networkSpeed > 3000000) {
      // Buffer is healthy and network is good, upgrade quality
      const newQuality = this.upgradeQuality(session.currentQuality);
      await this.mediaServer.changeQuality(sessionId, newQuality);
    }
  }
}
```

## Security and Moderation

### Content Moderation
```javascript
class ContentModerationService {
  constructor(aiService, humanModerators) {
    this.aiService = aiService;
    this.humanModerators = humanModerators;
    this.moderationQueue = new Queue();
  }

  async moderateVideo(videoId, videoData) {
    const moderationTasks = [
      this.aiService.analyzeVideo(videoData.url),
      this.aiService.analyzeThumbnail(videoData.thumbnail),
      this.aiService.analyzeMetadata(videoData.title, videoData.description)
    ];

    const results = await Promise.all(moderationTasks);
    const violations = results.flat().filter(result => result.violation);

    if (violations.length > 0) {
      const severity = this.calculateSeverity(violations);
      
      if (severity === 'high') {
        await this.autoReject(videoId);
      } else {
        await this.flagForReview(videoId, violations);
      }
    } else {
      await this.approveVideo(videoId);
    }
  }

  async moderateComment(comment) {
    const analysis = await this.aiService.analyzeText(comment);
    
    if (analysis.toxicity > 0.8) {
      return { approved: false, reason: 'toxic_content' };
    }
    
    if (analysis.spam > 0.7) {
      return { approved: false, reason: 'spam' };
    }
    
    return { approved: true, cleanedComment: comment };
  }

  async flagForReview(contentId, violations) {
    const review = {
      id: generateId(),
      contentId,
      violations,
      status: 'pending',
      createdAt: new Date()
    };

    await this.moderationQueue.add(review);
    await this.notifyModerators(review);
  }
}
```

## Testing Strategies

### Load Testing
```javascript
class StreamingLoadTest {
  constructor(loadGenerator, metricsCollector) {
    this.loadGenerator = loadGenerator;
    this.metrics = metricsCollector;
  }

  async testConcurrentViewers(streamId, maxViewers = 10000) {
    const viewers = await this.loadGenerator.createViewers(maxViewers);
    
    const startTime = Date.now();
    const joinPromises = viewers.map(viewer => 
      this.streamingServer.joinStream(streamId, viewer.id)
    );
    
    const results = await Promise.allSettled(joinPromises);
    const endTime = Date.now();
    
    const successfulJoins = results.filter(r => r.status === 'fulfilled').length;
    const successRate = successfulJoins / maxViewers;
    
    expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
  }

  async testVideoPlayback(videoId, concurrentPlays = 1000) {
    const players = await this.loadGenerator.createPlayers(concurrentPlays);
    
    const playbackPromises = players.map(player => 
      this.videoService.playVideo(videoId, player.id)
    );
    
    const results = await Promise.allSettled(playbackPromises);
    const successfulPlays = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successfulPlays / concurrentPlays).toBeGreaterThan(0.98); // 98% success rate
  }
}
```

## Best Practices

### Video Processing
- Use adaptive bitrate encoding for multiple quality levels
- Implement proper error handling for failed uploads
- Use background processing for video encoding
- Implement retry mechanisms for failed operations
- Monitor processing queue health

### Streaming Performance
- Use CDN for global content delivery
- Implement adaptive bitrate streaming
- Monitor network conditions and adjust quality
- Use proper caching strategies
- Implement connection pooling

### User Experience
- Provide multiple video quality options
- Implement smooth quality transitions
- Use lazy loading for video thumbnails
- Provide offline viewing capabilities
- Implement proper error recovery

### Security
- Implement DRM for premium content
- Use secure video delivery protocols
- Implement proper access controls
- Monitor for abuse and violations
- Regular security audits 