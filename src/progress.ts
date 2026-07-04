import { spinner } from "@clack/prompts";
import chalk from "chalk";

export interface GenerationProgressState {
  total: number;
  completed: number;
  failed: number;
  inFlight: number;
}

/** Build the CLI spinner message for LLM generation progress. */
export function formatGenerationProgressMessage(state: GenerationProgressState): string {
  const parts = [`${state.completed}/${state.total} complete`];

  if (state.inFlight > 0) {
    parts.push(`${state.inFlight} in flight`);
  }

  if (state.failed > 0) {
    parts.push(chalk.red(`${state.failed} failed`));
  }

  return `Generating steering... ${parts.join(", ")}`;
}

/** Tracks parallel LLM requests and renders a clack spinner in the terminal. */
export class GenerationProgress {
  private completed = 0;
  private failed = 0;
  private inFlight = 0;
  private spin = spinner();
  private started = false;

  constructor(private total: number) {}

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.spin.start(formatGenerationProgressMessage(this.getState()));
  }

  packageStarted(): void {
    if (!this.started) {
      this.start();
    }
    this.inFlight++;
    this.render();
  }

  packageCompleted(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.completed++;
    this.render();
  }

  packageFailed(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.failed++;
    this.render();
  }

  finish(): void {
    if (!this.started) {
      return;
    }

    const message =
      this.failed > 0
        ? chalk.yellow(
            `Generated ${this.completed}/${this.total} packages (${this.failed} failed)`,
          )
        : chalk.green(`Generated steering for ${this.completed} package(s)`);

    this.spin.stop(message);
  }

  getState(): GenerationProgressState {
    return {
      total: this.total,
      completed: this.completed,
      failed: this.failed,
      inFlight: this.inFlight,
    };
  }

  private render(): void {
    this.spin.message(formatGenerationProgressMessage(this.getState()));
  }
}
