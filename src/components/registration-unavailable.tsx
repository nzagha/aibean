import Link from "next/link";

export function RegistrationUnavailable() {
  return (
    <section
      className="placeholder-card"
      aria-labelledby="registration-unavailable"
    >
      <h2 id="registration-unavailable" className="text-2xl">
        Registration is not open yet.
      </h2>
      <p className="my-4">
        Public account creation is unavailable while aiBean uses its temporary
        sign-in setup. No account has been created.
      </p>
      <p className="mb-6">
        You can discover and compare tools now. When registration opens,
        everyone starts with an ordinary User account. Creator applications and
        tool ownership require separate approval.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link href="/tools" className="button primary">
          Explore AI Tools →
        </Link>
        <Link href="/login" className="button secondary">
          Login to an existing account
        </Link>
      </div>
    </section>
  );
}
