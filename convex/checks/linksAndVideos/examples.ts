import { writingGeneratorsModule } from '../../lib/fixtures/pythonGeneratorsModules';
import type { ModulePack } from '../../lib/courseSchema';

const mapBlocks = (change: (block: ModulePack['sections'][number]['blocks'][number]) => typeof block): ModulePack => ({
  ...writingGeneratorsModule,
  sections: writingGeneratorsModule.sections.map((section) => ({ ...section, blocks: section.blocks.map(change) }))
});

export const linksAndVideosExamples = {
  passing: writingGeneratorsModule,
  failingDeadLink: mapBlocks((block) =>
    block.type === 'article' ? { ...block, url: 'https://docs.python.org/3/howto/no-such-howto.html' } : block
  ),
  failingVideoEndsLate: mapBlocks((block) => (block.type === 'video' ? { ...block, endSec: 99_999 } : block)),
  failingVideoGone: mapBlocks((block) => (block.type === 'video' ? { ...block, youtubeId: 'AAAAAAAAAAA' } : block))
};
