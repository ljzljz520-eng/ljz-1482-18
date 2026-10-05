export const env = {
  port: Number(process.env.PORT ?? 8000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  nodeEnv: process.env.NODE_ENV ?? "development"
};
