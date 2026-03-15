const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

// 开发模式默认走 Vite 同源代理；非开发环境保留本地后端默认地址，避免 preview/静态托管回归到 404。
export const API_BASE_URL = configuredApiBaseUrl
  || (import.meta.env.DEV ? '' : 'http://127.0.0.1:8000');
