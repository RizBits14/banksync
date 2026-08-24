import multer from "multer";

const storage = multer.memoryStorage();

export const uploadFile = multer({
    storage,

    limits: {
        fileSize: 10 * 1024 * 1024,
    },

    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only CSV and Excel files are allowed"));
        }

        cb(null, true);
    },
});