import api from "../api/axios";

// Get my cases
export const getMyCases = async () => {
  const res = await api.get("/cases/my-cases");
  return res.data;
};

// Create case
export const createCase = async (caseData) => {
  const res = await api.post("/cases/file", caseData);
  return res.data;
};

// Get case by ID
export const getCaseById = async (id) => {
  const res = await api.get(`/cases/${id}`);
  return res.data;
};
