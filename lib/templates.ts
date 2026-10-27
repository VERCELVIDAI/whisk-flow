import type { Template } from "@/lib/types";

export const TEMPLATES: Template[] = [
  {
    slug: "last-light",
    title: "The Last Light",
    description: "A lonely roadside diner, a final conversation and a sky that refuses to go dark.",
    category: "Narrative",
    mode: "video",
    prompt:
      "A quiet roadside diner at blue hour, warm tungsten light spilling onto wet asphalt, a lone figure at the counter, slow push-in through rain-streaked glass, anamorphic flares, 35mm film grain, intimate and melancholic.",
    negativePrompt: "",
    aspectRatio: "16:9",
    durationSeconds: 10,
    stylePreset: "cinematic",
    poster: "/samples/cinematic-diner.jpg",
    featured: true,
    tags: ["Cinematic", "Night", "Narrative"],
    scenes: [
      {
        title: "Arrival",
        prompt:
          "Wide shot of a solitary diner on an empty desert highway at dusk, neon sign flickering, heat shimmer, slow dolly forward.",
        durationSeconds: 10,
      },
      {
        title: "The Counter",
        prompt:
          "Medium close-up inside the diner, a lone figure stirs coffee, warm practicals, rain on the window, shallow depth of field, quiet tension.",
        durationSeconds: 10,
      },
      {
        title: "Last light",
        prompt:
          "Exterior wide shot, the diner lights switch off one by one, the last orange band of sunset disappears, static camera, ambient wind.",
        durationSeconds: 10,
      },
    ],
  },
  {
    slug: "saffron-smoke",
    title: "Saffron & Smoke",
    description: "A tactile food film where steam, fire and color do the storytelling.",
    category: "Food",
    mode: "video",
    prompt:
      "Macro food cinematography, handmade pasta lifted from a copper pot, saffron steam curling through a beam of warm light, embers in the background, shallow focus, rich color, slow motion.",
    aspectRatio: "16:9",
    durationSeconds: 10,
    stylePreset: "cinematic",
    poster: "/samples/food-pasta.jpg",
    tags: ["Food", "Macro", "Warm"],
  },
  {
    slug: "neon-runner",
    title: "Neon Runner",
    description: "Anime key art energy for a rain-soaked chase through a future city.",
    category: "Anime",
    mode: "video",
    prompt:
      "Anime key visual of a courier sprinting through a neon-drenched alley at night, rain streaking through magenta and cyan light, dynamic low angle, speed lines, hand-painted background, cinematic composition.",
    aspectRatio: "9:16",
    durationSeconds: 10,
    stylePreset: "anime",
    poster: "/samples/anime-neon.jpg",
    featured: true,
    tags: ["Anime", "Neon", "Vertical"],
  },
  {
    slug: "desert-letter",
    title: "Desert Letter",
    description: "A sparse, sun-bleached character study on the edge of a dune.",
    category: "Portrait",
    mode: "image",
    prompt:
      "Editorial portrait of a traveler in a sand-colored linen coat standing on a vast dune, hard midday sun, wind lifting fabric, muted earth palette, medium format film look, quiet dignity.",
    aspectRatio: "3:4",
    stylePreset: "editorial",
    poster: "/samples/story-desert.jpg",
    tags: ["Editorial", "Desert", "Portrait"],
  },
  {
    slug: "form-01",
    title: "Form / 01",
    description: "A product study built from glass, shadow and a single confident highlight.",
    category: "Product",
    mode: "image",
    prompt:
      "Luxury perfume bottle on a polished stone plinth, single hard light source, deep amber glass, precise caustic shadows, minimal warm backdrop, high-end product photography, no text.",
    aspectRatio: "4:5",
    stylePreset: "product",
    poster: "/samples/product-perfume.jpg",
    featured: true,
    tags: ["Product", "Luxury", "Studio"],
  },
  {
    slug: "sneaker-launch",
    title: "Sneaker Launch",
    description: "A kinetic campaign frame for a footwear drop with a graphic point of view.",
    category: "Campaign",
    mode: "image",
    prompt:
      "A sculptural sneaker floating above a concrete plinth, electric blue gel lighting, crisp shadow, bold negative space for campaign copy, editorial product photography, hyper-detailed materials.",
    aspectRatio: "1:1",
    stylePreset: "product",
    poster: "/samples/brand-sneaker.jpg",
    tags: ["Campaign", "Product", "Graphic"],
  },
  {
    slug: "travel-diary",
    title: "Open Road",
    description: "A three-scene travel diary with a documentary heartbeat.",
    category: "Travel",
    mode: "storyboard",
    prompt:
      "A documentary travel sequence along an empty coastal road at golden hour, dust on the lens, honest color, human-scale moments.",
    aspectRatio: "16:9",
    durationSeconds: 10,
    stylePreset: "documentary",
    poster: "/samples/travel-road.jpg",
    tags: ["Travel", "Documentary", "Storyboard"],
    scenes: [
      {
        title: "Departure",
        prompt:
          "Handheld shot from the passenger seat, coastal road unfurling ahead, golden hour, wind in the microphone, lens flare.",
        durationSeconds: 10,
      },
      {
        title: "The stop",
        prompt:
          "Wide static shot of a car pulled onto a dusty shoulder, a figure walks toward the ocean, long shadows, natural sound.",
        durationSeconds: 10,
      },
      {
        title: "Afterglow",
        prompt:
          "Close-up of hands holding a paper map in warm evening light, ocean bokeh behind, subtle film grain, quiet closure.",
        durationSeconds: 10,
      },
    ],
  },
  {
    slug: "studio-session",
    title: "Studio Session",
    description: "Clean editorial light for a fashion story with room to breathe.",
    category: "Fashion",
    mode: "image",
    prompt:
      "Full-length fashion editorial in a warm concrete studio, oversized tailored silhouette, single softbox from the left, long shadow, muted neutral palette, medium format detail, confident stillness.",
    aspectRatio: "3:4",
    stylePreset: "editorial",
    poster: "/samples/fashion-editorial.jpg",
    tags: ["Fashion", "Editorial", "Studio"],
  },
];

export function getTemplates(): Template[] {
  return TEMPLATES;
}

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((template) => template.slug === slug);
}
