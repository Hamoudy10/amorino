"use client";

import * as React from "react";
import { SignInButton } from "@clerk/nextjs";
import { Navigation, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RiderDashboard } from "@/components/rider/rider-dashboard";
import { getUserRole } from "@/lib/rider-client";

export function RiderApp() {
  const [state, setState] = React.useState<"loading" | "unauthenticated" | "unauthorized" | "ok">("loading");

  React.useEffect(() => {
    void getUserRole().then(setState);
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === "unauthenticated" || state === "unauthorized") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <ShieldAlert className="h-10 w-10 text-primary" />
            <h1 className="text-xl font-bold">Rider Portal</h1>
            <p className="text-sm text-muted-foreground">
              {state === "unauthorized"
                ? "This portal is for Amorino riders. Signed up already? Ask the owner to add you in Admin → Riders (they just need your sign-up email)."
                : "Sign in with your Amorino rider account to see your deliveries. New here? Sign up first, then ask the owner to add you."}
            </p>
            <SignInButton mode="modal">
              <Button className="gap-2">
                <Navigation className="h-4 w-4" /> Sign in
              </Button>
            </SignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <RiderDashboard />;
}