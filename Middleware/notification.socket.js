// sockets/notification.socket.js
let ioInstance = null;

export const initNotificationSocket = (io) => {
  ioInstance = io;
};

export const emitNotificationToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userId).emit(event, payload);
};

export const emitNotificationToUsers = (userIds = [], event, payload) => {
  if (!ioInstance) return;

  userIds.forEach(userId => {
    ioInstance.to(userId).emit(event, payload);
  });
};

export const emitNotificationToRole = (role, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(role).emit(event, payload);
};
