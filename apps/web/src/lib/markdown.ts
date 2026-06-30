/** Strip common scrape noise before rendering article markdown. */
export function cleanArticleMd(md: string): string {
  return md
    .replace(/Sorry, your browser doesn't support embedded videos\.?\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
