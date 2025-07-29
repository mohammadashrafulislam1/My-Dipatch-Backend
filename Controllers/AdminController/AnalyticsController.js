import mongoose from 'mongoose';
import moment from 'moment';
import { TransactionModel } from '../../Model/AdminModel/Wallet.js';
import { UserModel } from '../../Model/User.js';
import { RideModel } from '../../Model/CustomerModel/Ride.js';

// Get rides over the last week
export const getRidesLastWeek = async (req, res) => {
  try {
    const today = moment().endOf('day');
    const lastWeek = moment().subtract(7, 'days').startOf('day');
    
    const rides = await RideModel.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeek.toDate(), $lte: today.toDate() },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: "$_id",
          rides: "$count",
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Fill in missing days with 0 rides
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayData = rides.find(r => r.date === date) || { date, rides: 0 };
      result.push(dayData);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching rides data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get driver status breakdown
export const getDriverStatusBreakdown = async (req, res) => {
  try {
    const breakdown = await UserModel.aggregate([
      { $match: { role: 'driver' } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    // Format for frontend
    const formatted = breakdown.map(item => ({
      status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      count: item.count
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching driver status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get monthly revenue
export const getMonthlyRevenue = async (req, res) => {
  try {
    const currentYear = moment().year();
    const months = Array.from({ length: 12 }, (_, i) => 
      moment().month(i).format('MMM')
    );

    const revenue = await TransactionModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$adminCut" }
        }
      },
      {
        $project: {
          month: "$_id",
          revenue: 1,
          _id: 0
        }
      }
    ]);

    // Fill all months with revenue data
    const result = months.map((monthName, index) => {
      const monthData = revenue.find(r => r.month === index + 1);
      return {
        month: monthName,
        revenue: monthData ? monthData.revenue : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard summary
export const getDashboardSummary = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');
    const lastWeek = moment().subtract(7, 'days').startOf('day');
    
    // Total rides
    const totalRides = await RideModel.countDocuments({ status: 'completed' });
    
    // Today's rides
    const todaysRides = await RideModel.countDocuments({ 
      status: 'completed',
      createdAt: { $gte: today.toDate() }
    });
    
    // Active drivers
    const activeDrivers = await UserModel.countDocuments({ 
      role: 'driver', 
      status: 'active' 
    });
    
    // Total revenue
    const revenueResult = await TransactionModel.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$adminCut" }
        }
      }
    ]);
    
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
    res.json({
      totalRides,
      todaysRides,
      activeDrivers,
      totalRevenue
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};