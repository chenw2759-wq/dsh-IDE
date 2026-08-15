/* Minimal CSS Modules declaration (mirrors the other packages). */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
