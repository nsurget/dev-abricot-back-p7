"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProjectRole = exports.canDeleteProject = exports.canModifyProject = exports.canModifyTasks = exports.canCreateTasks = exports.isProjectOwner = exports.isProjectAdmin = exports.hasProjectAccess = void 0;
const client_1 = require("@prisma/client");
const types_1 = require("../types");
const prisma = new client_1.PrismaClient();
const hasProjectAccess = async (userId, projectId) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { ownerId: userId },
                    {
                        members: {
                            some: {
                                userId: userId,
                            },
                        },
                    },
                ],
            },
        });
        return !!project;
    }
    catch (error) {
        console.error("Erreur lors de la vérification d'accès au projet:", error);
        return false;
    }
};
exports.hasProjectAccess = hasProjectAccess;
const isProjectAdmin = async (userId, projectId) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { ownerId: userId },
                    {
                        members: {
                            some: {
                                userId: userId,
                                role: types_1.Role.ADMIN,
                            },
                        },
                    },
                ],
            },
        });
        return !!project;
    }
    catch (error) {
        console.error("Erreur lors de la vérification des droits d'admin:", error);
        return false;
    }
};
exports.isProjectAdmin = isProjectAdmin;
const isProjectOwner = async (userId, projectId) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                ownerId: userId,
            },
        });
        return !!project;
    }
    catch (error) {
        console.error("Erreur lors de la vérification de propriété:", error);
        return false;
    }
};
exports.isProjectOwner = isProjectOwner;
const canCreateTasks = async (userId, projectId) => {
    return await (0, exports.hasProjectAccess)(userId, projectId);
};
exports.canCreateTasks = canCreateTasks;
const canModifyTasks = async (userId, projectId) => {
    return await (0, exports.hasProjectAccess)(userId, projectId);
};
exports.canModifyTasks = canModifyTasks;
const canModifyProject = async (userId, projectId) => {
    return await (0, exports.isProjectAdmin)(userId, projectId);
};
exports.canModifyProject = canModifyProject;
const canDeleteProject = async (userId, projectId) => {
    return await (0, exports.isProjectOwner)(userId, projectId);
};
exports.canDeleteProject = canDeleteProject;
const getUserProjectRole = async (userId, projectId) => {
    try {
        const isOwner = await (0, exports.isProjectOwner)(userId, projectId);
        if (isOwner) {
            return types_1.Role.ADMIN;
        }
        const membership = await prisma.projectMember.findFirst({
            where: {
                userId: userId,
                projectId: projectId,
            },
        });
        return membership ? membership.role : null;
    }
    catch (error) {
        console.error("Erreur lors de la récupération du rôle:", error);
        return null;
    }
};
exports.getUserProjectRole = getUserProjectRole;
//# sourceMappingURL=permissions.js.map