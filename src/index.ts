import { Client, isFullPage, iteratePaginatedAPI } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { isFullPageOrDatabase } from "@notionhq/client/build/src/helpers";
import fs from "fs-extra";
import { DatabaseMount, loadConfig, PageMount } from "./config";
import { ContentFile, getAllContentFiles } from "./file";
import { getNotionPageUrl } from "./helpers";
import { savePage } from "./render";

const page_ids: string[] = [];

async function runSavePage(
  page: PageObjectResponse,
  notion: Client,
  mount: DatabaseMount | PageMount,
) {
  page_ids.push(page.id);

  console.info(`\n🚀 Processing notion page [${getNotionPageUrl(page)}]`);
  await savePage(page, notion, mount);
}

/**
 * Remove posts that exist locally but not in Notion Database.
 */
function runRemoveTrashedPost(files: ContentFile[]) {
  for (const file of files) {
    if (!page_ids.includes(file.metadata.id)) {
      console.info(
        `\n🗑️ Delete post [${file.filepath}] because it's not exists anymore in notion`,
      );
      fs.removeSync(file.filepath);
    }
  }
}

async function main() {
  const config = await loadConfig();
  console.info("⏳ Config loaded");

  const notion = new Client({ auth: config.notion_token });

  console.info("🏁 Start processing mounted databases");
  for (const mount of config.mount.databases) {
    fs.ensureDirSync(`content/${mount.target_folder}`);

    for await (const page of iteratePaginatedAPI(notion.databases.query, {
      database_id: mount.database_id,
    })) {
      if (!isFullPageOrDatabase(page) || page.object !== "page") {
        continue;
      }

      await runSavePage(page, notion, mount);
    }
  }

  console.info("\n🏁 Start processing mounted pages");
  for (const mount of config.mount.pages) {
    const page = await notion.pages.retrieve({ page_id: mount.page_id });

    if (!isFullPage(page)) {
      continue;
    }

    await runSavePage(page, notion, mount);
  }

  runRemoveTrashedPost(getAllContentFiles("content"));

  console.info("\n🎉 Converting notion into markdown finished");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
