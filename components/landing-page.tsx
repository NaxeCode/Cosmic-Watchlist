"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { AuthButtons } from "@/components/auth-buttons";
import { ItemCard } from "@/components/item-card";
import { Star, Sparkles, Play, Filter, Search, BarChart3 } from "lucide-react";
import { useRef } from "react";

// Demo data showcasing the app's capabilities
const DEMO_ITEMS = [
  {
    id: 1,
    title: "Cowboy Bebop",
    type: "anime",
    status: "completed",
    rating: 9.5,
    posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-GCsPm7waJ4kS.png",
    synopsis: "The futuristic misadventures of an easygoing bounty hunter and his partners.",
    releaseYear: 1998,
    runtimeMinutes: 24,
    tags: "sci-fi,noir,jazz",
    genres: "action,drama",
    studios: "Sunrise",
    cast: "Kōichi Yamadera, Megumi Hayashibara",
    notes: "Masterpiece. The ending still hits different.",
    createdAt: new Date("2024-01-15"),
    userId: "demo",
  },
  {
    id: 2,
    title: "Everything Everywhere All at Once",
    type: "movie",
    status: "completed",
    rating: 10,
    posterUrl: "https://image.tmdb.org/t/p/w500/u68AjlvlutfEIcpmbYpKcdi09ut.jpg",
    synopsis: "A woman must connect with parallel universe versions of herself to stop a powerful being.",
    releaseYear: 2022,
    runtimeMinutes: 139,
    tags: "multiverse,mind-bending",
    genres: "sci-fi,comedy,action",
    studios: "A24",
    cast: "Michelle Yeoh, Stephanie Hsu, Ke Huy Quan",
    notes: "Best movie of 2022. Rewatched 3 times already.",
    createdAt: new Date("2024-02-20"),
    userId: "demo",
  },
  {
    id: 3,
    title: "The Last of Us",
    type: "tv",
    status: "watching",
    rating: 9.0,
    posterUrl: "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
    synopsis: "After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl.",
    releaseYear: 2023,
    runtimeMinutes: 60,
    tags: "post-apocalyptic,emotional",
    genres: "drama,thriller",
    studios: "HBO",
    cast: "Pedro Pascal, Bella Ramsey",
    notes: "Episode 3 destroyed me emotionally.",
    createdAt: new Date("2024-03-10"),
    userId: "demo",
  },
  {
    id: 4,
    title: "Baldur's Gate 3",
    type: "game",
    status: "playing",
    rating: 9.5,
    posterUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.jpg",
    synopsis: "Gather your party and return to the Forgotten Realms in a tale of fellowship, betrayal, and sacrifice.",
    releaseYear: 2023,
    runtimeMinutes: null,
    tags: "rpg,dnd,tactical",
    genres: "role-playing,strategy",
    studios: "Larian Studios",
    cast: "",
    notes: "200 hours in and still finding new things. GOTY for sure.",
    createdAt: new Date("2024-03-25"),
    userId: "demo",
  },
  {
    id: 5,
    title: "Arcane",
    type: "anime",
    status: "completed",
    rating: 10,
    posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/104490-AHK6ssmgsfWw.jpg",
    synopsis: "Set in utopian Piltover and oppressed Zaun, the story follows the origins of two iconic League champions.",
    releaseYear: 2021,
    runtimeMinutes: 40,
    tags: "steampunk,sisters",
    genres: "animation,action,drama",
    studios: "Fortiche Production",
    cast: "Hailee Steinfeld, Ella Purnell",
    notes: "The animation quality is unreal. Waiting for S2.",
    createdAt: new Date("2024-01-05"),
    userId: "demo",
  },
  {
    id: 6,
    title: "Dune: Part Two",
    type: "movie",
    status: "planned",
    rating: null,
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    releaseYear: 2024,
    runtimeMinutes: 166,
    tags: "epic,desert",
    genres: "sci-fi,adventure",
    studios: "Legendary Pictures",
    cast: "Timothée Chalamet, Zendaya",
    notes: "Can't wait. Part 1 was incredible.",
    createdAt: new Date("2024-02-01"),
    userId: "demo",
  },
];

