import { MetadataRoute } from "next";
import { loadDictionary } from "./lib/i18n";
import { nodes } from "./lib/nodes";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const nodesMap = nodes.map((node) => {
    const dict = loadDictionary("en");
    const name =
      (dict.generated as any)[node.type]?.[
        "termId" in node ? node.termId : node.id
      ]?.name ?? "";
    return {
      url: `https://diablo4.th.gl/nodes/${encodeURIComponent(
        name || node.type,
      )}/@${node.x},${node.y}`,
      lastModified: now,
    };
  });

  return [
    {
      url: "https://diablo4.th.gl",
      lastModified: now,
    },
    ...nodesMap,
  ];
}
