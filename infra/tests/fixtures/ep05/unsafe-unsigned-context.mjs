export function auth(request) { return JSON.parse(request.headers.authorization_context); }
