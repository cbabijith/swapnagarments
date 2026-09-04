export const AUTH_EVENTS = {
  userCreated: "auth.user.created",
} as const;

export interface AuthUserCreatedPayload {
  userId: string;
  name: string;
  email: string;
}

export interface AuthEventMap {
  "auth.user.created": AuthUserCreatedPayload;
}
