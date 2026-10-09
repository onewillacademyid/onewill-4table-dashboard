/**
 * Onewill Academy | Server-Only Report Repository Factory
 * Provides dependency injection for Next.js App Router API handlers.
 * Guaranteed production isolation against mock repository activation.
 */

import { IReportRepository } from './report-repository-interface';
import { FirestoreReportRepository } from './firestore-report-repository';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Repository factory imported on client side!');
}

let activeRepository: IReportRepository = new FirestoreReportRepository();

export function getReportRepository(): IReportRepository {
  if (process.env.NODE_ENV === 'production') {
    return new FirestoreReportRepository();
  }
  return activeRepository;
}

export function setReportRepositoryForTesting(repo: IReportRepository): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY ERROR: Repository test overrides are strictly prohibited in production!');
  }
  activeRepository = repo;
}

export function resetReportRepositoryForTesting(): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  activeRepository = new FirestoreReportRepository();
}
