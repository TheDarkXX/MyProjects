function tryDecodeGoogleNews(articleId) {
  try {
    const raw = articleId.split('?')[0];
    const b64 = Buffer.from(raw, 'base64').toString('latin1');
    console.log('Decoded latin1:', b64);
    const urls = b64.match(/https?:\/\/[^\x00-\x1F\x7F-\x9F\"\'<>\s]+/g);
    console.log('URLs in base64:', urls);
  } catch (e) {
    console.error(e);
  }
}

const testId = 'CBMiUEFVX3lxTE9qejEtbzhHOHJnMXJRWUVEbUxyUFF0RnJuNEtEN0U4Mk4wTlIycHNTejNyYTJYQlRDMFRCMllMcGJtNV81S0RNME9IZFBSZkRJ';
tryDecodeGoogleNews(testId);
