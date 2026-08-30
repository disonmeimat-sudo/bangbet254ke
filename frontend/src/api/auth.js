import api from "./client";

export async function registerUser(data) {
  const response = await api.post("/api/auth/register", data);
  return response.data;
}

export async function loginUser(data) {
  console.log("LOGIN REQUEST:", {
    phone: data.phone,
    passwordLength: data.password?.length,
    apiUrl: import.meta.env.VITE_API_URL,
  });

  const response = await api.post("/api/auth/login", data);

  console.log("LOGIN RESPONSE:", response.data);

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/api/auth/me");
  return response.data;
}
