import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev サーバーへの LAN アクセス許可（スマホ実機確認用・本番には無関係）
  allowedDevOrigins: ["192.168.10.113", "192.168.10.107", "192.168.10.*", "192.168.137.1"],
};

export default nextConfig;
