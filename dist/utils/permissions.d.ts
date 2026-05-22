import { Role } from "../types";
export declare const hasProjectAccess: (userId: string, projectId: string) => Promise<boolean>;
export declare const isProjectAdmin: (userId: string, projectId: string) => Promise<boolean>;
export declare const isProjectOwner: (userId: string, projectId: string) => Promise<boolean>;
export declare const canCreateTasks: (userId: string, projectId: string) => Promise<boolean>;
export declare const canModifyTasks: (userId: string, projectId: string) => Promise<boolean>;
export declare const canModifyProject: (userId: string, projectId: string) => Promise<boolean>;
export declare const canDeleteProject: (userId: string, projectId: string) => Promise<boolean>;
export declare const getUserProjectRole: (userId: string, projectId: string) => Promise<Role | null>;
//# sourceMappingURL=permissions.d.ts.map