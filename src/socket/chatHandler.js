const jwt = require('jsonwebtoken');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// Store active connections
const activeConnections = new Map();
const roomConnections = new Map();

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user.id;
    socket.username = user.username;
    socket.userInfo = {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImage: user.profile_image
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
  }
};

const initializeChatHandler = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    console.log(`User ${socket.username} connected to chat`);
    
    // Store active connection
    activeConnections.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      userInfo: socket.userInfo,
      connectedAt: new Date()
    });

    // Join user to their existing rooms
    try {
      const userRooms = await ChatRoom.findUserRooms(socket.userId);
      for (const room of userRooms) {
        socket.join(room.id);
        
        // Update user online status
        await ChatRoom.updateMemberStatus(room.id, socket.userId, true);
        
        // Track room connections
        if (!roomConnections.has(room.id)) {
          roomConnections.set(room.id, new Set());
        }
        roomConnections.get(room.id).add(socket.userId);

        // Notify room members that user is online
        socket.to(room.id).emit('user_online', {
          userId: socket.userId,
          username: socket.username,
          userInfo: socket.userInfo
        });
      }

      // Send user their room list
      socket.emit('user_rooms', userRooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        roomType: room.room_type,
        role: room.role,
        unreadCount: parseInt(room.unread_count),
        isOnline: room.is_online,
        lastSeen: room.last_seen
      })));

    } catch (error) {
      console.error('Error joining user rooms:', error);
    }

    // Handle joining a room
    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;
        
        // Verify room exists and user has access
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        // Check if user is a member or if room is public
        const isMember = await ChatRoom.isMember(roomId, socket.userId);
        if (!isMember && room.room_type !== 'public') {
          return socket.emit('error', { message: 'Access denied to this room' });
        }

        // Add user to room if not already a member
        if (!isMember && room.room_type === 'public') {
          await ChatRoom.addMember(roomId, socket.userId, 'member');
        }

        // Join socket room
        socket.join(roomId);
        
        // Update online status
        await ChatRoom.updateMemberStatus(roomId, socket.userId, true);

        // Track room connection
        if (!roomConnections.has(roomId)) {
          roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId).add(socket.userId);

        // Get recent messages
        const messages = await ChatMessage.findByRoom(roomId, 50);
        const onlineMembers = await ChatRoom.getOnlineMembers(roomId);

        socket.emit('room_joined', {
          room: {
            id: room.id,
            name: room.name,
            description: room.description,
            roomType: room.room_type,
            maxMembers: room.max_members
          },
          messages: messages.map(formatMessage),
          onlineMembers: onlineMembers.map(member => ({
            userId: member.user_id,
            username: member.username,
            firstName: member.first_name,
            lastName: member.last_name,
            profileImage: member.profile_image,
            role: member.role,
            lastSeen: member.last_seen
          }))
        });

        // Notify other room members
        socket.to(roomId).emit('user_joined_room', {
          userId: socket.userId,
          username: socket.username,
          userInfo: socket.userInfo,
          roomId
        });

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving a room
    socket.on('leave_room', async (data) => {
      try {
        const { roomId } = data;
        
        socket.leave(roomId);
        
        // Update offline status
        await ChatRoom.updateMemberStatus(roomId, socket.userId, false);

        // Remove from room connections tracking
        if (roomConnections.has(roomId)) {
          roomConnections.get(roomId).delete(socket.userId);
        }

        // Notify other room members
        socket.to(roomId).emit('user_left_room', {
          userId: socket.userId,
          username: socket.username,
          roomId
        });

        socket.emit('room_left', { roomId });

      } catch (error) {
        console.error('Error leaving room:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, messageType = 'text', replyTo } = data;

        // Validate input
        if (!roomId || !content?.trim()) {
          return socket.emit('error', { message: 'Room ID and message content are required' });
        }

        // Verify user is in room
        const isMember = await ChatRoom.isMember(roomId, socket.userId);
        if (!isMember) {
          return socket.emit('error', { message: 'You are not a member of this room' });
        }

        // Create message
        const message = await ChatMessage.create({
          roomId,
          senderId: socket.userId,
          content: content.trim(),
          messageType,
          replyTo
        });

        // Get full message details
        const fullMessage = await ChatMessage.findById(message.id);
        const formattedMessage = formatMessage(fullMessage);

        // Broadcast to all room members
        io.to(roomId).emit('new_message', formattedMessage);

        // Update room's last activity
        await ChatRoom.update(roomId, { updated_at: new Date() });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message editing
    socket.on('edit_message', async (data) => {
      try {
        const { messageId, content } = data;

        if (!messageId || !content?.trim()) {
          return socket.emit('error', { message: 'Message ID and content are required' });
        }

        const updatedMessage = await ChatMessage.update(messageId, socket.userId, {
          content: content.trim()
        });

        if (!updatedMessage) {
          return socket.emit('error', { message: 'Message not found or permission denied' });
        }

        const fullMessage = await ChatMessage.findById(messageId);
        const formattedMessage = formatMessage(fullMessage);

        // Broadcast edit to room
        io.to(updatedMessage.room_id).emit('message_edited', formattedMessage);

      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle message deletion
    socket.on('delete_message', async (data) => {
      try {
        const { messageId } = data;

        const deletedMessage = await ChatMessage.delete(messageId, socket.userId);
        
        if (!deletedMessage) {
          return socket.emit('error', { message: 'Message not found or permission denied' });
        }

        // Broadcast deletion to room
        io.to(deletedMessage.room_id).emit('message_deleted', {
          messageId,
          roomId: deletedMessage.room_id
        });

      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle marking room as read
    socket.on('mark_room_read', async (data) => {
      try {
        const { roomId } = data;
        
        const markedCount = await ChatMessage.markRoomAsRead(roomId, socket.userId);
        
        socket.emit('room_marked_read', {
          roomId,
          markedCount
        });

      } catch (error) {
        console.error('Error marking room as read:', error);
        socket.emit('error', { message: 'Failed to mark room as read' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        roomId
      });
    });

    socket.on('typing_stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_stopped_typing', {
        userId: socket.userId,
        username: socket.username,
        roomId
      });
    });

    // Handle getting online users
    socket.on('get_online_users', async (data) => {
      const { roomId } = data;
      try {
        const onlineMembers = await ChatRoom.getOnlineMembers(roomId);
        socket.emit('online_users', {
          roomId,
          users: onlineMembers.map(member => ({
            userId: member.user_id,
            username: member.username,
            firstName: member.first_name,
            lastName: member.last_name,
            profileImage: member.profile_image,
            role: member.role
          }))
        });
      } catch (error) {
        console.error('Error getting online users:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.username} disconnected from chat`);
      
      try {
        // Update all rooms where user was online
        const userRooms = await ChatRoom.findUserRooms(socket.userId);
        for (const room of userRooms) {
          await ChatRoom.updateMemberStatus(room.id, socket.userId, false);
          
          // Remove from room connections tracking
          if (roomConnections.has(room.id)) {
            roomConnections.get(room.id).delete(socket.userId);
          }

          // Notify room members that user went offline
          socket.to(room.id).emit('user_offline', {
            userId: socket.userId,
            username: socket.username
          });
        }

        // Remove from active connections
        activeConnections.delete(socket.userId);

      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  // Helper function to format messages
  function formatMessage(message) {
    return {
      id: message.id,
      roomId: message.room_id,
      senderId: message.sender_id,
      content: message.content,
      messageType: message.message_type,
      replyTo: message.reply_to,
      replyContent: message.reply_content,
      replyUsername: message.reply_username,
      isEdited: message.is_edited,
      sender: {
        username: message.username,
        firstName: message.first_name,
        lastName: message.last_name,
        profileImage: message.profile_image
      },
      createdAt: message.created_at,
      updatedAt: message.updated_at
    };
  }
};

module.exports = initializeChatHandler;