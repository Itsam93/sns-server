import Newsletter from "../models/Newsletter.js";

async function subscribe(email: string) {
  const existingSubscriber =
    await Newsletter.findOne({ email });

  if (existingSubscriber) {
    throw new Error(
      "EMAIL_ALREADY_SUBSCRIBED",
    );
  }

  const subscriber =
    await Newsletter.create({
      email,
    });

  return {
    _id: subscriber._id,
    email: subscriber.email,
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}

async function getSubscribers() {
  return Newsletter.find({})
    .sort({ createdAt: -1 })
    .lean();
}

const newsletterService = {
  subscribe,
  getSubscribers,
};

export default newsletterService;