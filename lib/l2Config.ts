export type L2App = {
  id: string;
  name: string;
  description: string;
  category: "ai" | "legal" | "defi" | "other";
  docsUrl?: string;
  externalUrl?: string;
  // Optional: link to IPNDHT descriptors (by tag/meta)
  ipndhtTag?: string;
};

export const L2_APPS: L2App[] = [
  {
    id: "ai-fairness",
    name: "AI Fairness Scoring",
    description: "IPPAN’s deterministic D-GBDT fairness engine running on L1 metrics with L2 model lifecycle.",
    category: "ai",
    docsUrl: "https://github.com/dmrl789/IPPAN/tree/master/ai_assets",
    ipndhtTag: "ai_model"
  },
  {
    id: "infolaw",
    name: "InfoLAW",
    description: "Curated legal datasets and reasoning models anchored on IPPAN.",
    category: "legal",
    docsUrl: "https://github.com/dmrl789/IPPAN",
    ipndhtTag: "ai_dataset"
  }
  // add more as the ecosystem grows
];

