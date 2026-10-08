# Homepage pictures

The homepage takes most of its pictures from the content in the admin area (destinations, stays, experiences, stories, products): upload good photographs
there. Three big pictures are set separately, in the environment settings (see `.env.example`):

| Setting | What it is | Suggested |
|---|---|---|
| `HOME_HERO_IMAGE` | The big picture at the top of the homepage | 2400 x 1350 px, landscape, JPG or WebP, under 400 KB. A clear sky area on the left helps the headline read |
| `HOME_CLOSING_IMAGE` | Behind "Taita is calling." | 2400 x 1350 px, a sunset or mountain scene, under 400 KB |
| `HOME_HERO_VIDEO` | Optional silent film over the hero picture | MP4 (H.264), 10 to 20 seconds, 1280 x 720, no sound, under 6 MB, a seamless loop |
| `HOME_STORY_URL` | Where "Watch the story" goes | A film on YouTube or Vimeo. Leave empty to show "Read the stories" instead |

Put files you host yourself in this folder (`public/home/`) and refer to them as `/home/hero.jpg`. Use photographs you have the right to use, taken in Taita:
real places and real people, and ask the people pictured. Please don't use pictures that suggest places or practices that aren't really here.

The video never plays for visitors who reduce motion, who save data, or who are on a slow connection: they see the picture.
