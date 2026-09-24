import type {
    Request,
    Response,
} from "express";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import {
    AccountRequest,
    ACCOUNT_REQUEST_STATUSES,
    type AccountRequestStatus,
} from "./account-request.model.js";

import {
    User,
} from "../users/user.model.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

import {
    sendAccountCredentialsEmail,
} from "../mail/mail.service.js";

/*
 * ----------------------------------------
 * HELPERS
 * ----------------------------------------
 */

const createEmailBase = (
    name: string
) => {
    return name
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9\s]/g,
            ""
        )
        .trim()
        .replace(
            /\s+/g,
            "."
        )
        .replace(
            /\.+/g,
            "."
        );
};

const generateUniqueBankSyncEmail =
    async (
        name: string
    ) => {
        const base =
            createEmailBase(name);

        if (!base) {
            throw new Error(
                "Unable to generate BankSync User ID"
            );
        }

        let email =
            `${base}@banksync.com`;

        let number = 2;

        while (
            await User.exists({
                email,
            })
        ) {
            email =
                `${base}${number}@banksync.com`;

            number += 1;
        }

        return email;
    };

const generateTemporaryPassword =
    () => {
        const uppercase =
            "ABCDEFGHJKLMNPQRSTUVWXYZ";

        const lowercase =
            "abcdefghijkmnopqrstuvwxyz";

        const numbers =
            "23456789";

        const all =
            uppercase +
            lowercase +
            numbers;

        const pick = (
            characters: string
        ) => {
            const index =
                crypto.randomInt(
                    0,
                    characters.length
                );

            return characters[index];
        };

        const characters = [
            pick(uppercase),
            pick(lowercase),
            pick(numbers),
        ];

        while (
            characters.length < 6
        ) {
            characters.push(
                pick(all)
            );
        }

        for (
            let index =
                characters.length - 1;
            index > 0;
            index -= 1
        ) {
            const swapIndex =
                crypto.randomInt(
                    0,
                    index + 1
                );

            [
                characters[index],
                characters[swapIndex],
            ] = [
                characters[swapIndex],
                characters[index],
            ];
        }

        return characters.join("");
    };

/*
 * ----------------------------------------
 * SUBMIT ACCOUNT REQUEST
 * ----------------------------------------
 */
export const createAccountRequest =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const {
                name,
                email,
            } = req.body;

            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            /*
             * Prevent requests using an
             * email that already belongs
             * to a BankSync user.
             */
            const existingUser =
                await User.findOne({
                    email:
                        normalizedEmail,
                });

            if (existingUser) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "An account already exists for this email",
                    });
            }

            /*
             * Prevent duplicate pending
             * account requests.
             */
            const existingPendingRequest =
                await AccountRequest.findOne(
                    {
                        email:
                            normalizedEmail,

                        status:
                            "PENDING",
                    }
                );

            if (
                existingPendingRequest
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "An account request is already pending for this email",
                    });
            }

            const accountRequest =
                await AccountRequest.create(
                    {
                        name:
                            String(
                                name
                            ).trim(),

                        email:
                            normalizedEmail,

                        status:
                            "PENDING",
                    }
                );

            return res
                .status(201)
                .json({
                    success: true,

                    message:
                        "Account request submitted successfully",

                    data: {
                        id:
                            accountRequest._id,

                        name:
                            accountRequest.name,

                        email:
                            accountRequest.email,

                        status:
                            accountRequest.status,

                        createdAt:
                            accountRequest.createdAt,
                    },
                });
        } catch (error) {
            console.error(
                "Create account request error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to submit account request",
                });
        }
    };

/*
 * ----------------------------------------
 * GET ACCOUNT REQUESTS
 * ----------------------------------------
 */
export const getAccountRequests =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const statusParam =
                typeof req.query
                    .status ===
                "string"
                    ? req.query.status
                          .trim()
                          .toUpperCase()
                    : "";

            let status:
                | AccountRequestStatus
                | undefined;

            if (
                ACCOUNT_REQUEST_STATUSES.includes(
                    statusParam as AccountRequestStatus
                )
            ) {
                status =
                    statusParam as AccountRequestStatus;
            }

            const requests =
                await AccountRequest.find(
                    status
                        ? {
                              status,
                          }
                        : {}
                )
                    .populate(
                        "reviewedBy",
                        "name email role"
                    )
                    .populate(
                        "createdUserId",
                        "name email role isActive mustChangePassword"
                    )
                    .sort({
                        createdAt: -1,
                    });

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        "Account requests retrieved successfully",

                    data:
                        requests,
                });
        } catch (error) {
            console.error(
                "Get account requests error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to retrieve account requests",
                });
        }
    };

/*
 * ----------------------------------------
 * APPROVE ACCOUNT REQUEST
 * ----------------------------------------
 */
