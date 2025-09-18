const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const { cache, cacheKeys } = require('../middleware/cache');

const createRoom = async (req, res) => {
  try {
    const { name, description, roomType = 'public', maxMembers = 100 } = req.body;
    const createdBy = req.user.id;

    const room = await ChatRoom.create({
      name,
      description,
      roomType,
      createdBy,
      maxMembers
    });

    // Add creator as admin member
    await ChatRoom.addMember(room.id, createdBy, 'admin');

    // Invalidate room list cache
    await cache.delPattern('chat:rooms:*');

    res.status(201).json({
      message: 'Chat room created successfully',
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        roomType: room.room_type,
        maxMembers: room.max_members,
        createdAt: room.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
};

const getRooms = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `chat:rooms:${type}:${page}:${limit}`;

    // Try cache first
    const cachedRooms = await cache.get(cacheKey);
    if (cachedRooms) {
      return res.json(cachedRooms);
    }

    let rooms;
    if (type === 'public') {
      rooms = await ChatRoom.findPublicRooms(limit);
    } else {
      rooms = await ChatRoom.findAll(limit, offset);
    }

    const formattedRooms = rooms.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      roomType: room.room_type,
      memberCount: parseInt(room.member_count || 0),
      onlineCount: parseInt(room.online_count || 0),
      creator: room.creator_username ? {
        username: room.creator_username,
        firstName: room.creator_first_name
      } : null,
      createdAt: room.created_at
    }));

    const response = {
      rooms: formattedRooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: formattedRooms.length === parseInt(limit)
      }
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rooms' });
  }
};

const getRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `chat:room:${id}`;

    // Try cache first
    const cachedRoom = await cache.get(cacheKey);
    if (cachedRoom) {
      return res.json(cachedRoom);
    }

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user has access to this room
    const isMember = await ChatRoom.isMember(id, req.user.id);
    if (!isMember && room.room_type !== 'public') {
      return res.status(403).json({ error: 'Access denied to this room' });
    }

    const members = await ChatRoom.getRoomMembers(id);
    const onlineMembers = await ChatRoom.getOnlineMembers(id);

    const response = {
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        roomType: room.room_type,
        maxMembers: room.max_members,
        creator: room.creator_username ? {
          username: room.creator_username,
          firstName: room.creator_first_name
        } : null,
        memberCount: members.length,
        onlineCount: onlineMembers.length,
        createdAt: room.created_at
      },
      members: members.map(member => ({
        userId: member.user_id,
        username: member.username,
        firstName: member.first_name,
        lastName: member.last_name,
        profileImage: member.profile_image,
        role: member.role,
        joinedAt: member.joined_at,
        isOnline: member.is_online,
        lastSeen: member.last_seen
      })),
      userRole: await ChatRoom.getMemberRole(id, req.user.id)
    };

    // Cache for 2 minutes
    await cache.set(cacheKey, response, 120);

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room' });
  }
};

const getUserRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `chat:user_rooms:${userId}`;

    // Try cache first
    const cachedRooms = await cache.get(cacheKey);
    if (cachedRooms) {
      return res.json(cachedRooms);
    }

    const rooms = await ChatRoom.findUserRooms(userId);

    const response = {
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        roomType: room.room_type,
        role: room.role,
        unreadCount: parseInt(room.unread_count),
        isOnline: room.is_online,
        lastSeen: room.last_seen,
        creator: room.creator_username ? {
          username: room.creator_username,
          firstName: room.creator_first_name
        } : null,
        createdAt: room.created_at,
        updatedAt: room.updated_at
      }))
    };

    // Cache for 1 minute
    await cache.set(cacheKey, response, 60);

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user rooms' });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if already a member
    const isMember = await ChatRoom.isMember(id, userId);
    if (isMember) {
      return res.json({ message: 'Already a member of this room' });
    }

    // For private rooms, only allow joining if invited (this would require invitation system)
    if (room.room_type === 'private') {
      return res.status(403).json({ error: 'Cannot join private room without invitation' });
    }

    await ChatRoom.addMember(id, userId, 'member');

    // Invalidate caches
    await Promise.all([
      cache.del(`chat:room:${id}`),
      cache.del(`chat:user_rooms:${userId}`),
      cache.delPattern('chat:rooms:*')
    ]);

    res.json({ message: 'Successfully joined room' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join room' });
  }
};

