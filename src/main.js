import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";

import { createExitSignal, staticServer } from "./shared/server.ts";

import { gpt } from "./shared/openai.ts";

const app = new Application();
const router = new Router();

router.post("/api/image", async (ctx) => {
  console.log("ctx.request.url.pathname:", ctx.request.url.pathname);

  console.log("ctx.request.method:", ctx.request.method);

  const JSONdata = await ctx.request.body({ limit: "20mb" }).value;
  const data = JSON.parse(JSONdata);
  const imageURL = data.image;
  console.log(imageURL.slice(0, 50));
  const response = await analyzeImage(imageURL);
  ctx.response.body = response;
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(staticServer);

console.log("\nListening on http://localhost:8585");
await app.listen({ port: 8585, signal: createExitSignal() });

async function analyzeImage(imageURL) {
  const response = await gpt({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze the image and provide structured data to find similar art/artists in the collection of the Art Institute of Chicago.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageURL,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.8,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "image_analysis",
        schema: {
          type: "object",
          properties: {
            artist: {
              type: "string",
              description: "The artist of the artwork. If the artist is unknown, write 'unknown'.",
            },
            title: {
              type: "string",
              description:
                "The title of the artwork. If the title is unknown, write 'unknown'. If the artwork is untitled, write 'untitled'.",
            },
            medium: {
              type: "string",
              description:
                "The medium of the artwork, for example 'Oil on canvas' or 'Photograph'. If unknown, write 'unknown'.",
            },
            subject: {
              type: "string",
              description: "The artwork's subject, in 10-20 words.",
            },
            era: {
              type: "string",
              description: "The era of the work, for example 'Early Renaissance' or '19th century'.",
            },
            style: {
              type: "string",
              description: "The artwork's style, like 'Impressionism'.",
            },
            movement: {
              type: "string",
              description:
                "The artwork's movement, like 'Dadaism'. If the artwork does not belong to a movement, write 'none'.",
            },
            mood: {
              type: "array",
              description: "A few descriptors of mood of the artwork, for example 'sad', 'contemplative'.",
              items: { type: "string" },
            },
            similar_artists: {
              type: "array",
              description:
                "2-5 similar artists to that of the artwork's artist and/or style that are in the collection of the Art Institute of Chicago. If none are known, write 'none'.",
              items: { type: "string" },
            },
            similar_artworks: {
              type: "array",
              description:
                "5-10 similar artworks that are in the collection of the Art Institute of Chicago, based on the work's subject, style, medium, and mood. Example: Water Lilies, Claude Monet. If none are known, write 'none'. Make sure the artworks currently exist in the collection of the Art Institute of Chicago and are available in their online collection, and the names are accurate. Offer a variety of artists, if possible.",
              items: { type: "string" },
            },
            background_color: {
              type: "array",
              description:
                "Two background colors, in HEX, inspired by the artwork. This color should be a prominent color in the artwork, but keep the color somewhat light.",
              items: { type: "string" },
            },
          },
          required: [
            "artist",
            "title",
            "medium",
            "subject",
            "era",
            "style",
            "movement",
            "mood",
            "similar_artists",
            "similar_artworks",
            "background_color",
          ],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });
  await Deno.writeTextFile("art_info.json", response.content);
  return response.parsed;
}
