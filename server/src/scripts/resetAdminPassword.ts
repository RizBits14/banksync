import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import { User } from "../modules/users/user.model.js";

const resetAdminPassword = async () => {
    try {
        const email = "admin@banksync.com";
        const newPassword = "BankSync@123";

        await connectDB();

        const admin = await User.findOne({
            email,
            role: "ADMIN",
        });

        if (!admin) {
            throw new Error("Admin user not found");
        }

        admin.password = await bcrypt.hash(
            newPassword,
            12
        );

        await admin.save();

        console.log(
            `Admin password reset successfully for ${email}`
        );
    } catch (error) {
        console.error(
            "Admin password reset failed:",
            error
        );

        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void resetAdminPassword();