const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const removedMember = await ChatRoom.removeMember(id, userId);
    if (!removedMember) {
      return res.status(404).json({ error: 'Not a member of this room' });
    }

    // Invalidate caches
    await Promise.all([
      cache.del(`chat:room:${id}`),
      cache.del(`chat:user_rooms:${userId}`),
      cache.delPattern('chat:rooms:*')
    ]);

    res.json({ message: 'Successfully left room' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave room' });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, since } = req.query;
    const offset = (page - 1) * limit;

    // Verify user has access to room
    const isMember = await ChatRoom.isMember(id, req.user.id);
    if (!isMember) {
      const room = await ChatRoom.findById(id);
      if (!room || room.room_type !== 'public') {
        return res.status(403).json({ error: 'Access denied to this room' });
      }
    }

    let messages;
    if (since) {
      messages = await ChatMessage.findByRoomSince(id, new Date(since), limit);
    } else {
      messages = await ChatMessage.findByRoom(id, limit, offset);
    }

    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      messageType: message.message_type,
      replyTo: message.reply_to,
      replyContent: message.reply_content,
      replyUsername: message.reply_username,
      isEdited: message.is_edited,
      sender: {
        id: message.sender_id,
        username: message.username,
        firstName: message.first_name,
        lastName: message.last_name,
        profileImage: message.profile_image
      },
      createdAt: message.created_at,
      updatedAt: message.updated_at
    }));

    res.json({
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: formattedMessages.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room messages' });
  }
};

const searchMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { q, limit = 20 } = req.query;

    if (!q?.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Verify user has access to room
    const isMember = await ChatRoom.isMember(id, req.user.id);
    if (!isMember) {
      const room = await ChatRoom.findById(id);
      if (!room || room.room_type !== 'public') {
        return res.status(403).json({ error: 'Access denied to this room' });
      }
    }

    const messages = await ChatMessage.search(id, q.trim(), limit);

    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      messageType: message.message_type,
      sender: {
        id: message.sender_id,
        username: message.username,
        firstName: message.first_name,
        lastName: message.last_name,
        profileImage: message.profile_image
      },
      createdAt: message.created_at
    }));

    res.json({
      messages: formattedMessages,
      searchTerm: q.trim(),
      count: formattedMessages.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // Check if user has permission to update room
    const userRole = await ChatRoom.getMemberRole(id, userId);
    if (!userRole || !['admin', 'moderator'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to update room' });
    }

    const updatedRoom = await ChatRoom.update(id, updates);
    if (!updatedRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Invalidate caches
    await Promise.all([
      cache.del(`chat:room:${id}`),
      cache.delPattern('chat:rooms:*')
    ]);

    res.json({
      message: 'Room updated successfully',
      room: {
        id: updatedRoom.id,
        name: updatedRoom.name,
        description: updatedRoom.description,
        maxMembers: updatedRoom.max_members,
        updatedAt: updatedRoom.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has permission to delete room
    const userRole = await ChatRoom.getMemberRole(id, userId);
    if (!userRole || userRole !== 'admin') {
      return res.status(403).json({ error: 'Only room admins can delete rooms' });
    }

    const deletedRoom = await ChatRoom.delete(id);
    if (!deletedRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Invalidate all related caches
    await Promise.all([
      cache.del(`chat:room:${id}`),
      cache.delPattern('chat:rooms:*'),
      cache.delPattern('chat:user_rooms:*')
    ]);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  getUserRooms,
  joinRoom,
  leaveRoom,
  getRoomMessages,
  searchMessages,
  updateRoom,
  deleteRoom
};