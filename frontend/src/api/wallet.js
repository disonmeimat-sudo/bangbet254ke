import api from "./client";

export async function getWallet() {
  const response = await api.get("/api/wallet");
  return response.data;
}
