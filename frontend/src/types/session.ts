export const UserRole = {
  ANALYST: 0,
  SUPERVISOR: 1,
} as const

type UserRole = (typeof UserRole)[keyof typeof UserRole]

export interface UserSession {
  name: string
  role: UserRole
}
