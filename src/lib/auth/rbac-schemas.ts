/**
 * Onewill Academy | Typed Zod Validation Schemas for RBAC Operations
 * PRD v1.1 Section 10 & 11 Compliant.
 * Validates inputs for user invitations and administrative user updates.
 */

import { z } from 'zod';
import { UserRole } from '@/types';

export const USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGEMENT',
  'TEAM_LEAD',
  'CONTRIBUTOR',
] as const;

/**
 * Zod schema for creating user invitations.
 * Normalizes email to lower case and trims whitespace.
 */
export const CreateInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Surel wajib diisi.')
    .email('Format surel tidak valid.'),
  role: z.enum(USER_ROLES, {
    message: 'Peran (role) tidak valid.',
  }),
  teamId: z
    .string()
    .min(1, 'Divisi wajib dipilih.'),
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

/**
 * Zod schema for updating administrative user role and status.
 */
export const UpdateUserSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.active !== undefined, {
    message: 'Setidaknya satu bidang (role atau active) harus diperbarui.',
  });

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
