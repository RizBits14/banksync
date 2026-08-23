import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("MONGODB_URI is not defined");
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(mongoUri);
    }

    await connectionPromise;

    console.log("MongoDB connected");
};