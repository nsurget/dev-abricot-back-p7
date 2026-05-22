"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.getTask = exports.getTasks = exports.createTask = void 0;
const client_1 = require("@prisma/client");
const validation_1 = require("../utils/validation");
const permissions_1 = require("../utils/permissions");
const response_1 = require("../utils/response");
const taskAssignments_1 = require("../utils/taskAssignments");
const taskComments_1 = require("../utils/taskComments");
const prisma = new client_1.PrismaClient();
const createTask = async (req, res) => {
    try {
        const projectId = req.params.projectId || req.params.id;
        console.log("Paramètres reçus:", req.params);
        console.log("projectId extrait:", projectId);
        console.log("Tous les paramètres:", Object.keys(req.params));
        if (!projectId || typeof projectId !== "string") {
            (0, response_1.sendError)(res, "ID de projet invalide", "INVALID_PROJECT_ID", 400);
            return;
        }
        const { title, description, priority, dueDate, assigneeIds, } = req.body;
        const authReq = req;
        if (!authReq.user) {
            (0, response_1.sendError)(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
            return;
        }
        const validationErrors = (0, validation_1.validateCreateTaskData)({
            title,
            description,
            priority,
            dueDate,
            assigneeIds,
        });
        if (validationErrors.length > 0) {
            (0, response_1.sendValidationError)(res, "Données de création de tâche invalides", validationErrors);
            return;
        }
        const hasAccess = await (0, permissions_1.hasProjectAccess)(authReq.user.id, projectId);
        if (!hasAccess) {
            (0, response_1.sendError)(res, "Accès refusé au projet", "FORBIDDEN", 403);
            return;
        }
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            (0, response_1.sendError)(res, "Projet non trouvé", "PROJECT_NOT_FOUND", 404);
            return;
        }
        const canCreate = await (0, permissions_1.canCreateTasks)(authReq.user.id, projectId);
        if (!canCreate) {
            (0, response_1.sendError)(res, "Vous n'avez pas les permissions pour créer des tâches dans ce projet", "FORBIDDEN", 403);
            return;
        }
        if (assigneeIds && assigneeIds.length > 0) {
            const areValidMembers = await (0, taskAssignments_1.validateProjectMembers)(projectId, assigneeIds);
            if (!areValidMembers) {
                (0, response_1.sendError)(res, "Certains utilisateurs assignés ne sont pas membres du projet", "INVALID_ASSIGNEES", 400);
                return;
            }
        }
        const taskData = {
            title: title.trim(),
            description: description?.trim() || null,
            priority: priority || "MEDIUM",
            dueDate: dueDate ? new Date(dueDate) : null,
            projectId,
            creatorId: authReq.user.id,
        };
        console.log("Création de tâche avec les données:", taskData);
        const task = await prisma.task.create({
            data: taskData,
        });
        console.log("Tâche créée:", task);
        if (assigneeIds && assigneeIds.length > 0) {
            await (0, taskAssignments_1.updateTaskAssignments)(task.id, assigneeIds);
        }
        const taskWithRelations = await prisma.task.findUnique({
            where: { id: task.id },
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!taskWithRelations) {
            (0, response_1.sendError)(res, "Erreur lors de la récupération de la tâche créée", "TASK_NOT_FOUND", 404);
            return;
        }
        const assignees = await (0, taskAssignments_1.getTaskAssignments)(task.id);
        const comments = await (0, taskComments_1.getTaskComments)(task.id);
        const taskResponse = {
            ...taskWithRelations,
            assignees,
            comments,
        };
        (0, response_1.sendSuccess)(res, "Tâche créée avec succès", { task: taskResponse }, 201);
    }
    catch (error) {
        console.error("Erreur lors de la création de la tâche:", error);
        (0, response_1.sendServerError)(res, "Erreur lors de la création de la tâche");
    }
};
exports.createTask = createTask;
const getTasks = async (req, res) => {
    try {
        const projectId = req.params.id;
        const authReq = req;
        if (!authReq.user) {
            (0, response_1.sendError)(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
            return;
        }
        const hasAccess = await (0, permissions_1.hasProjectAccess)(authReq.user.id, projectId);
        if (!hasAccess) {
            (0, response_1.sendError)(res, "Accès refusé au projet", "FORBIDDEN", 403);
            return;
        }
        const tasks = await prisma.task.findMany({
            where: { projectId },
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });
        const tasksWithAssignments = await Promise.all(tasks.map(async (task) => {
            const assignees = await (0, taskAssignments_1.getTaskAssignments)(task.id);
            const comments = await (0, taskComments_1.getTaskComments)(task.id);
            return {
                ...task,
                assignees,
                comments,
            };
        }));
        (0, response_1.sendSuccess)(res, "Tâches récupérées avec succès", {
            tasks: tasksWithAssignments,
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération des tâches:", error);
        (0, response_1.sendServerError)(res, "Erreur lors de la récupération des tâches");
    }
};
exports.getTasks = getTasks;
const getTask = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { taskId } = req.params;
        const authReq = req;
        if (!authReq.user) {
            (0, response_1.sendError)(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
            return;
        }
        const hasAccess = await (0, permissions_1.hasProjectAccess)(authReq.user.id, projectId);
        if (!hasAccess) {
            (0, response_1.sendError)(res, "Accès refusé au projet", "FORBIDDEN", 403);
            return;
        }
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                projectId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!task) {
            (0, response_1.sendError)(res, "Tâche non trouvée", "TASK_NOT_FOUND", 404);
            return;
        }
        const assignees = await (0, taskAssignments_1.getTaskAssignments)(task.id);
        const comments = await (0, taskComments_1.getTaskComments)(task.id);
        const taskWithAssignments = {
            ...task,
            assignees,
            comments,
        };
        (0, response_1.sendSuccess)(res, "Tâche récupérée avec succès", {
            task: taskWithAssignments,
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération de la tâche:", error);
        (0, response_1.sendServerError)(res, "Erreur lors de la récupération de la tâche");
    }
};
exports.getTask = getTask;
const updateTask = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { taskId } = req.params;
        const { title, description, status, priority, dueDate, assigneeIds, } = req.body;
        const authReq = req;
        if (!authReq.user) {
            (0, response_1.sendError)(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
            return;
        }
        const validationErrors = (0, validation_1.validateUpdateTaskData)({
            title,
            description,
            status,
            priority,
            dueDate,
            assigneeIds,
        });
        if (validationErrors.length > 0) {
            (0, response_1.sendValidationError)(res, "Données de mise à jour invalides", validationErrors);
            return;
        }
        const hasAccess = await (0, permissions_1.hasProjectAccess)(authReq.user.id, projectId);
        if (!hasAccess) {
            (0, response_1.sendError)(res, "Accès refusé au projet", "FORBIDDEN", 403);
            return;
        }
        const canModify = await (0, permissions_1.canModifyTasks)(authReq.user.id, projectId);
        if (!canModify) {
            (0, response_1.sendError)(res, "Vous n'avez pas les permissions pour modifier des tâches dans ce projet", "FORBIDDEN", 403);
            return;
        }
        const existingTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                projectId,
            },
        });
        if (!existingTask) {
            (0, response_1.sendError)(res, "Tâche non trouvée", "TASK_NOT_FOUND", 404);
            return;
        }
        if (assigneeIds && assigneeIds.length > 0) {
            const areValidMembers = await (0, taskAssignments_1.validateProjectMembers)(projectId, assigneeIds);
            if (!areValidMembers) {
                (0, response_1.sendError)(res, "Certains utilisateurs assignés ne sont pas membres du projet", "INVALID_ASSIGNEES", 400);
                return;
            }
        }
        const updateData = {};
        if (title !== undefined) {
            updateData.title = title.trim();
        }
        if (description !== undefined) {
            updateData.description = description?.trim() || null;
        }
        if (status !== undefined) {
            updateData.status = status;
        }
        if (priority !== undefined) {
            updateData.priority = priority;
        }
        if (dueDate !== undefined) {
            updateData.dueDate = dueDate ? new Date(dueDate) : null;
        }
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (assigneeIds !== undefined) {
            await (0, taskAssignments_1.updateTaskAssignments)(taskId, assigneeIds);
        }
        const assignees = await (0, taskAssignments_1.getTaskAssignments)(taskId);
        const comments = await (0, taskComments_1.getTaskComments)(taskId);
        const taskWithAssignments = {
            ...updatedTask,
            assignees,
            comments,
        };
        (0, response_1.sendSuccess)(res, "Tâche mise à jour avec succès", {
            task: taskWithAssignments,
        });
    }
    catch (error) {
        console.error("Erreur lors de la mise à jour de la tâche:", error);
        (0, response_1.sendServerError)(res, "Erreur lors de la mise à jour de la tâche");
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { taskId } = req.params;
        const authReq = req;
        if (!authReq.user) {
            (0, response_1.sendError)(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
            return;
        }
        const hasAccess = await (0, permissions_1.hasProjectAccess)(authReq.user.id, projectId);
        if (!hasAccess) {
            (0, response_1.sendError)(res, "Accès refusé au projet", "FORBIDDEN", 403);
            return;
        }
        const canModify = await (0, permissions_1.canModifyTasks)(authReq.user.id, projectId);
        if (!canModify) {
            (0, response_1.sendError)(res, "Vous n'avez pas les permissions pour supprimer des tâches dans ce projet", "FORBIDDEN", 403);
            return;
        }
        const existingTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                projectId,
            },
        });
        if (!existingTask) {
            (0, response_1.sendError)(res, "Tâche non trouvée", "TASK_NOT_FOUND", 404);
            return;
        }
        await prisma.task.delete({
            where: { id: taskId },
        });
        (0, response_1.sendSuccess)(res, "Tâche supprimée avec succès");
    }
    catch (error) {
        console.error("Erreur lors de la suppression de la tâche:", error);
        (0, response_1.sendServerError)(res, "Erreur lors de la suppression de la tâche");
    }
};
exports.deleteTask = deleteTask;
//# sourceMappingURL=taskController.js.map