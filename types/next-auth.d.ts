import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    admin?: boolean;
  }

  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      admin?: boolean;
    };
  }
}
