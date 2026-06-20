import Image from "next/image";
import { AlbumCoverMedia } from "@/components/album-cover-media";
import { AlbumTrackReveal } from "@/components/album-track-reveal";
import { AudioPlayerProvider, SidebarAudioDock } from "@/components/audio-player";
import { AudioReveal } from "@/components/audio-reveal";
import { ChapterDivider } from "@/components/chapter-divider";
import { FontSettingsMenu } from "@/components/font-settings-menu";
import { HeroSection } from "@/components/hero-section";
import { InteractiveMedia } from "@/components/interactive-media";
import { MediaModeToggle } from "@/components/media-mode-toggle";
import { SectionBreakMedia } from "@/components/section-break-media";
import { SiteSidebar } from "@/components/site-sidebar";
import { SidebarScrollLink } from "@/components/sidebar-scroll-link";
import { VideoReveal } from "@/components/video-reveal";
import { getPublishedPoems, getSectionBreakImage, groupPoemsBySection, type Poem, type SectionBreakImage } from "@/lib/poems";
import { typographText } from "@/lib/typography";

const bookPdfUrl = "https://disk.yandex.ru/i/3cXpW2qrOPT4mw";

const navItems = [
  ["Об авторе", "#about"],
  ["Интерактив", "#interactive"],
  ["Стихи", "#poems"],
  ["Песни", "#songs"],
  ["Контакты", "#contacts"]
] as const;

const contentsColumns = [
  [
    {
      title: "О жизни и судьбе",
      items: [
        "Стихи, которых нет!",
        "Наша жизнь (М)",
        "Что Бога нам гневить? (М)",
        "Этот мир нам понять",
        "Счастье (М)",
        "Надежда (М)",
        "«Друзья»",
        "Ты с этой жизнью (М)",
        "О всём хорошем не забыл (М)",
        "Артист (М)",
        "Тело (М)",
        "Прогресс (М)",
        "XXI век (М)"
      ]
    },
    {
      title: "О любви и нежности",
      items: [
        "Непогода",
        "Женщинам! (М)",
        "Жемчужинка моя",
        "Мой ангел, ты моё терпенье",
        "Видение",
        "Дорогая Оля!",
        "Моя родная пчёлка",
        "Наша милая родная",
        "Ну вот сегодня восемнадцать!"
      ]
    },
    {
      title: "Родные, друзья, поздравления",
      items: [
        "С днём рождения, грудничок!",
        "Днюха (М)",
        "Дорогому сынуле",
        "Дорогому сыну-отцу!",
        "Нашей крошке",
        "Последний звонок",
        "Дорогая тёща-мать",
        "Желаем вам счастья",
        "Дорогой наш дед, отец!",
        "Другу",
        "Дорогой наш друг Олег",
        "Дорогой наш Валерон!",
        "Дорогой маме!",
        "Другу Вовке"
      ]
    }
  ],
  [
    {
      title: "Мужики, характер, дорога",
      items: [
        "Про нас",
        "Человеческий фактор (М)",
        "Космос (М)",
        "Дорогие мужики (М)",
        "Девчонкам (М)",
        "Дорожная пыль (М)",
        "О себе (М)",
        "Для взрослых"
      ]
    },
    {
      title: "Смех, быт и горькая правда",
      items: [
        "Денежный баланс (М)",
        "Однажды был я в зоосаде (М)",
        "Всем привет! (М)",
        "Новый год (М)",
        "Такую женщину (М)",
        "Ната как граната (М)",
        "Я (М)",
        "Заявление!!!",
        "Б/С для Витька (М)",
        "Бюрократ! (М)"
      ]
    }
  ]
] as const;

type ContentsIcon = "music" | "voice" | "video";

const contentsIconAssets: Record<ContentsIcon, { src: string; width: number; height: number; label: string }> = {
  music: {
    src: "/figma-assets/contents-icon-music.svg",
    width: 18,
    height: 14,
    label: "есть песня"
  },
  video: {
    src: "/figma-assets/contents-icon-video.svg",
    width: 18,
    height: 18,
    label: "есть клип"
  },
  voice: {
    src: "/figma-assets/contents-icon-voice.svg",
    width: 12,
    height: 21,
    label: "есть озвучка"
  }
};

