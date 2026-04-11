// Module augmentation: properties added to FastifyRequest by src/plugins/auth.ts
export {};

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
  }
}
