import { RideModel } from "../Model/CustomerModel/Ride.js";
import { ReviewModel } from "../Model/Review.js";
import { UserModel } from "../Model/User.js";


// Submit a review for a completed ride
export const submitReview = async (req, res) => {
  const { rideId, rating, comment } = req.body;
  const customerId = req.user.id; // Authenticated customer ID

  try {
    // Verify ride exists and is completed
    const ride = await RideModel.findOne({
      _id: rideId,
      status: "completed",
      customerId
    });

    if (!ride) {
      return res.status(400).json({ 
        message: "Ride not found or not completed by you" 
      });
    }

    // Check if review already exists
    const existingReview = await ReviewModel.findOne({ rideId });
    if (existingReview) {
      return res.status(400).json({ 
        message: "Review already submitted for this ride" 
      });
    }

    // Create new review
    const newReview = new ReviewModel({
      rideId,
      driverId: ride.driverId,
      customerId,
      rating,
      comment
    });

    await newReview.save();

    // Update driver's average rating
    await updateDriverRating(ride.driverId);

    res.status(201).json({
      message: "Review submitted successfully",
      review: newReview
    });
  } catch (err) {
    console.error("Review submission error:", err);
    res.status(500).json({ message: "Server error submitting review" });
  }
};

// Get reviews for a driver
export const getDriverReviews = async (req, res) => {
  const { driverId } = req.params;

  try {
    const reviews = await ReviewModel.find({ driverId })
      .populate("customerId", "name profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Reviews retrieved successfully",
      reviews
    });
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ message: "Error retrieving reviews" });
  }
};

// In ReviewController.js
export const checkReviewExists = async (req, res) => {
  const { rideId } = req.params;

  try {
    const review = await ReviewModel.findOne({ rideId });
    res.status(200).json({ exists: !!review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ exists: false });
  }
};

// Helper: Update driver's average rating
const updateDriverRating = async (driverId) => {
  const reviews = await ReviewModel.find({ driverId });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    await UserModel.findByIdAndUpdate(driverId, {
      rating: averageRating,
      ratingCount: reviews.length
    });
  }
};