const tutorialIconAssets: Record<ContentsIcon, { src: string; label: string }> = {
  music: {
    src: "/figma-assets/btn-music.svg",
    label: "значок песни"
  },
  video: {
    src: "/figma-assets/btn-video.svg",
    label: "значок клипа"
  },
  voice: {
    src: "/figma-assets/btn-voice.svg",
    label: "значок озвучки"
  }
};

const sectionOrder: readonly string[] = contentsColumns.flat().map((group) => group.title);

const sectionBreakImageFallbacks: Record<string, SectionBreakImage> = {
  "О жизни и судьбе": {
    src: "/figma-assets/life-man.svg",
    width: 452,
    height: 246
  }
};

function TutorialIcon({ type }: { type: ContentsIcon }) {
  const asset = tutorialIconAssets[type];

  return (
    <span className="tutorial-icon" role="img" aria-label={asset.label}>
      <Image className="tutorial-icon-img" src={asset.src} width={27} height={27} alt="" aria-hidden="true" />
    </span>
  );
}

export default function Home() {
  const poems = getPublishedPoems();
  const poemSections = groupPoemsBySection(poems).sort(
    ([sectionA], [sectionB]) => getSectionIndex(sectionA) - getSectionIndex(sectionB)
  );
  const albumTracks = getAlbumTracks(poems);
  const musicQueue = albumTracks.map((track) => ({
    id: `song:${track.audioSrc}`,
    title: typographText(track.title),
    audioSrc: track.audioSrc,
    type: "music" as const,
    lyrics: track.lyrics ? typographText(track.lyrics) : undefined
  }));
  const voiceQueue = getReadingTracks(poems).map((track) => ({
    id: `voice:${track.audioSrc}`,
    title: typographText(track.title),
    audioSrc: track.audioSrc,
    type: "voice" as const
  }));
  const poemsByTitle = new Map(poems.map((poem) => [poem.title, poem]));

  const getContentsItem = (item: string) => {
    const title = item.replace(/\s*\(М\)\s*$/, "");
    const poem = poemsByTitle.get(title);
    const icons: ContentsIcon[] = [];

    if (poem?.song) {
      icons.push("music");
    }

    if (poem?.clip) {
      icons.push("video");
    }

    if (poem?.reading) {
      icons.push("voice");
    }

    return {
      title,
      href: poem ? `#${poem.slug}` : "#poems",
      icons
    };
  };

  return (
    <AudioPlayerProvider queues={{ music: musicQueue, voice: voiceQueue }}>
    <main className="book-shell">
      <SiteSidebar>
        <div className="site-sidebar-inner">
          <div className="site-sidebar-head">
            <a className="brand site-sidebar-brand" href="#top" aria-label="В начало книги">
              <Image
                src="/figma-assets/header-mark.svg"
                width={35}
                height={33}
                alt=""
                aria-hidden="true"
                className="brand-mark"
              />
              <span className="brand-wordmark-wrap" aria-hidden="true">
                <Image
                  src="/figma-assets/header-wordmark.svg"
                  width={27}
                  height={204}
                  alt=""
                  className="brand-wordmark"
                />
              </span>
              <span className="sr-only">Стихи, которых нет!</span>
            </a>

            <FontSettingsMenu />
          </div>

          <div className="site-sidebar-tools" aria-label="Настройки">
            <MediaModeToggle />
          </div>

          <nav className="site-sidebar-nav">
            {navItems.map(([label, href]) => {
              if (href === "#poems") {
                return (
                  <SidebarScrollLink href={href} key={href} sidebarTarget="#contents">
                    {label}
                  </SidebarScrollLink>
                );
              }

              const isExternal = href.startsWith("http");

              return (
                <a href={href} key={href} rel={isExternal ? "noreferrer" : undefined} target={isExternal ? "_blank" : undefined}>
                  {label}
                </a>
              );
            })}
          </nav>

          <section className="contents-section contents-section--sidebar" id="contents" aria-labelledby="contents-title">
            <h2 id="contents-title">Содержание</h2>
            <ContentsList getContentsItem={getContentsItem} />
          </section>
        </div>
      </SiteSidebar>
      <SidebarAudioDock />

      <div className="book-content">
        <HeroSection />

        <section className="text-section" id="about" aria-labelledby="about-title">
          <h2 id="about-title">Об авторе</h2>
          <div className="prose">
            <p>
              {typographText(
                "В этот сборник вошли стихи Сергея Шевченко — искренние, живые, лиричные, ироничные и местами хулиганские. Здесь рядом стоят размышления о жизни, времени, счастье и надежде, тёплые строки о семье, любви и дружбе, поздравления близким, бытовые зарисовки и стихи с характером."
              )}
            </p>
            <p>
              {typographText(
                "Эти тексты объединяет главное — честная интонация, узнаваемые чувства и внимание к простым, но важным вещам: дому, родным людям, памяти, дороге, прожитым годам и человеческому теплу."
              )}
            </p>
            <p>
              {typographText(
                "Книга приурочена к 60-летнему юбилею Сергея Шевченко, собрана и свёрстана его сыном — как подарок."
              )}
            </p>
          </div>
        </section>

      <section className="text-section" id="interactive" aria-labelledby="interactive-title">
        <h2 id="interactive-title">Интерактив</h2>
        <div className="prose">
          <p>{typographText("Книга содержит интерактивные элементы для лучшего погружения в атмосферу.")}</p>
          <p>
            <strong>{typographText("Ожившие иллюстрации")}</strong>
            <br />
            {typographText(
              "Переключатель «Анимации» включает или выключает ожившие иллюстрации во всей книге. Если анимации выключены, рядом со стихами остаются спокойные статичные рисунки, чтобы они не отвлекали от чтения."
            )}
          </p>
          <div className="interactive-animation-toggle">
            <MediaModeToggle />
          </div>
          <p>
            <strong>{typographText("Песни, которых нет")}</strong>
            <br />
            {typographText("Если увидите рядом с названием стихотворения значок")} <TutorialIcon type="music" />,
            {typographText(
              " значит есть песня по мотивам этого стиха. По клику появится плеер и текст. Рекомендуем сначала прочитать стихотворение, его осмыслить, а уже позже слушать."
            )}
          </p>
          <p>
            <strong>{typographText("Клипы")}</strong>
            <br />
            {typographText("Если увидите рядом с названием стихотворения значок")} <TutorialIcon type="video" />,
            {typographText(" значит есть клип на песню по мотивам этого стиха. По клику появится видеоплеер.")}
          </p>
          <p>
            <strong>{typographText("Прочитать вслух")}</strong>
            <br />
            {typographText("Если увидите рядом с названием стихотворения значок")} <TutorialIcon type="voice" />,
            {typographText(
              " значит этот стих вам могут прочитать красиво вслух, а вы закроете глаза и будете наслаждаться."
            )}
          </p>
        </div>
      </section>

      <div className="reader-layout">
        <section className="poems" id="poems" aria-label="Стихи">
          {poemSections.map(([section, sectionPoems], sectionIndex) => {
            const sectionImage = getSectionBreakImage(section) ?? sectionBreakImageFallbacks[section];
            const hasNextSection = sectionIndex < poemSections.length - 1;

            return (
              <div className="poems-section" key={section}>
                <div className={sectionImage ? "section-break" : "section-break section-break--text-only"}>
                  <h2>{typographText(section)}</h2>
                  {sectionImage ? <SectionBreakMedia image={sectionImage} /> : null}
                </div>
                {sectionPoems.map((poem) => (
                  <article className="poem" id={poem.slug} key={poem.slug}>
                    <header className="poem-header">
                      <h2>{typographText(poem.title)}</h2>
                      <div className="poem-actions" aria-label="Интерактивные элементы">
                        {poem.badges.music && poem.song ? (
                          <AudioReveal
                            icon="music"
                            title={typographText(poem.song.title ?? "Песня")}
                            audioSrc={poem.song.audioSrc}
                            lyrics={poem.song.lyrics ? typographText(poem.song.lyrics) : undefined}
                          />
                        ) : null}
                        {poem.badges.reading && poem.reading ? (
                          <AudioReveal
                            icon="voice"
                            title={typographText(poem.reading.title ?? poem.title)}
                            audioSrc={poem.reading.audioSrc}
                          />
                        ) : null}
                        {poem.badges.interactive && poem.clip ? (
                          <VideoReveal title={typographText(poem.clip.title ?? "Видео к стихотворению")} videoSrc={poem.clip.videoSrc} poster={poem.clip.poster} />
                        ) : null}
                      </div>
                    </header>

                    <div className="poem-layout">
                      <div className="poem-body">
                        {poem.body.split(/\n{2,}/).map((stanza) => (
                          <p key={stanza}>{typographText(stanza)}</p>
                        ))}
                      </div>
                      {poem.illustration ? <InteractiveMedia illustration={poem.illustration} /> : null}
                    </div>
                  </article>
                ))}
                {hasNextSection ? <ChapterDivider /> : null}
              </div>
            );
          })}
        </section>
      </div>

      <section className="print-version" id="print-version" aria-labelledby="print-version-title">
        <h2 id="print-version-title">{typographText("Версия для печати")}</h2>
        <p className="book-pdf-download" id="book-pdf-download">
          <a href={bookPdfUrl} target="_blank" rel="noreferrer">
            {typographText("Скачать книгу в pdf")}
          </a>
        </p>
      </section>

      <section className="songs-section" id="songs" aria-labelledby="songs-title">
        <h2 id="songs-title">Песни, которых нет</h2>
        <div className="album-intro">
          <p>
            {typographText("Музыкальный нейроальбом на стихи")}
            <br />
            {typographText("Автор: Виниловая голова")}
            <br />
            {typographText("Год: 2026")}
            <br />
            <a className="album-download" href="https://disk.yandex.ru/d/zHGE-Ooz5LTN8w" target="_blank" rel="noreferrer">
              {typographText("Скачать")}
            </a>
          </p>
        </div>
        <AlbumCoverMedia />
        {albumTracks.length > 0 ? (
          <div className="album-track-block">
            <h3>Список песен</h3>
            <ol className="album-track-list">
              {albumTracks.map((track, index) => (
                <AlbumTrackReveal
                  audioSrc={track.audioSrc}
                  index={index}
                  key={track.audioSrc}
                  lyrics={track.lyrics ? typographText(track.lyrics) : undefined}
                  title={typographText(track.title)}
                />
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <footer className="book-footer" id="contacts" aria-label="Контакты и навигация">
        <a className="brand book-footer-brand" href="#top" aria-label="В начало книги">
          <Image
            src="/figma-assets/header-mark.svg"
            width={35}
            height={33}
            alt=""
            aria-hidden="true"
            className="brand-mark"
          />
          <span className="brand-wordmark-wrap" aria-hidden="true">
            <Image
              src="/figma-assets/header-wordmark.svg"
              width={27}
              height={204}
              alt=""
              className="brand-wordmark"
            />
          </span>
          <span className="sr-only">Стихи, которых нет!</span>
        </a>
        <nav className="book-footer-nav" aria-label="Навигация в футере">
          <a href="#about">Об авторе</a>
          <a href="#interactive">Интерактив</a>
          <a href="#poems">Стихи</a>
          <a href="#songs">Песни</a>
          <span className="book-footer-contacts">
            <span>Контакты</span>
            <span className="book-footer-socials" aria-label="Социальные сети">
              <a className="book-footer-social book-footer-social--telegram" href="https://t.me/vinylhead" target="_blank" rel="noreferrer" aria-label="Telegram">
                <Image
                  className="book-footer-social-circle book-footer-social-normal"
                  src="/figma-assets/footer-contact-circle.svg"
                  width={35}
                  height={35}
                  alt=""
                  aria-hidden="true"
                />
                <Image
                  className="book-footer-social-mark"
                  src="/figma-assets/footer-telegram.svg"
                  width={22}
                  height={19}
                  alt=""
                  aria-hidden="true"
                />
                <Image
                  className="book-footer-social-circle book-footer-social-hover"
                  src="/figma-assets/footer-contact-circle-hover.svg"
                  width={35}
                  height={35}
                  alt=""
                  aria-hidden="true"
                />
                <Image
                  className="book-footer-social-mark book-footer-social-hover"
                  src="/figma-assets/footer-telegram-hover.svg"
                  width={22}
                  height={19}
                  alt=""
                  aria-hidden="true"
                />
              </a>
              <a className="book-footer-social" href="https://vk.com/saltyfun" target="_blank" rel="noreferrer" aria-label="VK">
                <Image
                  className="book-footer-social-normal"
                  src="/figma-assets/footer-vk.svg"
                  width={35}
                  height={35}
                  alt=""
                  aria-hidden="true"
                />
                <Image
                  className="book-footer-social-hover"
                  src="/figma-assets/footer-vk-hover.svg"
                  width={35}
                  height={35}
                  alt=""
                  aria-hidden="true"
                />
              </a>
            </span>
          </span>
        </nav>
        <p>©Виниловая голова 2026</p>
      </footer>
      </div>
    </main>
    </AudioPlayerProvider>
  );
}

function getSectionIndex(section: string) {
  const index = sectionOrder.indexOf(section);

  return index === -1 ? sectionOrder.length : index;
}

type AlbumTrack = {
  audioSrc: string;
  lyrics?: string;
  order: number;
  section: string;
  title: string;
};

type ReadingTrack = {
  audioSrc: string;
  order: number;
  section: string;
  title: string;
};

function getAlbumTracks(poems: Poem[]): AlbumTrack[] {
  const tracksByAudio = new Map<string, AlbumTrack>();
  const seenTrackTitles = new Set<string>();

  poems
    .filter((poem) => poem.song)
    .sort(
      (a, b) =>
        getSectionIndex(a.section) - getSectionIndex(b.section) ||
        a.order - b.order ||
        a.title.localeCompare(b.title, "ru")
    )
    .forEach((poem) => {
      if (!poem.song) {
        return;
      }

      const title = poem.song.title ?? poem.title;
      const titleKey = getTrackTitleKey(title);

      if (tracksByAudio.has(poem.song.audioSrc) || seenTrackTitles.has(titleKey)) {
        return;
      }

      seenTrackTitles.add(titleKey);
      tracksByAudio.set(poem.song.audioSrc, {
        audioSrc: poem.song.audioSrc,
        lyrics: poem.song.lyrics,
        order: poem.order,
        section: poem.section,
        title
      });
    });

  return Array.from(tracksByAudio.values());
}

function getReadingTracks(poems: Poem[]): ReadingTrack[] {
  return poems
    .filter((poem) => poem.reading)
    .sort(
      (a, b) =>
        getSectionIndex(a.section) - getSectionIndex(b.section) ||
        a.order - b.order ||
        a.title.localeCompare(b.title, "ru")
    )
    .map((poem) => ({
      audioSrc: poem.reading?.audioSrc ?? "",
      order: poem.order,
      section: poem.section,
      title: poem.reading?.title ?? poem.title
    }))
    .filter((track) => track.audioSrc);
}

function getTrackTitleKey(title: string) {
  return title
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function ContentsList({ getContentsItem }: { getContentsItem: (item: string) => { title: string; href: string; icons: ContentsIcon[] } }) {
  return (
    <div className="contents-grid">
      {contentsColumns.map((column, columnIndex) => (
        <div className="contents-column" key={columnIndex}>
          {column.map((group) => (
            <div className="contents-group" key={group.title}>
              <h3>{typographText(group.title)}</h3>
              <ol>
                {group.items.map((item) => {
                  const contentsItem = getContentsItem(item);

                  return (
                    <li className="contents-item" key={item}>
                      <a className="contents-link" href={contentsItem.href}>{typographText(contentsItem.title)}</a>
                      {contentsItem.icons.length > 0 ? (
                        <span className="contents-icons" aria-label={contentsItem.icons.map((icon) => contentsIconAssets[icon].label).join(", ")}>
                          {contentsItem.icons.map((icon) => {
                            const asset = contentsIconAssets[icon];

                            return (
                              <span className={`contents-icon-box contents-icon-box--${icon}`} key={icon}>
                                <Image
                                  className={`contents-icon contents-icon--${icon}`}
                                  src={asset.src}
                                  width={asset.width}
                                  height={asset.height}
                                  alt=""
                                  aria-hidden="true"
                                />
                              </span>
                            );
                          })}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          {columnIndex === contentsColumns.length - 1 ? (
            <div className="contents-group contents-group--print">
              <h3>{typographText("Версия для печати")}</h3>
              <ol>
                <li className="contents-item">
                  <a className="contents-link" href={bookPdfUrl} target="_blank" rel="noreferrer">
                    {typographText("Скачать книгу в pdf")}
                  </a>
                </li>
              </ol>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
