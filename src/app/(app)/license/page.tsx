import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photo License",
  description:
    "What you can do with a photo you buy or download on CatchMyAction: keep it, print it and share it as yourself. No reselling, no promoting a business without the photographer's permission.",
  alternates: { canonical: "https://catchmyactions.com/license" },
};

export default function LicensePage() {
  return (
    <div className="max-w-3xl mx-auto py-12 md:py-16">
      <p className="hud mb-5">Legal / Photo license</p>
      <h1 className="disp text-[clamp(34px,5vw,60px)] text-bone mb-4">
        Photo license<span className="text-rec">.</span>
      </h1>
      <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-dim mb-6">Last updated: November 2026</p>
      <p className="text-mute text-[15px] leading-relaxed mb-10">
        This page explains in plain words what you can do with a photo you buy or download on CatchMyAction. It is the
        detail behind Section 7 of our{" "}
        <Link href="/terms" className="text-bone underline underline-offset-2">
          Terms of Service
        </Link>
        .
      </p>

      <div className="border-l-2 border-rec bg-char-2 p-5 mb-10">
        <p className="hud mb-2">The short version</p>
        <p className="text-bone text-[15px] leading-relaxed">
          You are buying a license to use the photo, not its copyright. Keep it, print it and share it as yourself. Do not
          sell it, hand it out for others to use, or use it to promote a business unless the photographer agrees.
        </p>
      </div>

      <Block title="What you can do">
        <Li>Download the full-resolution file, without the watermark, and keep as many backups as you like.</Li>
        <Li>Print it for yourself, your family and your friends: a wall print, an album, a gift.</Li>
        <Li>
          Post it on your own social media, in your messages and on your personal website, as long as it is not for a
          business. Please credit the photographer: tag them or use the name shown on the session page.
        </Li>
        <Li>Edit it for your own use: crop it, adjust the colour, add a caption or a filter.</Li>
      </Block>

      <Block title="What you can not do">
        <Li>Sell, rent, license or give away the file, or prints of it, so that others can use it.</Li>
        <Li>
          Use it to advertise or promote a business, brand, product, school, event or sponsor, or put it on a shop, a
          commercial website or a stock-photo site.
        </Li>
        <Li>Send it to a contest, magazine or publication as your own work.</Li>
        <Li>Present yourself as the photographer, or remove the photographer&apos;s credit.</Li>
        <Li>Use it to train an AI model, or feed it into a tool that does.</Li>
        <Li>Use it to mock, harass or misrepresent anyone who appears in it.</Li>
      </Block>

      <Block title="Need more?">
        <p className="text-mute text-[15px] leading-relaxed">
          A sponsorship, a shop, an article, a team page? That needs the photographer&apos;s permission, and they set the
          terms and the price. Tell us through the{" "}
          <Link href="/contact" className="text-bone underline underline-offset-2">
            contact form
          </Link>{" "}
          and we will try to put you in touch with them.
        </p>
      </Block>

      <Block title="What kind of license this is">
        <Li>Non-exclusive and non-transferable. You cannot pass it to someone else.</Li>
        <Li>Worldwide, and it lasts as long as you follow these rules.</Li>
        <Li>One purchase covers you, one person. It does not cover a team or a company.</Li>
        <Li>The photographer keeps the copyright and may license the same photo to others.</Li>
        <Li>It applies to every photo you get through CatchMyAction, free ones included.</Li>
      </Block>

      <Block title="Other people in the photo">
        <p className="text-mute text-[15px] leading-relaxed">
          Action photos are taken in public places and can show other people. You may keep and share them for personal use.
          Be respectful: if someone in the photo asks you to take it down from your own posts, please do. If a photo shows
          you and you want it removed from CatchMyAction, use &ldquo;Report this photo&rdquo; on it.
        </p>
      </Block>

      <Block title="Previews and the watermark">
        <p className="text-mute text-[15px] leading-relaxed">
          Previews on the site carry a watermark and may not be copied or posted. The file without a watermark is only for
          people who bought or downloaded it.
        </p>
      </Block>

      <Block title="For photographers">
        <p className="text-mute text-[15px] leading-relaxed">
          You keep your copyright. When you sell or give away a photo on CatchMyAction, you grant the buyer this license.
          You confirm that the photo is yours and that you have the right to sell it (Terms, Section 4). If you want to
          offer wider rights, such as commercial use, agree it with the buyer directly and set your own price.
        </p>
      </Block>

      <Block title="Questions">
        <p className="text-mute text-[15px] leading-relaxed">
          Write to us through the{" "}
          <Link href="/contact" className="text-bone underline underline-offset-2">
            contact form
          </Link>
          .
        </p>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="text-lg font-bold text-bone mb-3">{title}</h2>
      {Array.isArray(children) ? <ul className="space-y-2.5">{children}</ul> : children}
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-mute text-[15px] leading-relaxed">
      <span className="text-rec font-mono shrink-0" aria-hidden="true">
        ›
      </span>
      <span>{children}</span>
    </li>
  );
}
