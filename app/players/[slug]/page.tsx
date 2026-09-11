import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { resolvePlayerImageUrl } from '@/lib/utils';
import PlayerPageClient, { type PlayerClientShape } from './PlayerPageClient';

async function getPlayerForPage(slug: string): Promise<{ player: PlayerClientShape; upvoteCount: number } | null> {
  const player = await prisma.player.findUnique({
    where: { slug },
    select: {
      id: true,
      playerNumber: true,
      slug: true,
      name: true,
      title: true,
      team: true,
      bio: true,
      imageUrl: true,
      eliminated: true,
      extraFields: true,
      upvoteCount: true,
    },
  });

  if (!player) return null;

  const resolvedImageUrl = await resolvePlayerImageUrl(player.playerNumber, player.imageUrl);

  return {
    player: {
      id: player.id,
      playerNumber: player.playerNumber,
      slug: player.slug,
      name: player.name,
      title: player.title,
      team: player.team,
      bio: player.bio,
      imageUrl: resolvedImageUrl,
      eliminated: player.eliminated,
      extraFields: player.extraFields as any,
    },
    upvoteCount: (player as any).upvoteCount ?? 0,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const data = await getPlayerForPage((await params).slug);

  if (!data) {
    return {
      title: 'Player Not Found | Beast Games',
      description: 'This player could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const { player } = data;
  const title = `${player.name} | Beast Games`;
  const description =
    (player.bio && player.bio.trim()) ||
    (player.title && player.title.trim())
      ? `${player.name}${player.title ? ` — ${player.title}` : ''}`
      : `View ${player.name}'s profile on Beast Games.`;

  const image = player.imageUrl || '/images/logo.png';

  return {
    title,
    description,
    alternates: {
      canonical: `/players/${player.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/players/${player.slug}`,
      type: 'profile',
      images: [
        {
          url: image,
          alt: player.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await getPlayerForPage((await params).slug);
  if (!data) notFound();

  return <PlayerPageClient initialPlayer={data.player} initialUpvoteCount={data.upvoteCount} />;
}

