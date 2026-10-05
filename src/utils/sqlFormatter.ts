import { format } from 'sql-formatter'

/**
 * Formats SQL queries using the official PostgreSQL dialect
 * with consistent indentation and uppercase keywords.
 */
export function formatSql(sql: string): string {
  if (!sql || !sql.trim()) return ''

  try {
    return format(sql, {
      language: 'postgresql',
      tabWidth: 2,
      keywordCase: 'upper',
      linesBetweenQueries: 2,
    })
  } catch {
    // If formatting fails on custom edge-case syntax, return raw trimmed SQL safely
    return sql.trim()
  }
}
