export const videoJudgementRubric = [
  'Judge each candidate from its title, description, chapters and top comments. You get no transcript.',
  'relevance 0 to 1: 1 means the video teaches this exact concept head on; 0.5 means it covers it inside a wider topic; below 0.3 means it only mentions it. Score the concept, not the production quality.',
  'startSec and endSec: pick the chapter that teaches the concept and use its start and the next chapter start. With no chapters, pick the window the description points at, and use 0 and the full length when nothing points anywhere.',
  'comments: read the top comments and count each one as praise when it says the video made the idea click, warning when it says the video is wrong, misleading or out of date, and neutral otherwise. Send the three counts.',
  'Send one judgement per candidate you would accept. Leave out the rest. Deeply scores relevance 40, comments 20, likes per view 15, views per month 10, channel 10 and freshness 5, each scaled 0 to 1, and keeps the best 2.'
].join('\n');

export const articleJudgementRubric = [
  'Judge each vetted page from its title, site, word count and code block count, plus what you read when you found it.',
  'relevance 0 to 1: same scale as videos.',
  'tier 1 to 4: 1 is the primary source, meaning official docs, the spec or the maintainers writing about their own work. 2 is a recognised practitioner or engineering blog. 3 is a general tutorial site. 4 is a thin aggregator or content farm.',
  'Send one judgement per page you would accept. Deeply scores relevance 40, tier 30, depth 25 and freshness 5, each scaled 0 to 1, where depth comes from word count and code blocks, and keeps the best 2.'
].join('\n');

export const channelProxyNote =
  'The channel part is a proxy, not a track record: it is one channels.list call, scaled from subscriber count and views per video on a log scale. It does not rate the other videos on that channel.';
