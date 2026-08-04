import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Sign in to Amorino Café to place an order or manage deliveries.
        </p>
        <SignIn />
      </div>
    </div>
  );
}