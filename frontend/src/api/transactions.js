import api from "./client";

export async function createDeposit(data) {
  const response = await api.post(
    "/api/transactions/deposit",
    data
  );

  return response.data;
}

export async function createWithdrawal(data) {
  const response = await api.post(
    "/api/transactions/withdrawal",
    data
  );

  return response.data;
}

export async function getMyTransactions() {
  const response = await api.get("/api/transactions");
  return response.data;
}

export async function getAdminTransactions(params = {}) {
  const response = await api.get(
    "/api/admin/transactions",
    { params }
  );

  return response.data;
}

export async function getPendingTransactions() {
  const response = await api.get(
    "/api/admin/transactions/pending"
  );

  return response.data;
}

export async function updateTransaction(transactionId, data) {
  const response = await api.patch(
    `/api/admin/transactions/${transactionId}`,
    data
  );

  return response.data;
}
