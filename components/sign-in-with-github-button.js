import Link from "next/link";

/**
 * GitHub sign-in button. A plain link to the server-side OAuth start route
 * (`/auth/login`), which creates the CSRF state and redirects to GitHub. No
 * client-side auth SDK needed.
 *
 * @param {{ next?: string, label?: string }} props
 */
export function SignInWithGithubButton({ next = "/dashboard", label = "Sign in with GitHub" }) {
  const href = `/auth/login?next=${encodeURIComponent(next)}`;
  return (
    <Link className="btn" href={href}>
      {label}
    </Link>
  );
}
