"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMessageSchema = exports.CreateInterviewSchema = exports.UpdateProfileSchema = void 0;
const zod_1 = require("zod");
exports.UpdateProfileSchema = zod_1.z.object({
    target_company: zod_1.z.string().trim().max(100).nullable().optional(),
    target_role: zod_1.z.string().trim().max(100).nullable().optional(),
    name: zod_1.z.string().trim().max(100).nullable().optional(),
});
exports.CreateInterviewSchema = zod_1.z.object({
    type: zod_1.z.enum(['behavioral', 'system-design', 'technical', 'product', 'custom']),
    company: zod_1.z.string().trim().min(1).max(100),
    role: zod_1.z.string().trim().min(1).max(100),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']),
    duration: zod_1.z.number().int().min(10).max(120),
});
exports.CreateMessageSchema = zod_1.z.object({
    sender: zod_1.z.enum(['candidate', 'interviewer', 'system']),
    content: zod_1.z.string().trim().min(1),
});
