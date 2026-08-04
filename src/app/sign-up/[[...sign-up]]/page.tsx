import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Join Amorino Café and start ordering in a few taps.
        </p>
        <SignUp />
      </div>
    </div>
  );
}