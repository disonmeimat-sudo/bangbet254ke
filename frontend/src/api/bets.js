import api from "./client";

export async function placeBet(data) {
  const response = await api.post("/api/bets", data);
  return response.data;
}

export async function getMyBets() {
  const response = await api.get("/api/bets");
  return response.data;
}
