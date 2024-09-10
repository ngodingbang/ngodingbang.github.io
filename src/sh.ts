import { exec } from "child_process";

/** Execute simple shell command (async wrapper). */
export async function sh(
  cmd: string,
  panic: boolean = true,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise(function (resolve, reject) {
    exec(cmd, function (err, stdout, stderr) {
      if (err && panic) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}
