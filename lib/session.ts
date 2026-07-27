import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "attendee";
};

const COOKIE_NAME = "conference_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a string at least 16 characters long.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    const email = payload.email;
    const full_name = payload.full_name;
    const role = payload.role;

    if (
      typeof id !== "string" ||
      typeof email !== "string" ||
      typeof full_name !== "string" ||
      (role !== "admin" && role !== "attendee")
    ) {
      return null;
    }

    return { id, email, full_name, role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", sessionCookieOptions(0));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return readSessionToken(token);
}

export async function getSessionUserFromRequest(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return readSessionToken(token);
}

export function applySessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookieOnResponse(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", sessionCookieOptions(0));
}

export { COOKIE_NAME };
