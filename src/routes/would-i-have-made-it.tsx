import { createFileRoute, redirect } from "@tanstack/react-router";

// This route used to render its own eligibility + result page. The
// personalized score experience has moved inline onto Home so users answer
// the primary product question without a navigation click. Anyone who
// bookmarked or was linked to this URL is redirected to the anchor on Home.
export const Route = createFileRoute("/would-i-have-made-it")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "where-you-stand", replace: true });
  },
});
