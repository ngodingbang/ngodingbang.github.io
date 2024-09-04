import { Client, isFullPage, iteratePaginatedAPI } from "@notionhq/client";
import { isFullPageOrDatabase } from "@notionhq/client/build/src/helpers";
import fs from "fs-extra";
import { loadConfig } from "./config";
import { getAllContentFiles } from "./file";
import { getNotionPageUrl } from "./helpers";
import { savePage } from "./render";

async function main() {
  const config = await loadConfig();
  console.info("[Info] Config loaded\n");

  const notion = new Client({ auth: config.notion_token });

  const page_ids: string[] = [];

  /** process mounted databases */
  console.info("[Info] Start processing mounted databases\n");
  for (const mount of config.mount.databases) {
    fs.ensureDirSync(`content/${mount.target_folder}`);

    for await (const page of iteratePaginatedAPI(notion.databases.query, {
      database_id: mount.database_id,
    })) {
      if (!isFullPageOrDatabase(page) || page.object !== "page") {
        continue;
      }

      console.info(`[Info] Start processing page ${getNotionPageUrl(page)}`);
      page_ids.push(page.id);

      await savePage(page, notion, mount);
    }
  }

  /** process mounted pages */
  for (const mount of config.mount.pages) {
    const page = await notion.pages.retrieve({ page_id: mount.page_id });

    if (!isFullPage(page)) {
      continue;
    }

    page_ids.push(page.id);

    await savePage(page, notion, mount);
  }

  /** remove posts that exist locally but not in Notion Database */
  const contentFiles = getAllContentFiles("content");

  for (const file of contentFiles) {
    if (!page_ids.includes(file.metadata.id)) {
      fs.removeSync(file.filepath);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
