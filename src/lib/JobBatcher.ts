import { ZBBatchWorker } from '../zb/ZBBatchWorker';
import {
  BatchedJob,
  ICustomHeaders,
  IInputVariables,
  IOutputVariables,
  ZBBatchWorkerTaskHandler,
} from './interfaces-1.0';
import { Queue } from './Queue';

interface ErrorReportingFunction {
  (message: string, error?: any): void;
}

export interface IJobBatcherOptions {
  handler: ZBBatchWorkerTaskHandler<IInputVariables, ICustomHeaders, IOutputVariables>;
  timeout: number;
  batchSize: number;
  worker: ZBBatchWorker<IInputVariables, ICustomHeaders, IOutputVariables>;
}

export class JobBatcher {
  private batchedJobs: Queue<BatchedJob<IInputVariables, ICustomHeaders, IOutputVariables>> = new Queue();
  private handler: ZBBatchWorkerTaskHandler<IInputVariables, ICustomHeaders, IOutputVariables>;
  private timeout: number;
  private batchSize: number;
  private worker: ZBBatchWorker<IInputVariables, ICustomHeaders, IOutputVariables>;
  private batchExecutionTimerHandle: NodeJS.Timeout | undefined;

  constructor(options: IJobBatcherOptions) {
    this.handler = options.handler;
    this.timeout = options.timeout * 1000; // Convert timeout to milliseconds
    this.batchSize = options.batchSize;
    this.worker = options.worker;
  }

  public batch(batch: BatchedJob<IInputVariables, ICustomHeaders, IOutputVariables>[]) {
    if (!this.batchExecutionTimerHandle) {
      this.batchExecutionTimerHandle = setTimeout(() => this.execute(), this.timeout);
    }
    batch.forEach(this.batchedJobs.push);
    if (this.batchedJobs.length() >= this.batchSize) {
      clearTimeout(this.batchExecutionTimerHandle);
      this.execute();
    }
  }

  private execute() {
    this.batchExecutionTimerHandle = undefined;
    this.worker.debug(`Executing batched handler with ${this.batchedJobs.length()} jobs`);
    try {
      this.handler(this.batchedJobs.drain(), this.worker);
    } catch (e: any) {
      this.reportError('An unhandled exception occurred in the worker task handler!', e);
    }
  }

  private reportError(message: string, error?: any) {
    const errorReportingFunction: ErrorReportingFunction = this.worker.error ?? console.error;
    errorReportingFunction(message, error);
  }
}
