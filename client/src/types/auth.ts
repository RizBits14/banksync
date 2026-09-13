export type UserRole =
    | "ADMIN"
    | "IMPORT_OFFICER"
    | "MAKER"
    | "CHECKER"
    | "AUDITOR"
    | "OPERATIONS_MANAGER";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}