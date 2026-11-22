// Every template against the inputs real data will bring. All of it is invented: no real person's data goes here.
// Each case is drawn into gallery/expected/, and a test fails when a drawing changes.

import { readFileSync } from "node:fs";
import type { Picture, PreviewInput, RenderOptions } from "../src/index.ts";

export type Case = { id: string; input: PreviewInput; options?: RenderOptions };

const portrait: Picture = {
  bytes: readFileSync(new URL("./pictures/portrait.jpg", import.meta.url)),
  mediaType: "image/jpeg",
};

const mika = { name: "Mika Rowan", handle: "mika.example" };
const longName = "Bartholomew Featherstonehaugh-Cholmondeley";
const longHandle = "bartholomew.featherstonehaugh-cholmondeley.example.com";

export const cases: Case[] = [
  // The designs' own content.
  {
    id: "profile-design",
    input: { kind: "profile", ...mika, eyebrow: "Meet Mika", bio: "Designer, reader, collector of small discoveries." },
  },
  {
    id: "post-design",
    input: { kind: "post", author: mika, text: "Some ideas need a quiet corner before they need an audience." },
  },
  {
    id: "article-design",
    input: {
      kind: "article",
      author: { name: "Mika Rowan" },
      label: "Essay · 4 min read",
      title: "The small web is still growing.",
      excerpt: "A few thoughts on tending our own corners of the internet.",
    },
  },
  // The other theme.
  {
    id: "profile-dark",
    input: { kind: "profile", ...mika, eyebrow: "Meet Mika", bio: "Designer, reader, collector of small discoveries." },
    options: { theme: "dark" },
  },
  {
    id: "post-light",
    input: { kind: "post", author: mika, text: "Some ideas need a quiet corner before they need an audience." },
    options: { theme: "light" },
  },
  {
    id: "article-dark",
    input: {
      kind: "article",
      author: { name: "Mika Rowan" },
      label: "Note · 1 min read",
      title: "A title on the dark ground",
    },
    options: { theme: "dark" },
  },
  // With a picture.
  {
    id: "profile-picture",
    input: { kind: "profile", ...mika, picture: portrait, bio: "Designer, reader, collector of small discoveries." },
  },
  {
    id: "post-picture",
    input: {
      kind: "post",
      author: { ...mika, picture: portrait },
      text: "Some ideas need a quiet corner before they need an audience.",
    },
  },
  // The least a template can be given.
  { id: "profile-least", input: { kind: "profile", name: "Mika", handle: "mika.example" } },
  { id: "article-least", input: { kind: "article", author: { name: "Mika Rowan" }, title: "Untitled" } },
  // A name that fits once it shrinks a step.
  {
    id: "profile-shrunk",
    input: { kind: "profile", name: "Alexandria Montgomery", handle: "alexandria.example", bio: "Gardener." },
  },
  // Far too much text.
  {
    id: "profile-long",
    input: {
      kind: "profile",
      name: longName,
      handle: longHandle,
      eyebrow: "Meet Bartholomew Featherstonehaugh-Cholmondeley, who has a great deal to say about everything",
      bio: "Writes very long biographies that go on and on about every interest, hobby, former job and half-finished project, far past the point where anyone is still reading them.",
    },
  },
  {
    id: "post-long",
    input: {
      kind: "post",
      author: { name: longName, handle: longHandle },
      text: "Some ideas need a quiet corner before they need an audience, and some need three more paragraphs, a second draft, a walk around the block and an honest friend before they are ready for anyone at all.",
    },
  },
  {
    id: "article-long",
    input: {
      kind: "article",
      author: { name: `${longName} and a second author with an equally long name for good measure` },
      label: "Essay · 48 min read",
      title: "A title that keeps going well past the two lines the design gives it, to see where it is cut",
      excerpt:
        "An excerpt that also keeps going, sentence after sentence, long after the two lines it has been given have run out and the reader has moved on.",
    },
  },
  // Letters the brand's own font files lack: Polish, Czech, Turkish, Hungarian, Romanian and Vietnamese.
  {
    id: "profile-accents",
    input: {
      kind: "profile",
      name: "Łucja Šťastná-Nguyễn",
      handle: "lucja.example",
      eyebrow: "Podróże · Du lịch",
      bio: "Książki, kawa i długie spacery. Čeština, Türkçe (ğ ş ı İ), magyar (ő ű), română (ș ț) và tiếng Việt.",
    },
  },
  {
    id: "article-accents",
    input: {
      kind: "article",
      author: { name: "Đặng Thị Hồng Ánh" },
      title: "Żółta łódź płynie przez Hồ Chí Minh",
      excerpt: "Příliš žluťoučký kůň úpěl ďábelské ódy. Pijamalı hasta yağız şoföre çabucak güvendi.",
      label: "Podróże · Du lịch",
    },
  },
  // One unbroken word, accents, and a name of one letter.
  {
    id: "post-unbroken",
    input: {
      kind: "post",
      author: { name: "Å", handle: "a.example" },
      text: "Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichen café naïve Zoë Łódź",
    },
  },
];
