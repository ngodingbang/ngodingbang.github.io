import { Client, isFullUser, iteratePaginatedAPI } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import { DatabaseMount, PageMount } from "./config";
import { getContentFile, getFileFullName, getFileName } from "./file";
import { getCoverLink, getNotionPageUrl, getPageTitle } from "./helpers";

import NotionToMarkdown from "./markdown/NotionToMarkdown";
import { MdBlock } from "./markdown/types";
import { sh } from "./sh";

function getExpiryTime(
  blocks: MdBlock[],
  expiry_time: string | undefined = undefined,
): string | undefined {
  for (const block of blocks) {
    if (block.expiry_time !== undefined) {
      if (expiry_time === undefined) {
        expiry_time = block.expiry_time;
      } else {
        expiry_time =
          expiry_time < block.expiry_time ? expiry_time : block.expiry_time;
      }
    }

    if (block.children.length > 0) {
      const child_expiry_time = getExpiryTime(block.children, expiry_time);

      if (child_expiry_time) {
        if (expiry_time === undefined) {
          expiry_time = child_expiry_time;
        } else {
          expiry_time =
            expiry_time < child_expiry_time ? expiry_time : child_expiry_time;
        }
      }
    }
  }

  return expiry_time;
}

export async function renderPage(
  page: PageObjectResponse,
  notion: Client,
  postpath: string,
) {
  const n2m = new NotionToMarkdown({ notionClient: notion });

  console.info(
    `✨ Convert notion page [${getNotionPageUrl(page)}] to markdown [${postpath}]`,
  );
  const mdblocks = await n2m.pageToMarkdown(page.id);

  const mdString = n2m.toMarkdownString(mdblocks);
  const frontMatter = await collectFrontMatter(page, notion, mdblocks);

  return {
    frontMatter,
    pageString:
      "---\n" +
      YAML.stringify(frontMatter, {
        defaultStringType: "QUOTE_DOUBLE",
        defaultKeyType: "PLAIN",
      }) +
      "\n---\n" +
      "\n" +
      mdString,
  };
}

export async function collectFrontMatter(
  page: PageObjectResponse,
  notion: Client,
  blocks: MdBlock[],
): Promise<
  Record<string, string | string[] | number | boolean | PageObjectResponse>
> {
  let nearest_expiry_time: string | null = null;
  const page_expiry_time = getExpiryTime(blocks);

  if (page_expiry_time) {
    nearest_expiry_time = page_expiry_time;
  }

  const title = getPageTitle(page);
  const frontMatter: Record<
    string,
    string | string[] | number | boolean | PageObjectResponse
  > = {
    title,
    date: page.created_time,
    lastmod: page.last_edited_time,
    draft: false,
  };

  /** set featuredImage and open graph image */
  const featuredImageLink = await getCoverLink(page.id, notion);

  if (featuredImageLink) {
    const { link, expiry_time } = featuredImageLink;
    frontMatter.featuredImage = link;
    frontMatter.images = [link];

    /** update nearest_expiry_time */
    if (expiry_time) {
      if (nearest_expiry_time) {
        nearest_expiry_time =
          expiry_time < nearest_expiry_time ? expiry_time : nearest_expiry_time;
      } else {
        nearest_expiry_time = expiry_time;
      }
    }
  }

  /** map page properties to front matter */
  for (const property in page.properties) {
    const id = page.properties[property].id;
    const response = await notion.pages.properties.retrieve({
      page_id: page.id,
      property_id: id,
    });

    if (response.object === "property_item") {
      switch (response.type) {
        case "checkbox":
          frontMatter[property] = response.checkbox;
          break;

        case "select":
          if (response.select) {
            frontMatter[property] = response.select.name;
          }
          break;

        case "multi_select":
          frontMatter[property] = response.multi_select.map(
            (select) => select.name,
          );
          break;

        case "email":
          if (response.email) frontMatter[property] = response.email;
          break;

        case "url":
          if (response.url) frontMatter[property] = response.url;
          break;

        case "date":
          if (response.date) frontMatter[property] = response.date.start;
          break;

        case "number":
          if (response.number) frontMatter[property] = response.number;
          break;

        case "phone_number":
          if (response.phone_number)
            frontMatter[property] = response.phone_number;
          break;

        case "status":
          if (response.status) {
            frontMatter[property] = response.status.name;
          }
          break;

        case "created_by":
          if (response.created_by) {
            // @ts-ignore
            frontMatter[property] = response.created_by.name;
          }
          break;

        case "last_edited_by":
          if (response.last_edited_by) {
            // @ts-ignore
            frontMatter[property] = response.last_edited_by.name;
          }
          break;

        /** ignore these properties */
        case "created_time":
        case "last_edited_time":
        case "rollup":
        case "files":
        case "formula":
        default:
          break;
      }
    } else {
      for await (const result of iteratePaginatedAPI(
        // @ts-ignore
        notion.pages.properties.retrieve,
        {
          page_id: page.id,
          property_id: id,
        },
      )) {
        switch (result.type) {
          case "people":
            frontMatter[property] = frontMatter[property] || [];

            if (isFullUser(result.people)) {
              const fm = frontMatter[property];

              if (Array.isArray(fm) && result.people.name) {
                fm.push(result.people.name);
              }
            }
            break;

          case "rich_text":
            frontMatter[property] = frontMatter[property] || "";
            frontMatter[property] += result.rich_text.plain_text;

          /** ignore these */
          case "relation":
          case "title":
          default:
            break;
        }
      }
    }
  }

  /** set default author */
  if (typeof frontMatter.authors === "string") {
    frontMatter.authors = [frontMatter.authors];
  }

  /** save metadata */
  frontMatter.NOTION_METADATA = page;

  /** save update time */
  frontMatter.UPDATE_TIME = new Date().toISOString();

  /** save nearest expiry time */
  if (nearest_expiry_time) {
    frontMatter.EXPIRY_TIME = nearest_expiry_time;
  }

  return frontMatter;
}

export async function savePage(
  page: PageObjectResponse,
  notion: Client,
  mount: DatabaseMount | PageMount,
) {
  const postpath = path.join(
    "content",
    mount.target_folder,
    getFileFullName(page),
  );
  const post = getContentFile(postpath);

  if (post) {
    const metadata = post.metadata;

    /** if the page is not modified, continue */
    if (
      post.expiry_time == null &&
      metadata.last_edited_time === page.last_edited_time
    ) {
      console.info(`✅ Post [${postpath}] is up-to-date, skipped`);
      return;
    } else {
      console.info(`🚨 Post [${postpath}] need to be updated, re-render`);
    }
  }

  const { pageString } = await renderPage(page, notion, postpath);
  const fileName = getFileName(page);

  await sh(`hugo new "${mount.target_folder}/${fileName}"`, false);

  fs.writeFileSync(`content/${mount.target_folder}/${fileName}`, pageString);
}
