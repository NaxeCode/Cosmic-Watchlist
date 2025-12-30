import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleSignIn, handleSignOut } from "@/app/auth-actions";

export function AuthButtons({ isSignedIn }: { isSignedIn: boolean }) {
  return isSignedIn ? (
    <form action={handleSignOut}>
      <Button type="submit" variant="outline" className="gap-2">
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  ) : (
    <form action={handleSignIn}>
      <Button type="submit" className="gap-2">
        <LogIn className="h-4 w-4" />
        Sign in with Google
      </Button>
    </form>
  );
}
