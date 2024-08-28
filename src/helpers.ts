import { Client, isFullPage } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export function getPageTitle(page: PageObjectResponse): string {
  const title = page.properties.Name ?? page.properties.title;

  if (title.type !== "title") {
    throw new Error(
      `page.properties.Name has type ${title.type} instead of title. The underlying Notion API might has changed, please report an issue to the author.`,
    );
  }

  return title.title.map((text) => text.plain_text).join("");
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

export function getFileName(title: string): string {
  return title.replaceAll(" ", "-").replace(/--+/g, "-") + ".md";
}

export function getFileFullName(page: PageObjectResponse): string {
  return getFileName(getPageTitle(page));
}

export function getNotionPageUrl(page: PageObjectResponse): string {
  return `https://www.notion.so/${getFileFullName(page).replaceAll(".md", "")}-${page.id.replaceAll("-", "")}`;
}
