import { Case } from "./case.model.js";
import { Exception } from "../exceptions/exception.model.js";

type CaseDocument = InstanceType<typeof Case>;

export const saveCaseAndException = async (
    caseRecord: CaseDocument
) => {
    let exceptionStatus: "ASSIGNED" | "RESOLVED";

    switch (caseRecord.status) {
        case "ASSIGNED":
        case "RETURNED_TO_MAKER":
            exceptionStatus = "ASSIGNED";
            break;

        case "APPROVED":
            exceptionStatus = "RESOLVED";
            break;

        default:
            throw new Error(
                "This case status does not support a linked exception update"
            );
    }

    await Case.db.transaction(
        async (session) => {
            await caseRecord.save({ session });

            const result = await Exception.updateOne(
                { _id: caseRecord.exceptionId },
                { $set: { status: exceptionStatus } },
                { session, runValidators: true }
            );

            if (result.matchedCount !== 1) {
                throw new Error(
                    "The exception linked to this case is unavailable"
                );
            }
        },
        {
            readPreference: "primary",
            readConcern: { level: "snapshot" },
            writeConcern: { w: "majority" },
        }
    );

    return caseRecord;
};
