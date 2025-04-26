import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import fm from "front-matter";
import fs from "fs";
import path from "path";
import { getPageLanguage, getPageTitle } from "./helpers";
import { plainText } from "./markdown/md";

export type ContentFile = {
  filename: string;
  /** relative path to the project folder */
  filepath: string;
  metadata: PageObjectResponse;
  expiry_time: string | null | undefined;
};

export function isMarkdownFile(filename: string): boolean {
  return filename.endsWith(".md");
}

export function getContentFile(filepath: string): ContentFile | undefined {
  if (!fs.existsSync(filepath)) {
    return undefined;
  }

  const filedata = fm(fs.readFileSync(filepath, "utf-8"));
  const metadata = (filedata.attributes as any).NOTION_METADATA;

  if (!metadata) {
    console.warn(
      `[Warn] ${filepath} does not have NOTION_METADATA in its front matter`,
    );

    return undefined;
  }

  return {
    filename: path.basename(filepath),
    filepath,
    metadata,
    expiry_time: (filedata.attributes as any).EXPIRY_TIME,
  };
}

export function getAllContentFiles(dirPath: string): ContentFile[] {
  const fileArray: ContentFile[] = [];
  const queue: string[] = [dirPath];

  while (queue.length !== 0) {
    const filepath = queue.shift();

    if (filepath === undefined) {
      continue;
    }

    if (fs.statSync(filepath).isDirectory()) {
      const files = fs.readdirSync(filepath);

      for (const file of files) {
        queue.push(path.join(filepath, file));
      }

      continue;
    }

    if (!isMarkdownFile(filepath)) {
      continue;
    }

    const filedata = fm(fs.readFileSync(filepath, "utf-8"));
    const metadata = (filedata.attributes as any).NOTION_METADATA;

    if (!metadata) {
      console.warn(
        `[Warn] ${filepath} does not have NOTION_METADATA in its front matter, it will not be managed`,
      );
    } else {
      fileArray.push({
        filename: path.basename(filepath),
        filepath,
        metadata,
        expiry_time: (filedata.attributes as any).expiry_time,
      });
    }
  }

  return fileArray;
}

export function getFileName(page: PageObjectResponse): string {
  const filename = page.properties?.filename;

  if (filename !== undefined && filename?.type !== "rich_text") {
    throw new Error(
      `page.properties.filename has type ${filename.type} instead of rich_text. The underlying Notion API might has changed, please report an issue to the author.`,
    );
  }

  const language = getPageLanguage(page);

  if (filename.rich_text.length > 0) {
    let plainFilename = plainText(filename.rich_text);

    if (!plainFilename.endsWith(`.${language}`)) {
      plainFilename += `.${language}`;
    }

    return plainFilename + ".md";
  }

  const title = getPageTitle(page)
    .normalize("NFD") // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "") // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, "-");

  return title + (language ? `.${language}` : "") + ".md";
}

export function getFileFullName(page: PageObjectResponse): string {
  return getFileName(page);
}
