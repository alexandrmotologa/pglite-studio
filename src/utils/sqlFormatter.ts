/**
 * Formats SQL keywords into standard indentation and uppercase keywords
 */
export function formatSql(sql: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN', 'ON', 'GROUP BY', 'HAVING',
    'ORDER BY', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE FROM', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'CREATE INDEX',
    'CREATE EXTENSION', 'WITH', 'UNION', 'UNION ALL', 'EXPLAIN'
  ]

  let formatted = sql.trim()

  // Capitalize common keywords
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi')
    formatted = formatted.replace(regex, kw)
  })

  return formatted
}
