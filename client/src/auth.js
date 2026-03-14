export const getToken = () => localStorage.getItem("iot_token") || "";

export const setToken = (token) => localStorage.setItem("iot_token", token);

export const clearToken = () => localStorage.removeItem("iot_token");

export const isAuthenticated = () => !!getToken();
