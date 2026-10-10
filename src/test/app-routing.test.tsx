import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

async function routerAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return router;
}

describe("App routing", () => {
  it("resolves the index route", async () => {
    const router = await routerAt("/");

    expect(router.state.location.pathname).toBe("/");
    expect(router.state.matches.map((match) => match.routeId)).toContain("/");
  });

  it("keeps an unknown path in the root not-found route", async () => {
    const router = await routerAt("/this-route-does-not-exist");

    expect(router.state.location.pathname).toBe("/this-route-does-not-exist");
    expect(router.state.matches.map((match) => match.routeId)).toContain("__root__");
  });
});
