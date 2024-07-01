import dotenv from "dotenv";
import { UserConfig } from "./src/config";

dotenv.config();

const userConfig: UserConfig = {
  notion_token: process.env.NOTION_TOKEN,
  mount: {
    manual: (process.env.USE_MANUAL_MOUNT || "false") === "true",
    page_url: process.env.PAGE_URL,
  },
};

export default userConfig;
