// Helper functions to work around Kysely type issues

export function asDbString(value: any): string {
  return value as string
}

export function asDbValue(value: any): any {
  return value as any
}
