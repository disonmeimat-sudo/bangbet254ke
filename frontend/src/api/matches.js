import client from "./client";

export async function getPublicMatches() {
  const response = await client.get("/api/public/matches");
  return response.data;
}
