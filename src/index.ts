import { config as loadEnv } from "dotenv";
import { Command } from "commander";
import chalk from "chalk";
import { loadOrCreateConfig, getApiKeySetupMessage, resolveApiKey, runFirstRunWizard } from "./config.js";
import {
  fetchReadmesForPackages,
  getProjectDependencies,
  resolvePackagesToProcess,
} from "./packages.js";
import {
  assembleSteeringDocument,
  generateSteeringContent,
  mergeSteeringSections,
} from "./generate.js";
import { GenerationProgress } from "./progress.js";
import { getSteeringPath, writeSteeringFile } from "./write.js";
import { updateToolReferences } from "./tools/index.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

loadEnv();

const program = new Command();

program
  .name("airo")
  .description("Generate AI coding assistant steering files from npm packages")
  .version("0.1.0")
  .option("--setup", "Re-run the first-run setup wizard")
  .option(
    "--regenerate",
    "Regenerate steering for all packages using existing config (e.g. after prompt changes)",
  )
  .action(async (options: { setup?: boolean; regenerate?: boolean }) => {
    const cwd = process.cwd();

    try {
      await run(cwd, {
        forceSetup: options.setup ?? false,
        regenerate: options.regenerate ?? false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

export interface RunOptions {
  /** Re-run the setup wizard and regenerate all packages. */
  forceSetup?: boolean;
  /** Regenerate all packages using existing config (no wizard). */
  regenerate?: boolean;
}

/** Main CLI flow: resolve config, diff packages, generate steering, write output. */
async function run(cwd: string, options: RunOptions = {}): Promise<void> {
  const { forceSetup = false, regenerate = false } = options;
  console.log(chalk.bold("airo"));

  const config = forceSetup ? await runFirstRunWizard(cwd) : await loadOrCreateConfig(cwd);

  loadEnv();

  const steeringPath = getSteeringPath(cwd);
  const allDeps = await getProjectDependencies(cwd, config);

  if (allDeps.length === 0) {
    console.log(chalk.yellow("No dependencies found in package.json."));
    return;
  }

  console.log(chalk.dim(`Found ${allDeps.length} dependency(ies)`));

  let toProcess: string[];
  let isIncremental: boolean;
  let removed: string[];

  if (forceSetup || regenerate) {
    if (forceSetup) {
      console.log(chalk.dim("Re-running setup — regenerating steering for all packages."));
    } else {
      console.log(chalk.dim("Regenerating steering for all packages."));
    }
    toProcess = allDeps;
    isIncremental = false;
    removed = [];
  } else {
    ({ packages: toProcess, isIncremental, removed } = await resolvePackagesToProcess(
      cwd,
      config,
      steeringPath,
    ));
  }

  if (isIncremental && toProcess.length === 0 && removed.length === 0) {
    console.log(chalk.green("No package changes detected. Steering is up to date."));
    console.log(chalk.dim("Run with --regenerate to rebuild all sections (e.g. after prompt changes)."));
    await updateToolReferences(cwd, config);
    return;
  }

  if (isIncremental && toProcess.length === 0 && removed.length > 0) {
    const existing = await readFile(steeringPath, "utf-8");
    const finalContent = await mergeSteeringSections(existing, "", removed);
    await writeSteeringFile(cwd, finalContent);
    await updateToolReferences(cwd, config);
    console.log(chalk.green("\nDone!"));
    return;
  }

  if (toProcess.length === 0) {
    console.log(chalk.yellow("No packages to process."));
    return;
  }

  if (!resolveApiKey(config)) {
    throw new Error(getApiKeySetupMessage(config));
  }

  console.log(
    chalk.dim(
      isIncremental
        ? `Processing ${toProcess.length} changed package(s)...`
        : `Processing all ${toProcess.length} package(s)...`,
    ),
  );
  console.log(
    chalk.dim(
      "Remember to install all packages before running airo so that their README files are available.",
    ),
  );

  const readmes = await fetchReadmesForPackages(cwd, toProcess, config);

  if (readmes.length === 0) {
    console.log(chalk.yellow("No READMEs found for any packages."));
    console.log(
      chalk.yellow(
        "Remember to install all packages before running airo so that their README files are available.",
      ),
    );
    return;
  }

  const progress = new GenerationProgress(readmes.length);
  const newSections = await generateSteeringContent(readmes, config, allDeps, progress);

  let finalContent: string;

  if (isIncremental && existsSync(steeringPath)) {
    const existing = await readFile(steeringPath, "utf-8");
    finalContent = await mergeSteeringSections(existing, newSections, removed, toProcess);
  } else {
    finalContent = assembleSteeringDocument(newSections);
  }

  await writeSteeringFile(cwd, finalContent);
  await updateToolReferences(cwd, config);

  console.log(chalk.green("\nDone!"));
}

program.parse();

export { run };
