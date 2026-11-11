import type { RoleKey } from "@/lib/irerc/model";

/**
 * Pre-assigned user directory.
 * Each entry maps an email address to a role and display name.
 * No passwords or verification — email is the only credential.
 */
export type UserRecord = {
  email: string;
  role: RoleKey;
  name: string;
};

export const USER_DIRECTORY: UserRecord[] = [
  {
    email: "addisrdmc@gmail.com",
    role: "admin",
    name: "System Administrator",
  },
  {
    email: "asmamawdeguale16@gmail.com",
    role: "chair",
    name: "Chairperson",
  },
  {
    email: "alemnigussie971@gmail.com",
    role: "secretariat",
    name: "IRERC Secretariat",
  },
  {
    email: "demamu2009@gmail.com",
    role: "reviewer",
    name: "Dr. Demamu",
  },
  {
    email: "binyamabebe4584@gmail.com",
    role: "reviewer",
    name: "Dr. Binyam Abebe",
  },
];

/** Look up a user by email (case-insensitive). Returns null if not found. */
export function findUserByEmail(email: string): UserRecord | null {
  const normalised = email.trim().toLowerCase();
  return USER_DIRECTORY.find((u) => u.email.toLowerCase() === normalised) ?? null;
}

/** All active reviewers from the directory. */
export const DIRECTORY_REVIEWERS = USER_DIRECTORY.filter((u) => u.role === "reviewer");
