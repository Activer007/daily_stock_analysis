// 生产环境与本地开发默认都走同源路径；开发时可通过 VITE_API_URL 覆盖。
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