export const approveAccountRequest =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const requestId =
                String(
                    req.params.id
                );

            const {
                role,
            } = req.body;

            const admin =
                res.locals.user;

            const accountRequest =
                await AccountRequest.findById(
                    requestId
                );

            if (!accountRequest) {
                return res
                    .status(404)
                    .json({
                        success: false,

                        message:
                            "Account request not found",
                    });
            }

            if (
                accountRequest.status !==
                "PENDING"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "Only pending account requests can be approved",
                    });
            }

            /*
             * Generate BankSync login ID.
             */
            const bankSyncEmail =
                await generateUniqueBankSyncEmail(
                    accountRequest.name
                );

            /*
             * Generate temporary password.
             */
            const temporaryPassword =
                generateTemporaryPassword();

            /*
             * Store only the hash.
             */
            const hashedPassword =
                await bcrypt.hash(
                    temporaryPassword,
                    12
                );

            /*
             * Create BankSync user.
             */
            const user =
                await User.create({
                    name:
                        accountRequest.name,

                    email:
                        bankSyncEmail,

                    password:
                        hashedPassword,

                    role,

                    isActive:
                        true,

                    mustChangePassword:
                        true,
                });

            /*
             * Mark request approved.
             */
            accountRequest.status =
                "APPROVED";

            accountRequest.reviewedBy =
                admin.userId;

            accountRequest.reviewedAt =
                new Date();

            accountRequest.createdUserId =
                user._id;

            accountRequest.rejectionReason =
                "";

            await accountRequest.save();

            /*
             * Audit account creation.
             */
            await createBusinessAudit({
                actorId:
                    admin.userId,

                actorRole:
                    admin.role,

                entityType:
                    "USER",

                entityId:
                    user._id.toString(),

                action:
                    "USER_CREATED",

                description:
                    "BankSync user created from approved account request",

                metadata: {
                    accountRequestId:
                        accountRequest._id.toString(),

                    requestedEmail:
                        accountRequest.email,

                    bankSyncEmail:
                        user.email,

                    role:
                        user.role,

                    mustChangePassword:
                        true,
                },
            });

            /*
             * Audit approval.
             */
            await createBusinessAudit({
                actorId:
                    admin.userId,

                actorRole:
                    admin.role,

                entityType:
                    "ACCOUNT_REQUEST",

                entityId:
                    accountRequest._id.toString(),

                action:
                    "ACCOUNT_REQUEST_APPROVED",

                description:
                    "Employee account request approved",

                metadata: {
                    employeeName:
                        accountRequest.name,

                    requestedEmail:
                        accountRequest.email,

                    createdUserId:
                        user._id.toString(),

                    role:
                        user.role,
                },
            });

            /*
             * --------------------------------
             * SEND CREDENTIALS EMAIL
             * --------------------------------
             *
             * Important:
             * If email sending fails, we do NOT
             * delete the user account.
             *
             * The account was already created.
             * Admin can still see the credentials
             * once in the frontend.
             */
            let emailSent =
                false;

            try {
                await sendAccountCredentialsEmail(
                    {
                        to:
                            accountRequest.email,

                        name:
                            accountRequest.name,

                        loginId:
                            user.email,

                        temporaryPassword,

                        role:
                            user.role,
                    }
                );

                emailSent =
                    true;

                await createBusinessAudit({
                    actorId:
                        admin.userId,

                    actorRole:
                        admin.role,

                    entityType:
                        "ACCOUNT_REQUEST",

                    entityId:
                        accountRequest._id.toString(),

                    action:
                        "ACCOUNT_CREDENTIALS_EMAIL_SENT",

                    description:
                        "BankSync account credentials email sent",

                    metadata: {
                        recipient:
                            accountRequest.email,

                        bankSyncEmail:
                            user.email,
                    },
                });
            } catch (
                emailError
            ) {
                console.error(
                    "Credentials email error:",
                    emailError
                );
            }

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        emailSent
                            ? "Account approved, created, and credentials emailed successfully"
                            : "Account approved and created, but the credentials email could not be sent",

                    data: {
                        request: {
                            id:
                                accountRequest._id,

                            name:
                                accountRequest.name,

                            email:
                                accountRequest.email,

                            status:
                                accountRequest.status,
                        },

                        user: {
                            id:
                                user._id,

                            name:
                                user.name,

                            loginId:
                                user.email,

                            role:
                                user.role,

                            mustChangePassword:
                                user.mustChangePassword,
                        },

                        credentials: {
                            loginId:
                                user.email,

                            temporaryPassword,
                        },

                        delivery: {
                            email:
                                accountRequest.email,

                            emailSent,
                        },
                    },
                });
        } catch (error) {
            console.error(
                "Approve account request error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to approve account request",
                });
        }
    };