const FEATURES = [
  {
    icon: Star,
    title: "Rate & Track",
    description: "Keep your ratings, status, and notes all in one place",
  },
  {
    icon: Filter,
    title: "Smart Filters",
    description: "Filter by type, status, tags, and search across everything",
  },
  {
    icon: Search,
    title: "Command Palette",
    description: "Press ⌘K to instantly find and manage any item",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "See your watch stats, top tags, and personalized recommendations",
  },
];

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Animated cosmic background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0118] via-[#0f0420] to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,51,234,0.35),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.28),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(59,130,246,0.22),transparent_60%)]" />

        {/* Floating particles */}
        {[...Array(30)].map((_, i) => {
          // Generate deterministic positions based on index
          const left = ((i * 37) % 100);
          const top = ((i * 53) % 100);
          const opacity = 0.3 + ((i * 17) % 70) / 100;
          const duration = 2 + ((i * 11) % 30) / 10;
          const delay = ((i * 13) % 20) / 10;

          return (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                opacity,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [opacity * 0.5, opacity, opacity * 0.5],
              }}
              transition={{
                duration,
                repeat: Infinity,
                delay,
              }}
            />
          );
        })}
      </div>

      {/* Floating sign-in button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed right-6 top-6 z-50"
      >
        <AuthButtons isSignedIn={false} />
      </motion.div>

      {/* Hero Section */}
      <motion.section
        style={{ opacity }}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 flex justify-center"
          >
            <Badge variant="glow" className="gap-2 px-6 py-3 text-sm uppercase tracking-[0.3em]">
              <Sparkles className="h-4 w-4" />
              Stargazers Cosmic Watchlist
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 text-6xl font-bold leading-[1.1] tracking-tight md:text-8xl"
          >
            <span className="bg-gradient-to-r from-[#e0d5ff] via-[#c4b5fd] to-[#f9a8d4] bg-clip-text text-transparent">
              Track everything
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#f9a8d4] via-[#a78bfa] to-[#60a5fa] bg-clip-text text-transparent">
              you watch
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            A premium, server-first watchlist for anime, movies, TV shows, and games.
            <br />
            Dark, glassy, and built for late-night sessions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <AuthButtons isSignedIn={false} />
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Play className="h-4 w-4" />
              Scroll to see it in action
            </p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Demo Section */}
      <section className="relative z-10 bg-gradient-to-b from-background/50 to-background px-6 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <Badge variant="outline" className="mb-4 uppercase tracking-widest">
              Live Demo
            </Badge>
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              <span className="bg-gradient-to-r from-[#c4b5fd] to-[#f472b6] bg-clip-text text-transparent">
                See it in action
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              This is what your watchlist looks like. Each item is fully editable with inline actions,
              filters, and smart search.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2">
            {DEMO_ITEMS.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <ItemCard
                  item={item}
                  index={index}
                  selected={false}
                  onToggle={() => {}}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 bg-background px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <Badge variant="outline" className="mb-4 uppercase tracking-widest">
              Features
            </Badge>
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              Everything you need
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Built with modern tech for a premium experience
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-secondary/40 p-6 transition-all duration-300 hover:border-primary/50"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <feature.icon className="relative mb-4 h-8 w-8 text-primary" />
                <h3 className="relative mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="relative text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="mx-auto max-w-2xl rounded-3xl border border-border/70 bg-gradient-to-br from-white via-indigo-50 to-slate-100 p-10 shadow-2xl dark:from-[#0f1020] dark:via-[#0b0c18] dark:to-[#070710]">
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.16),transparent_32%)] blur-[1px]" />
              <div className="relative">
                <h3 className="mb-4 text-3xl font-bold">Ready to start tracking?</h3>
                <p className="mb-6 text-muted-foreground">
                  Sign in with Google to unlock your personal cosmic watchlist
                </p>
                <AuthButtons isSignedIn={false} />
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Private & Secure</Badge>
                  <Badge variant="outline">Server Actions</Badge>
                  <Badge variant="outline">Real-time Sync</Badge>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tech Stack Footer */}
      <section className="relative z-10 border-t border-border/30 bg-background/80 px-6 py-12 backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-4">Built with</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="outline">Next.js 16</Badge>
              <Badge variant="outline">React 19</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">Drizzle ORM</Badge>
              <Badge variant="outline">PostgreSQL</Badge>
              <Badge variant="outline">Framer Motion</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
              <Badge variant="outline">NextAuth</Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
