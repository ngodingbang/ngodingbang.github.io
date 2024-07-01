import { Client, isFullBlock, iteratePaginatedAPI } from "@notionhq/client";
import userDefinedConfig from "../notion-hugo.config";

export type UserConfig = {
  notion_token?: string;
  mount: UserMount;
};

export type UserMount = {
  manual: boolean;

  /**
   * If "manual" value is false, just replace the "page_url" value with the Notion url page.
   * Otherwise, fill "databases" and "pages" value manually.
   */
  page_url?: string;
} & Partial<Mount>;

export type Config = {
  notion_token: string;
  mount: Mount;
};

export type Mount = {
  databases: DatabaseMount[];
  pages: PageMount[];
};

export type DatabaseMount = {
  database_id: string;
  /** path/relative/to/content/folder */
  target_folder: string;
};

export type PageMount = {
  page_id: string;
  /** path/relative/to/content/folder */
  target_folder: string;
};

export function defineConfig(config: UserConfig) {
  return config;
}

export async function loadConfig(): Promise<Config> {
  const userConfig = userDefinedConfig as UserConfig;
  const config: Config = {
    notion_token: "",
    mount: {
      databases: [],
      pages: [],
    },
  };

  if (!userConfig.notion_token) {
    throw new Error("The NOTION_TOKEN environment variable is not set.");
  } else {
    config.notion_token = userConfig.notion_token;
  }

  if (userConfig.mount.manual) {
    if (userConfig.mount.databases) {
      config.mount.databases = userConfig.mount.databases;
    }

    if (userConfig.mount.pages) {
      config.mount.pages = userConfig.mount.pages;
    }

    return config;
  } else if (userConfig.mount.page_url === undefined) {
    throw new Error(
      `[Error] When mount.manual is false, a page_url must be set.`,
    );
  }

  const url = new URL(userConfig.mount.page_url);
  const urlLength = url.pathname.length;

  if (urlLength < 32) {
    throw new Error(`[Error] The page_url ${url.href} is invalid`);
  }

  const notion = new Client({ auth: config.notion_token });

  for await (const block of iteratePaginatedAPI(notion.blocks.children.list, {
    /** Get page id from page url */
    block_id: url.pathname.slice(urlLength - 32, urlLength),
  })) {
    if (!isFullBlock(block)) {
      continue;
    }

    if (block.type === "child_database") {
      config.mount.databases.push({
        database_id: block.id,
        target_folder: block.child_database.title,
      });
    }

    if (block.type === "child_page") {
      config.mount.pages.push({
        page_id: block.id,
        target_folder: ".",
      });
    }
  }

  return config;
}
