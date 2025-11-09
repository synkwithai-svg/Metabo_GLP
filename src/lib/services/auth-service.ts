import { db } from "@/lib/db"
import type { User } from "@/lib/types/auth.types"
import { Prisma, Role } from "@prisma/client"

/**
 * Get a user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
  })
  return user || null
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await db.user.findUnique({
    where: { email },
  })
  return user || null
}

/**
 * Update a user
 * @param userId - ID of the user to update
 * @param data - Partial data to update
 */
export async function updateUser(
  userId: string,
  data: Prisma.UserUpdateInput // Prisma type ensures enums and fields are correct
): Promise<User> {
  const user = await db.user.update({
    where: { id: userId },
    data,
  })
  return user
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<void> {
  await db.user.delete({
    where: { id: userId },
  })
}

/**
 * Helper to create a properly typed update object
 * Converts plain string role to Prisma enum type
 */
// export function createUserUpdateData(data: Partial<User>): Prisma.UserUpdateInput {
//   const updateData: Prisma.UserUpdateInput = { ...data }

//   if (data.role) {
//     updateData.role = data.role as Role
//   }

//   return updateData
// }
