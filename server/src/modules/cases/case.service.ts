import { Case } from "./case.model.js";
import { Exception } from "../exceptions/exception.model.js";

const determinePriority = (score: number) => {
    if (score >= 80) {
        return "CRITICAL";
    }

    if (score >= 60) {
        return "HIGH";
    }

    if (score >= 40) {
        return "MEDIUM";
    }

    return "LOW";
};

export const createCaseFromException = async (
    exceptionId: string
) => {
    const exception = await Exception.findById(
        exceptionId
    );

    if (!exception) {
        throw new Error("Exception not found");
    }

    const existingCase = await Case.findOne({
        exceptionId: exception._id,
    });

    if (existingCase) {
        return existingCase;
    }

    return Case.create({
        exceptionId: exception._id,
        priority: determinePriority(
            exception.score
        ),
        status: "OPEN",
    });
};