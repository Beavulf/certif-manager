import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  // Keep node-cron external so schedule/timers work in standalone runtime.
  serverExternalPackages: ['node-cron', 'nodemailer', 'minio'],
  experimental: {
    serverActions: { bodySizeLimit: '10mb' }
  }
};

export default nextConfig;
