#!/usr/bin/env tsx

/**
 * Script to validate poster URLs in the landing page demo data
 *
 * Usage:
 *   npx tsx scripts/validate-posters.ts
 */

const DEMO_ITEMS = [
  {
    id: 1,
    title: "Cowboy Bebop",
    posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-GCsPm7waJ4kS.png",
  },
  {
    id: 2,
    title: "Everything Everywhere All at Once",
    posterUrl: "https://image.tmdb.org/t/p/w500/u68AjlvlutfEIcpmbYpKcdi09ut.jpg",
  },
  {
    id: 3,
    title: "The Last of Us",
    posterUrl: "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
  },
  {
    id: 4,
    title: "Baldur's Gate 3",
    posterUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.jpg",
  },
  {
    id: 5,
    title: "Arcane",
    posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/104490-AHK6ssmgsfWw.jpg",
  },
  {
    id: 6,
    title: "Dune: Part Two",
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  },
];

async function checkUrl(url: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Only fetch headers, not the full image
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function validatePosters() {
  console.log('🔍 Validating poster URLs...\n');

  const results = [];

  for (const item of DEMO_ITEMS) {
    process.stdout.write(`Checking "${item.title}"... `);

    const result = await checkUrl(item.posterUrl);

    if (result.success) {
      console.log(`✅ OK (${result.status})`);
      results.push({ ...item, status: 'valid', code: result.status });
    } else {
      console.log(`❌ FAILED (${result.status || result.error})`);
      results.push({ ...item, status: 'invalid', code: result.status, error: result.error });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary\n');

  const valid = results.filter(r => r.status === 'valid');
  const invalid = results.filter(r => r.status === 'invalid');

  console.log(`✅ Valid:   ${valid.length}/${results.length}`);
  console.log(`❌ Invalid: ${invalid.length}/${results.length}\n`);

  if (invalid.length > 0) {
    console.log('🔴 Broken URLs:\n');
    invalid.forEach(item => {
      console.log(`  - ${item.title}`);
      console.log(`    URL: ${item.posterUrl}`);
      console.log(`    Error: ${item.error || `HTTP ${item.code}`}\n`);
    });
  }

  if (valid.length > 0) {
    console.log('✅ Valid URLs:\n');
    valid.forEach(item => {
      console.log(`  - ${item.title}: ${item.posterUrl}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  if (invalid.length > 0) {
    console.log('\n💡 Tip: You can find replacement poster URLs at:');
    console.log('   - TMDB: https://www.themoviedb.org/');
    console.log('   - Or set posterUrl to null to show "No poster" fallback\n');
    process.exit(1);
  } else {
    console.log('\n🎉 All poster URLs are valid!\n');
    process.exit(0);
  }
}

validatePosters();
