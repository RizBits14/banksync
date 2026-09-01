import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import { User } from "../modules/users/user.model.js";

const seedAdmin = async () => {
    try {
        const name = process.env.SEED_ADMIN_NAME?.trim();
        const email = process.env.SEED_ADMIN_EMAIL
            ?.trim()
            .toLowerCase();
        const password = process.env.SEED_ADMIN_PASSWORD;

        if (!name || !email || !password) {
            throw new Error(
                "SEED_ADMIN_NAME, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required"
            );
        }

        if (password.length < 8) {
            throw new Error(
                "SEED_ADMIN_PASSWORD must be at least 8 characters"
            );
        }

        await connectDB();

        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log(`Admin already exists: ${email}`);
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await User.create({
            name,
            email,
            password: hashedPassword,
            role: "ADMIN",
            isActive: true,
        });

        console.log(`Admin created successfully: ${email}`);
    } catch (error) {
        console.error("Admin seed failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void seedAdmin();