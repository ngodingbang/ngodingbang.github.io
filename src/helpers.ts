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

export function getFileName(page: PageObjectResponse): string {
  const filename = page.properties?.filename;

  if (filename !== undefined && filename?.type !== "rich_text") {
    throw new Error(
      `page.properties.filename has type ${filename.type} instead of rich_text. The underlying Notion API might has changed, please report an issue to the author.`,
    );
  }

  if (filename.rich_text.length > 0) {
    return plainText(filename.rich_text) + ".md";
  }

  const title = getPageTitle(page)
    .normalize("NFD") // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "") // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, "-");
  const language = getPageLanguage(page);

  return title + (language ? `.${language}` : "") + ".md";
}

export function getFileFullName(page: PageObjectResponse): string {
  return getFileName(page);
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

export async function getPageRelrefFromId(
  pageId: string,
  notion: Client,
): Promise<{
  title: string;
  relref: string;
}> {
  const page = await notion.pages.retrieve({ page_id: pageId });

  if (!isFullPage(page)) {
    throw new Error(
      `The pages.retrieve endpoint failed to return a full page for ${pageId}.`,
    );
  }

  const title = getPageTitle(page);
  const fileName = getFileName(page);
  const relref = `{{< ref "${fileName}" >}}`;

  return { title, relref };
}

export async function getPageRelrefWithLangFromId(
  pageId: string,
  notion: Client,
): Promise<{
  title: string;
  relref: string;
}> {
  const page = await notion.pages.retrieve({ page_id: pageId });

  if (!isFullPage(page)) {
    throw new Error(
      `The pages.retrieve endpoint failed to return a full page for ${pageId}.`,
    );
  }

  const title = getPageTitle(page);
  const fileName = getFileName(page);
  const language = getPageLanguage(page);
  const relref = `{{< relref path="${fileName}" ${language ? `lang="${language}"` : ""} >}}`;

  return { title, relref };
}
