export interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } satisfies ApiSuccessBody<T>, { status });
}

export function jsonCreated<T>(data: T): Response {
  return jsonOk(data, 201);
}

export function jsonError(code: string, message: string, status: number, details?: unknown): Response {
  return Response.json(
    { success: false, error: { code, message, details } } satisfies ApiErrorBody,
    { status },
  );
}
