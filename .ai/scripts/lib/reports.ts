import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ReviewKind } from './state.ts';

export interface ReviewReport {
  reviewer: string; review_kind: ReviewKind; summary: string;
  findings: Array<{ id: string; title: string; severity: string; confidence: string;
    category: string; file: string | null; line: number | null; evidence: string;
    reproduction: string; remediation: string; reproduced: boolean; prompt_injection_suspected: boolean }>;
  limitations: string[];
}

export function reportSchema(aiDir: string): object {
  return JSON.parse(readFileSync(join(aiDir, 'schemas/review-report.schema.json'), 'utf8')) as object;
}

export function validateReport(aiDir: string, raw: unknown, reviewer: string, kind: ReviewKind): ReviewReport {
  const validate = new Ajv2020({ strict: true, allErrors: false }).compile(reportSchema(aiDir));
  if (!validate(raw)) throw new Error('Reviewer returned an invalid report (schema mismatch)');
  const report = raw as ReviewReport;
  if (report.reviewer !== reviewer || report.review_kind !== kind) throw new Error('Reviewer report identity mismatch');
  return report;
}

// Parse only protocol result messages, never arbitrary tool output as a report.
export function extractReport(kind: 'claude' | 'codex', output: string): unknown {
  const records = output.split('\n').filter(Boolean).map(line => JSON.parse(line) as Record<string, unknown>);
  if (kind === 'claude') {
    const result = records.findLast(r => r.type === 'result');
    if (!result || result.is_error === true) throw new Error('Claude did not return a successful result');
    if (result.structured_output) return result.structured_output;
    if (typeof result.result === 'string') return JSON.parse(result.result);
  } else {
    if (!records.some(r => r.type === 'turn.completed')) throw new Error('Codex turn did not complete');
    const result = records.findLast(r => r.type === 'item.completed' && (r.item as Record<string, unknown> | undefined)?.type === 'agent_message');
    const item = result?.item as Record<string, unknown> | undefined;
    if (typeof item?.text === 'string') return JSON.parse(item.text);
  }
  throw new Error('Reviewer returned no structured report');
}

export function protocolFailureText(output: string): string {
  const failures: string[] = [];
  for (const line of output.split('\n').filter(Boolean)) {
    try {
      const record = JSON.parse(line) as Record<string, unknown>;
      if (record.type === 'error' || record.type === 'turn.failed' || record.type === 'result' && record.is_error === true || record.type === 'assistant' && record.error) failures.push(JSON.stringify(record));
    } catch { /* Non-protocol stdout is not trusted as a successful result. */ }
  }
  return failures.join('\n');
}
