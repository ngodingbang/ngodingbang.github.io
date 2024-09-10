import { isFullPage } from "@notionhq/client";
import { GetPageResponse } from "@notionhq/client/build/src/api-endpoints";
import { getFileName } from "../file";
import { getPageLanguage } from "../helpers";

/** @see https://hugodoit.pages.dev/theme-documentation-built-in-shortcodes/#ref-and-relref */
export async function ref(page: GetPageResponse): Promise<string> {
  if (!isFullPage(page)) {
    throw new Error("The given parameter of [page] is not a full page.");
  }

  return `{{< ref "${getFileName(page)}" >}}`;
}

/** @see https://hugodoit.pages.dev/theme-documentation-built-in-shortcodes/#ref-and-relref */
export async function relref(page: GetPageResponse): Promise<string> {
  if (!isFullPage(page)) {
    throw new Error("The given parameter of [page] is not a full page.");
  }

  const fileName = getFileName(page);
  const language = getPageLanguage(page);

  return `{{< relref path="${fileName}" ${language ? `lang="${language}"` : ""} >}}`;
}

/** @see https://hugodoit.pages.dev/theme-documentation-built-in-shortcodes/#figure */
export function figure(alt: string, href: string) {
  return `{{< figure src="${href}" title="${alt}" >}}`;
}

/** @see https://hugodoit.pages.dev/theme-documentation-extended-shortcodes/#image */
export function image(alt: string, href: string) {
  return `{{< image src="${href}" alt="${alt}" caption="${alt}" >}}`;
}
