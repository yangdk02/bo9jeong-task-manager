import type { Person, Project, TableRow } from "@/lib/domain/schemas";
import { readTable } from "@/lib/server/csv-repository";

export type AssetListItem = {
  asset: TableRow<"assets">;
  project: Project;
  owner?: Person;
  uploader?: Person;
};

export type AssetDetailData = AssetListItem & {
  people: Person[];
  comments: Array<{ comment: TableRow<"comments">; author?: Person }>;
};

export async function getAssetListData() {
  const [people, projects, assets] = await Promise.all([
    readTable("people"), readTable("projects"), readTable("assets"),
  ]);
  const personById = new Map(people.map((person) => [person.person_id, person]));
  const projectById = new Map(projects.map((project) => [project.project_id, project]));
  const items = assets
    .flatMap((asset) => {
      const project = projectById.get(asset.project_id);
      if (!project) return [];
      return [{ asset, project, owner: personById.get(asset.owner_person_id), uploader: personById.get(asset.uploaded_by) }];
    })
    .sort((a, b) => b.asset.uploaded_at.localeCompare(a.asset.uploaded_at));
  return { people, projects, items };
}

export async function getAssetDetailData(assetId: string): Promise<AssetDetailData | undefined> {
  const [{ people, items }, comments] = await Promise.all([getAssetListData(), readTable("comments")]);
  const item = items.find(({ asset }) => asset.asset_id === assetId);
  if (!item) return undefined;
  const personById = new Map(people.map((person) => [person.person_id, person]));
  return {
    ...item,
    people,
    comments: comments
      .filter((comment) => comment.target_type === "asset" && comment.target_id === assetId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((comment) => ({ comment, author: personById.get(comment.author_person_id) })),
  };
}
