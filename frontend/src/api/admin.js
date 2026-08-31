import api from "./client";

export async function getAdminUsers(params = {}) {
  const response = await api.get("/api/admin/users", {
    params,
  });

  return response.data;
}

export async function getAdminUser(userId) {
  const response = await api.get(
    `/api/admin/users/${userId}`
  );

  return response.data;
}

export async function updateAdminUserStatus(
  userId,
  isActive
) {
  const response = await api.patch(
    `/api/admin/users/${userId}/status`,
    null,
    {
      params: {
        is_active: isActive,
      },
    }
  );

  return response.data;
}

export async function deleteAdminUser(userId) {
  const response = await api.delete(
    `/api/admin/users/${userId}`
  );

  return response.data;
}
