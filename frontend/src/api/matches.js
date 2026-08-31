import api from "./client";

export async function getPublicMatches(params = {}) {
  const response = await api.get(
    "/api/public/matches",
    { params }
  );

  return response.data;
}
