"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function CustomerSignOutButton() {
  return (
    <Button
      onClick={() => void signOut({ callbackUrl: "/" })}
      type="button"
      variant="outline"
    >
      Sign out
    </Button>
  );
}
