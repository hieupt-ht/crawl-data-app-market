/**
 * dataSource.ts — ĐIỂM DUY NHẤT quyết định dashboard lấy dữ liệu từ đâu.
 *
 * Hiện tại: trả về dữ liệu giả.
 * Sau này:  đổi thân hàm thành đọc file JSON thật hoặc gọi API Django.
 * Các component không cần biết gì về thay đổi đó.
 */
import { DATA } from "@/data/mockData";
import { createLookups, type Lookups } from "./analytics";
import type { DashboardData } from "./types";

export function getDashboardData(): DashboardData {
  return DATA;
}

// Bảng tra cứu theo id chỉ cần tạo 1 lần, dùng chung cho mọi trang
const lookups = createLookups(DATA);

export function getLookups(): Lookups {
  return lookups;
}
