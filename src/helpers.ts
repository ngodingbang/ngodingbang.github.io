import { Client, isFullPage } from "@notionhq/client";
import {
  GetBlockResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { plainText } from "./markdown/md";

export function getPageTitle(page: PageObjectResponse): string {
  const title = page.properties.Title ?? page.properties.title;

  if (title.type !== "title") {
    throw new Error(
      `page.properties.Title has type ${title.type} instead of title. The underlying Notion API might has changed, please report an issue to the author.`,
    );
  }

  return plainText(title.title);
}

export function getPageLanguage(page: PageObjectResponse): string | undefined {
  const language = page.properties.language;

  if (language === undefined) {
    return;
  } else if (language?.type !== "select") {
    throw new Error(
      `page.properties.language has type ${language.type} instead of select. The underlying Notion API might has changed, please report an issue to the author.`,
    );
  }

  return language.select?.name;
}

export async function getCoverLink(
  page_id: string,
  notion: Client,
): Promise<{ link: string; expiry_time: string | null } | null> {
  const page = await notion.pages.retrieve({ page_id });

  if (!isFullPage(page)) {
    return null;
  }

  if (page.cover === null) {
    return null;
  }

  if (page.cover.type === "external") {
    return {
      link: page.cover.external.url,
      expiry_time: null,
    };
  }

  return {
    link: page.cover.file.url,
    expiry_time: page.cover.file.expiry_time,
  };
}

export function getNotionPageUrl(page: PageObjectResponse): string {
  return `https://www.notion.so/${page.id.replaceAll("-", "")}`;
}

export async function getBlockChildren(
  notionClient: Client,
  block_id: string,
  totalPage: number | null,
) {
  try {
    let results: GetBlockResponse[] = [];
    let pageCount = 0;
    let start_cursor = undefined;

    do {
      const response: ListBlockChildrenResponse =
        await notionClient.blocks.children.list({
          start_cursor,
          block_id,
        });
      results.push(...response.results);

      start_cursor = response.next_cursor;
      pageCount += 1;
    } while (
      start_cursor != null &&
      (totalPage == null || pageCount < totalPage)
    );

    return results;
  } catch (e) {
    console.error(e);

    return [];
  }
}
