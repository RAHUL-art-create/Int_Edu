export function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function createYouTubeEmbed(url) {
  const videoId = extractVideoId(url);
  return videoId ? 
    `<iframe 
      width="90%" 
      height="90%" 
      src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0" 
      frameborder="0" 
      allowfullscreen
      style="display: block; margin: 5% auto;"
    ></iframe>` : 
    '<p>Invalid YouTube URL</p>';
}
