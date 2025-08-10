import { RideModel } from "../Model/CustomerModel/Ride.js";
import { UserModel } from "../Model/User.js";


let io; // your socket.io instance, make sure it's initialized

// Call this once after server starts
export const startPendingRideNotifier = (socketIoInstance) => {
  io = socketIoInstance;

  setInterval(async () => {
    try {
      // Find rides still pending after 10 seconds
      const pendingRides = await RideModel.find({
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 10 * 1000) }
      });

      if (pendingRides.length > 0) {
        console.log(`Re-emitting ${pendingRides.length} pending ride notifications`);

        // Get active drivers
        const activeDrivers = await UserModel.find({ role: 'driver', status: 'active' });

        pendingRides.forEach((ride) => {
          activeDrivers.forEach((driver) => {
            io.to(driver._id.toString()).emit('new-ride-request', ride);
          });
        });
      }
    } catch (err) {
      console.error('Error in pending ride notifier:', err);
    }
  }, 30 * 1000); // every 10 seconds
};
