import type { TrackingProvider } from "./provider";

/**
 * Kopija za faks nima ponudnika sledenja: številke se vpišejo, stanje paketa pa
 * potrdi človek ("Paket je pri nas"). Ostala koda to obravnava enako kot
 * nenastavljenega ponudnika.
 */
export const tracker: TrackingProvider = {
  name: "brez sledenja",
  configured: () => false,
  register: async () => [],
  fetch: async () => [],
  fetchFresh: async () => {
    throw new Error("NOT_CONFIGURED");
  },
};
