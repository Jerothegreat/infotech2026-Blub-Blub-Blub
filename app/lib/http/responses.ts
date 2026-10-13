export function jsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

export function createdResponse<T>(body: T): Response {
  return jsonResponse(body, 201);
}

export function acceptedResponse<T>(body: T): Response {
  return jsonResponse(body, 202);
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}
