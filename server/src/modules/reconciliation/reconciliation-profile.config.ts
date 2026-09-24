import type {
    SourceSystem,
} from "../uploads/upload.model.js";

/*
 * ----------------------------------------
 * BANK-APPROVED RECONCILIATION PROFILES
 * ----------------------------------------
 *
 * Each reconciliation profile defines:
 *
 * 1. The system where the transaction
 *    originates or is first captured.
 *
 * 2. The system where the corresponding
 *    posting is expected to appear.
 *
 * 3. The business reason why those two
 *    systems should be reconciled.
 *
 * BankSync should not allow arbitrary
 * combinations of uploaded files.
 */

export const RECONCILIATION_PROFILES = [
    {
        key: "ATM_TO_CBS",

        name:
            "ATM Posting Reconciliation",

        sourceSystem:
            "ATM",

        targetSystem:
            "CBS",

        businessReason:
            "Verify that ATM channel transactions are correctly reflected in customer-account postings in the Core Banking System.",
    },

    {
        key:
            "INTERNET_BANKING_TO_CBS",

        name:
            "Internet Banking Posting Reconciliation",

        sourceSystem:
            "INTERNET_BANKING",

        targetSystem:
            "CBS",

        businessReason:
            "Verify that Internet Banking transaction instructions are correctly posted to customer accounts in the Core Banking System.",
    },

    {
        key:
            "MOBILE_BANKING_TO_CBS",

        name:
            "Mobile Banking Posting Reconciliation",

        sourceSystem:
            "MOBILE_BANKING",

        targetSystem:
            "CBS",

        businessReason:
            "Verify that Mobile Banking channel transactions are correctly posted to customer accounts in the Core Banking System.",
    },

    {
        key:
            "PAYMENT_GATEWAY_TO_CBS",

        name:
            "Payment Gateway Posting Reconciliation",

        sourceSystem:
            "PAYMENT_GATEWAY",

        targetSystem:
            "CBS",

        businessReason:
            "Verify that payment activity captured by the Payment Gateway is correctly reflected in the Core Banking System.",
    },

    {
        key:
            "REMITTANCE_TO_CBS",

        name:
            "Remittance Posting Reconciliation",

        sourceSystem:
            "REMITTANCE",

        targetSystem:
            "CBS",

        businessReason:
            "Verify that remittance instructions are correctly reflected in beneficiary or customer-account postings in the Core Banking System.",
    },

    {
        key:
            "CBS_TO_GENERAL_LEDGER",

        name:
            "Core Banking to General Ledger Reconciliation",

        sourceSystem:
            "CBS",

        targetSystem:
            "GENERAL_LEDGER",

        businessReason:
            "Verify that operational postings recorded in the Core Banking System are correctly reflected in the bank's General Ledger.",
    },
] as const satisfies ReadonlyArray<{
    key: string;

    name: string;

    sourceSystem:
        SourceSystem;

    targetSystem:
        SourceSystem;

    businessReason:
        string;
}>;

/*
 * ----------------------------------------
 * PROFILE TYPES
 * ----------------------------------------
 */

export type ReconciliationProfile =
    (typeof RECONCILIATION_PROFILES)[number];

export type ReconciliationProfileKey =
    ReconciliationProfile["key"];

/*
 * Used by the Reconciliation model enum.
 */
export const RECONCILIATION_PROFILE_KEYS =
    RECONCILIATION_PROFILES.map(
        (profile) =>
            profile.key
    );

/*
 * ----------------------------------------
 * FIND PROFILE
 * ----------------------------------------
 *
 * Returns the full reconciliation profile
 * for a given profile key.
 */

export const getReconciliationProfile = (
    key: string
) => {
    return (
        RECONCILIATION_PROFILES.find(
            (profile) =>
                profile.key ===
                key
        ) || null
    );
};

/*
 * ----------------------------------------
 * VALIDATE SOURCE / TARGET PAIR
 * ----------------------------------------
 *
 * Example:
 *
 * profileKey = ATM_TO_CBS
 *
 * sourceSystem = ATM
 * targetSystem = CBS
 *
 * Result = true
 *
 *
 * profileKey = ATM_TO_CBS
 *
 * sourceSystem = ATM
 * targetSystem = MOBILE_BANKING
 *
 * Result = false
 */

export const isProfilePairValid = ({
    profileKey,
    sourceSystem,
    targetSystem,
}: {
    profileKey: string;

    sourceSystem:
        SourceSystem;

    targetSystem:
        SourceSystem;
}) => {
    const profile =
        getReconciliationProfile(
            profileKey
        );

    if (!profile) {
        return false;
    }

    return (
        profile.sourceSystem ===
            sourceSystem &&
        profile.targetSystem ===
            targetSystem
    );
};